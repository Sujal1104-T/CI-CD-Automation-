import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import githubRoutes from './webhooks/github';
import buildRoutes from './routes/builds';
import pipelinesRoutes from './routes/pipelines';
import logsRoutes from './routes/logs';
import { initWorker, setWebSocketServer } from './queue/buildQueue';
import { initWebSocket } from './logs/websocket';
import { initializeDatabase } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.use('/webhooks/github', githubRoutes);
app.use('/builds', buildRoutes);
app.use('/pipelines', pipelinesRoutes);
app.use('/logs', logsRoutes);

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'cicd-backend' });
});

const server = app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize database schema
    try {
        await initializeDatabase();
        console.log('[Server] Database initialized');
    } catch (error) {
        console.error('[Server] Failed to initialize database:', error);
        process.exit(1);
    }

    // Initialize WebSocket and connect to worker
    const wss = initWebSocket(server);
    setWebSocketServer(wss);

    // Initialize worker
    initWorker();
});

