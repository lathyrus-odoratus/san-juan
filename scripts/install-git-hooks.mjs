import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const source = resolve(process.cwd(), 'scripts/git-hooks/pre-commit')
const hooksDir = resolve(process.cwd(), '.git/hooks')
const target = resolve(hooksDir, 'pre-commit')

if (!existsSync('.git')) {
  throw new Error('Cannot install hooks outside a Git repository.')
}

mkdirSync(hooksDir, { recursive: true })
copyFileSync(source, target)
chmodSync(target, 0o755)

console.log('Installed .git/hooks/pre-commit')
