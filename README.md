[ToDoApp_README.md](https://github.com/user-attachments/files/28236925/ToDoApp_README.md)
# Shared Planner with Google Drive Sync

A desktop to-do application built with Electron, featuring Google Drive synchronization so your task list is always available across devices.

## Features

- Add, check off, and delete tasks
- Save and load the task list to/from Google Drive (stored as JSON)
- Google OAuth 2.0 authentication with token persistence
- Toast notifications for user feedback
- Frameless window with custom minimize/close controls

## Tech Stack

| | Technology |
|---|---|
| Runtime | Electron |
| Language | JavaScript |
| External API | Google Drive API v3 |
| Auth | Google OAuth 2.0 |

## Getting Started

### Prerequisites

- Node.js
- A Google Cloud project with the Drive API enabled and OAuth 2.0 credentials configured

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Add your Google OAuth credentials file as `src/credentials_example.json`:

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob"]
  }
}
```

3. Run the app:

```bash
npm start
```

### First run

On first launch click **Login** to authenticate with your Google account. The app will open a browser window for OAuth consent. After approval the token is saved locally — you won't need to log in again on the same machine.

## How it works

- Tasks are stored locally in `localStorage` during the session.
- **Save** uploads the current task list as a JSON file (`koci_planer_todos.json`) to your Google Drive.
- **Load** downloads the file from Drive and restores the task list.
- The main process handles all Drive API calls via IPC — the renderer never talks to Google directly.
