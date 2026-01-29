class RoomManager {
    constructor() {
        this.users = new Map();
        this.colors = [
            '#FF5733', '#33FF57', '#3357FF', '#F333FF',
            '#33FFF3', '#F3FF33', '#FF3385', '#33FFB5',
            '#FF8C33', '#8C33FF', '#33FF8C', '#FF3333'
        ];
    }

    addUser(socketId) {
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        const user = {
            id: socketId,
            color: color,
            cursor: { x: 0, y: 0 }
        };
        this.users.set(socketId, user);
        return user;
    }

    removeUser(socketId) {
        this.users.delete(socketId);
    }

    updateCursor(socketId, x, y) {
        const user = this.users.get(socketId);
        if (user) {
            user.cursor = { x, y };
        }
    }

    getUsers() {
        return Array.from(this.users.values());
    }
}

module.exports = new RoomManager();
