/**
 * Parser for .prompty files (TFE/TabzChrome format)
 *
 * Format:
 * ---
 * name: Title
 * description: Description
 * url: optional
 * tags: [optional, list]
 * ---
 * Template content with {{VARIABLES}}
 */

export interface ParsedPrompt {
  name: string;
  description: string;
  template: string;
  variables: string[];
  url?: string;
  tags?: string[];
  filePath?: string;  // Original file path
}

/**
 * Parse a .prompty file content
 *
 * @param content - Raw file content
 * @param filePath - Optional file path for fallback name
 * @returns Parsed prompt object
 */
export function parsePromptyFile(content: string, filePath?: string): ParsedPrompt {
  const parts = content.split(/^---\s*$/m);

  let frontmatter: Record<string, unknown> = {};
  let template = '';

  if (parts.length >= 3) {
    // Standard format: empty | yaml | template
    frontmatter = parseFrontmatter(parts[1]);
    template = parts.slice(2).join('---').trim();
  } else if (parts.length === 2 && parts[0].trim() === '') {
    // Missing closing --- or minimal content
    frontmatter = parseFrontmatter(parts[1]);
    template = '';
  } else {
    // No frontmatter - treat entire content as template
    template = content.trim();
  }

  // Derive name from filename if not in frontmatter
  const name = (frontmatter.name as string) || deriveNameFromPath(filePath);
  const description = (frontmatter.description as string) || '';
  const url = frontmatter.url as string | undefined;
  const tags = parseTags(frontmatter.tags);

  const variables = extractVariables(template);

  return {
    name,
    description,
    template,
    variables,
    url,
    tags: tags.length > 0 ? tags : undefined,
    filePath,
  };
}

/**
 * Extract {{variable}} names from template
 * Pattern: /\{\{([a-zA-Z0-9_]+)\}\}/g
 * Returns unique variable names in document order
 *
 * Also handles variables with default values: {{name:default value}}
 *
 * @param template - Template content
 * @returns Array of unique variable names in order of first occurrence
 */
export function extractVariables(template: string): string[] {
  // Match {{variable}} or {{variable:default}} or {{variable:option1|option2}}
  const pattern = /\{\{([a-zA-Z0-9_]+)(?::[^}]*)?\}\}/g;
  const seen = new Set<string>();
  const variables: string[] = [];

  let match;
  while ((match = pattern.exec(template)) !== null) {
    const varName = match[1].toLowerCase();
    if (!seen.has(varName)) {
      seen.add(varName);
      // Preserve original case from first occurrence
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Simple YAML frontmatter parser (between --- markers)
 * Handles basic key: value pairs, no nested structures
 *
 * @param yaml - YAML content between --- markers
 * @returns Object with parsed key-value pairs
 */
function parseFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!yaml || typeof yaml !== 'string') {
    return result;
  }

  const lines = yaml.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Match key: value pattern
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    if (!key) {
      continue;
    }

    // Handle YAML array syntax [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      result[key] = arrayContent
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    // Handle quoted strings
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      result[key] = value.slice(1, -1);
    }
    // Plain value
    else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parse tags from frontmatter value
 * Handles YAML array [a, b] or comma-separated string
 *
 * @param value - Tags value from frontmatter
 * @returns Array of tag strings
 */
function parseTags(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(v => v.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  return [];
}

/**
 * Derive a display name from file path
 *
 * @param filePath - File path like "/path/to/my-prompt.prompty"
 * @returns Display name like "my-prompt"
 */
function deriveNameFromPath(filePath?: string): string {
  if (!filePath) {
    return 'Untitled Prompt';
  }

  // Extract filename without extension
  const parts = filePath.split('/');
  const filename = parts[parts.length - 1] || '';
  const nameWithoutExt = filename.replace(/\.prompty$/i, '');

  // Convert kebab-case or snake_case to Title Case
  return nameWithoutExt
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate if content looks like a valid .prompty file
 *
 * @param content - Raw file content
 * @returns True if content appears to be valid .prompty format
 */
export function isValidPromptyFormat(content: string): boolean {
  // Must have content
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Either has frontmatter or template content
  const hasFrontmatter = content.trim().startsWith('---');
  const hasContent = content.trim().length > 0;

  return hasFrontmatter || hasContent;
}
