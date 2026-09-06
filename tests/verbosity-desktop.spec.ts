import { randomUUID } from 'node:crypto'
import { access } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveSessionVerbosity } from '../src/session-verbosity.ts'

// Import the deployed OLD SDK, never the newer SDK resolved from devDependencies.
// Detached, synthetic Session instances only: no store, persistence, credentials,
// runtime services, network calls, or reads/writes of real user sessions.
const desktopSessionPath = '/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-session/lib/index.js'
let desktopAvailable = true
try {
  await access(desktopSessionPath)
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') desktopAvailable = false
  else throw error
}
// Only an absent installation is skippable in CI. Import/initialization errors in
// a present installation must fail this suite, not silently become a skip.
const desktop = desktopAvailable ? await import(pathToFileURL(desktopSessionPath).href) : undefined

function createSession(agentPreset: string) {
  const id = randomUUID()
  return desktop!.Session.create(id, undefined, { version: 0, id, createdAt: 0, agentPreset })
}

describe.skipIf(!desktopAvailable)('installed old Desktop Session verbosity compatibility (offline)', () => {
  it('exercises the real .events API without snapshotEvents or a compatibility shim', () => {
    const session = createSession('michael')
    expect(session).toBeInstanceOf(desktop!.Session)
    expect(session.snapshotEvents).toBeUndefined()
    expect(session.events).toEqual([])
    session.append('agent-preset/selected', { agentPreset: 'cordis' })
    expect(session.events[0]).toMatchObject({
      type: 'agent-preset/selected', data: { agentPreset: 'cordis' },
    })
  })

  it.each([
    ['michael', 'high'],
    ['cordis', undefined],
  ] as const)('falls back to the creation header %s without selection events', (agentPreset, expected) => {
    const session = createSession(agentPreset)
    expect(resolveSessionVerbosity(session)).toBe(expected)
    expect(session.header.agentPreset).toBe(agentPreset)
    expect(session.events).toEqual([])
  })

  it.each([
    ['cordis', 'michael', 'high'],
    ['michael', 'cordis', undefined],
  ] as const)('latest data.agentPreset overrides header %s in favor of %s', (headerPreset, selectedPreset, expected) => {
    const session = createSession(headerPreset)
    session.append('agent-preset/selected', { agentPreset: headerPreset })
    session.append('agent-preset/selected', { agentPreset: selectedPreset })
    // An unrelated newer event must not hide the latest actual selection.
    session.append('session/title', { title: 'Synthetic compatibility fixture', agentPreset: headerPreset })
    const events = session.events
    expect(resolveSessionVerbosity(session)).toBe(expected)
    expect(session.header.agentPreset).toBe(headerPreset)
    expect(session.events).toBe(events)
  })

  it('re-resolves live appends rather than caching an old immutable .events snapshot', () => {
    const session = createSession('cordis')
    session.append('agent-preset/selected', { agentPreset: 'michael' })
    const previousEvents = session.events
    expect(resolveSessionVerbosity(session)).toBe('high')

    session.append('agent-preset/selected', { agentPreset: 'cordis' })
    expect(session.events).not.toBe(previousEvents)
    expect(previousEvents).toHaveLength(1)
    expect(resolveSessionVerbosity(session)).toBeUndefined()

    session.append('agent-preset/selected', { agentPreset: 'michael' })
    expect(resolveSessionVerbosity(session)).toBe('high')
    expect(session.header.agentPreset).toBe('cordis')
    expect(session.events).toHaveLength(3)
  })
})
