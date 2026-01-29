# CoDraw | Engineering Case Study

CoDraw is an interview-grade, real-time collaborative drawing engine built from the ground up using **Raw HTML5 Canvas** and **WebSockets**. It demonstrates high-performance state synchronization and complex global undo/redo logic.

## 🚀 Getting Started

1.  **Clone the workspace** and navigate to the project root:
    ```bash
    cd collaborative-canvas
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Fire up the engine**:
    ```bash
    npm start
    ```
4.  **Test Collaboration**:
    Open `http://localhost:3000` in multiple tabs or different browsers (Chrome, Safari, Firefox).

## 🧪 Testing Scenarios

1.  **Real-Time Streaming**: Draw in Tab A. You should see the stroke appear in Tab B *while* your mouse is still moving (not just after release).
2.  **Global Undo**: Draw a red line in Tab A, then a blue circle in Tab B. Click **Undo** (or `Ctrl+Z`) in Tab A. Notice the blue circle (the last *global* action) disappears for everyone.
3.  **High-DPI Check**: Open the app on a Retina display or 4K monitor. The lines will remain crisp due to `devicePixelRatio` scaling.
4.  **Concurrency**: Have 3 or more windows open and draw simultaneously. The system merges these live previews seamlessly.

## 🛠 Tech Stack & Design

-   **Frontend**: Vanilla JS for zero-dependency performance. Raw Canvas API for low-level pixel manipulation.
-   **Backend**: Node.js with Socket.io for robust WebSocket communication and state management.
-   **Optimization**: Offscreen secondary canvas for history caching (minimizes redraw cost).

## ⚠️ Known Limitations

-   **Network Jitter**: In extremely poor network conditions, remote cursors may appear "jumpy." Client-side interpolation (tweening) could be added to smooth this further.
-   **Memory Cap**: History is currently stored in-memory on the server. For production, this should be backed by a persistent store like PostgreSQL or Redis.

## ⏱ Time Estimate
- **Total Development Time**: ~8 hours
  - 1.5h: Architecture & Protocol Design
  - 2.5h: Raw Canvas Engine (Scaling, Eraser, Buffering)
  - 2.5h: WebSocket Synchronization & State Authority
  - 1.5h: Refinement (CSS, Documentation, Comments)
