"use client"

// Re-export from provider for backward compatibility
export { useWorkingDir as useWorkingDirectory, useWorkingDirSafe } from "@/components/WorkingDirProvider"
export type { WorkingDirContextType as UseWorkingDirectoryReturn } from "@/components/WorkingDirProvider"

// Utility to expand ~ to home directory path (for display purposes)
export function expandTilde(path: string, homeDir?: string): string {
  if (path.startsWith("~")) {
    const home = homeDir || (typeof process !== "undefined" ? process.env.HOME : undefined) || "/home/user"
    return path.replace(/^~/, home)
  }
  return path
}

// Utility to compact home directory to ~ (for display)
export function compactPath(path: string, homeDir?: string): string {
  const home = homeDir || (typeof process !== "undefined" ? process.env.HOME : undefined)
  if (home && path.startsWith(home)) {
    return path.replace(home, "~")
  }
  return path
}

// Check if a path is within or under a working directory
export function isPathUnderWorkingDir(path: string, workingDir: string): boolean {
  // Normalize ~ for comparison
  const normalizedPath = path.startsWith("~") ? path : path
  const normalizedWorkingDir = workingDir.startsWith("~") ? workingDir : workingDir

  // If working dir is ~, everything matches
  if (normalizedWorkingDir === "~") return true

  // Check if path starts with working dir
  return normalizedPath.startsWith(normalizedWorkingDir) ||
         normalizedPath.startsWith(normalizedWorkingDir + "/")
}
