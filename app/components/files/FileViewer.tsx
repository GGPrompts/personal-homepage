'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { X, Pin, FileCode, FileText, Image, Video, FileJson, Table2, Eye, ZoomIn, ZoomOut, RotateCcw, Download, Loader2, Volume2, VolumeX, Square, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useFilesContext, OpenFile } from '@/app/contexts/FilesContext'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { FileType } from '@/lib/fileTypeUtils'
import { PromptyViewer } from './PromptyViewer'

// File type icons
const FILE_TYPE_ICONS: Record<FileType, typeof FileCode> = {
  code: FileCode,
  markdown: FileText,
  text: FileText,
  json: FileJson,
  image: Image,
  video: Video,
  csv: Table2,
  prompty: Sparkles,
}

// File type badge colors
const FILE_TYPE_COLORS: Record<FileType, string> = {
  code: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  markdown: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  text: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  json: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  image: 'bg-green-500/20 text-green-400 border-green-500/30',
  video: 'bg-red-500/20 text-red-400 border-red-500/30',
  csv: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  prompty: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

// ============================================================================
// File Tab Component
// ============================================================================

interface FileTabProps {
  file: OpenFile
  isActive: boolean
  onSelect: () => void
  onClose: () => void
  onPin: () => void
}

function FileTab({ file, isActive, onSelect, onClose, onPin }: FileTabProps) {
  const Icon = FILE_TYPE_ICONS[file.fileType]

  return (
    <div
      className={cn(
        'group relative flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer',
        'border-r border-border transition-colors',
        isActive
          ? 'bg-background text-foreground'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
        !file.pinned && 'italic'
      )}
      onClick={onSelect}
      onDoubleClick={onPin}
      title={file.pinned ? file.path : `${file.path} (preview - double-click to pin)`}
      data-tabz-item="file-tab"
      data-tabz-file={file.path}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="max-w-[120px] truncate">{file.name}</span>
      {file.pinned && (
        <Pin className="h-3 w-3 text-cyan-500 flex-shrink-0" />
      )}
      <button
        className={cn(
          'ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isActive && 'opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        data-tabz-action="close-file-tab"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ============================================================================
// Code Viewer Component
// ============================================================================

interface CodeViewerProps {
  content: string
  language?: string
  lineCount?: number
  fontSize?: number
  fontFamily?: string
}

function CodeViewer({ content, language = 'text', lineCount, fontSize = 16, fontFamily = 'JetBrains Mono' }: CodeViewerProps) {
  // Build font-family CSS value
  const fontFamilyValue = fontFamily === 'monospace'
    ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    : `"${fontFamily}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

  // Custom style to match glass-dark aesthetic
  const customStyle = useMemo(() => ({
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: 'transparent',
      margin: 0,
      padding: '1rem',
      fontSize: `${fontSize}px`,
      lineHeight: '1.5',
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: 'transparent',
      fontSize: `${fontSize}px`,
      fontFamily: fontFamilyValue,
    },
  }), [fontSize, fontFamilyValue])

  return (
    <div className="relative h-full" data-tabz-region="code-viewer">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <TTSControls content={content} />
        <Badge variant="outline" className="text-xs font-mono">
          {language}
        </Badge>
        {lineCount !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {lineCount} lines
          </Badge>
        )}
      </div>
      <ScrollArea className="h-full w-full">
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'hsl(var(--muted-foreground))',
            opacity: 0.5,
            userSelect: 'none',
            fontSize: `${fontSize}px`,
          }}
          wrapLines
          customStyle={{
            background: 'transparent',
            margin: 0,
          }}
        >
          {content}
        </SyntaxHighlighter>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Image Viewer Component
// ============================================================================

interface ImageViewerProps {
  dataUri: string
  fileName: string
}

function ImageViewer({ dataUri, fileName }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = dataUri
    link.download = fileName
    link.click()
  }

  return (
    <div className="relative h-full flex flex-col" data-tabz-region="image-viewer">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="outline" className="text-xs font-mono mx-1">
            {Math.round(zoom * 100)}%
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="w-px h-4 bg-border mx-2" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRotate}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Image Display */}
      <ScrollArea className="flex-1">
        <div className="min-h-full flex items-center justify-center p-8 bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUri}
            alt={fileName}
            className="max-w-full transition-transform duration-200 shadow-lg rounded"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// Video Viewer Component
// ============================================================================

interface VideoViewerProps {
  dataUri: string
  fileName: string
}

function VideoViewer({ dataUri, fileName }: VideoViewerProps) {
  return (
    <div className="relative h-full flex flex-col" data-tabz-region="video-viewer">
      <div className="flex-1 flex items-center justify-center p-8 bg-black/50">
        <video
          src={dataUri}
          controls
          className="max-w-full max-h-full rounded shadow-lg"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="px-4 py-2 border-t border-border bg-muted/30 text-center">
        <span className="text-sm text-muted-foreground">{fileName}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Markdown Viewer Component
// ============================================================================

interface MarkdownViewerProps {
  content: string
  fontSize?: number
}

function MarkdownViewer({ content, fontSize = 16 }: MarkdownViewerProps) {
  // Simple markdown rendering with improved styling
  const renderMarkdown = useMemo(() => {
    // Basic markdown transformations with better dark theme colors
    let html = content
      // Headers - cyan accent for visibility
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-cyan-400">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-8 mb-4 text-cyan-300 border-b border-border/50 pb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-cyan-200 border-b border-border pb-2">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-foreground"><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-foreground/90">$1</em>')
      // Code blocks - better contrast
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-900/80 border border-border/50 p-4 rounded-lg overflow-x-auto my-4 font-mono text-sm text-emerald-400"><code>$2</code></pre>')
      // Inline code - cyan tint
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      // Links - bright cyan
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:text-cyan-300 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists
      .replace(/^- (.*$)/gm, '<li class="ml-6 text-foreground/90 list-disc">$1</li>')
      // Ordered lists
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-6 text-foreground/90 list-decimal">$2</li>')
      // Blockquotes - styled nicely
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-cyan-500/50 bg-cyan-500/5 pl-4 pr-4 py-2 my-4 text-foreground/80 italic rounded-r">$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="my-8 border-border/50" />')
      // Paragraphs (wrap remaining text)
      .replace(/^(?!<[hpuolba]|<\/|<li|<hr|<pre|<block)(.*$)/gm, (match, p1) => {
        return p1.trim() ? `<p class="my-3 text-foreground/85 leading-relaxed">${p1}</p>` : ''
      })

    return html
  }, [content])

  return (
    <div className="relative h-full" data-tabz-region="markdown-viewer">
      <div className="absolute top-2 right-2 z-10">
        <TTSControls content={content} />
      </div>
      <ScrollArea className="h-full">
        <div
          className="max-w-none p-6"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.7' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown }}
        />
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// JSON Viewer Component
// ============================================================================

interface JsonViewerProps {
  content: string
  fontSize?: number
  fontFamily?: string
}

function JsonViewer({ content, fontSize, fontFamily }: JsonViewerProps) {
  const formattedJson = useMemo(() => {
    try {
      const parsed = JSON.parse(content)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return content
    }
  }, [content])

  return <CodeViewer content={formattedJson} language="json" fontSize={fontSize} fontFamily={fontFamily} />
}

// ============================================================================
// CSV Viewer Component
// ============================================================================

interface CsvViewerProps {
  content: string
  fontSize?: number
}

function CsvViewer({ content, fontSize = 14 }: CsvViewerProps) {
  const { headers, rows } = useMemo(() => {
    const lines = content.trim().split('\n')
    if (lines.length === 0) return { headers: [], rows: [] }

    // Simple CSV parsing (doesn't handle quoted fields with commas)
    const parseRow = (line: string) => line.split(',').map(cell => cell.trim())

    const headers = parseRow(lines[0])
    const rows = lines.slice(1).map(parseRow)

    return { headers, rows }
  }, [content])

  return (
    <div className="relative h-full" data-tabz-region="csv-viewer">
      <div className="absolute top-2 right-2 z-10">
        <TTSControls content={content} />
      </div>
      <ScrollArea className="h-full">
        <div className="p-4">
          <table className="w-full border-collapse" style={{ fontSize: `${fontSize}px` }}>
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="border border-border bg-cyan-500/10 px-3 py-2 text-left font-semibold text-cyan-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  {row.map((cell, j) => (
                    <td key={j} className="border border-border/50 px-3 py-2 text-foreground/80">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-xs text-muted-foreground">
            {rows.length} rows, {headers.length} columns
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// TTS Controls Component
// ============================================================================

interface TTSControlsProps {
  content: string
  className?: string
}

function TTSControls({ content, className }: TTSControlsProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSpeak = async () => {
    if (isLoading) return

    if (isSpeaking) {
      // Stop speaking - we can't actually stop TTS mid-speech via API
      // but we'll toggle the state to indicate user wants to stop
      setIsSpeaking(false)
      toast.info('TTS cannot be stopped mid-speech')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/tabz/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, priority: 'low' }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 503) {
          toast.error(data.hint || data.error || 'TTS not available')
        } else {
          toast.error(data.error || 'Failed to read aloud')
        }
        return
      }

      if (data.success) {
        setIsSpeaking(true)
        toast.success('Reading aloud...')
        // Auto-reset speaking state after estimated duration
        // Rough estimate: 150 words per minute, 5 chars per word
        const wordCount = content.length / 5
        const durationMs = (wordCount / 150) * 60 * 1000
        setTimeout(() => setIsSpeaking(false), Math.min(durationMs, 60000))
      } else {
        toast.error(data.error || 'Failed to read aloud')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read aloud'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', className)}
            onClick={handleSpeak}
            disabled={isLoading || !content}
            data-tabz-action="read-aloud"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSpeaking ? (
              <VolumeX className="h-4 w-4 text-cyan-400" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isLoading ? 'Starting...' : isSpeaking ? 'Speaking...' : 'Read Aloud'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// File Content Renderer
// ============================================================================

interface FileContentProps {
  file: OpenFile
  fontSize?: number
  fontFamily?: string
}

function FileContent({ file, fontSize, fontFamily }: FileContentProps) {
  if (file.loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading file...</span>
        </div>
      </div>
    )
  }

  if (file.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <X className="h-8 w-8" />
          <span className="text-sm">Error loading file: {file.error}</span>
        </div>
      </div>
    )
  }

  // Image files
  if (file.fileType === 'image' && file.mediaDataUri) {
    return <ImageViewer dataUri={file.mediaDataUri} fileName={file.name} />
  }

  // Video files
  if (file.fileType === 'video' && file.mediaDataUri) {
    return <VideoViewer dataUri={file.mediaDataUri} fileName={file.name} />
  }

  // Text-based files
  if (!file.content) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <span className="text-sm">No content to display</span>
      </div>
    )
  }

  switch (file.fileType) {
    case 'prompty':
      return <PromptyViewer content={file.content} fileName={file.name} fontSize={fontSize} />
    case 'markdown':
      return <MarkdownViewer content={file.content} fontSize={fontSize} />
    case 'json':
      return <JsonViewer content={file.content} fontSize={fontSize} fontFamily={fontFamily} />
    case 'csv':
      return <CsvViewer content={file.content} fontSize={fontSize} />
    case 'code':
    case 'text':
    default:
      // Get language from file extension
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const languageMap: Record<string, string> = {
        js: 'javascript',
        jsx: 'jsx',
        ts: 'typescript',
        tsx: 'tsx',
        py: 'python',
        rb: 'ruby',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        cs: 'csharp',
        php: 'php',
        go: 'go',
        rs: 'rust',
        swift: 'swift',
        kt: 'kotlin',
        scala: 'scala',
        sql: 'sql',
        sh: 'bash',
        bash: 'bash',
        zsh: 'bash',
        css: 'css',
        scss: 'scss',
        sass: 'sass',
        less: 'less',
        html: 'html',
        xml: 'xml',
        yaml: 'yaml',
        yml: 'yaml',
        toml: 'toml',
        ini: 'ini',
        dockerfile: 'dockerfile',
        makefile: 'makefile',
        lua: 'lua',
        perl: 'perl',
        vim: 'vim',
        tex: 'latex',
        diff: 'diff',
        patch: 'diff',
        graphql: 'graphql',
        gql: 'graphql',
      }
      const language = languageMap[ext] || 'text'
      return <CodeViewer content={file.content} language={language} lineCount={file.lineCount} fontSize={fontSize} fontFamily={fontFamily} />
  }
}

// ============================================================================
// Main FileViewer Component
// ============================================================================

export function FileViewer() {
  const { openFiles, activeFileId, setActiveFileId, closeFile, pinFile, viewerSettings } = useFilesContext()

  const activeFile = useMemo(() => {
    return openFiles.find(f => f.id === activeFileId)
  }, [openFiles, activeFileId])

  // Separate pinned and unpinned files for tab ordering
  const { pinnedFiles, previewFile } = useMemo(() => {
    const pinned = openFiles.filter(f => f.pinned)
    const preview = openFiles.find(f => !f.pinned)
    return { pinnedFiles: pinned, previewFile: preview }
  }, [openFiles])

  if (openFiles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground" data-tabz-region="file-viewer-empty">
        <div className="flex flex-col items-center gap-3">
          <FileCode className="h-12 w-12 opacity-50" />
          <span className="text-sm">Select a file to view</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col glass-dark rounded-lg border border-border overflow-hidden" data-tabz-region="file-viewer">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto" data-tabz-list="file-tabs">
        {/* Pinned tabs first */}
        {pinnedFiles.map(file => (
          <FileTab
            key={file.id}
            file={file}
            isActive={file.id === activeFileId}
            onSelect={() => setActiveFileId(file.id)}
            onClose={() => closeFile(file.id)}
            onPin={() => {}} // Already pinned
          />
        ))}
        {/* Preview tab last (if any) */}
        {previewFile && (
          <FileTab
            key={previewFile.id}
            file={previewFile}
            isActive={previewFile.id === activeFileId}
            onSelect={() => setActiveFileId(previewFile.id)}
            onClose={() => closeFile(previewFile.id)}
            onPin={() => pinFile(previewFile.id)}
          />
        )}
        {/* Fill remaining space */}
        <div className="flex-1 min-w-[50px]" />
      </div>

      {/* File Content Area */}
      <div className="flex-1 overflow-hidden bg-background/50">
        {activeFile ? (
          <FileContent file={activeFile} fontSize={viewerSettings.fontSize} fontFamily={viewerSettings.fontFamily} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <span className="text-sm">No file selected</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileViewer
