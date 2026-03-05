/**
 * Claude CLI helper for GovHound analysis.
 *
 * Uses `claude --print` mode for one-shot structured responses.
 * Reuses binary discovery from lib/ai/claude.ts pattern.
 * Unsets ANTHROPIC_API_KEY to force Claude Max subscription auth.
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Binary discovery — same paths as lib/ai/claude.ts
const CLAUDE_PATHS = [
  join(homedir(), ".local", "bin", "claude"),
  join(homedir(), ".claude", "local", "claude"),
  "/usr/local/bin/claude",
];

const CLAUDE_BIN =
  CLAUDE_PATHS.find((p) => existsSync(p)) || "claude";

/**
 * Call Claude CLI in --print mode for one-shot structured responses.
 * Returns the full text output.
 */
export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["--print", "--output-format", "text"];

    if (systemPrompt) {
      args.push("--system-prompt", systemPrompt);
    }

    // Prompt is passed as a positional argument
    args.push(prompt);

    const env = { ...process.env };
    // Unset API key to force Max subscription auth
    delete env.ANTHROPIC_API_KEY;

    const proc = spawn(CLAUDE_BIN, args, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000, // 2 minute timeout
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `Claude CLI exited with code ${code}: ${stderr || stdout}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}
