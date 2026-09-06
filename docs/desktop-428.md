# Desktop 2.0.4 local build of Codex Connect 4.28

Version `0.1.0-alpha.4.28.1` derives from upstream tag
`v0.1.0-alpha.4.28`. It retains the new release's account/request isolation,
transport, cancellation and proxy fixes while carrying the previously installed
Desktop compatibility and Michael-specific verbosity changes forward.

The target remains DSH Desktop 2.0.4, its bundled harness 0.1.2-alpha.1 and pi-ai
0.84.3. The settings namespace/install seam supports that older runtime, JSON
equality is local, and the existing Sol/Astra/GPT-5.5 1M configuration ceilings
are preserved. Michael sessions retain high verbosity without changing other
presets or forcing a reasoning level. This is a personal compatibility build,
not a claim that upstream 4.28 supports Desktop's older API unmodified.

Validation: typecheck, build, 89 focused verbosity/auth/store/proxy/cancellation/
settings tests; isolated installation against the actual Desktop bundled runtime;
doctor reports compatible with no provider conflict. Installed into the Desktop
profile, preserving settings and credentials. Runtime restarted after the active
K2 test completed. Source and package backups remain available locally.

Post-restart live UI verification: Sol answered the one-sentence connection
check in 2.4 seconds; doctor reports version 4.28.1, compatible, and no provider
conflict. The existing K2 two-turn/tool conversation also reloaded intact.
