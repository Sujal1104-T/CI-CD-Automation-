import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// GET all pipelines
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM pipelines ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pipelines:', error);
        res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
});

// POST create new pipeline
router.post('/', async (req, res) => {
    const { name, repoUrl, branch } = req.body;
    if (!name || !repoUrl) {
        return res.status(400).json({ error: 'Name and Repo URL are required' });
    }

    try {
        // For MVP, associate with the demo user
        const userResult = await query("SELECT id FROM users WHERE email = 'demo@cicd.com'");
        const userId = userResult.rows[0]?.id;

        if (!userId) {
            return res.status(500).json({ error: 'Demo user not found' });
        }

        const result = await query(
            'INSERT INTO pipelines (user_id, name, repo_url, branch) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, name, repoUrl, branch || 'main']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating pipeline:', error);
        res.status(500).json({ error: 'Failed to create pipeline' });
    }
});

// PUT update pipeline
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, repoUrl, branch } = req.body;

    try {
        const result = await query(
            'UPDATE pipelines SET name = $1, repo_url = $2, branch = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [name, repoUrl, branch, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating pipeline:', error);
        res.status(500).json({ error: 'Failed to update pipeline' });
    }
});

// DELETE pipeline
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM pipelines WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }
        res.json({ message: 'Pipeline deleted successfully' });
    } catch (error) {
        console.error('Error deleting pipeline:', error);
        res.status(500).json({ error: 'Failed to delete pipeline' });
    }
});

export default router;
