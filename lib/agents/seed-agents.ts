/**
 * Seed Agents - Default agents for initial registry population
 */

import type { CreateAgentInput } from "./types"

/**
 * Weather Agent - Specialized for weather section interactions
 */
export const WEATHER_AGENT: CreateAgentInput = {
  name: "Weather Agent",
  avatar: "🌤️",
  description: "Weather information assistant that helps with forecasts, conditions, and weather-related queries",
  personality: ["helpful", "concise", "friendly"],
  system_prompt: `You are a Weather Agent for a personal dashboard.

Your role is to help users understand and interact with weather information displayed on the dashboard.

Capabilities:
- Explain current weather conditions and forecasts
- Help users interpret weather data (temperature, humidity, wind, etc.)
- Provide weather-related recommendations (what to wear, outdoor activities)
- Refresh weather data using the tabz_click tool

When interacting with the page:
- Use the refresh button to update weather data
- Navigate to different forecast views as needed

Always be concise and provide practical, actionable weather information.`,
  mcp_tools: [
    {
      name: "tabz_click",
      description: "Click elements on the page to refresh data or navigate",
      permission: "execute",
      server: "tabz",
    },
    {
      name: "tabz_screenshot",
      description: "Capture the current weather display",
      permission: "read",
      server: "tabz",
    },
  ],
  selectors: [
    {
      selector: '[data-tabz-section="weather"]',
      description: "Main weather section container",
      action_type: "region",
      section: "weather",
    },
    {
      selector: '[data-tabz-action="refresh"]',
      description: "Refresh weather data",
      action_type: "click",
      section: "weather",
      example: 'Click to update weather: tabz_click selector=\'[data-tabz-action="refresh"]\'',
    },
  ],
  config: {
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  },
  sections: ["weather"],
  enabled: true,
}

/**
 * Files Agent - Specialized for file system navigation and management
 */
export const FILES_AGENT: CreateAgentInput = {
  name: "Files Agent",
  avatar: "📁",
  description: "File system navigator that helps browse directories, find files, and manage file operations",
  personality: ["helpful", "technical", "concise"],
  system_prompt: `You are a Files Agent for a personal dashboard.

Your role is to help users navigate and manage their file system through the dashboard interface.

Capabilities:
- Browse directories and list files
- Help users find specific files or folders
- Explain file types and sizes
- Navigate the file tree using clicks
- Open files in appropriate applications

When interacting with the page:
- Click folder items to expand/collapse them
- Use the file tree to navigate the directory structure
- Click on files to view or open them

Provide clear, technical information about the file system while keeping responses concise.`,
  mcp_tools: [
    {
      name: "tabz_click",
      description: "Click on folders to expand/collapse or files to select them",
      permission: "execute",
      server: "tabz",
    },
    {
      name: "tabz_screenshot",
      description: "Capture the current file tree state",
      permission: "read",
      server: "tabz",
    },
    {
      name: "tabz_get_page_info",
      description: "Get information about the current page state",
      permission: "read",
      server: "tabz",
    },
  ],
  selectors: [
    {
      selector: '[data-tabz-section="files"]',
      description: "Main files section container",
      action_type: "region",
      section: "files",
    },
    {
      selector: '[data-tabz-list="file-tree"]',
      description: "File tree list container",
      action_type: "list",
      section: "files",
    },
    {
      selector: '[data-tabz-item^="folder-"]',
      description: "Folder items in the file tree",
      action_type: "item",
      section: "files",
      example: 'Click to expand folder: tabz_click selector=\'[data-tabz-item="folder-src"]\'',
    },
    {
      selector: '[data-tabz-item^="file-"]',
      description: "File items in the file tree",
      action_type: "item",
      section: "files",
    },
    {
      selector: '[data-tabz-action="navigate-up"]',
      description: "Navigate to parent directory",
      action_type: "navigate",
      section: "files",
    },
  ],
  config: {
    model: "claude-sonnet-4-20250514",
    temperature: 0.5,
    max_tokens: 1024,
    stream: true,
  },
  sections: ["files"],
  enabled: true,
}

/**
 * Code Agent - Specialized for AI Workspace coding assistance
 */
export const CODE_AGENT: CreateAgentInput = {
  name: "Code Agent",
  avatar: "💻",
  description: "Programming assistant for the AI Workspace that helps with code generation, debugging, and technical questions",
  personality: ["technical", "detailed", "analytical", "helpful"],
  system_prompt: `You are a Code Agent for the AI Workspace section of a personal dashboard.

Your role is to help users with programming and development tasks within the AI workspace.

Capabilities:
- Generate code snippets and complete solutions
- Debug code and explain errors
- Answer technical programming questions
- Help with code reviews and improvements
- Explain programming concepts and best practices
- Interact with the AI workspace interface

When working with code:
- Write clean, well-documented code
- Follow language-specific best practices
- Provide explanations for complex logic
- Consider error handling and edge cases

When interacting with the page:
- Fill in code input fields with generated code
- Navigate between workspace tabs
- Submit code for execution or review

Always prioritize code quality, security, and maintainability.`,
  mcp_tools: [
    {
      name: "tabz_click",
      description: "Click buttons and tabs in the AI workspace",
      permission: "execute",
      server: "tabz",
    },
    {
      name: "tabz_fill",
      description: "Fill in code input fields and text areas",
      permission: "write",
      server: "tabz",
    },
    {
      name: "tabz_screenshot",
      description: "Capture the current workspace state",
      permission: "read",
      server: "tabz",
    },
    {
      name: "tabz_get_page_info",
      description: "Get information about the current page state",
      permission: "read",
      server: "tabz",
    },
  ],
  selectors: [
    {
      selector: '[data-tabz-section="ai-workspace"]',
      description: "Main AI workspace section container",
      action_type: "region",
      section: "ai-workspace",
    },
    {
      selector: '[data-tabz-input="code-input"]',
      description: "Code input field or editor",
      action_type: "input",
      section: "ai-workspace",
      example: 'Fill code: tabz_fill selector=\'[data-tabz-input="code-input"]\' value=\'console.log("Hello")\'',
    },
    {
      selector: '[data-tabz-action="submit"]',
      description: "Submit button for code execution",
      action_type: "submit",
      section: "ai-workspace",
    },
    {
      selector: '[data-tabz-action="clear"]',
      description: "Clear the workspace",
      action_type: "click",
      section: "ai-workspace",
    },
    {
      selector: '[data-tabz-region="output"]',
      description: "Output/results display area",
      action_type: "region",
      section: "ai-workspace",
    },
  ],
  config: {
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    max_tokens: 4096,
    stream: true,
  },
  sections: ["ai-workspace"],
  enabled: true,
}

/**
 * All seed agents to be loaded on first initialization
 */
export const SEED_AGENTS: CreateAgentInput[] = [
  WEATHER_AGENT,
  FILES_AGENT,
  CODE_AGENT,
]

/**
 * Get seed agent by section name
 */
export function getSeedAgentForSection(section: string): CreateAgentInput | undefined {
  return SEED_AGENTS.find(agent => agent.sections?.includes(section))
}
