// Runs triage + deep analysis on a batch of stored vacancies. Manual
// alongside the scheduled endpoint (Phase 6).
// Usage: npm run analyze:once [batchSize]
import prisma from '@/backend/shared/db/prisma'
import { runAnalyze } from '@/backend/vacancies/pipeline/stages'

const BATCH_SIZE = Number(process.argv[2] ?? 8)

async function main() {
  const { analyzed, errors, usage } = await runAnalyze(BATCH_SIZE, outcome => {
    console.log(`[${outcome.vacancy.company}] ${outcome.vacancy.title}`)

    if (outcome.triageError) {
      console.log(`  ✗ triage failed: ${outcome.triageError}\n`)
      return
    }
    console.log(
      `  triage: ${outcome.triageResult?.worthDeepAnalysis ? 'worth a deep look' : 'skipping deep analysis'} — ${outcome.triageResult?.reason}`
    )
    if (!outcome.triageResult?.worthDeepAnalysis) {
      console.log()
      return
    }

    if (outcome.deepError) {
      console.log(`  ✗ deep analysis failed: ${outcome.deepError}\n`)
      return
    }
    const deep = outcome.deepResult
    if (!deep) return
    console.log(`  ✓ fitScore=${deep.fitScore} verdict=${deep.verdict} → ${deep.suggestedResume}`)
    console.log(`  summary: ${deep.summary}`)
    console.log(`  matched: ${deep.matchedSkills.join(', ') || '—'}`)
    console.log(`  missing: ${deep.missingSkills.join(', ') || '—'}`)
    if (deep.redFlags.length) console.log(`  red flags: ${deep.redFlags.join(', ')}`)
    console.log(`  apply advice: ${deep.applyAdvice}\n`)
  })

  console.log(`[analyze] done: ${analyzed} analyzed, ${errors.length} error(s)`)
  console.log(`[analyze] token usage: ${JSON.stringify(usage)}`)
}

main()
  .catch(err => {
    console.error('[analyze] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
