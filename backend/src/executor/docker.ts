import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';

const docker = new Docker();

export const runBuild = async (
    jobId: string,
    repoUrl: string,
    commands: string[]
) => {
    // 1. Prepare env
    // For MVP, we'll just run a simple container that clones and runs commands
    // Ideally we mount a volume or build an image.

    // We'll use a `node:18` image for now as a generic builder
    console.log(`[Executor] Starting job ${jobId}`);

    try {
        const stream = await docker.pull('node:18-alpine');
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err: any, res: any) => err ? reject(err) : resolve(res));
        });

        // Create container
        // Cmd: clone repo and run commands.
        // This is complex in a single command, so usually we use a script or volume.
        // For MVP, let's just echo.

        const cmd = ['sh', '-c', `echo "Cloning ${repoUrl}" && ${commands.join(' && ')}`];

        const container = await docker.createContainer({
            Image: 'node:18-alpine',
            Cmd: cmd,
            Tty: true,
            Env: [`JOB_ID=${jobId}`]
        });

        await container.start();
        console.log(`[Executor] Container started for ${jobId}`);

        // Stream logs
        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true
        });

        logStream.on('data', (chunk) => {
            console.log(`[Job ${jobId}]: ${chunk.toString()}`);
            // TODO: Push to WebSocket / Save to DB
        });

        const data = await container.wait();
        console.log(`[Executor] Job ${jobId} finished with code ${data.StatusCode}`);

        await container.remove();
    } catch (error) {
        console.error(`[Executor] Failed to run job ${jobId}`, error);
    }
};
