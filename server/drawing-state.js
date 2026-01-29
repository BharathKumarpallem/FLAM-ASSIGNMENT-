class DrawingState {
    constructor() {
        this.history = [];
        this.redoStack = [];
        this.nextSequence = 0;
    }

    addStroke(stroke) {
        stroke.id = `stroke-${Date.now()}-${this.nextSequence++}`;
        stroke.timestamp = Date.now();
        this.history.push(stroke);
        this.redoStack = [];
    }

    undo() {
        if (this.history.length > 0) {
            const stroke = this.history.pop();
            this.redoStack.push(stroke);
            return true;
        }
        return false;
    }

    redo() {
        if (this.redoStack.length > 0) {
            const stroke = this.redoStack.pop();
            this.history.push(stroke);
            return true;
        }
        return false;
    }
}

module.exports = new DrawingState();
