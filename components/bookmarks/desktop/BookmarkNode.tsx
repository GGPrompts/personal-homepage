"use client";

import React, { memo, useCallback, useState } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { Terminal, MessageSquare, ClipboardPaste, Globe } from "lucide-react";
import type { BookmarkNodeData } from "./types";

// ---------------------------------------------------------------------------
// Favicon helpers (mirrored from bookmarks.tsx to avoid coupling)
// ---------------------------------------------------------------------------

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function FaviconWithFallback({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
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
// Terminal icon picker
// ---------------------------------------------------------------------------

function TerminalIcon({ bookmark }: { bookmark: BookmarkNodeData["bookmark"] }) {
  if (bookmark.sendToChat) {
    return <MessageSquare className="h-6 w-6 text-emerald-400" />;
  }
  if (bookmark.autoExecute === false) {
    return <ClipboardPaste className="h-6 w-6 text-emerald-400" />;
  }
  return <Terminal className="h-6 w-6 text-emerald-400" />;
}

// ---------------------------------------------------------------------------
// BookmarkNode — desktop-shortcut style React Flow node
// ---------------------------------------------------------------------------

function BookmarkNodeComponent({
  data,
  selected,
}: NodeProps<Node<BookmarkNodeData>>) {
  const { bookmark, isTerminal } = data;

  const handleDoubleClick = useCallback(() => {
    if (!isTerminal && bookmark.url) {
      window.open(bookmark.url, "_blank");
    }
    // Terminal spawning is handled at the canvas level
  }, [isTerminal, bookmark.url]);

  return (
    <div
      className={`flex flex-col items-center justify-start w-[80px] h-[90px] cursor-pointer select-none ${
        selected ? "ring-2 ring-primary/50 rounded-lg" : ""
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Icon area */}
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-lg ${
          isTerminal
            ? "bg-emerald-500/20 border border-emerald-500/30"
            : "bg-white/15"
        }`}
      >
        {isTerminal ? (
          <TerminalIcon bookmark={bookmark} />
        ) : (
          <FaviconWithFallback url={bookmark.url} className="h-6 w-6" />
        )}
      </div>

      {/* Title */}
      <span className="text-xs text-center max-w-[80px] line-clamp-2 mt-1 leading-tight">
        {bookmark.name}
      </span>
    </div>
  );
}

export const BookmarkNode = memo(BookmarkNodeComponent);
