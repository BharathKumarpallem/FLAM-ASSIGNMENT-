const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const drawingState = require('./drawing-state');
const roomManager = require('./rooms');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
    const user = roomManager.addUser(socket.id);

    socket.emit('init', {
        user,
        users: roomManager.getUsers(),
        history: drawingState.history
    });

    socket.broadcast.emit('user-joined', user);

    socket.on('cursor-move', (data) => {
        roomManager.updateCursor(socket.id, data.x, data.y);
        socket.broadcast.emit('cursor-update', {
            userId: socket.id,
            x: data.x,
            y: data.y
        });
    });

    socket.on('draw-start', (data) => {
        socket.broadcast.emit('remote-draw-start', {
            userId: socket.id,
            ...data
        });
    });

    socket.on('draw-continue', (data) => {
        socket.broadcast.emit('remote-draw-continue', {
            userId: socket.id,
            ...data
        });
    });

    socket.on('draw-end', (stroke) => {
        stroke.userId = socket.id;
        drawingState.addStroke(stroke);
        io.emit('stroke-added', stroke);
    });

    socket.on('undo', () => {
        if (drawingState.undo()) {
            io.emit('history-update', drawingState.history);
        }
    });

    socket.on('redo', () => {
        if (drawingState.redo()) {
            io.emit('history-update', drawingState.history);
        }
    });

    socket.on('disconnect', () => {
        roomManager.removeUser(socket.id);
        io.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});
