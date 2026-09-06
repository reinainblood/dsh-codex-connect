# Login-only pi-ai OAuth copy

Source: `@earendil-works/pi-ai@0.84.4`, https://github.com/earendil-works/pi/tree/main/packages/ai, distributed under the MIT license in `docs/licenses/pi-ai-oauth.txt`. Regenerate with `node scripts/vendor-codex-oauth.mjs --write` using the pinned development dependency; without that flag it verifies the exact source and patch without writing.

The only protocol implementation change is callback-server shutdown: close accepted HTTP connections and await server closure. Codex Connect uses this copy for login only; model catalogs, requests, token refresh and credential commit remain with the host pi-ai. No host dependency files or global HTTP methods are patched. Retire this copy when an upstream release provides awaited callback closure and passes the real-socket regression.
