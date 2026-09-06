# Local Michael verbosity adaptation

Local connector version: `0.1.0-alpha.4.26.1`, based on the previously installed `6e87523` revision (including its sparse Astra SSE completion fix).

For sessions whose effective preset is **michael**, the outgoing Codex Responses payload uses **`text.verbosity: "high"`**, matching Kirsten's updated AGENTS.md preference and her request for medium or higher. The effective preset is the latest `agent-preset/selected` event, falling back to the session header. Other presets and requests without a matching session keep their previous behavior.

This is a real transport field, not extra persona prose. The current SDK's `streamSimple` normalization drops a raw `textVerbosity` option, so this adaptation uses its supported `onPayload` hook instead. Existing payload hooks, text formatting, Fast Mode and proxy settings are preserved. No auth, model choice, reasoning effort, max-token limits, or permission settings change.

Restart DSH Desktop after installing the versioned local archive. Existing Michael conversations then receive the setting; starting a new conversation is not required for this transport change. A future upstream connector update can replace this local adaptation unless the feature is carried forward.
