const { ipcRenderer } = require('electron');

let isAuthenticated = false;
let toastTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    const minimizeButton = document.getElementById('minimize-btn');
    const closeButton = document.getElementById('close-btn');
    const startButton = document.getElementById('start-app');
    const inputBox = document.querySelector('.input-box');
    const listContainer = document.getElementById('list-container');
    const loginButton = document.getElementById('login-btn');
    const loadButton = document.getElementById('load-btn');

    // Window control buttons
    minimizeButton?.addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
    });

    closeButton?.addEventListener('click', () => {
        ipcRenderer.send('close-window');
    });

    // Enter key handler
    inputBox?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    // Start button
    startButton?.addEventListener('click', () => {
        if (!isAuthenticated) {
            showToast('Please log in first by clicking the Login button!');
            return;
        }
        ipcRenderer.send('navigate-to-planner');
    });

    // Login button
    loginButton?.addEventListener('click', () => {
        ipcRenderer.send('login');
    });

    // Load todos if on planner page
    if (window.location.pathname.endsWith('planner_page.html')) {
        loadTodos();
    }
});

// IPC Renderer events
ipcRenderer.on('save-status', (event, data) => {
    console.log('Received save-status:', data);
    if (data.success) {
        showToast('Successfully saved to shared Google Drive file!');
    } else {
        showToast(`Error saving to Drive: ${data.error}`);
    }
});

ipcRenderer.on('notification', (event, message) => {
    showToast(message);
});

ipcRenderer.on('authentication-status', (event, status) => {
    isAuthenticated = status;
});

ipcRenderer.on('load-drive-todos', (event, todos) => {
    localStorage.setItem('todos', JSON.stringify(todos));
    loadTodos();
});

// Task management functions
async function addTask() {
    const inputBox = document.querySelector('.input-box');
    const listContainer = document.getElementById('list-container');
    
    if (!inputBox || !listContainer || inputBox.value.trim() === '') {
        return;
    }

    const listItem = document.createElement('li');
    listItem.className = 'list-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `todo-${Date.now()}`;
    
    const customCheckbox = document.createElement('label');
    customCheckbox.className = 'custom-checkbox';
    customCheckbox.htmlFor = checkbox.id;
    checkbox.addEventListener('change', saveTodos);

    const todoText = document.createElement('label');
    todoText.className = 'todo-text';
    todoText.htmlFor = checkbox.id;
    todoText.textContent = inputBox.value;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '&#215;';
    deleteButton.onclick = function () {
        listContainer.removeChild(listItem);
        // saveTodos();
    };

    listItem.appendChild(checkbox);
    listItem.appendChild(customCheckbox);
    listItem.appendChild(todoText);
    listItem.appendChild(deleteButton);

    listContainer.appendChild(listItem);
    inputBox.value = '';
    // saveTodos();
}

async function addDriveTodos() {
    loadTodos();
    showToast('Loaded last saved todos from Google Drive');
}

async function saveDriveTodos() {
  showToast('Saving to Google Drive...');
    const listContainer = document.getElementById('list-container');
    if (!listContainer) return;

    const todos = [];
    listContainer.querySelectorAll('li').forEach(item => {
        const text = item.querySelector('.todo-text').textContent;
        const isChecked = item.querySelector('input[type="checkbox"]').checked;
        const id = item.querySelector('input[type="checkbox"]').id;
        todos.push({ text, isChecked, id });
    });
    
    ipcRenderer.send('save-drive-todos', todos);
    saveTodos();
}

function saveTodos() {
    const listContainer = document.getElementById('list-container');
    if (!listContainer) return;

    const todos = [];
    listContainer.querySelectorAll('li').forEach(item => {
        const text = item.querySelector('.todo-text').textContent;
        const isChecked = item.querySelector('input[type="checkbox"]').checked;
        const id = item.querySelector('input[type="checkbox"]').id;
        todos.push({ text, isChecked, id });
    });
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const listContainer = document.getElementById('list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const savedTodos = JSON.parse(localStorage.getItem('todos')) || [];
    savedTodos.forEach(todo => {
        const listItem = document.createElement('li');
        listItem.className = 'list-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = todo.id;
        checkbox.checked = todo.isChecked;
        checkbox.addEventListener('change', saveTodos);

        const customCheckbox = document.createElement('label');
        customCheckbox.className = 'custom-checkbox';
        customCheckbox.htmlFor = checkbox.id;

        const todoText = document.createElement('label');
        todoText.className = 'todo-text';
        todoText.htmlFor = checkbox.id;
        todoText.textContent = todo.text;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '&#215;';
        deleteButton.onclick = function () {
            listContainer.removeChild(listItem);
            // saveTodos();
        };

        listItem.appendChild(checkbox);
        listItem.appendChild(customCheckbox);
        listItem.appendChild(todoText);
        listItem.appendChild(deleteButton);

        listContainer.appendChild(listItem);
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    
    toast.textContent = message;
    toast.classList.remove('hidden');

    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
        toastTimeout = null;
    }, 3000);
}