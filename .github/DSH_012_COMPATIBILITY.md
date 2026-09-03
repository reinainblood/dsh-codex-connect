# DSH Desktop 2.0.4 compatibility

This fork branch adapts the upstream Codex Connect `0.1.0-alpha.4.25` release
to the exact runtime shipped in DSH Desktop 2.0.4:

- DSH plugin APIs: `0.1.2-alpha.1`
- `@earendil-works/pi-ai`: `0.84.3`
- `@deepseek-ai/cordis`: `4.0.1`
- Node.js: `^22.19.0 || >=24.0.0`

It is intentionally separate from upstream Alpha 4.25, which remains verified
for DSH `0.1.2-alpha.5`. DSH Desktop 2.0.5 moved to DSH `0.1.2-rc.1` and is not
covered by this branch.

## Compatibility changes

- Retarget all declared DSH peers and diagnostics to the Desktop 2.0.4 bundle.
- Use `deepEqualJson`, `settingsNamespace`, and `installSettingsSection` from
  the alpha.1 `dsh-settings` API instead of the later `dsh-util-values` and
  settings-service surface.
- Retain Alpha 4.25's Models account card, modular Plugin settings, server-driven
  quota windows, proxy workflow, compatibility diagnostics, and Auto-review UI.
- Serve a fork-owned verified compatibility catalog so the update card evaluates
  the tested fork/runtime pair instead of applying upstream Alpha 4.25's
  alpha.5-only record.

## Acceptance evidence

The fork was tested against DSH Desktop 2.0.4's packaged CLI and Host modules,
not inferred from package names alone:

1. An isolated profile loaded exactly one `llm-openai-codex` provider.
2. `doctor --json` reported plugin `0.1.0-alpha.4.25`, DSH API
   `0.1.2-alpha.1`, and pi-ai `0.84.3` as compatible with no provider conflict.
3. A disposable Web boot rendered Codex Connect under both Settings -> Plugins
   and Settings -> Models without browser errors.
4. The Plugin card showed version 4.25, account, models, network, and capability
   modules; the capability module rendered Auto-review, search, and GPT Image
   controls.
5. The real Desktop profile must still preserve its existing OAuth state,
   default model, global search route, model visibility, and context-window
   override during installation and be checked again after restart.

The removed alpha.1 npm artifacts make a fresh registry-only dependency install
impossible. Runtime acceptance therefore uses the exact modules embedded by DSH
Desktop 2.0.4. The GitHub package includes committed build output, as required
for profile installation without a local build step.
