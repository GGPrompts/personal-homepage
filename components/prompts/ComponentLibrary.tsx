"use client"

import * as React from "react"
import {
  Search,
  X,
  Library,
  FileCode,
  Tag,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ComponentCard } from "./ComponentCard"
import type { SavedComponent } from "@/lib/prompts-playground"
import { formatDate } from "@/lib/prompts-playground"

interface ComponentLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  components: SavedComponent[]
  onDelete: (id: string) => void
  onRerunPrompt: (component: SavedComponent) => void
}

export function ComponentLibrary({
  open,
  onOpenChange,
  components,
  onDelete,
  onRerunPrompt,
}: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [previewComponent, setPreviewComponent] = React.useState<SavedComponent | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Get all unique tags
  const allTags = React.useMemo(() => {
    const tags = new Set<string>()
    components.forEach((c) => c.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [components])

  // Filter components
  const filteredComponents = React.useMemo(() => {
    return components.filter((c) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = c.name.toLowerCase().includes(query)
        const matchesPrompt = c.prompt?.toLowerCase().includes(query)
        const matchesTags = c.tags.some((t) => t.toLowerCase().includes(query))
        if (!matchesName && !matchesPrompt && !matchesTags) {
          return false
        }
      }

      // Tag filter
      if (selectedTag && !c.tags.includes(selectedTag)) {
        return false
      }

      return true
    })
  }, [components, searchQuery, selectedTag])

  const copyFilesToClipboard = async (component: SavedComponent) => {
    if (component.files.length === 0) {
      await navigator.clipboard.writeText(component.prompt || "")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return
    }

    const content = component.files
      .map((f) => `// ${f.path}\n${f.content}`)
      .join("\n\n// ─────────────────────────────────────────\n\n")

    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border/20">
          <SheetTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Component Library
          </SheetTitle>
          <SheetDescription>
            {components.length} saved component{components.length !== 1 && "s"}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 border-b border-border/20 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <TooltipProvider>
            {filteredComponents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {components.length === 0 ? (
                  <>
                    <Library className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No saved components yet</p>
                    <p className="text-sm mt-1">
                      Click the save button on a panel to add components
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No components match your search</p>
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 grid gap-4 md:grid-cols-2">
                {filteredComponents.map((component) => (
                  <ComponentCard
                    key={component.id}
                    component={component}
                    onPreview={() => setPreviewComponent(component)}
                    onCopyFiles={() => copyFilesToClipboard(component)}
                    onRerunPrompt={() => onRerunPrompt(component)}
                    onDelete={() => onDelete(component.id)}
                  />
                ))}
              </div>
            )}
          </TooltipProvider>
        </ScrollArea>

        {/* Preview Dialog */}
        <Dialog
          open={previewComponent !== null}
          onOpenChange={(open) => !open && setPreviewComponent(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{previewComponent?.name}</DialogTitle>
              <DialogDescription>
                Created {previewComponent && formatDate(previewComponent.createdAt)}
                {previewComponent?.panelLabel && ` | ${previewComponent.panelLabel}`}
              </DialogDescription>
            </DialogHeader>

            {previewComponent && (
              <Tabs defaultValue="prompt" className="flex-1 overflow-hidden flex flex-col">
                <TabsList>
                  <TabsTrigger value="prompt">Prompt</TabsTrigger>
                  <TabsTrigger value="files">
                    Files ({previewComponent.files.length})
                  </TabsTrigger>
                  {previewComponent.notes && (
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="prompt" className="flex-1 overflow-auto mt-4">
                  <div className="space-y-4">
                    {/* Agent Config */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {previewComponent.agentConfig.cli}
                      </Badge>
                      {previewComponent.agentConfig.model && (
                        <Badge variant="secondary">
                          {previewComponent.agentConfig.model}
                        </Badge>
                      )}
                      {previewComponent.agentConfig.agent && (
                        <Badge variant="secondary">
                          + {previewComponent.agentConfig.agent}
                        </Badge>
                      )}
                    </div>

                    {/* Prompt */}
                    <div className="relative">
                      <Textarea
                        value={previewComponent.prompt}
                        readOnly
                        className="h-48 font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(previewComponent.prompt)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 mr-1" />
                        )}
                        Copy
                      </Button>
                    </div>

                    {/* Tags */}
                    {previewComponent.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {previewComponent.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="flex-1 overflow-auto mt-4">
                  {previewComponent.files.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No files saved with this component
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {previewComponent.files.map((file, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{file.path}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {file.language}
                            </Badge>
                          </div>
                          <pre className="bg-background/50 border border-border/20 rounded-lg p-4 overflow-x-auto text-sm">
                            <code>{file.content}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {previewComponent.notes && (
                  <TabsContent value="notes" className="flex-1 overflow-auto mt-4">
                    <div className="bg-background/50 border border-border/20 rounded-lg p-4">
                      <p className="whitespace-pre-wrap">{previewComponent.notes}</p>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}
