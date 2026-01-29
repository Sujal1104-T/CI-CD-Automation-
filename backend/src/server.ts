import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import githubRoutes from './webhooks/github';
import buildRoutes from './routes/builds';
import { initWorker } from './queue/buildQueue';
import { initWebSocket } from './logs/websocket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/webhooks/github', githubRoutes);
app.use('/builds', buildRoutes);

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'cicd-backend' });
});

const server = app.listen(PORT, () => {
    initWorker();
    initWebSocket(server);
    console.log(`Server running on port ${PORT}`);
});
