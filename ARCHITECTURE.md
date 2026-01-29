# Architecture Documentation - CoDraw

## Data Flow Diagram

1.  **Direct Drawing (Local)**: User Input (Mouse/Touch) -> `DrawingManager` (Active Stroke Layer) -> Render Loop.
2.  **Streaming (Outbound)**: `DrawingManager` -> `WebSocketClient` -> Server.
3.  **Broadcasting (Server)**: Server (Socket.io) -> Receives segment -> Broadcasts to all other connected clients.
4.  **Synchronization (Inbound)**: Other Clients -> `WebSocketClient` -> `DrawingManager` (Remote Strokes Layer) -> Render Loop.
5.  **Persistence**: User finishes stroke -> Client emits `draw-end` -> Server validates, assigns UUID/Timestamp -> Server adds to Global History Array -> Server broadcasts `stroke-added`.

## WebSocket Protocol

### Client → Server Events
| Event | Payload | Purpose |
| :--- | :--- | :--- |
| `cursor-move` | `{ x, y }` | Real-time position tracking. |
| `draw-start` | `{ tool, color, width, point }` | Initializes a remote preview stroke. |
| `draw-continue`| `{ x, y }` | Streams point data during active drawing. |
| `draw-end` | `strokeObject` | Signals stroke completion for global storage. |
| `undo` / `redo` | `void` | Triggers global history manipulation. |

### Server → Client Broadcasts
| Event | Payload | Purpose |
| :--- | :--- | :--- |
| `init` | `{ user, users, history }` | Bootstrapping new connections. |
| `cursor-update`| `{ userId, x, y }` | Updating remote user cursor positions. |
| `remote-draw-start` | `{ userId, tool, ... }` | Starting a live preview for others. |
| `stroke-added` | `strokeObject` | Moving a stroke from "preview" to permanent history. |
| `history-update`| `history[]` | Syncing full state after an undo/redo action. |

## Undo / Redo Strategy

CoDraw implements an **Authoritative Global History Mode**:
- **Shared Timeline**: Unlike most apps where undo is personal, here it is collective. If User A draws and then User B draws, clicking Undo (by anyone) removes User B's drawing.
- **Deterministic Convergence**: The server is the final arbiter. When an undo occurs, the server pops the last element, moves it to a `redoStack`, and broadcasts the *entire* updated history array to all clients.
- **Client Rendering**: Clients clear their history buffer and re-play all strokes in the array. This guarantees that all users see exactly the same pixels.

## Performance Optimizations

1.  **RequestAnimationFrame (RAF)**: We decouple data processing from rendering. Mouse events update state, while RAF ensures smooth 60fps rendering without blocking the event loop.
2.  **Double Buffering (Offscreen Canvas)**: To avoid clearing and redrawing the entire history every frame (which is expensive as history grows), we render the history to an **offscreen canvas**. The main canvas then simply draws this "cached" image and overlays the active moving strokes.
3.  **DPR Scaling**: The canvas internal coordinate system is scaled by `window.devicePixelRatio`. This prevents "blurry line syndrome" on Retina and 4K displays.
4.  **Incremental Segments**: We stream only `x, y` pairs during active drawing to minimize network payload.

## Conflict Handling

- **Atomic Commits**: Live drawing is ephemeral. A stroke only becomes "permanent" when the server receives `draw-end`. This prevents half-finished data from clogging the history if a user disconnects.
- **Last-In Priority**: Since strokes are ordered by server arrival time, overlapping strokes naturally layer based on the sequence of completion.
- **Non-Blocking Logic**: No user can "lock" a region. Multiple users can draw over each other simultaneously; the render loop merges these by drawing all active remote strokes on top of the base history layer.

## Scaling to 1000 Users

To scale from a small group to 1000+ concurrent users:

1.  **Binary Serialization**: Replace JSON payloads with binary formats like **Protocol Buffers** or **MessagePack** to reduce bandwidth by 30-50%.
2.  **QuadTree Proximity Filtering**: Instead of broadcasting every cursor move to everyone, use a **Spatial Partitioning (QuadTree)** to only send cursor updates to users who are physically close to that area on the canvas.
3.  **Canvas Tiles**: For highly dense drawings, divide the canvas into tiles (e.g., 256x256). Only redraw/sync tiles that have changed.
4.  **Backend Clustering**: Use **Redis Adapter** for Socket.io to distribute connections across multiple server instances while maintaining a shared message bus.
5.  **Throttling**: Throttle cursor updates to 30Hz or 20Hz (human-perceptible limit) instead of the raw 60Hz-120Hz mouse frequency.
