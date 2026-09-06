/** Minimal read-only session view; no session mutation or projection registration. */
interface PresetSession {
  readonly header: { readonly agentPreset?: string }
  snapshotEvents?(): readonly { readonly type: string; readonly data: unknown }[]
  readonly events?: readonly { readonly type: string; readonly data: unknown }[]
}

/** Selected presets supersede the creation header, which can be stale. */
export function resolveSessionVerbosity(session?: PresetSession): 'high' | undefined {
  if (!session) return undefined
  // Desktop's installed SDK exposes events; newer SDKs expose snapshotEvents().
  const events = typeof session.snapshotEvents === 'function' ? session.snapshotEvents() : session.events ?? []
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]!
    if (event.type !== 'agent-preset/selected') continue
    const data = event.data
    if (data === null || typeof data !== 'object' || !('agentPreset' in data)) continue
    if (typeof data.agentPreset === 'string') return data.agentPreset === 'michael' ? 'high' : undefined
  }
  return session.header.agentPreset === 'michael' ? 'high' : undefined
}
