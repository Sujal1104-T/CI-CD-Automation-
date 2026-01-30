import Docker from 'dockerode';
import path from 'path';

const docker = new Docker();

export interface BuildResult {
    success: boolean;
    exitCode: number;
    logs: string[];
}

export const runJobInDocker = async (
    jobName: string,
    image: string,
    commands: string[],
    repoPath: string,
    onLog: (message: string) => void
): Promise<BuildResult> => {
    console.log(`[Docker] Running job "${jobName}" with image ${image}`);

    const logs: string[] = [];

    try {
        // Pull image first
        onLog(`📦 Pulling Docker image: ${image}`);
        const stream = await docker.pull(image);
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err: any, res: any) =>
                err ? reject(err) : resolve(res)
            );
        });
        onLog(`✓ Image ${image} pulled successfully`);

        // Prepare command - run all steps sequentially
        const cmd = ['sh', '-c', commands.join(' && ')];

        // Create container with volume mount
        const container = await docker.createContainer({
            Image: image,
            Cmd: cmd,
            WorkingDir: '/workspace',
            HostConfig: {
                Binds: [`${repoPath}:/workspace`],
                AutoRemove: true
            },
            Tty: false
        });

        onLog(`🐳 Starting container for job "${jobName}"`);
        await container.start();

        // Attach to container to stream logs
        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true
        });

        // Process log stream
        logStream.on('data', (chunk: Buffer) => {
            const message = chunk.toString('utf8').trim();
            if (message) {
                logs.push(message);
                onLog(message);
            }
        });

        // Wait for container to finish
        const result = await container.wait();
        const exitCode = result.StatusCode || 0;

        if (exitCode === 0) {
            onLog(`✅ Job "${jobName}" completed successfully`);
            return { success: true, exitCode, logs };
        } else {
            onLog(`❌ Job "${jobName}" failed with exit code ${exitCode}`);
            return { success: false, exitCode, logs };
        }

    } catch (error: any) {
        const errorMsg = `Docker execution failed: ${error.message}`;
        console.error(`[Docker] ${errorMsg}`, error);
        onLog(`❌ ${errorMsg}`);
        return { success: false, exitCode: 1, logs };
    }
};

