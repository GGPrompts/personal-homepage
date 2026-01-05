# Tasks

Quick todo list with GitHub-synced quick notes.

## Files
- `app/sections/tasks.tsx` - Main component

## Features
- Local todo list (localStorage)
- Add/complete/delete tasks
- Task reordering
- Quick notes tab (GitHub sync):
  - Project-scoped notes
  - General/personal categories
  - Create/edit/delete notes
- Tab switching (Tasks / Notes)

## Integration
- **Tasks**: localStorage only (`quick-tasks`)
- **Notes**: GitHub repository sync (requires auth)

## TabzChrome Selectors
- `data-tabz-section="tasks"` - Container
- `data-tabz-input="new-task"` - Task input
- `data-tabz-action="add-task"` - Add button
- `data-tabz-action="toggle-task"` - Complete/uncomplete
- `data-tabz-action="delete-task"` - Remove task
- `data-tabz-action="reorder-task"` - Move up/down
- `data-tabz-action="switch-tab"` - Tasks/Notes toggle
- `data-tabz-list="tasks"` - Task list
- `data-tabz-item="task"` - Individual task
- `data-tabz-list="notes"` - Quick notes list

## State
- Tasks in localStorage
- Notes in GitHub repo (configurable)
