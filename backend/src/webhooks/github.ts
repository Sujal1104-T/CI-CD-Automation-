import { Router } from 'express';
import { buildQueue } from '../queue/buildQueue';
import { query } from '../config/database';

const router = Router();

router.post('/', async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'push') {
        const repoUrl = payload.repository.clone_url;
        const branch = payload.ref.replace('refs/heads/', '');
        const commitIds = payload.commits.map((c: any) => c.id);

        console.log(`[Webhook] Received push for ${repoUrl} on branch ${branch}`);

        try {
            // Find pipeline by repo URL
            const pipelineResult = await query(
                `SELECT id, repo_url FROM pipelines WHERE repo_url = $1 LIMIT 1`,
                [repoUrl]
            );

            if (pipelineResult.rows.length === 0) {
                console.log(`[Webhook] No pipeline found for repo: ${repoUrl}`);
                return res.json({ message: 'Ignored - No pipeline configured for this repository' });
            }

            const pipeline = pipelineResult.rows[0];

            // Create build record
            const buildResult = await query(
                `INSERT INTO builds (pipeline_id, status, trigger) 
                 VALUES ($1, $2, $3) 
                 RETURNING id`,
                [pipeline.id, 'pending', 'webhook']
            );

            const buildId = buildResult.rows[0].id;

            // Add to queue
            await buildQueue.add('build-job', {
                repoUrl,
                branch,
                commit: payload.after,
                triggeredBy: 'webhook',
                buildId
            });

            res.json({ message: 'Build triggered', buildId });
        } catch (error) {
            console.error('[Webhook] Error processing webhook:', error);
            res.status(500).json({ error: 'Failed to process webhook' });
        }
    } else {
        res.json({ message: 'Ignored - Not a push event' });
    }
});

export default router;
