import { Router } from 'express';
import { query } from '../config/database';
import { buildQueue } from '../queue/buildQueue';

const router = Router();

// GET /builds - List all recent builds
router.get('/', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                b.id,
                b.pipeline_id,
                b.status,
                b.trigger,
                b.start_time,
                b.end_time,
                b.created_at,
                p.name as pipeline_name,
                p.repo_url as pipeline_repo_url,
                p.branch as pipeline_branch,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', j.id,
                            'name', j.name,
                            'status', j.status,
                            'image', j.image,
                            'start_time', j.start_time,
                            'end_time', j.end_time
                        ) ORDER BY j.created_at
                    ) FILTER (WHERE j.id IS NOT NULL),
                    '[]'
                ) as jobs
            FROM builds b
            JOIN pipelines p ON b.pipeline_id = p.id
            LEFT JOIN jobs j ON b.id = j.build_id
            GROUP BY b.id, p.id
            ORDER BY b.created_at DESC
            LIMIT 20
        `);

        // Transform to match frontend expectations
        const builds = result.rows.map(row => ({
            id: row.id,
            pipelineId: row.pipeline_id,
            status: row.status,
            trigger: row.trigger,
            startTime: row.start_time,
            endTime: row.end_time,
            createdAt: row.created_at,
            pipeline: {
                id: row.pipeline_id,
                name: row.pipeline_name,
                repoUrl: row.pipeline_repo_url,
                branch: row.pipeline_branch
            },
            jobs: row.jobs
        }));

        res.json(builds);
    } catch (error) {
        console.error('[Builds API] Error fetching builds:', error);
        res.status(500).json({ error: 'Failed to fetch builds' });
    }
});

// GET /builds/:id - Get specific build details
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(`
            SELECT 
                b.id,
                b.pipeline_id,
                b.status,
                b.trigger,
                b.start_time,
                b.end_time,
                b.created_at,
                p.name as pipeline_name,
                p.repo_url as pipeline_repo_url,
                p.branch as pipeline_branch,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', j.id,
                            'name', j.name,
                            'status', j.status,
                            'image', j.image,
                            'start_time', j.start_time,
                            'end_time', j.end_time
                        ) ORDER BY j.created_at
                    ) FILTER (WHERE j.id IS NOT NULL),
                    '[]'
                ) as jobs
            FROM builds b
            JOIN pipelines p ON b.pipeline_id = p.id
            LEFT JOIN jobs j ON b.id = j.build_id
            WHERE b.id = $1
            GROUP BY b.id, p.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Build not found' });
        }

        const row = result.rows[0];
        const build = {
            id: row.id,
            pipelineId: row.pipeline_id,
            status: row.status,
            trigger: row.trigger,
            startTime: row.start_time,
            endTime: row.end_time,
            createdAt: row.created_at,
            pipeline: {
                id: row.pipeline_id,
                name: row.pipeline_name,
                repoUrl: row.pipeline_repo_url,
                branch: row.pipeline_branch
            },
            jobs: row.jobs
        };

        res.json(build);
    } catch (error) {
        console.error('[Builds API] Error fetching build:', error);
        res.status(500).json({ error: 'Failed to fetch build' });
    }
});

// POST /builds - Trigger a manual build
router.post('/', async (req, res) => {
    let { pipelineId } = req.body;

    try {
        // If no pipelineId provided, use the demo pipeline
        if (!pipelineId) {
            const pipelineResult = await query(
                `SELECT id, repo_url, branch FROM pipelines WHERE name = $1 LIMIT 1`,
                ['Demo Pipeline']
            );

            if (pipelineResult.rows.length === 0) {
                return res.status(404).json({ error: 'No demo pipeline found. Please run database initialization.' });
            }

            pipelineId = pipelineResult.rows[0].id;
        }

        // Verify pipeline exists and get branch
        const pipelineCheck = await query(
            `SELECT id, repo_url, branch FROM pipelines WHERE id = $1`,
            [pipelineId]
        );

        if (pipelineCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }

        const pipeline = pipelineCheck.rows[0];

        // Create build record
        const buildResult = await query(
            `INSERT INTO builds (pipeline_id, status, trigger) 
             VALUES ($1, $2, $3) 
             RETURNING id, pipeline_id, status, trigger, created_at`,
            [pipelineId, 'pending', 'manual']
        );

        const build = buildResult.rows[0];

        // Add to queue with branch
        await buildQueue.add('build-job', {
            repoUrl: pipeline.repo_url,
            buildId: build.id,
            branch: pipeline.branch || 'main'
        });

        res.json({
            id: build.id,
            pipelineId: build.pipeline_id,
            status: build.status,
            trigger: build.trigger,
            createdAt: build.created_at
        });

    } catch (error) {
        console.error('[Builds API] Error triggering build:', error);
        res.status(500).json({ error: 'Failed to trigger build' });
    }
});

export default router;
