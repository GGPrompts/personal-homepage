"use client";

import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";
import { Folder, FolderOpen, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FolderNodeData } from "./types";

// ---------------------------------------------------------------------------
// Favicon helper (mirrors bookmarks.tsx FaviconWithFallback)
// ---------------------------------------------------------------------------

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function MiniFavicon({ url, className }: { url: string; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <Globe className={className} />;
  }

  return (
    <img
      src={getFaviconUrl(url)}
      alt=""
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

// ---------------------------------------------------------------------------
// FolderNode — collapsible container for bookmarks on the desktop canvas
// ---------------------------------------------------------------------------

function FolderNodeComponent({
  data,
  selected,
}: NodeProps & { data: FolderNodeData }) {
  const { folder, bookmarks, collapsed, isDropTarget } = data;

  const showResizer = selected && !collapsed;

  const dropTargetClasses = isDropTarget
    ? "border-primary/60 bg-primary/10"
    : "border-border/40";

  // -- Collapsed view (~160x60) ---------------------------------------------
  if (collapsed) {
    return (
      <div
        className={`glass border rounded-lg px-3 py-2 flex items-center gap-2 select-none ${dropTargetClasses}`}
        style={{ width: 160, height: 60 }}
      >
        <span className="shrink-0 text-base">
          {folder.icon ? (
            <span>{folder.icon}</span>
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
        <span className="text-sm font-medium truncate flex-1">
          {folder.name}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {bookmarks.length}
        </Badge>
      </div>
    );
  }

  // -- Expanded view (~240x auto) -------------------------------------------
  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={showResizer}
        lineClassName="!border-primary/30"
        handleClassName="!h-2.5 !w-2.5 !border-primary/50 !bg-background"
      />
      <div
        className={`glass border rounded-lg flex flex-col select-none ${dropTargetClasses}`}
        style={{ width: "100%", height: "100%", minWidth: 200, minHeight: 120 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <span className="shrink-0 text-base">
            {folder.icon ? (
              <span>{folder.icon}</span>
            ) : (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
          <span className="text-sm font-medium truncate flex-1">
            {folder.name}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {bookmarks.length}
          </Badge>
          <span className="text-[10px] text-muted-foreground">&#9660;</span>
        </div>

        {/* Body — mini grid of bookmark favicons */}
        <div className="flex-1 overflow-y-auto max-h-[300px] p-2">
          {bookmarks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Empty folder
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-muted/40 transition-colors"
                >
                  <MiniFavicon
                    url={bm.url}
                    className="h-8 w-8 rounded object-contain"
                  />
                  <span className="text-[9px] text-muted-foreground leading-tight text-center truncate w-full">
                    {bm.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const FolderNode = memo(FolderNodeComponent);
