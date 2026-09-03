#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APP_ROOT = resolve(process.env.DSH_DESKTOP_APP_PATH ?? '/Applications/DSH Desktop.app')
const RUNTIME_ROOT = join(APP_ROOT, 'Contents/Resources/app.asar.unpacked')
const DESKTOP_CLI = join(RUNTIME_ROOT, 'lib/desktop-cli.js')
const EXPECTED_DESKTOP_VERSION = '2.0.4'
const EXPECTED_DSH_VERSION = '0.1.2-alpha.1'
const EXPECTED_PI_AI_VERSION = '0.84.3'

function run(args, environment, options = {}) {
  const result = spawnSync(process.execPath, [DESKTOP_CLI, ...args], {
    cwd: REPO_ROOT,
    env: environment,
    encoding: 'utf8',
    ...options,
  })
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    throw new Error(`Desktop CLI failed (${String(result.status)}): ${args.join(' ')}`)
  }
  return result.stdout
}

function pack(destination, environment) {
  const result = spawnSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', destination,
  ], {
    cwd: REPO_ROOT,
    env: environment,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    throw new Error(`npm pack failed (${String(result.status)})`)
  }
  const parsed = JSON.parse(result.stdout)
  const manifest = Array.isArray(parsed) ? parsed[0] : parsed['dsh-codex-connect'] ?? Object.values(parsed)[0]
  if (manifest?.filename === undefined) throw new Error('npm pack did not return a package filename')
  return join(destination, manifest.filename)
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, 'utf8'))
}

async function linkRuntimePackage(profileDirectory, name) {
  const source = join(RUNTIME_ROOT, 'node_modules', name)
  const destination = join(profileDirectory, 'node_modules', name)
  try {
    await lstat(destination)
    return
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await mkdir(dirname(destination), { recursive: true })
  await symlink(source, destination, 'dir')
}

const temporaryHome = await mkdtemp(join(tmpdir(), 'dsh-codex-connect-desktop204-'))
try {
  const [desktop, piAi] = await Promise.all([
    readJson(join(RUNTIME_ROOT, 'package.json')),
    readJson(join(RUNTIME_ROOT, 'node_modules/@earendil-works/pi-ai/package.json')),
  ])
  if (desktop.version !== EXPECTED_DESKTOP_VERSION) {
    throw new Error(`expected DSH Desktop ${EXPECTED_DESKTOP_VERSION}, found ${String(desktop.version)}`)
  }
  if (desktop.dependencies?.['@deepseek-ai/dsh'] !== EXPECTED_DSH_VERSION) {
    throw new Error('DSH Desktop runtime version mismatch')
  }
  if (piAi.version !== EXPECTED_PI_AI_VERSION) throw new Error('DSH Desktop pi-ai version mismatch')

  const environment = { ...process.env, DSH_HOME: temporaryHome }
  const tarball = pack(temporaryHome, environment)
  run(['plugin', '--profile', 'web', 'add', '--save-exact', `file:${tarball}`], environment)
  const profileDirectory = join(temporaryHome, 'profiles/web')
  const pluginManifest = await readJson(join(REPO_ROOT, 'package.json'))
  for (const dependency of Object.keys(pluginManifest.peerDependencies ?? {})) {
    await linkRuntimePackage(profileDirectory, dependency)
  }
  const inventory = JSON.parse(run(['plugin', '--profile', 'web', 'list', '--json'], environment))
  const plugin = inventory[0]?.dependencies?.['dsh-codex-connect']
  if (plugin === undefined) throw new Error('isolated profile did not install dsh-codex-connect')

  const config = run(['--profile', 'web', '--dump-config'], environment)
  if ((config.match(/^- id: llm-openai-codex$/gmu) ?? []).length !== 1) {
    throw new Error('isolated profile must contain exactly one llm-openai-codex row')
  }
  if (!/^\s+searchProvider: deepseek-official$/mu.test(config)) {
    throw new Error('isolated profile changed the default search provider')
  }

  const doctor = JSON.parse(run([
    'plugin', '--profile', 'web', 'exec', 'dsh-codex-connect', 'doctor', '--json',
  ], environment))
  if (doctor.version !== '0.1.0-alpha.4.25') throw new Error('doctor reported the wrong plugin version')
  if (doctor.providerConflict !== false) throw new Error('doctor found a provider conflict')
  if (doctor.compatibility?.status !== 'compatible') throw new Error('doctor rejected Desktop compatibility')
  if (doctor.compatibility?.packages?.['@deepseek-ai/dsh-llm']?.installed !== EXPECTED_DSH_VERSION) {
    throw new Error('doctor did not resolve the Desktop DSH runtime')
  }
  if (doctor.compatibility?.packages?.['@earendil-works/pi-ai']?.installed !== EXPECTED_PI_AI_VERSION) {
    throw new Error('doctor did not resolve the Desktop pi-ai runtime')
  }

  process.stdout.write(JSON.stringify({
    desktopVersion: desktop.version,
    dshVersion: EXPECTED_DSH_VERSION,
    piAiVersion: EXPECTED_PI_AI_VERSION,
    pluginVersion: doctor.version,
    providerConflict: doctor.providerConflict,
    compatibility: doctor.compatibility.status,
    profile: 'isolated-web',
  }) + '\n')
} finally {
  await rm(temporaryHome, { recursive: true, force: true })
}
