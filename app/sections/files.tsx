'use client'

import React, { useState } from 'react'
import { FolderOpen, Plug, FileCode } from 'lucide-react'
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
    <div className="min-h-full lg:h-full flex flex-col lg:flex-row gap-4 p-6" data-tabz-section="files">
      {/* Left sidebar - File Tree */}
      <div className="lg:w-80 flex-shrink-0 lg:h-full">
        <div className="glass-dark rounded-lg border border-border h-full flex flex-col overflow-hidden">
          <FileTree
            basePath={workingDir || '~'}
            maxDepth={5}
            showHidden={false}
            className="h-full"
          />
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="glass-dark rounded-lg border border-border h-full flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            {/* Tab list */}
            <div className="px-4 pt-3 pb-0 border-b border-border/50 bg-background/30 flex-shrink-0">
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
