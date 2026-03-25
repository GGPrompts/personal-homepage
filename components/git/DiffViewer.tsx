'use client'

import React, { useMemo, useRef, useCallback } from 'react'
import { Columns2, AlignJustify, Plus, Minus } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { parseDiff, type DiffFile, type DiffHunk, type DiffLine } from '@/lib/git/parse-diff'

// ---------------------------------------------------------------------------
// Language mapping (file extension -> Prism language)
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', rb: 'ruby', java: 'java', cpp: 'cpp', c: 'c',
  cs: 'csharp', php: 'php', go: 'go', rs: 'rust', swift: 'swift',
  kt: 'kotlin', scala: 'scala', sql: 'sql', sh: 'bash', bash: 'bash',
  zsh: 'bash', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  html: 'html', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  ini: 'ini', lua: 'lua', perl: 'perl', vim: 'vim', tex: 'latex',
  graphql: 'graphql', gql: 'graphql', md: 'markdown', json: 'json',
}

function getLanguageForFile(fileName?: string, language?: string): string {
  if (language) return language
  if (!fileName) return 'text'
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return LANGUAGE_MAP[ext] || 'text'
}

// ---------------------------------------------------------------------------
// Diff stats
// ---------------------------------------------------------------------------

function getDiffStats(files: DiffFile[]) {
  let additions = 0
  let deletions = 0
  for (const file of files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'addition') additions++
        else if (line.type === 'deletion') deletions++
      }
    }
  }
  return { additions, deletions }
}

// ---------------------------------------------------------------------------
// Format line number
// ---------------------------------------------------------------------------

function formatLineNumber(num: number | null, width: number): string {
  if (num === null) return ' '.repeat(width)
  return String(num).padStart(width, ' ')
}

// ---------------------------------------------------------------------------
// HighlightedLine: renders a single line with syntax highlighting
// ---------------------------------------------------------------------------

const highlighterStyle = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: 0,
    fontSize: 'inherit',
    lineHeight: 'inherit',
    overflow: 'visible',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: 'inherit',
  },
}

function HighlightedLine({ content, language }: { content: string; language: string }) {
  if (!content && content !== '') return <span> </span>

  return (
    <SyntaxHighlighter
      language={language}
      style={highlighterStyle}
      customStyle={{
        background: 'transparent',
        margin: 0,
        padding: 0,
        display: 'inline',
        overflow: 'visible',
      }}
      PreTag="span"
      CodeTag="span"
      wrapLines={false}
    >
      {content || ' '}
    </SyntaxHighlighter>
  )
}

// ---------------------------------------------------------------------------
// Compute max line number width
// ---------------------------------------------------------------------------

function useMaxLineWidth(files: DiffFile[]) {
  return useMemo(() => {
    let max = 0
    for (const file of files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.oldLineNumber !== null && line.oldLineNumber > max) max = line.oldLineNumber
          if (line.newLineNumber !== null && line.newLineNumber > max) max = line.newLineNumber
        }
      }
    }
    return Math.max(3, String(max).length)
  }, [files])
}

// ---------------------------------------------------------------------------
// Split-mode helpers: build left/right line arrays for side-by-side
// ---------------------------------------------------------------------------

interface SplitLine {
  type: 'context' | 'addition' | 'deletion' | 'empty'
  content: string
  lineNumber: number | null
}

interface SplitPair {
  left: SplitLine
  right: SplitLine
}

function buildSplitPairs(hunk: DiffHunk): SplitPair[] {
  const pairs: SplitPair[] = []
  const lines = hunk.lines
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.type === 'context') {
      pairs.push({
        left: { type: 'context', content: line.content, lineNumber: line.oldLineNumber },
        right: { type: 'context', content: line.content, lineNumber: line.newLineNumber },
      })
      i++
    } else if (line.type === 'deletion') {
      // Collect consecutive deletions
      const deletions: DiffLine[] = []
      while (i < lines.length && lines[i].type === 'deletion') {
        deletions.push(lines[i])
        i++
      }
      // Collect consecutive additions
      const additions: DiffLine[] = []
      while (i < lines.length && lines[i].type === 'addition') {
        additions.push(lines[i])
        i++
      }
      // Pair them up
      const maxLen = Math.max(deletions.length, additions.length)
      for (let j = 0; j < maxLen; j++) {
        const del = deletions[j]
        const add = additions[j]
        pairs.push({
          left: del
            ? { type: 'deletion', content: del.content, lineNumber: del.oldLineNumber }
            : { type: 'empty', content: '', lineNumber: null },
          right: add
            ? { type: 'addition', content: add.content, lineNumber: add.newLineNumber }
            : { type: 'empty', content: '', lineNumber: null },
        })
      }
    } else if (line.type === 'addition') {
      // Pure addition with no preceding deletion
      pairs.push({
        left: { type: 'empty', content: '', lineNumber: null },
        right: { type: 'addition', content: line.content, lineNumber: line.newLineNumber },
      })
      i++
    } else {
      i++
    }
  }

  return pairs
}

