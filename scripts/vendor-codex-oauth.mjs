import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Reproduce the small, login-only source copy; do not modify the host's pi-ai.
const root = fileURLToPath(new URL('../', import.meta.url))
const source = resolve(dirname(fileURLToPath(import.meta.resolve('@earendil-works/pi-ai'))), '..')
const metadata = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'))
if (metadata.version !== '0.84.4') throw new Error('Review the upstream OAuth diff before changing the vendor pin')
const files = ['auth/oauth/openai-codex.js', 'auth/oauth/device-code.js', 'auth/oauth/oauth-page.js', 'auth/oauth/pkce.js', 'utils/provider-env.js']
for (const file of files) {
  let body = await readFile(resolve(source, 'dist', file), 'utf8')
  body = body.replace(/^\/\/# sourceMappingURL=.*\n?/gm, '')
  if (file === files[0]) {
    const original = 'close: () => server.close(),'
    if (body.split(original).length !== 2) throw new Error('Unexpected upstream server close implementation')
    body = body.replace(original, `close: () => new Promise((resolve) => {
                    server.close(() => resolve());
                    server.closeAllConnections();
                }),`)
    body = body.replace('        server.close();\n    }\n}', '        await server.close();\n    }\n}')
  }
  const target = resolve(root, 'vendor/pi-ai-oauth', file)
  if (!process.argv.includes('--write')) {
    if (await readFile(target, 'utf8') !== body) throw new Error(`Vendor drift: ${file}`)
  } else {
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, body)
  }
}
console.log('Pinned OAuth source and callback cleanup patch verified')
