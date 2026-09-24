// One-off ingest + filter run, for manual testing/catch-up alongside the
// scheduled endpoint (Phase 6).
// Usage: npm run ingest:once              (every enabled source)
//        npm run ingest:once -- <name>    (one source, by its name)
import prisma from '@/backend/db/prisma'
import { runFilter, runIngest } from '@/backend/pipeline'
import { findSource, sources } from '@/backend/sources'

async function main() {
  const only = process.argv[2]
  const toRun = only ? [findSource(only)] : sources
  if (toRun.some(s => !s)) {
    throw new Error(`unknown or disabled source: ${only} (available: ${sources.map(s => s.name).join(', ')})`)
  }

  for (const source of toRun) {
    console.log(`[ingest] ${source!.label}: fetching...`)
    try {
      const { fetched, newCount } = await runIngest(source!)
      console.log(`[ingest] ${source!.label}: ${fetched} vacancy page(s) fetched (already-seen ones were skipped), ${newCount} new row(s) inserted`)
    } catch (err) {
      // Same policy as runPipeline: one broken source doesn't stop the rest.
      console.error(`[ingest] ${source!.label}: failed:`, err)
      process.exitCode = 1
    }
  }

  // No limit here (unlike the cron endpoint): a manual run is fine taking
  // longer, and it also catches anything inserted before the filter existed.
  console.log('[filter] running the rule filter on everything pending...')
  const { dismissed, flagged, clean } = await runFilter()
  console.log(`[filter] done: ${dismissed} dismissed, ${flagged} flagged (kept), ${clean} clean`)
}

main()
  .catch(err => {
    console.error('[ingest] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
