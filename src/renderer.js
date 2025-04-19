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
    const saveButton = document.getElementById('save-btn');

    // Window control buttons
    minimizeButton?.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    closeButton?.addEventListener('click', () => {
        window.electronAPI.closeWindow();
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
            showToast('Nie jesteś zalogowany!');
            return;
        }
        window.electronAPI.navigateToPlanner();
    });

    // Login button
    loginButton?.addEventListener('click', () => {
        window.electronAPI.login();
    });

    // Load from Drive button
    loadButton?.addEventListener('click', () => {
        window.electronAPI.loadDriveTodos();
    });

    // Save to Drive button
    saveButton?.addEventListener('click', () => {
        saveDriveTodos();
    });

    // Setup event listeners
    window.electronAPI.onSaveStatus((event, data) => {
        console.log('Received save-status:', data);
        if (data.success) {
            showToast('Zapisano do Google Drive pomyślnie!');
        } else {
            showToast(`Błąd podczas zapisywania: ${data.error}`);
        }
    });

    window.electronAPI.onNotification((event, message) => {
        showToast(message);
    });

    window.electronAPI.onAuthenticationStatus((event, status) => {
        isAuthenticated = status;
    });

    window.electronAPI.onLoadDriveTodos((event, todos) => {
        localStorage.setItem('todos', JSON.stringify(todos));
        loadTodos();
        showToast('Wczytano listę z Google Drive!');
    });

    // Load todos if on planner page
    if (window.location.pathname.endsWith('planner_page.html')) {
        loadTodos();
    }
});

// Cleanup event listeners when page unloads
window.addEventListener('beforeunload', () => {
    window.electronAPI.removeSaveStatusListener();
    window.electronAPI.removeNotificationListener();
    window.electronAPI.removeAuthenticationStatusListener();
    window.electronAPI.removeLoadDriveTodosListener();
});

// Task management functions
function addTask() {
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
    checkbox.addEventListener('change', saveTodos);
    
    const customCheckbox = document.createElement('label');
    customCheckbox.className = 'custom-checkbox';
    customCheckbox.htmlFor = checkbox.id;

    const todoText = document.createElement('label');
    todoText.className = 'todo-text';
    todoText.htmlFor = checkbox.id;
    todoText.textContent = inputBox.value;

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '&#215;';
    deleteButton.onclick = function () {
        listContainer.removeChild(listItem);
        saveTodos();
    };

    listItem.appendChild(checkbox);
    listItem.appendChild(customCheckbox);
    listItem.appendChild(todoText);
    listItem.appendChild(deleteButton);

    listContainer.appendChild(listItem);
    inputBox.value = '';
    saveTodos();
}

function saveDriveTodos() {
    showToast('Zapisywanie listy do Google Drive...');
    const listContainer = document.getElementById('list-container');
    if (!listContainer) return;

    const todos = [];
    listContainer.querySelectorAll('li').forEach(item => {
        const text = item.querySelector('.todo-text').textContent;
        const isChecked = item.querySelector('input[type="checkbox"]').checked;
        const id = item.querySelector('input[type="checkbox"]').id;
        todos.push({ text, isChecked, id });
    });
    
    window.electronAPI.saveDriveTodos(todos);
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
            saveTodos();
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