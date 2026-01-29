import { Router } from 'express';
// import prisma from '../config/db'; // Disabled due to Prisma issues
import { buildQueue } from '../queue/buildQueue';

const router = Router();

// In-memory store (Fallout MVP)
export let MOCK_BUILDS: any[] = [];
export let MOCK_PIPELINES: any[] = [
    { id: 'p1', name: 'Demo Pipeline', repoUrl: 'https://github.com/torvalds/linux', branch: 'master' }
];

// GET /builds - List all recent builds
router.get('/', async (req, res) => {
    try {
        // Return mock builds with pipeline info attached
        const enrichedBuilds = MOCK_BUILDS.map(b => ({
            ...b,
            pipeline: MOCK_PIPELINES.find(p => p.id === b.pipelineId)
        }));
        res.json(enrichedBuilds.reverse());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch builds' });
    }
});

// POST /builds - Trigger a manual build
router.post('/', async (req, res) => {
    let { pipelineId } = req.body;

    try {
        if (!pipelineId) {
            pipelineId = MOCK_PIPELINES[0].id;
        }

        const build = {
            id: 'b' + Date.now(),
            pipelineId,
            status: 'pending',
            trigger: 'manual',
            createdAt: new Date(),
            startTime: null,
            endTime: null,
            jobs: []
        };
        MOCK_BUILDS.push(build);

        // Add to Queue (Real Redis)
        await buildQueue.add('build-job', {
            repoUrl: MOCK_PIPELINES[0].repoUrl,
            buildId: build.id
        });

        res.json(build);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to trigger build' });
    }
});

export default router;
