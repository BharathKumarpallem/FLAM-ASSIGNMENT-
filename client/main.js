document.addEventListener('DOMContentLoaded', () => {
    const ws = new WebSocketClient();
    const dm = new DrawingManager('main-canvas', ws);

    const userList = document.getElementById('user-list');
    const cursorsContainer = document.getElementById('cursors-container');
    const brushBtn = document.getElementById('brush-tool');
    const eraserBtn = document.getElementById('eraser-tool');
    const sizeInput = document.getElementById('stroke-width');
    const sizePreview = document.getElementById('size-preview');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const customColor = document.getElementById('custom-color');
    const swatches = document.querySelectorAll('.color-swatch');

    const users = new Map();

    ws.onInit = (data) => {
        dm.setHistory(data.history);
        data.users.forEach(u => addUserUI(u));
    };

    ws.onUserJoined = (user) => {
        addUserUI(user);
    };

    ws.onUserLeft = (userId) => {
        removeUserUI(userId);
    };

    ws.onCursorUpdate = (data) => {
        updateCursorUI(data);
    };

    ws.onStrokeAdded = (stroke) => {
        dm.history.push(stroke);
        dm.needsHistoryRedraw = true;
        dm.removeRemoteStroke(stroke.userId);
    };

    ws.onHistoryUpdate = (history) => {
        dm.setHistory(history);
    };

    ws.onRemoteDrawStart = (data) => {
        dm.addRemoteStrokeStart(data.userId, data);
    };

    ws.onRemoteDrawContinue = (data) => {
        dm.addRemoteStrokeContinue(data.userId, { x: data.x, y: data.y });
    };

    function addUserUI(user) {
        users.set(user.id, user);

        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.id = `user-${user.id}`;
        avatar.style.backgroundColor = user.color;
        avatar.innerText = user.id.substr(0, 2).toUpperCase();
        userList.appendChild(avatar);

        if (user.id !== ws.userId) {
            const cursor = document.createElement('div');
            cursor.className = 'remote-cursor';
            cursor.id = `cursor-${user.id}`;
            cursor.innerHTML = `
                <div class="cursor-dot" style="background-color: ${user.color}"></div>
                <div class="cursor-label">${user.id.substr(0, 5)}</div>
            `;
            cursorsContainer.appendChild(cursor);
        }
    }

    function removeUserUI(userId) {
        users.delete(userId);
        const avatar = document.getElementById(`user-${userId}`);
        if (avatar) avatar.remove();
        const cursor = document.getElementById(`cursor-${userId}`);
        if (cursor) cursor.remove();
        dm.removeRemoteStroke(userId);
    }

    function updateCursorUI(data) {
        const cursor = document.getElementById(`cursor-${data.userId}`);
        if (cursor) {
            cursor.style.left = `${data.x}px`;
            cursor.style.top = `${data.y}px`;
        }
    }

    brushBtn.onclick = () => {
        dm.tool = 'brush';
        brushBtn.classList.add('active');
        eraserBtn.classList.remove('active');
    };

    eraserBtn.onclick = () => {
        dm.tool = 'eraser';
        eraserBtn.classList.add('active');
        brushBtn.classList.remove('active');
    };

    sizeInput.oninput = (e) => {
        const val = e.target.value;
        dm.width = parseInt(val);
        sizePreview.innerText = `${val}px`;
    };

    undoBtn.onclick = () => ws.emit('undo');
    redoBtn.onclick = () => ws.emit('redo');

    swatches.forEach(sw => {
        sw.onclick = () => {
            const color = sw.dataset.color;
            dm.color = color;
            document.querySelector('.color-swatch.active').classList.remove('active');
            sw.classList.add('active');
            customColor.value = color;
        };
    });

    customColor.oninput = (e) => {
        dm.color = e.target.value;
        document.querySelector('.color-swatch.active')?.classList.remove('active');
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') ws.emit('undo');
        if (e.ctrlKey && e.key === 'y') ws.emit('redo');
    });
});
