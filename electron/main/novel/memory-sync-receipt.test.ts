import { afterEach, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clearPendingMemorySync, markPendingMemorySync, readPendingMemorySync, verifyMemorySyncReceipt } from './pending-memory-sync.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })
test('requires a current manuscript hash and preserves a newer pending generation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'narracat-sync-receipt-'))
  roots.push(root)
  await mkdir(join(root, 'manuscript/vol-01'), { recursive: true })
  const file = join(root, 'manuscript/vol-01/ch-001.md')
  await writeFile(file, 'Original')
  await markPendingMemorySync(root, 1, ['Changed'])
  const hash = createHash('sha256').update('Original').digest('hex')
  const token = await verifyMemorySyncReceipt(root, 1, hash, new Date(Date.now() + 1000).toISOString())
  expect(token).toBeString()
  await writeFile(file, 'Changed again')
  expect(await verifyMemorySyncReceipt(root, 1, hash, new Date(Date.now() + 1000).toISOString())).toBeNull()
  await markPendingMemorySync(root, 1, ['New edit'])
  await clearPendingMemorySync(root, 1, token!)
  expect((await readPendingMemorySync(root))['1']?.reasons).toEqual(['New edit'])
})
