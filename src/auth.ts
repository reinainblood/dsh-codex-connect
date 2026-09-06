/**
 * OpenAI Codex OAuth orchestration shared by the plugin and standalone launcher.
 * @module dsh-codex-connect/auth
 */

import { createModels } from '@earendil-works/pi-ai'
import type { AuthInteraction, CredentialStore } from '@earendil-works/pi-ai'
import { openaiCodexProvider } from '@earendil-works/pi-ai/providers/openai-codex'
import { openaiCodexOAuth } from '../vendor/pi-ai-oauth/auth/oauth/openai-codex.js'
import { OpenAICodexCredentialStore, OPENAI_CODEX_PROVIDER } from './store.ts'

/** Non-secret login state shown by the launcher. */
export interface OpenAICodexAuthStatus {
  /** Whether a stored OAuth credential exists. */
  authenticated: boolean
  /** Access-token expiry time; refresh is automatic on the next request. */
  expiresAt?: Date
}

/**
 * Complete provider-native OAuth and persist the resulting credential.
 * @param interaction - terminal or UI callbacks for the provider flow.
 * @param store - credential store, defaulting under `$DSH_HOME`.
 */
export async function loginOpenAICodex(
  interaction: AuthInteraction,
  store: OpenAICodexCredentialStore = new OpenAICodexCredentialStore(),
): Promise<void> {
  const models = createModels({ credentials: store })
  const provider = openaiCodexProvider()
  let login: ReturnType<typeof openaiCodexOAuth.login> | undefined
  models.setProvider({ ...provider, auth: { ...provider.auth, oauth: {
    ...openaiCodexOAuth,
    login: callbacks => { login = openaiCodexOAuth.login(callbacks); return login },
  } } })
  try {
    await models.login(OPENAI_CODEX_PROVIDER, 'oauth', interaction)
  } finally {
    // Models may settle cancellation before the provider has closed its callback server.
    await login?.catch(() => undefined)
  }
}

/**
 * Remove the stored OpenAI Codex credential.
 * @param store - credential store, defaulting under `$DSH_HOME`.
 */
export async function logoutOpenAICodex(
  store: OpenAICodexCredentialStore = new OpenAICodexCredentialStore(),
): Promise<void> {
  await store.delete(OPENAI_CODEX_PROVIDER)
}

/**
 * Read non-secret OpenAI Codex login state without refreshing the token.
 * @param store - credential store, defaulting under `$DSH_HOME`.
 * @returns stored login state and expiry.
 */
export async function openAICodexAuthStatus(
  store: CredentialStore = new OpenAICodexCredentialStore(),
): Promise<OpenAICodexAuthStatus> {
  const credential = await store.read(OPENAI_CODEX_PROVIDER)
  return credential?.type === 'oauth'
    ? { authenticated: true, expiresAt: new Date(credential.expires) }
    : { authenticated: false }
}

/** Resolve one captured account, including refresh, without rereading the active selection. */
export async function readOpenAICodexRequestAuth(
  store: Pick<OpenAICodexCredentialStore, 'captureActiveAccount'>,
  signal?: AbortSignal,
): Promise<{ access: string; accountId: string } | undefined> {
  signal?.throwIfAborted()
  const credentials = await store.captureActiveAccount()
  const models = createModels({ credentials })
  models.setProvider(openaiCodexProvider())
  const auth = await models.getAuth(OPENAI_CODEX_PROVIDER, signal === undefined ? undefined : { signal })
  const access = auth?.auth.apiKey
  const credential = await credentials.read(OPENAI_CODEX_PROVIDER)
  if (credential?.type !== 'oauth' || credential.access !== access || !access
    || typeof credential.accountId !== 'string' || credential.accountId.length === 0) return undefined
  return { access, accountId: credential.accountId }
}
