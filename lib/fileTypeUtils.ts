// File type detection utilities for syntax highlighting

export type FileType = "markdown" | "code" | "text" | "json" | "image" | "video" | "csv"

export interface FileTypeInfo {
  type: FileType
  language?: string
}

// Code language mapping (extension -> react-syntax-highlighter language)
const codeExtensions: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  php: "php",
  go: "go",
  rs: "rust",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  r: "r",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  ps1: "powershell",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "html",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  conf: "ini",
  dockerfile: "dockerfile",
  makefile: "makefile",
  cmake: "cmake",
  vue: "javascript",
  lua: "lua",
  perl: "perl",
  elm: "elm",
  clj: "clojure",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hs: "haskell",
  ml: "ocaml",
  fs: "fsharp",
  dart: "dart",
  graphql: "graphql",
  gql: "graphql",
  vim: "vim",
  tex: "latex",
  diff: "diff",
  patch: "diff",
}

// Detect file type and language from file path
export const getFileTypeAndLanguage = (filePath: string): FileTypeInfo => {
  const fileName = filePath.split("/").pop() || ""
  const ext = fileName.split(".").pop()?.toLowerCase() || ""

  // Handle special filenames (Dockerfile, Makefile, etc.)
  const lowerName = fileName.toLowerCase()
  if (lowerName === "dockerfile") {
    return { type: "code", language: "dockerfile" }
  }
  if (lowerName === "makefile" || lowerName === "gnumakefile") {
    return { type: "code", language: "makefile" }
  }

  // Markdown files
  if (["md", "markdown"].includes(ext)) {
    return { type: "markdown", language: "markdown" }
  }

  // JSON files
  if (ext === "json") {
    return { type: "json", language: "json" }
  }

  // Image files (handled separately in Files.tsx)
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"].includes(ext)) {
    return { type: "image" }
  }

  // Video files
  if (["mp4", "webm", "ogg", "ogv", "mov", "avi", "mkv", "m4v"].includes(ext)) {
    return { type: "video" }
  }

  // CSV files
  if (ext === "csv") {
    return { type: "csv" }
  }

  // Code files with syntax highlighting
  if (codeExtensions[ext]) {
    return { type: "code", language: codeExtensions[ext] }
  }

  // Default to plain text
  return { type: "text" }
}
