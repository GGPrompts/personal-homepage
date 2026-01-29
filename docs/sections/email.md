# Email Section

Gmail integration for reading and composing emails directly from the dashboard.

## Features

- **Inbox Management**: View, search, and filter emails from your Gmail inbox
- **Folders**: Navigate between Inbox, Starred, Sent, Drafts, Spam, and Trash
- **Labels**: Filter emails by Gmail labels
- **Compose**: Write and send new emails
- **Reply/Forward**: Reply to or forward existing emails
- **Star/Archive**: Star important emails or archive to remove from inbox
- **Mark Read/Unread**: Manage email read status
- **Attachments**: View attachment information on emails

## Authentication

The Email section uses Google OAuth to connect to Gmail. Users must:

1. Connect their Google account via the Profile/Settings section
2. Grant Gmail access permissions (read, send, modify)

The OAuth flow is handled by:
- `/api/auth/google` - Initiates OAuth flow
- `/api/auth/google/callback` - Handles OAuth callback
- `/api/auth/google/refresh` - Refreshes access tokens

## API Routes

### `/api/gmail/messages`

**GET** - List emails from Gmail

Query parameters:
- `maxResults` - Number of emails to fetch (default: 20)
- `pageToken` - Pagination token for next page
- `labelIds` - Comma-separated label IDs (default: INBOX)
- `q` - Search query

### `/api/gmail/messages/[id]`

**GET** - Get a single email by ID

**PATCH** - Modify email labels (for read status, starring, etc.)
```json
{
  "addLabelIds": ["STARRED"],
  "removeLabelIds": ["UNREAD"]
}
```

**DELETE** - Move email to trash

### `/api/gmail/send`

**POST** - Send an email
```json
{
  "to": "recipient@example.com",
  "cc": "cc@example.com",
  "subject": "Subject line",
  "body": "Plain text body",
  "htmlBody": "<p>HTML body</p>",
  "threadId": "thread-id-for-replies",
  "inReplyTo": "message-id-for-threading"
}
```

### `/api/gmail/labels`

**GET** - Get all labels (folders and user labels)

**POST** - Create a new label
```json
{
  "name": "My Label",
  "color": {
    "backgroundColor": "#ff0000",
    "textColor": "#ffffff"
  }
}
```

## Component Structure

```
app/sections/email.tsx
├── EmailSection (main component)
│   ├── Header with search
│   ├── Folder sidebar
│   ├── Email list with selection
│   ├── Email preview/detail view
│   └── Compose dialog
```

## TabzChrome Integration

The Email section includes data attributes for MCP automation:

- `data-tabz-section="email"` - Section identifier
- `data-tabz-action="compose"` - Compose button
- `data-tabz-action="refresh"` - Refresh button
- `data-tabz-action="reply"` - Reply button
- `data-tabz-action="forward"` - Forward button
- `data-tabz-action="send"` - Send button
- `data-tabz-action="archive"` - Archive button
- `data-tabz-action="delete"` - Delete button
- `data-tabz-input="search"` - Search input
- `data-tabz-input="compose-*"` - Compose form inputs
- `data-tabz-folder="INBOX"` - Folder selection
- `data-tabz-item="[id]"` - Individual email items

## Styling

Uses the project's design system:
- `glass` / `glass-dark` for card backgrounds
- `terminal-glow` for headings
- `border-border` for borders
- Standard shadcn/ui components

## State Management

- Uses TanStack Query for data fetching and caching
- Local component state for UI interactions (selected email, compose data)
- Mutations for modify/delete/send operations with optimistic updates

## Gmail API Reference

The integration uses the Gmail REST API v1:
- [Messages API](https://developers.google.com/gmail/api/reference/rest/v1/users.messages)
- [Labels API](https://developers.google.com/gmail/api/reference/rest/v1/users.labels)
