class WebSocketClient {
    constructor() {
        this.socket = io();
        this.userId = null;
        this.userColor = null;

        this.onInit = null;
        this.onUserJoined = null;
        this.onUserLeft = null;
        this.onCursorUpdate = null;
        this.onStrokeAdded = null;
        this.onHistoryUpdate = null;
        this.onRemoteDrawStart = null;
        this.onRemoteDrawContinue = null;

        this.setupListeners();
    }

    setupListeners() {
        this.socket.on('init', (data) => {
            this.userId = data.user.id;
            this.userColor = data.user.color;
            if (this.onInit) this.onInit(data);
        });

        this.socket.on('user-joined', (user) => {
            if (this.onUserJoined) this.onUserJoined(user);
        });

        this.socket.on('user-left', (userId) => {
            if (this.onUserLeft) this.onUserLeft(userId);
        });

        this.socket.on('cursor-update', (data) => {
            if (this.onCursorUpdate) this.onCursorUpdate(data);
        });

        this.socket.on('stroke-added', (stroke) => {
            if (this.onStrokeAdded) this.onStrokeAdded(stroke);
        });

        this.socket.on('history-update', (history) => {
            if (this.onHistoryUpdate) this.onHistoryUpdate(history);
        });

        this.socket.on('remote-draw-start', (data) => {
            if (this.onRemoteDrawStart) this.onRemoteDrawStart(data);
        });

        this.socket.on('remote-draw-continue', (data) => {
            if (this.onRemoteDrawContinue) this.onRemoteDrawContinue(data);
        });
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }
}
