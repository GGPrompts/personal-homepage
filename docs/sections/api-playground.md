# API Playground

HTTP request builder for testing APIs.

## Files
- `app/sections/api-playground.tsx` - Main component
- `components/JsonViewer.tsx` - JSON response viewer

## Features
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- Query parameters builder
- Custom headers
- Body types: JSON, form-urlencoded, raw
- Auth types: None, Bearer, Basic, API Key
- Response viewer with syntax highlighting
- Request history with starring
- Save/load request collections
- Folder organization for saved requests

## TabzChrome Selectors
- `data-tabz-section="api-playground"` - Container
- `data-tabz-input="request-url"` - URL input
- `data-tabz-action="send-request"` - Send button
- `data-tabz-action="add-param"` - Add query param
- `data-tabz-action="add-header"` - Add header
- `data-tabz-action="save-request"` - Save to collection
- `data-tabz-region="response"` - Response panel
- `data-tabz-list="history"` - Request history

## State
- localStorage for history and saved requests
