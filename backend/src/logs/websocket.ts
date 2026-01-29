import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface ExtWebSocket extends WebSocket {
    buildId?: string;
    isAlive?: boolean;
}

export const initWebSocket = (server: Server) => {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws: ExtWebSocket, req) => {
        // Extract buildId from query params if needed, e.g. /ws?buildId=123
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const buildId = url.searchParams.get('buildId');

        ws.buildId = buildId || undefined;
        ws.isAlive = true;

        console.log(`[WS] Client connected for build ${buildId}`);

        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('close', () => {
            console.log(`[WS] Client disconnected ${buildId}`);
        });

        // Send initial message
        ws.send(JSON.stringify({ type: 'info', message: 'Connected to Log Stream' }));
    });

    return wss;
};

// Helper to broadcast logs to specific build subscribers
export const broadcastLog = (wss: WebSocketServer, buildId: string, message: string) => {
    wss.clients.forEach((client: WebSocket) => {
        const extClient = client as ExtWebSocket;
        if (extClient.readyState === WebSocket.OPEN && extClient.buildId === buildId) {
            extClient.send(JSON.stringify({ type: 'log', content: message, timestamp: new Date() }));
        }
    });
};
