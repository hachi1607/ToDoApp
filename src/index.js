const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

// Constants
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials_example.json');
const DRIVE_FILE_NAME = 'koci_planer_todos.json';

// Google Drive Configuration
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// App State
let mainWindow;
let isAuthenticating = false;
let todoData = [];

/**
 * Google Drive API Functions
 */

async function downloadTodoFile(fileId) {
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  try {
    const response = await drive.files.get({
      fileId,
      alt: 'media'
    });
    return response.data;
  } catch (err) {
    console.error('Error downloading file:', err);
    throw err;
  }
}

async function listDriveFiles() {
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  try {
    const res = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, shared)',
      q: "name=",DRIVE_FILE_NAME, //Here input your file name on your drive which will be used to save the todos
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });
    return res.data.files;
  } catch (err) {
    console.error('Error listing files:', err);
    throw err;
  }
}

async function saveTodoFile(content) {
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  
  try {
    const files = await listDriveFiles();
    const todoFile = files.find(file => file.name === DRIVE_FILE_NAME);

    const fileMetadata = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json'
    };

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(content)
    };

    if (todoFile) {
      await drive.files.update({
        fileId: todoFile.id,
        media,
        supportsAllDrives: true
      });
      console.log('File updated successfully');
      return { success: true };
    } else {
      await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id'
      });
      console.log('New file created successfully');
      return { success: true };
    }
  } catch (err) {
    console.error('Error while saving file:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Authentication Functions
 */

function authorize() {
  if (isAuthenticating) return;
  isAuthenticating = true;

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  const authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  authWindow.loadURL(authUrl);

  const handleRedirect = async (event, url) => {
    const queryParams = new URL(url).searchParams;
    const code = queryParams.get('code');
    
    if (code) {
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        isAuthenticating = false;
        
        oAuth2Client.setCredentials(tokens);
        oAuth2Client.on('tokens', (newToken) => {
          if (newToken.refresh_token) {
            tokens.refresh_token = newToken.refresh_token;
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          }
        });

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        authWindow.close();

        mainWindow.webContents.send('authentication-status', true);
        mainWindow.webContents.send('notification', 'Logged in to Google Drive successfully!');

        // Load todos after authentication
        const files = await listDriveFiles();
        const todoFile = files.find(file => file.name === DRIVE_FILE_NAME);

        if (todoFile) {
          todoData = await downloadTodoFile(todoFile.id);
          mainWindow.webContents.send('notification', 'Loaded todos from Google Drive');
          mainWindow.webContents.send('load-drive-todos', todoData);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        mainWindow.webContents.send('notification', `Authentication not successful: ${err.message}`);
        isAuthenticating = false;
      }
    }
  };

  authWindow.webContents.on('will-redirect', handleRedirect);
  authWindow.on('closed', () => { isAuthenticating = false; });
}

/**
 * Window Management
 */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 850,
    frame: false,
    maximizable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'start_page.html'));
  // mainWindow.webContents.openDevTools();
}

/**
 * IPC Handlers
 */

function setupIpcHandlers() {
  ipcMain.on('minimize-window', () => mainWindow.minimize());
  ipcMain.on('close-window', () => mainWindow.close());
  ipcMain.on('navigate-to-planner', () => {
    mainWindow.loadFile(path.join(__dirname, 'planner_page.html'));
  });
  ipcMain.on('login', authorize);
  
  ipcMain.on('save-drive-todos', async (event, todos) => {
    try {
      const result = await saveTodoFile(todos);
      mainWindow.webContents.send('save-status', result);
    } catch (err) {
      mainWindow.webContents.send('save-status', { 
        success: false,
        error: err.message 
      });
    }
  });

  ipcMain.on('load-drive-todos', async () => {
    try {
      const files = await listDriveFiles();
      const todoFile = files.find(file => file.name === 'koci_planer_todos.json');
      
      if (todoFile) {
        todoData = await downloadTodoFile(todoFile.id);
        mainWindow.webContents.send('load-drive-todos', todoData);
      }
    } catch (err) {
      console.error('Error while displaying to-do list:', err);
    }
  });
}

/**
 * App Lifecycle
 */

app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle squirrel events for Windows installer
if (require('electron-squirrel-startup')) {
  app.quit();
}