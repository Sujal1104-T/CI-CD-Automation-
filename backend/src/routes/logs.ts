import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// GET /logs/:buildId - Retrieve logs for a specific build
router.get('/:buildId', async (req, res) => {
    const { buildId } = req.params;

    try {
        const result = await query(
            `SELECT id, level, message, timestamp 
             FROM build_logs 
             WHERE build_id = $1 
             ORDER BY timestamp ASC`,
            [buildId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('[Logs API] Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
