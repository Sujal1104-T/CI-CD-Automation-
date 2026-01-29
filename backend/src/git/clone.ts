import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';

const WORKSPACE_DIR = path.resolve(__dirname, '../../workspace');

// Ensure workspace dir exists
if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

export const cloneRepository = async (repoUrl: string, buildId: string) => {
    const targetDir = path.join(WORKSPACE_DIR, buildId);

    console.log(`[Git] Cloning ${repoUrl} to ${targetDir}...`);

    if (fs.existsSync(targetDir)) {
        // Clean up previous if exists (simplified)
        fs.rmSync(targetDir, { recursive: true, force: true });
    }

    try {
        await simpleGit().clone(repoUrl, targetDir);
        console.log(`[Git] Clone successful for ${buildId}`);
        return targetDir;
    } catch (error) {
        console.error(`[Git] Failed to clone ${repoUrl}`, error);
        throw error;
    }
};
