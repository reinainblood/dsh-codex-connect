import { Context } from '@deepseek-ai/cordis'
import SettingsProvider from '@deepseek-ai/dsh-settings'
import type { SettingsNamespace, SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { expect, it } from 'vitest'
import { Config } from '../src/index.ts'
import { resolveOpenAICodexSettings } from '../src/settings-contract.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  failNext = false
  readonly persisted: object[] = []
  protected async load(): Promise<Record<string, unknown>> { return {} }
  protected async persist(_ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    if (this.failNext) { this.failNext = false; throw new Error('fixture persistence failure') }
    this.persisted.push(structuredClone(section))
  }
}

it('commits a proxy transaction once and rejects failed, invalid or stale transactions intact', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(MemorySettings)
    const settings = ctx.settings as MemorySettings
    const scope = settings.register('codex-save-test', Config, { validate: resolveOpenAICodexSettings })
    const revision = () => settings.describe().find(entry => entry.ns === 'codex-save-test')!.revision
    const ops: SettingsPathOp[] = [
      { op: 'set', path: ['enableProxy'], value: true },
      { op: 'set', path: ['proxyUrl'], value: 'http://127.0.0.1:8899' },
    ]
    const before = scope.get()
    const initialRevision = revision()
    settings.failNext = true
    await expect(settings.mutate('codex-save-test', ops, initialRevision)).rejects.toThrow('fixture persistence failure')
    expect(scope.get()).toEqual(before)
    expect(revision()).toBe(initialRevision)
    expect(settings.persisted).toHaveLength(0)

    await settings.mutate('codex-save-test', ops, initialRevision)
    expect(scope.get()).toMatchObject({ enableProxy: true, proxyUrl: 'http://127.0.0.1:8899' })
    expect(settings.persisted).toHaveLength(1)
    expect(settings.persisted[0]).toMatchObject({ enableProxy: true, proxyUrl: 'http://127.0.0.1:8899' })
    const committed = scope.get()
    await expect(settings.mutate('codex-save-test', [{ op: 'set', path: ['enableProxy'], value: false }], initialRevision)).rejects.toThrow()
    await expect(settings.mutate('codex-save-test', [
      { op: 'set', path: ['enableProxy'], value: false },
      { op: 'set', path: ['searchMaxOutputTokens'], value: -1 },
    ], revision())).rejects.toThrow()
    expect(scope.get()).toEqual(committed)
    expect(settings.persisted).toHaveLength(1)
  } finally {
    await ctx.fiber.dispose()
  }
})
