import { Queue, Worker } from 'bullmq';
import { query } from '../config/database';
import { runJobInDocker } from '../executor/docker';
import { cloneRepository, cleanupRepository } from '../git/clone';
import { parsePipelineConfig } from '../parser/yaml';

export const buildQueue = new Queue('build-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    }
});

// WebSocket server instance (set by initWorker)
let wss: any = null;

export const setWebSocketServer = (websocketServer: any) => {
    wss = websocketServer;
};

// Helper to emit and store logs
const emitLog = async (buildId: string, message: string, level: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date();
    const logMessage = {
        type: 'log',
        buildId,
        timestamp: timestamp.toISOString(),
        level,
        message
    };

    // Broadcast via WebSocket
    if (wss) {
        wss.clients.forEach((client: any) => {
            if (client.readyState === 1 && client.buildId === buildId) {
                client.send(JSON.stringify(logMessage));
            }
        });
    }

    // Store in database
    try {
        await query(
            `INSERT INTO build_logs (build_id, level, message, timestamp) VALUES ($1, $2, $3, $4)`,
            [buildId, level, message, timestamp]
        );
    } catch (error) {
        console.error('[Worker] Failed to store log:', error);
    }
};

export const initWorker = () => {
    const worker = new Worker('build-queue', async job => {
        console.log(`[Worker] Processing Job ${job.id}`);
        const { repoUrl, buildId, branch = 'main' } = job.data;
        let repoPath: string | null = null;

        try {
            // Update build status to running
            await query(
                `UPDATE builds SET status = $1, start_time = $2 WHERE id = $3`,
                ['running', new Date(), buildId]
            );

            await emitLog(buildId, '🚀 Build started', 'info');
            await emitLog(buildId, `📦 Repository: ${repoUrl}`, 'info');
            await emitLog(buildId, `🌿 Branch: ${branch}`, 'info');

            // Step 1: Clone repository
            await emitLog(buildId, '⏳ Cloning repository...', 'info');
            repoPath = await cloneRepository(repoUrl, buildId, branch);
            await emitLog(buildId, '✓ Repository cloned successfully', 'success');

            // Step 2: Parse pipeline config
            await emitLog(buildId, '📄 Parsing pipeline configuration...', 'info');
            const pipelineConfig = parsePipelineConfig(repoPath);
            await emitLog(buildId, `✓ Pipeline "${pipelineConfig.name}" loaded with ${pipelineConfig.jobs.length} job(s)`, 'success');

            // Step 3: Execute each job
            let allJobsSucceeded = true;

            for (const pipelineJob of pipelineConfig.jobs) {
                await emitLog(buildId, `\n🔨 Starting job: ${pipelineJob.name}`, 'info');

                // Extract commands from steps
                const commands = pipelineJob.steps.map(step => step.run);

                // Create job record in database
                const jobResult = await query(
                    `INSERT INTO jobs (build_id, name, status, image, commands, start_time) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [buildId, pipelineJob.name, 'running', pipelineJob.image, commands, new Date()]
                );
                const jobId = jobResult.rows[0].id;

                // Run job in Docker
                const result = await runJobInDocker(
                    pipelineJob.name,
                    pipelineJob.image,
                    commands,
                    repoPath,
                    (logMessage) => emitLog(buildId, logMessage, 'info')
                );

                // Update job status
                const jobStatus = result.success ? 'success' : 'failed';
                await query(
                    `UPDATE jobs SET status = $1, end_time = $2 WHERE id = $3`,
                    [jobStatus, new Date(), jobId]
                );

                if (!result.success) {
                    allJobsSucceeded = false;
                    await emitLog(buildId, `❌ Job "${pipelineJob.name}" failed`, 'error');
                    break; // Stop on first failure
                }
            }

            // Mark build as success or failed
            const finalStatus = allJobsSucceeded ? 'success' : 'failed';
            await query(
                `UPDATE builds SET status = $1, end_time = $2 WHERE id = $3`,
                [finalStatus, new Date(), buildId]
            );

            if (allJobsSucceeded) {
                await emitLog(buildId, '\n✅ Build completed successfully', 'success');
                console.log(`[Worker] Build ${buildId} completed successfully`);
            } else {
                await emitLog(buildId, '\n❌ Build failed', 'error');
                console.log(`[Worker] Build ${buildId} failed`);
            }

        } catch (error: any) {
            console.error(`[Worker] Build ${buildId} failed:`, error);

            await emitLog(buildId, `❌ Build error: ${error.message}`, 'error');

            // Update build status to failed
            await query(
                `UPDATE builds SET status = $1, end_time = $2 WHERE id = $3`,
                ['failed', new Date(), buildId]
            );
        } finally {
            // Cleanup: Remove cloned repository
            if (repoPath) {
                try {
                    cleanupRepository(buildId);
                    console.log(`[Worker] Cleaned up repository for build ${buildId}`);
                } catch (cleanupError) {
                    console.error(`[Worker] Failed to cleanup for build ${buildId}:`, cleanupError);
                }
            }
        }
    }, {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        }
    });

    worker.on('completed', job => {
        console.log(`[Worker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.log(`[Worker] Job ${job?.id} failed:`, err.message);
    });
};
