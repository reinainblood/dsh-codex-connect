import { describe, expect, it } from 'vitest'
import { resolveSessionVerbosity } from '../src/session-verbosity.ts'

const selected = (agentPreset: string) => ({ type: 'agent-preset/selected', data: { agentPreset } })

describe('effective session preset verbosity', () => {
  it.each([
    ['cordis', [selected('michael')], 'high'],
    ['michael', [selected('cordis')], undefined],
    ['cordis', [selected('michael'), selected('creator')], undefined],
    ['michael', [selected('creator'), selected('michael')], 'high'],
    ['michael', [], 'high'],
    ['cordis', [], undefined],
  ] as const)('resolves header %s with selection events %j to %s', (agentPreset, events, expected) => {
    expect(resolveSessionVerbosity({ header: { agentPreset }, snapshotEvents: () => events })).toBe(expected)
    // Actual installed Desktop SDK shape: no snapshotEvents method.
    expect(resolveSessionVerbosity({ header: { agentPreset }, events })).toBe(expected)
  })

  it('prefers the newer snapshot API when both shapes exist and preserves its receiver', () => {
    const session = {
      header: { agentPreset: 'cordis' },
      events: [selected('cordis')],
      snapshotEvents() {
        expect(this).toBe(session)
        return [selected('michael')]
      },
    }
    expect(resolveSessionVerbosity(session)).toBe('high')
  })

  it('falls back to the header when neither event API exists', () => {
    expect(resolveSessionVerbosity({ header: { agentPreset: 'michael' } })).toBe('high')
    expect(resolveSessionVerbosity({ header: { agentPreset: 'creator' } })).toBeUndefined()
  })

  it('ignores unrelated events and does not mutate the session', () => {
    const events = Object.freeze([
      Object.freeze(selected('michael')),
      Object.freeze({ type: 'session/title', data: { agentPreset: 'cordis' } }),
    ])
    const session = Object.freeze({ header: Object.freeze({ agentPreset: 'cordis' }), snapshotEvents: () => events })
    expect(resolveSessionVerbosity(session)).toBe('high')
    expect(session.header.agentPreset).toBe('cordis')
    expect(session.snapshotEvents()).toBe(events)
  })

  it('rechecks appended selections rather than caching the creation preset', () => {
    const events = [selected('michael')]
    const session = { header: { agentPreset: 'creator' }, snapshotEvents: () => events }
    expect(resolveSessionVerbosity(session)).toBe('high')
    events.push(selected('creator'))
    expect(resolveSessionVerbosity(session)).toBeUndefined()
  })

  it('handles missing sessions, missing preset, and malformed event data', () => {
    expect(resolveSessionVerbosity()).toBeUndefined()
    expect(resolveSessionVerbosity({ header: {}, snapshotEvents: () => [] })).toBeUndefined()
    const events = [null, {}, { agentPreset: 42 }].map(data => ({ type: 'agent-preset/selected', data }))
    expect(resolveSessionVerbosity({ header: { agentPreset: 'michael' }, snapshotEvents: () => events })).toBe('high')
  })
})
