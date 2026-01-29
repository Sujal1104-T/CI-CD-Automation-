import { Router } from 'express';
import { buildQueue } from '../queue/buildQueue';
// import prisma from '../config/db'; // Disabled
import { MOCK_BUILDS, MOCK_PIPELINES } from '../routes/builds';

const router = Router();

router.post('/', async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'push') {
        const repoUrl = payload.repository.clone_url;
        const branch = payload.ref.replace('refs/heads/', '');
        const commitIds = payload.commits.map((c: any) => c.id);

        console.log(`Received push for ${repoUrl} on branch ${branch}`);

        // Find pipeline (mock)
        const pipeline = MOCK_PIPELINES.find(p => p.repoUrl === repoUrl);

        if (pipeline) {
            const build = {
                id: 'b' + Date.now(),
                pipelineId: pipeline.id,
                status: 'pending',
                trigger: 'webhook',
                createdAt: new Date(),
                startTime: null,
                endTime: null,
                jobs: []
            };
            MOCK_BUILDS.push(build);

            await buildQueue.add('build-job', {
                repoUrl,
                branch,
                commit: payload.after,
                triggeredBy: 'webhook'
            });
            res.json({ message: 'Build triggered', buildId: build.id });
        } else {
            // console.log("No pipeline found for repo");
            // ensure we return valid json handling
            res.json({ message: 'Ignored - No pipeline' });
        }
    } else {
        res.json({ message: 'Ignored' });
    }
});


export default router;
