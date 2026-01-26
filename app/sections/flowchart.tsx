"use client"

import React from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { FlowEditor } from '@/app/components/flowchart/components/FlowEditor'
import { useTabzConnection } from '@/app/components/flowchart/hooks/useTabzConnection'
import '@/app/components/flowchart/flowchart.css'
import '@xyflow/react/dist/style.css'

interface FlowchartSectionProps {
  activeSubItem?: string | null
  onSubItemHandled?: () => void
}

export default function FlowchartSection({
  activeSubItem,
  onSubItemHandled,
}: FlowchartSectionProps) {
  const { connected, queue, spawn } = useTabzConnection()

  React.useEffect(() => {
    if (activeSubItem) onSubItemHandled?.()
  }, [activeSubItem, onSubItemHandled])

  return (
    <div className="h-full flowchart-section" data-tabz-section="flowchart">
      <ReactFlowProvider>
        <FlowEditor
          tabzConnected={connected}
          tabzQueue={queue}
          tabzSpawn={spawn}
        />
      </ReactFlowProvider>
    </div>
  )
}
