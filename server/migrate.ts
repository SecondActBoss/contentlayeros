/**
 * Startup migration: idempotent SQL changes that must run before the app serves traffic.
 *
 * Uses raw SQL so it works even when the Drizzle schema is ahead of the database,
 * and is safe to run on every deploy (all statements are guarded by IF NOT EXISTS
 * or title-based WHERE clauses that match nothing when already applied).
 */
import { pool } from "./db";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Add brand column to context_items if it doesn't exist yet
    await client.query(`
      ALTER TABLE context_items
      ADD COLUMN IF NOT EXISTS brand text;
    `);

    // 2. Tag known AgentLayerOS context items by their canonical titles.
    //    Uses a deterministic WHERE clause so re-runs are safe (brand stays set).
    await client.query(`
      UPDATE context_items
      SET brand = 'agentlayeros'
      WHERE brand IS NULL
        AND (
          title ILIKE '%agentlayeros%'
          OR title ILIKE '%icp version 4%'
          OR title ILIKE '%icp v4%'
        );
    `);

    console.log("[migrate] context_items.brand column and AgentLayerOS backfill applied.");
  } finally {
    client.release();
  }
}
