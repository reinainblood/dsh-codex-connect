# DSH Desktop 2.0.4 compatibility

This fork branch adapts upstream Codex Connect `0.1.0-alpha.4.26` to the exact
runtime shipped in DSH Desktop 2.0.4:

- DSH plugin APIs: `0.1.2-alpha.1`
- `@earendil-works/pi-ai`: `0.84.3`
- `@deepseek-ai/cordis`: `4.0.1`
- Node.js: `^22.19.0 || >=24.0.0`

Upstream Alpha 4.26 targets DSH `0.1.2-rc.1`. This branch preserves its secure
multi-account OAuth store and Undici update while retaining the alpha.1 API
fallbacks required by Desktop 2.0.4.

## Compatibility changes

- Retarget declared peers and runtime diagnostics to Desktop 2.0.4.
- Use the alpha.1 settings namespace and section installer when the newer
  settings service is absent.
- Fall back to alpha.1 retained Session events and seed boundaries for
  Auto-review and inherited image lookup.
- Keep JSON equality inside the plugin instead of requiring the unavailable
  `dsh-util-values` peer.
- Preserve verified 1,000,000-token client budgets for GPT-5.6 Sol and GPT-5.5.
- Extend the older pi-ai catalog with GPT-6 Astra using the official
  1,050,000-token context, 128,000-token output, and low-through-max reasoning
  contract. Catalog presence does not claim OAuth entitlement; a live request
  remains the required proof.
- Serve a fork-owned compatibility catalog for the tested alpha.1 pairing.

## Acceptance gates

The branch must pass lint, typecheck, unit tests, browser tests, production
build, package inspection, and `check:desktop-204-install`. The Desktop gate
packs the plugin, installs it in an isolated profile, links the exact modules
from `/Applications/DSH Desktop.app`, registers one Codex adapter, and requires
`doctor --json` to report DSH alpha.1 and pi-ai 0.84.3 as compatible.

Real-profile acceptance additionally requires a full Desktop restart followed
by verification of signed-in state, preserved account selection, model
visibility, context overrides, provider uniqueness, and one finite Astra OAuth
response or an exact account-entitlement rejection.
