import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Provider, SimpleStreamOptions } from '@earendil-works/pi-ai'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { createOpenAICodexAdapter } from '../src/adapter.ts'
import { resolveSessionVerbosity } from '../src/session-verbosity.ts'
import type { OpenAICodexCredentialStore } from '../src/store.ts'

const observed = vi.hoisted(() => [] as SimpleStreamOptions[])
vi.mock('@earendil-works/pi-ai/providers/openai-codex', async importOriginal => {
  const actual = await importOriginal<typeof import('@earendil-works/pi-ai/providers/openai-codex')>()
  return {
    ...actual,
    openaiCodexProvider: () => {
      const provider: Provider = {
        ...actual.openaiCodexProvider(),
        streamSimple(_model, _context, options) {
          observed.push(options ?? {})
          throw new Error('offline stream capture')
        },
      }
      return provider
    },
  }
})

afterEach(() => { observed.length = 0; vi.unstubAllGlobals() })

describe('adapter verbosity resolver wiring', () => {
  it('carries session identity to a live resolver and changes only Michael payloads', async () => {
    vi.stubGlobal('fetch', () => { throw new Error('Network is forbidden in this test') })
    const credentials = {
      read: async () => ({ type: 'oauth', access: 'offline-test-access', refresh: 'offline-test-refresh', expires: Date.now() + 3_600_000 }),
      captureActiveAccount: async () => ({
        read: async () => ({ type: 'oauth', access: 'offline-test-access', refresh: 'offline-test-refresh', expires: Date.now() + 3_600_000 }),
        list: async () => [{ providerId: 'openai-codex', type: 'oauth' }],
      }),
    } as unknown as OpenAICodexCredentialStore
    const sessions = new Map([
      ['michael-session', { header: { agentPreset: 'creator' }, events: [{ type: 'agent-preset/selected', data: { agentPreset: 'michael' } }] }],
      ['other-session', { header: { agentPreset: 'michael' }, events: [{ type: 'agent-preset/selected', data: { agentPreset: 'creator' } }] }],
    ])
    const resolver = vi.fn((sessionId?: string) => resolveSessionVerbosity(sessionId === undefined ? undefined : sessions.get(sessionId)))
    const adapter = createOpenAICodexAdapter(credentials, () => undefined, undefined, undefined, undefined, undefined, undefined, resolver)
    const model = openaiCodexProvider().getModels()[0]!
    const prepared = await adapter.prepareCall('openai-codex', model.id)
    for (const sessionId of ['michael-session', 'other-session', undefined]) {
      const events: unknown[] = []
      for await (const event of prepared.stream({ provider: 'openai-codex', model: model.id, messages: [], ...(sessionId === undefined ? {} : { sessionId: sessionId as SessionId }) })) events.push(event)
      expect(events).toContainEqual({
        type: 'finish', reason: { kind: 'error', failure: { code: 'PI_AI_ERROR', message: 'offline stream capture' } },
      })
    }
    expect(resolver.mock.calls).toEqual([['michael-session'], ['other-session']])
    for (const verbosity of [undefined, 'low', 'medium', 'high']) {
      const payload = { text: { format: { type: 'text' }, ...(verbosity === undefined ? {} : { verbosity }) }, service_tier: 'auto' }
      expect(await observed[0]?.onPayload?.(payload, model)).toEqual({ ...payload, text: { ...payload.text, verbosity: 'high' } })
    }
    expect(observed[1]?.onPayload).toBeUndefined()
    expect(observed[2]?.onPayload).toBeUndefined()
  })
})
