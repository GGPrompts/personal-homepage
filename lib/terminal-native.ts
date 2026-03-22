import { spawn } from "child_process"
import { homedir } from "os"
import { stat } from "fs/promises"

export function expandHome(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return path.replace("~", homedir())
  }
  return path
}

export async function validateWorkDir(path: string): Promise<boolean> {
  try {
    const expanded = expandHome(path)
    const stats = await stat(expanded)
    return stats.isDirectory()
  } catch {
    return false
  }
}

export function spawnKittyTerminal(opts: {
  command?: string
  workingDir?: string
  name?: string
}): void {
  const args: string[] = ["--detach"]

  if (opts.name) {
    args.push("--title", opts.name)
  }

  const cwd = opts.workingDir ? expandHome(opts.workingDir) : homedir()
  args.push("--working-directory", cwd)

  if (opts.command) {
    args.push("--", "bash", "-c", opts.command)
  }

  const child = spawn("kitty", args, {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
}
