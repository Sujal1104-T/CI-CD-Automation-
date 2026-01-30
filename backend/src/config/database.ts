import { Pool, QueryResult, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Create connection pool
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'cicd_user',
    password: process.env.DB_PASSWORD || 'cicd_password',
    database: process.env.DB_NAME || 'cicd_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('[Database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client', err);
    process.exit(-1);
});

// Helper function to execute queries
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        console.log('[Database] Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('[Database] Query error', { text, error });
        throw error;
    }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
    try {
        console.log('[Database] Initializing schema...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

        await pool.query(schemaSql);
        console.log('[Database] Schema initialized successfully');
    } catch (error) {
        console.error('[Database] Failed to initialize schema', error);
        throw error;
    }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
    await pool.end();
    console.log('[Database] Connection pool closed');
}

