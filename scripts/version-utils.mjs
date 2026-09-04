export function incrementPatchVersion(version) {
  if (typeof version !== 'string') {
    return '0.1.0'
  }

  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(-.+)?$/)
  if (!match) {
    throw new Error(`Unsupported package version: ${version}`)
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  return `${major}.${minor}.${patch + 1}`
}
