import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export interface PipelineStep {
    name: string;
    run: string;
}

export interface PipelineJob {
    image: string;
    steps: PipelineStep[];
}

export interface PipelineConfig {
    name: string;
    jobs: Record<string, PipelineJob>;
}

export const parsePipelineConfig = (repoPath: string): PipelineConfig | null => {
    const configPath = path.join(repoPath, '.aura.yml');

    if (!fs.existsSync(configPath)) {
        console.warn(`[Parser] No .aura.yml found at ${configPath}`);
        return null;
    }

    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents) as PipelineConfig;

        // Basic validation
        if (!config.jobs) {
            throw new Error("Invalid pipeline config: 'jobs' section missing");
        }

        return config;
    } catch (error) {
        console.error('[Parser] Failed to parse .aura.yml', error);
        throw error;
    }
};
