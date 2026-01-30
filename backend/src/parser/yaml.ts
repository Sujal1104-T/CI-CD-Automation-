import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export interface PipelineStep {
    run: string;
    name?: string;
}

export interface PipelineJob {
    name: string;
    image: string;
    steps: PipelineStep[];
}

export interface PipelineConfig {
    name: string;
    jobs: PipelineJob[];
}

export const parsePipelineConfig = (repoPath: string): PipelineConfig => {
    // Check for .cicd.yml first, then fallback to aura.yml
    let configPath = path.join(repoPath, '.cicd.yml');

    if (!fs.existsSync(configPath)) {
        configPath = path.join(repoPath, 'aura.yml');
        if (!fs.existsSync(configPath)) {
            throw new Error('Pipeline configuration file (.cicd.yml or aura.yml) not found');
        }
    }

    try {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const rawConfig: any = yaml.load(fileContents);

        // Basic validation
        if (!rawConfig.name) {
            throw new Error("Invalid pipeline config: 'name' field missing");
        }
        if (!rawConfig.jobs) {
            throw new Error("Invalid pipeline config: 'jobs' field missing");
        }

        // Normalize jobs to array format
        let jobs: PipelineJob[];

        if (Array.isArray(rawConfig.jobs)) {
            // Already in array format
            jobs = rawConfig.jobs;
        } else if (typeof rawConfig.jobs === 'object') {
            // Convert object format to array
            jobs = Object.entries(rawConfig.jobs).map(([jobName, jobConfig]: [string, any]) => ({
                name: jobName,
                image: jobConfig.image,
                steps: jobConfig.steps || []
            }));
        } else {
            throw new Error("Invalid pipeline config: 'jobs' must be an array or object");
        }

        // Validate each job
        jobs.forEach((job, index) => {
            if (!job.name) throw new Error(`Job ${index}: 'name' is required`);
            if (!job.image) throw new Error(`Job ${index}: 'image' is required`);
            if (!job.steps || !Array.isArray(job.steps)) {
                throw new Error(`Job ${index}: 'steps' must be an array`);
            }
        });

        const config: PipelineConfig = {
            name: rawConfig.name,
            jobs
        };

        console.log(`[Parser] Successfully parsed pipeline: ${config.name}`);
        return config;
    } catch (error) {
        console.error('[Parser] Failed to parse pipeline config', error);
        throw error;
    }
};
