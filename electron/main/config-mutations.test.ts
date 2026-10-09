import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { markProviderApiKeyUpdated, mutateAppConfig, normalizeAppConfig, readAppConfig, saveProviderVerification, writeAppConfig } from './config.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'narracat-config-mutations-'))
  roots.push(root)
  const file = join(root, 'config.json')
  const config = markProviderApiKeyUpdated(normalizeAppConfig({ novelRootDir: '/old' }), 'deepseek', 'old-generation')
  await writeAppConfig(file, config)
  return { file, config }
}

test('a late verification preserves newer unrelated settings', async () => {
  const { file, config } = await fixture()
  await mutateAppConfig(file, (current) => ({ ...current, novelRootDir: '/new', systemNotificationsEnabled: false }))
  await saveProviderVerification(file, 'deepseek', config, 'verified')
  const saved = await readAppConfig(file)
  expect(saved.novelRootDir).toBe('/new')
  expect(saved.systemNotificationsEnabled).toBe(false)
  expect(saved.modelPool[0]?.verification?.verifiedAt).toBe('verified')
})

test('a changed key or endpoint rejects late verification without restoring old settings', async () => {
  const { file, config } = await fixture()
  await mutateAppConfig(file, (current) => markProviderApiKeyUpdated(current, 'deepseek', 'new-generation'))
  await expect(saveProviderVerification(file, 'deepseek', config, 'verified')).rejects.toThrow('已更改')
  expect((await readAppConfig(file)).apiKeyMetadata.deepseek?.updatedAt).toBe('new-generation')
  const next = await readAppConfig(file)
  await mutateAppConfig(file, (current) => ({ ...current, providers: { ...current.providers, deepseek: { ...current.providers.deepseek, baseUrl: 'https://changed.example' } } }))
  await expect(saveProviderVerification(file, 'deepseek', next, 'verified')).rejects.toThrow('已更改')
  expect((await readAppConfig(file)).providers.deepseek.baseUrl).toBe('https://changed.example')
})

test('overlapping mutations observe the latest committed config', async () => {
  const { file } = await fixture()
  await Promise.all([
    mutateAppConfig(file, (current) => ({ ...current, novelRootDir: '/new' })),
    mutateAppConfig(file, (current) => ({ ...current, systemNotificationsEnabled: false })),
  ])
  const saved = await readAppConfig(file)
  expect(saved.novelRootDir).toBe('/new')
  expect(saved.systemNotificationsEnabled).toBe(false)
})
