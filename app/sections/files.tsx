'use client'

import React, { useState } from 'react'
import { FolderOpen, Plug, FileCode } from 'lucide-react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FilesProvider } from '@/app/contexts/FilesContext'
import { FileTree } from '@/app/components/files/FileTree'
import { FileViewer } from '@/app/components/files/FileViewer'
import { PluginList } from '@/app/components/files/PluginList'
import { useWorkingDirectory } from '@/hooks/useWorkingDirectory'

interface FilesSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

function FilesSectionContent({ activeSubItem, onSubItemHandled }: FilesSectionProps) {
  const { workingDir } = useWorkingDirectory()
  const [activeTab, setActiveTab] = useState<string>('files')

  return (
    <div className="h-full flex flex-col p-6" data-tabz-section="files">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold font-mono gradient-text-theme terminal-glow flex items-center gap-2">
          <FolderOpen className="h-6 w-6" />
          Files
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse files and manage Claude Code plugins
        </p>
      </div>

      {/* Main content with resizable panels */}
      <div className="flex-1 min-h-0 glass-dark rounded-lg border border-border overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Left sidebar - File Tree */}
          <ResizablePanel
            defaultSize={25}
            minSize={15}
            maxSize={40}
            className="border-r border-border/50"
          >
            <FileTree
              basePath={workingDir || '~'}
              maxDepth={5}
              showHidden={false}
              className="h-full"
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors" />

          {/* Main area - Tabs for Files and Plugins */}
          <ResizablePanel defaultSize={75} minSize={40}>
            <div className="h-full flex flex-col">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="h-full flex flex-col"
              >
                {/* Tab list */}
                <div className="px-4 pt-3 pb-0 border-b border-border/50 bg-background/30">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger
                      value="files"
                      className="data-[state=active]:bg-primary/20 gap-1.5"
                      data-tabz-action="tab-files"
                    >
                      <FileCode className="h-4 w-4" />
                      Files
                    </TabsTrigger>
                    <TabsTrigger
                      value="plugins"
                      className="data-[state=active]:bg-primary/20 gap-1.5"
                      data-tabz-action="tab-plugins"
                    >
                      <Plug className="h-4 w-4" />
                      Plugins
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab content */}
                <TabsContent value="files" className="flex-1 mt-0 overflow-hidden">
                  <div className="h-full p-2">
                    <FileViewer />
                  </div>
                </TabsContent>

                <TabsContent value="plugins" className="flex-1 mt-0 overflow-hidden">
                  <div className="h-full p-2">
                    <PluginList />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export default function FilesSection(props: FilesSectionProps) {
  return (
    <FilesProvider>
      <FilesSectionContent {...props} />
    </FilesProvider>
  )
}
