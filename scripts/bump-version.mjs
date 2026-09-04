import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { incrementPatchVersion } from './version-utils.mjs'

const packageJsonPath = resolve(process.cwd(), 'package.json')
const packageLockPath = resolve(process.cwd(), 'package-lock.json')

const packageJson = readJson(packageJsonPath)
const packageLock = readJson(packageLockPath)
const nextVersion = incrementPatchVersion(packageJson.version)

packageJson.version = nextVersion

if (packageLock.packages?.['']) {
  packageLock.packages[''].version = nextVersion
}

writeJson(packageJsonPath, packageJson)
writeJson(packageLockPath, packageLock)

console.log(`Version bumped to ${nextVersion}`)

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}