// ---------------------------------------------------------------------------
// Unified mode renderer
// ---------------------------------------------------------------------------

function UnifiedView({
  files,
  language,
  lineNumberWidth,
}: {
  files: DiffFile[]
  language: string
  lineNumberWidth: number
}) {
  return (
    <div className="diff-unified overflow-auto h-full font-mono text-sm leading-6">
      {files.map((file, fileIndex) => (
        <div key={fileIndex}>
          {file.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex}>
              {/* Hunk header */}
              <div
                className="px-3 py-1 text-xs select-none sticky top-0 z-10"
                style={{ background: 'var(--diff-hunk-bg)' }}
              >
                <span className="opacity-70">
                  @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
                </span>
                {hunk.header && (
                  <span className="ml-2 text-[hsl(var(--primary))]">{hunk.header}</span>
                )}
              </div>

              {/* Lines */}
              {hunk.lines.map((line, lineIndex) => {
                const bgVar =
                  line.type === 'addition'
                    ? 'var(--diff-added-bg)'
                    : line.type === 'deletion'
                      ? 'var(--diff-deleted-bg)'
                      : 'transparent'
                const borderColor =
                  line.type === 'addition'
                    ? 'rgb(34, 197, 94)'
                    : line.type === 'deletion'
                      ? 'rgb(239, 68, 68)'
                      : 'transparent'
                const prefix =
                  line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '

                return (
                  <div
                    key={lineIndex}
                    className="flex"
                    style={{
                      background: bgVar,
                      borderLeft: `3px solid ${borderColor}`,
                    }}
                  >
                    {/* Old line number */}
                    <span
                      className="select-none text-right px-2 shrink-0"
                      style={{
                        minWidth: `${lineNumberWidth + 1}ch`,
                        color: 'hsl(var(--muted-foreground))',
                        opacity: 0.5,
                        borderRight: '1px solid hsl(var(--border) / 0.3)',
                      }}
                    >
                      {formatLineNumber(line.oldLineNumber, lineNumberWidth)}
                    </span>

                    {/* New line number */}
                    <span
                      className="select-none text-right px-2 shrink-0"
                      style={{
                        minWidth: `${lineNumberWidth + 1}ch`,
                        color: 'hsl(var(--muted-foreground))',
                        opacity: 0.5,
                        borderRight: '1px solid hsl(var(--border) / 0.3)',
                      }}
                    >
                      {formatLineNumber(line.newLineNumber, lineNumberWidth)}
                    </span>

                    {/* Prefix (+/-/space) */}
                    <span
                      className="select-none px-1 shrink-0"
                      style={{
                        color:
                          line.type === 'addition'
                            ? 'rgb(34, 197, 94)'
                            : line.type === 'deletion'
                              ? 'rgb(239, 68, 68)'
                              : 'hsl(var(--muted-foreground))',
                        fontWeight: line.type !== 'context' ? 600 : 400,
                      }}
                    >
                      {prefix}
                    </span>

                    {/* Content */}
                    <span className="flex-1 pr-4 whitespace-pre overflow-visible">
                      <HighlightedLine content={line.content} language={language} />
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Split mode renderer
// ---------------------------------------------------------------------------

function SplitView({
  files,
  language,
  lineNumberWidth,
}: {
  files: DiffFile[]
  language: string
  lineNumberWidth: number
}) {
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const isSyncing = useRef(false)

  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncing.current) return
    isSyncing.current = true

    const sourceEl = source === 'left' ? leftRef.current : rightRef.current
    const targetEl = source === 'left' ? rightRef.current : leftRef.current

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop
      targetEl.scrollLeft = sourceEl.scrollLeft
    }

    requestAnimationFrame(() => {
      isSyncing.current = false
    })
  }, [])

  // Pre-build all split pairs for all hunks
  const allPairs = useMemo(() => {
    const result: { fileIndex: number; hunkIndex: number; hunk: DiffHunk; pairs: SplitPair[] }[] = []
    for (let fi = 0; fi < files.length; fi++) {
      for (let hi = 0; hi < files[fi].hunks.length; hi++) {
        const hunk = files[fi].hunks[hi]
        result.push({
          fileIndex: fi,
          hunkIndex: hi,
          hunk,
          pairs: buildSplitPairs(hunk),
        })
      }
    }
    return result
  }, [files])

  const renderSide = (
    side: 'left' | 'right',
    ref: React.RefObject<HTMLDivElement | null>,
  ) => (
    <div
      ref={ref}
      className="overflow-auto h-full font-mono text-sm leading-6"
      onScroll={() => handleScroll(side)}
    >
      {allPairs.map(({ hunkIndex, hunk, pairs }, groupIndex) => (
        <div key={groupIndex}>
          {/* Hunk header */}
          <div
            className="px-3 py-1 text-xs select-none sticky top-0 z-10"
            style={{ background: 'var(--diff-hunk-bg)' }}
          >
            <span className="opacity-70">
              {side === 'left'
                ? `@@ -${hunk.oldStart},${hunk.oldCount} @@`
                : `@@ +${hunk.newStart},${hunk.newCount} @@`}
            </span>
            {hunk.header && (
              <span className="ml-2 text-[hsl(var(--primary))]">{hunk.header}</span>
            )}
          </div>

          {/* Paired lines */}
          {pairs.map((pair, pairIndex) => {
            const entry = side === 'left' ? pair.left : pair.right
            const bgVar =
              entry.type === 'addition'
                ? 'var(--diff-added-bg)'
                : entry.type === 'deletion'
                  ? 'var(--diff-deleted-bg)'
                  : entry.type === 'empty'
                    ? 'hsl(var(--muted) / 0.15)'
                    : 'transparent'

            const gutterBg =
              entry.type === 'addition'
                ? 'var(--diff-added-gutter)'
                : entry.type === 'deletion'
                  ? 'var(--diff-deleted-gutter)'
                  : 'transparent'

            return (
              <div
                key={pairIndex}
                className="flex"
                style={{ background: bgVar }}
              >
                {/* Line number gutter */}
                <span
                  className="select-none text-right px-2 shrink-0"
                  style={{
                    minWidth: `${lineNumberWidth + 1}ch`,
                    color: 'hsl(var(--muted-foreground))',
                    opacity: 0.5,
                    background: gutterBg,
                    borderRight: '1px solid hsl(var(--border) / 0.3)',
                  }}
                >
                  {entry.type !== 'empty'
                    ? formatLineNumber(entry.lineNumber, lineNumberWidth)
                    : ''}
                </span>

                {/* Content */}
                <span className="flex-1 px-2 whitespace-pre overflow-visible">
                  {entry.type !== 'empty' ? (
                    <HighlightedLine content={entry.content} language={language} />
                  ) : (
                    <span className="opacity-0">{' '}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={20}>
        {renderSide('left', leftRef)}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={20}>
        {renderSide('right', rightRef)}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function DiffToolbar({
  mode,
  onModeChange,
  fileName,
  additions,
  deletions,
}: {
  mode: 'split' | 'unified'
  onModeChange?: (mode: 'split' | 'unified') => void
  fileName?: string
  additions: number
  deletions: number
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[hsl(var(--border)/0.3)] bg-[hsl(var(--muted)/0.15)]">
      {/* Mode toggle */}
      {onModeChange && (
        <div className="flex items-center rounded-md border border-[hsl(var(--border)/0.3)] overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 rounded-none border-0',
              mode === 'split' && 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]',
            )}
            onClick={() => onModeChange('split')}
            title="Side-by-side"
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 rounded-none border-0',
              mode === 'unified' && 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]',
            )}
            onClick={() => onModeChange('unified')}
            title="Unified"
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* File name */}
      {fileName && (
        <span className="font-mono text-xs text-[hsl(var(--foreground))] truncate">
          {fileName}
        </span>
      )}

      <div className="flex-1" />

      {/* Stats badges */}
      {(additions > 0 || deletions > 0) && (
        <div className="flex items-center gap-1.5">
          {additions > 0 && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-xs font-mono border-green-500/30 text-green-400 bg-green-500/10"
            >
              <Plus className="h-3 w-3 mr-0.5" />
              {additions}
            </Badge>
          )}
          {deletions > 0 && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-xs font-mono border-red-500/30 text-red-400 bg-red-500/10"
            >
              <Minus className="h-3 w-3 mr-0.5" />
              {deletions}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main DiffViewer component
// ---------------------------------------------------------------------------

export interface DiffViewerProps {
  diff: string
  mode?: 'split' | 'unified'
  language?: string
  fileName?: string
  onModeChange?: (mode: 'split' | 'unified') => void
}

export function DiffViewer({
  diff,
  mode = 'split',
  language,
  fileName,
  onModeChange,
}: DiffViewerProps) {
  const files = useMemo(() => parseDiff(diff), [diff])
  const lineNumberWidth = useMaxLineWidth(files)
  const stats = useMemo(() => getDiffStats(files), [files])

  // Resolve language from fileName or explicit prop
  const resolvedFileName = fileName || (files.length > 0 ? files[0].newPath : undefined)
  const lang = getLanguageForFile(resolvedFileName, language)

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[hsl(var(--muted-foreground))] text-sm">
        No changes to display
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-md border border-[hsl(var(--border)/0.3)]">
      <DiffToolbar
        mode={mode}
        onModeChange={onModeChange}
        fileName={resolvedFileName}
        additions={stats.additions}
        deletions={stats.deletions}
      />
      <div className="flex-1 min-h-0">
        {mode === 'unified' ? (
          <UnifiedView files={files} language={lang} lineNumberWidth={lineNumberWidth} />
        ) : (
          <SplitView files={files} language={lang} lineNumberWidth={lineNumberWidth} />
        )}
      </div>
    </div>
  )
}
