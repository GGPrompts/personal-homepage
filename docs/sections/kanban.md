# Kanban

Project kanban board with workspace filtering.

## Files
- `app/sections/kanban.tsx` - Main component
- `app/components/kanban/board/KanbanBoard.tsx` - Board component
- `app/components/kanban/` - Kanban components

## Features
- Drag-drop columns and cards
- Workspace path filtering
- Column customization
- Card details (title, description)
- Workspace history (recent paths)
- Global working directory integration

## Workspace
- Set workspace path to filter cards
- Falls back to global working directory
- History of recent workspaces

## TabzChrome Selectors
- `data-tabz-section="kanban"` - Container
- `data-tabz-input="workspace"` - Workspace path input
- `data-tabz-action="set-workspace"` - Apply workspace
- `data-tabz-action="clear-workspace"` - Clear filter
- `data-tabz-action="add-card"` - Create card
- `data-tabz-action="move-card"` - Drag to column
- `data-tabz-list="columns"` - Column container
- `data-tabz-item="column"` - Individual column
- `data-tabz-item="card"` - Kanban card

## State
- Workspace in localStorage (`kanban-workspace`)
- History in localStorage (`kanban-workspace-history`)
- Board data in localStorage
