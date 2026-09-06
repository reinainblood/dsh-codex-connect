import { describe, expect, it, vi } from 'vitest'
import type { AssistantMessageEventStream, Context as PiContext, SimpleStreamOptions } from '@earendil-works/pi-ai'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { createOpenAICodexProfile, withOpenAICodexVerbosity } from '../src/adapter.ts'
import { FastModeRegistry } from '../src/fast-mode.ts'

function fixture() {
  const baseline = openaiCodexProvider()
  const model = baseline.getModels()[0]!
  const streamSimple = vi.fn((_model: typeof model, _context: PiContext, _options?: SimpleStreamOptions) => ({} as AssistantMessageEventStream))
  return { provider: { ...baseline, streamSimple }, model, streamSimple }
}

const context: PiContext = { messages: [] }
const resolveVerbosity = (sessionId?: string) => sessionId === 'michael-session' ? 'medium' as const : undefined

describe('session-scoped native Codex verbosity', () => {
  it.each([undefined, 'low', 'medium', 'high'] as const)('sets a medium floor on the actual hook payload (existing %s)', async existing => {
    const { provider, model, streamSimple } = fixture()
    const wrapped = withOpenAICodexVerbosity(provider, resolveVerbosity)
    const options = { sessionId: 'michael-session', temperature: 0.2 }
    wrapped.streamSimple(model, context, options)
    const received = streamSimple.mock.lastCall?.[2]
    expect(received).toMatchObject(options)
    const text = { format: { type: 'text' }, ...(existing === undefined ? {} : { verbosity: existing }) }
    const payload = { model: model.id, input: [], text, service_tier: 'auto', store: false }
    expect(await received?.onPayload?.(payload, model)).toEqual({
      ...payload, text: { ...text, verbosity: existing === 'high' ? 'high' : 'medium' },
    })
    expect(payload.text).toBe(text)
    expect(payload.text.verbosity).toBe(existing)
  })

  it('adds text when absent and composes async replacement with Fast Mode through the profile', async () => {
    const { provider, model, streamSimple } = fixture()
    const fastMode = new FastModeRegistry()
    fastMode.set('michael-session', true)
    const profile = createOpenAICodexProfile(provider, fastMode, undefined, undefined, undefined, resolveVerbosity)
    const replacement = { input: ['replacement'], text: { format: { type: 'text' }, verbosity: 'high' }, service_tier: 'auto' }
    const onPayload = vi.fn(async () => replacement)
    profile.piProvider.streamSimple(model, context, { sessionId: 'michael-session', onPayload })
    const payload = { input: ['original'] }
    expect(await streamSimple.mock.lastCall?.[2]?.onPayload?.(payload, model)).toEqual({ ...replacement, service_tier: 'priority' })
    expect(onPayload).toHaveBeenCalledExactlyOnceWith(payload, model)
    expect(replacement.service_tier).toBe('auto')

    profile.piProvider.streamSimple(model, context, { sessionId: 'michael-session' })
    expect(await streamSimple.mock.lastCall?.[2]?.onPayload?.(payload, model)).toEqual({
      ...payload, text: { verbosity: 'medium' }, service_tier: 'priority',
    })
  })

  it('preserves in-place mutations when an async hook returns undefined', async () => {
    const { provider, model, streamSimple } = fixture()
    const onPayload = vi.fn(async (payload: unknown) => {
      Object.assign(payload as object, { text: { format: { type: 'text' }, verbosity: 'high' } })
    })
    withOpenAICodexVerbosity(provider, resolveVerbosity).streamSimple(model, context, { sessionId: 'michael-session', onPayload })
    expect(await streamSimple.mock.lastCall?.[2]?.onPayload?.({ input: [] }, model)).toEqual({
      input: [], text: { format: { type: 'text' }, verbosity: 'high' },
    })
  })

  it.each([null, 'opaque', []])('leaves non-record hook replacements alone (%j)', async replacement => {
    const { provider, model, streamSimple } = fixture()
    withOpenAICodexVerbosity(provider, resolveVerbosity).streamSimple(model, context, {
      sessionId: 'michael-session', onPayload: async () => replacement,
    })
    expect(await streamSimple.mock.lastCall?.[2]?.onPayload?.({}, model)).toBe(replacement)
  })

  it('passes the exact options through for other sessions, no session, and no resolver', () => {
    const { provider, model, streamSimple } = fixture()
    const wrapped = withOpenAICodexVerbosity(provider, resolveVerbosity)
    for (const options of [undefined, {}, { sessionId: 'other-preset', onPayload: vi.fn() }]) {
      wrapped.streamSimple(model, context, options)
      expect(streamSimple.mock.lastCall?.[2]).toBe(options)
    }
    const options = { sessionId: 'michael-session', onPayload: vi.fn() }
    withOpenAICodexVerbosity(provider).streamSimple(model, context, options)
    expect(streamSimple.mock.lastCall?.[2]).toBe(options)
  })

  it('does not resolve or modify requests without a session or with another provider/model provider', () => {
    const { provider, model, streamSimple } = fixture()
    const resolver = vi.fn(() => 'medium' as const)
    const options = { sessionId: 'michael-session' }
    withOpenAICodexVerbosity({ ...provider, id: 'other' }, resolver).streamSimple(model, context, options)
    expect(streamSimple.mock.lastCall?.[2]).toBe(options)
    withOpenAICodexVerbosity(provider, resolver).streamSimple({ ...model, provider: 'other' }, context, options)
    expect(streamSimple.mock.lastCall?.[2]).toBe(options)
    withOpenAICodexVerbosity(provider, resolver).streamSimple(model, context)
    expect(streamSimple.mock.lastCall?.[2]).toBeUndefined()
    expect(resolver).not.toHaveBeenCalled()
  })
})
