import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';

const git = simpleGit();

// Workspace directory for cloned repositories
const WORKSPACE_DIR = path.join(__dirname, '../../workspace');

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

export const cloneRepository = async (repoUrl: string, buildId: string, branch: string = 'main'): Promise<string> => {
    const targetDir = path.join(WORKSPACE_DIR, buildId);

    // Cleanup any existing directory first to avoid Git errors
    if (fs.existsSync(targetDir)) {
        console.log(`[Git] Removing existing directory ${targetDir}`);
        fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Ensure workspace directory exists
    if (!fs.existsSync(WORKSPACE_DIR)) {
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    console.log(`[Git] Cloning ${repoUrl} (branch: ${branch}) into ${targetDir}`);

    try {
        await git.clone(repoUrl, targetDir, [
            '--branch', branch,
            '--single-branch',
            '--depth', '1'
        ]);
        console.log(`[Git] Successfully cloned ${repoUrl}`);
        return targetDir;
    } catch (error) {
        console.error(`[Git] Failed to clone ${repoUrl}`, error);
        throw error;
    }
};

export const cleanupRepository = (buildId: string) => {
    const targetDir = path.join(WORKSPACE_DIR, buildId);
    if (fs.existsSync(targetDir)) {
        console.log(`[Git] Cleaning up ${targetDir}`);
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
};
