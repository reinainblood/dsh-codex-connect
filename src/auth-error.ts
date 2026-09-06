/** Public diagnostics never include arbitrary provider messages or nested causes. */
const PUBLIC_MESSAGES = new Set([
  'ChatGPT authorization expired. Please sign in again.',
  'OpenAI Codex sign-in cancelled',
  'OpenAI Codex plugin disposed',
  'openai-codex: account not found',
  'openai-codex: replacement account not found',
  'openai-codex: removing the active account requires replacementAccountKey',
  'openai-codex: replacementAccountKey is only valid when removing the active account',
])

/** Return a bounded diagnostic from a closed vocabulary, never upstream response text. */
export function publicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (PUBLIC_MESSAGES.has(message)) return message
  if (/^OpenAI Codex usage request failed with HTTP [1-5][0-9]{2}$/u.test(message)) return message
  return 'OpenAI Codex operation failed. Please try again.'
}
