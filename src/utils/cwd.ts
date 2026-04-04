import path from 'node:path'

let cwd: string = process.cwd()

export function getCwd(): string {
  return cwd
}

export function setCwd(newCwd: string): void {
  cwd = path.resolve(newCwd)
}
