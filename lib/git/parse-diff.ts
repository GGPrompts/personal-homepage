// Types for parsed diff structure

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

/**
 * Parse a unified diff string into structured data.
 * Zero dependencies, pure function.
 */
export function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffText.split('\n');

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: diff --git a/file b/file
    if (line.startsWith('diff --git ')) {
      // Save previous file if exists
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }

      // Parse paths from diff --git a/path b/path
      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      currentFile = {
        oldPath: match ? match[1] : '',
        newPath: match ? match[2] : '',
        hunks: [],
      };
      currentHunk = null;
      continue;
    }

    // Skip index, --- and +++ lines but update paths if needed
    if (line.startsWith('index ')) continue;

    if (line.startsWith('--- ')) {
      const path = line.slice(4);
      if (currentFile && path !== '/dev/null') {
        // Remove a/ prefix if present
        currentFile.oldPath = path.startsWith('a/') ? path.slice(2) : path;
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      const path = line.slice(4);
      if (currentFile && path !== '/dev/null') {
        // Remove b/ prefix if present
        currentFile.newPath = path.startsWith('b/') ? path.slice(2) : path;
      }
      continue;
    }

    // Hunk header: @@ -10,6 +10,7 @@ optional context
    if (line.startsWith('@@')) {
      // Save previous hunk if exists
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@ context
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (hunkMatch) {
        oldLineNum = parseInt(hunkMatch[1], 10);
        newLineNum = parseInt(hunkMatch[3], 10);
        currentHunk = {
          oldStart: oldLineNum,
          oldCount: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
          newStart: newLineNum,
          newCount: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
          header: hunkMatch[5]?.trim() || '',
          lines: [],
        };
      }
      continue;
    }

    // Diff lines (must have a current hunk)
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'addition',
          content: line.slice(1),
          oldLineNumber: null,
          newLineNumber: newLineNum++,
        });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'deletion',
          content: line.slice(1),
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
        });
      } else if (line.startsWith(' ') || line === '') {
        // Context line (space prefix) or empty line
        const content = line.startsWith(' ') ? line.slice(1) : line;
        currentHunk.lines.push({
          type: 'context',
          content,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
      }
      // Ignore other lines like "\ No newline at end of file"
    }
  }

  // Save last file and hunk
  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  return files;
}

export type GitDiffLineType = 'added' | 'modified' | 'deleted';

/** A deleted line with its content and position in the new file */
export interface DeletedLine {
  /** Insert this deleted line after this line number in the new file (0 = at start) */
  afterLine: number;
  /** The content of the deleted line */
  content: string;
}

interface ExtractedChanges {
  changedLines: Map<number, GitDiffLineType>;
  deletedLines: DeletedLine[];
}

/**
 * Extract line changes from a git diff for a single file.
 * Returns a map of line numbers to their change type, plus deleted lines with content.
 *
 * For added lines: marks newLineNumber as 'added'
 * For modified lines (addition after deletion): marks as 'modified'
 * For deleted lines: returns the content and position where they should appear
 */
export function extractLineChanges(diffText: string): ExtractedChanges {
  const changedLines = new Map<number, GitDiffLineType>();
  const deletedLines: DeletedLine[] = [];
  const files = parseDiff(diffText);

  if (files.length === 0) {
    return { changedLines, deletedLines };
  }

  // We expect a single file diff
  const file = files[0];

  for (const hunk of file.hunks) {
    // Track position in new file for placing deleted lines
    let newLinePos = hunk.newStart - 1; // 0-based position before the hunk starts

    // Collect consecutive deletions to detect modifications
    let pendingDeletions: { content: string; afterLine: number }[] = [];

    for (const line of hunk.lines) {
      if (line.type === 'context') {
        // Flush any pending deletions as actual deletions
        for (const del of pendingDeletions) {
          deletedLines.push(del);
        }
        pendingDeletions = [];
        newLinePos++;
      } else if (line.type === 'deletion') {
        // Queue deletion - might be a modification if followed by addition
        pendingDeletions.push({
          content: line.content,
          afterLine: newLinePos,
        });
      } else if (line.type === 'addition' && line.newLineNumber !== null) {
        if (pendingDeletions.length > 0) {
          // This addition replaces a deletion - it's a modification
          changedLines.set(line.newLineNumber, 'modified');
          pendingDeletions.shift(); // Consume one pending deletion
        } else {
          // Pure addition
          changedLines.set(line.newLineNumber, 'added');
        }
        newLinePos++;
      }
    }

    // Flush remaining deletions at end of hunk
    for (const del of pendingDeletions) {
      deletedLines.push(del);
    }
  }

  return { changedLines, deletedLines };
}
