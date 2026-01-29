class DrawingManager {
    constructor(canvasId, socket) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Offscreen canvas used to cache the history for faster rendering
        this.historyCanvas = document.createElement('canvas');
        this.historyCtx = this.historyCanvas.getContext('2d');

        this.socket = socket;

        // State variables
        this.isDrawing = false;
        this.currentStroke = null;
        this.remoteStrokes = new Map();
        this.history = [];

        // Tool properties
        this.tool = 'brush';
        this.color = '#ffffff';
        this.width = 5;
        this.needsHistoryRedraw = true;

        this.setupCanvas();
        this.attachEvents();
        this.animate();
    }

    /**
     * Handles canvas resizing and high-DPI (Retina) display scaling.
     */
    setupCanvas() {
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = this.canvas.parentElement.clientWidth;
            const height = this.canvas.parentElement.clientHeight;

            // Set display size
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';

            // Set actual drawing surface size
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;

            this.historyCanvas.width = width * dpr;
            this.historyCanvas.height = height * dpr;

            // Scale context to match DPR
            this.ctx.scale(dpr, dpr);
            this.historyCtx.scale(dpr, dpr);

            this.needsHistoryRedraw = true;
        };

        window.addEventListener('resize', resize);
        resize();
    }

    /**
     * Attaches mouse, touch, and global events.
     */
    attachEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

        // Support for mobile devices
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    /**
     * Initializes a new local stroke.
     */
    startDrawing(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = true;
        this.currentStroke = {
            tool: this.tool,
            color: this.tool === 'eraser' ? '#000000' : this.color,
            width: this.width,
            points: [{ x, y }]
        };

        // Notify server that drawing has started
        this.socket.emit('draw-start', {
            tool: this.currentStroke.tool,
            color: this.currentStroke.color,
            width: this.currentStroke.width,
            point: { x, y }
        });
    }

    /**
     * Adds a point to the current stroke and tracks mouse movement.
     */
    draw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Broadcast cursor position even if not drawing
        this.socket.emit('cursor-move', { x, y });

        if (!this.isDrawing) return;

        this.currentStroke.points.push({ x, y });
        this.socket.emit('draw-continue', { x, y });
    }

    /**
     * Completes the local stroke.
     */
    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.socket.emit('draw-end', this.currentStroke);
        this.currentStroke = null;
    }

    /**
     * Updates the local history and triggers a background redraw.
     */
    setHistory(history) {
        this.history = history;
        this.needsHistoryRedraw = true;
    }

    /**
     * Logic for handling remote stroke start.
     */
    addRemoteStrokeStart(userId, data) {
        this.remoteStrokes.set(userId, {
            tool: data.tool,
            color: data.color,
            width: data.width,
            points: [data.point]
        });
    }

    /**
     * Logic for handling remote stroke updating.
     */
    addRemoteStrokeContinue(userId, point) {
        const stroke = this.remoteStrokes.get(userId);
        if (stroke) {
            stroke.points.push(point);
        }
    }

    /**
     * Clear reference to remote stroke once finished.
     */
    removeRemoteStroke(userId) {
        this.remoteStrokes.delete(userId);
    }

    /**
     * Main animation loop using requestAnimationFrame for smooth 60fps.
     */
    render() {
        // Clear the main display canvas
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.clearRect(0, 0, w, h);

        // If history has changed, redraw it to the offscreen buffer
        if (this.needsHistoryRedraw) {
            this.historyCtx.clearRect(0, 0, w, h);
            this.history.forEach(stroke => this.drawStroke(this.historyCtx, stroke));
            this.needsHistoryRedraw = false;
        }

        // Draw the cached history first
        this.ctx.drawImage(this.historyCanvas, 0, 0, w, h);

        // Draw the user's active stroke on top
        if (this.currentStroke) {
            this.drawStroke(this.ctx, this.currentStroke);
        }

        // Draw all remote users' active strokes
        this.remoteStrokes.forEach(stroke => {
            this.drawStroke(this.ctx, stroke);
        });
    }

    /**
     * Low-level stroke drawing logic on a specific context.
     * Uses optimized path drawing.
     */
    drawStroke(ctx, stroke) {
        if (stroke.points.length < 2) return;

        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;

        // Toggle composite operation for erasing
        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        // Draw segment by segment
        for (let i = 1; i < stroke.points.length; i++) {
            const p = stroke.points[i];
            ctx.lineTo(p.x, p.y);
        }

        ctx.stroke();
        // Always reset composite operation to default
        ctx.globalCompositeOperation = 'source-over';
    }

    animate() {
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}
