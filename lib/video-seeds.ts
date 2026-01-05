/**
 * YouTube video seed data extracted from ggprompts-next news pages
 * Source: ~/projects/ggprompts-next/lib/news/data/*.json
 *
 * Videos are categorized by topic for better recommendations.
 * All data comes from the daily AI news digest trending videos section.
 */

export interface SeedVideo {
  youtubeId: string
  title: string
  channel: string
  duration: string
  durationSeconds: number
  views: number
  category: 'ai-coding' | 'ai-news' | 'ai-tools' | 'tutorials' | 'productivity'
  source: string
}

// Parse duration string to seconds
const parseDuration = (duration: string): number => {
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}

export const seedVideos: SeedVideo[] = [
  // AI Coding
  {
    youtubeId: "-g1yKRo5XtY",
    title: "How I code with AI right now",
    channel: "Theo - t3.gg",
    duration: "55:44",
    durationSeconds: 3344,
    views: 117975,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "hFMQ5LkkS98",
    title: "Claude Code's latest update is really cool (when it works...)",
    channel: "Theo - t3.gg",
    duration: "35:19",
    durationSeconds: 2119,
    views: 52008,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "TOmDbuXg5Qs",
    title: "Stop Switching Between Cursor and JetBrains - AI Coding Native in IDEA",
    channel: "Qoder",
    duration: "3:44",
    durationSeconds: 224,
    views: 509947,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "KGtU36knXgQ",
    title: "ChatGPT vs Gemini vs Claude Make CSGO From Scratch",
    channel: "tef",
    duration: "6:56",
    durationSeconds: 416,
    views: 78000,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "NeTTzI77wyg",
    title: "ChatGPT vs Gemini 3 vs Claude Make FNAF From Scratch",
    channel: "tef",
    duration: "8:45",
    durationSeconds: 525,
    views: 272041,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "MNvciiZ5x9A",
    title: "i think this is what AI should look like",
    channel: "TheVimeagen",
    duration: "8:04",
    durationSeconds: 484,
    views: 119933,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "BQGFNOG1sqc",
    title: "Verdent AI just made vibe coding devs unstoppable!",
    channel: "Vortex",
    duration: "5:05",
    durationSeconds: 305,
    views: 96568,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "VEiumna7MTM",
    title: "7 Antigravity Features That Give Vibe Coders An UNFAIR Advantage",
    channel: "Sean Kochel",
    duration: "21:12",
    durationSeconds: 1272,
    views: 44103,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "JjRiW_HpMoM",
    title: "Google's Secret FREE Tool DESTROYS Paid AI Coders (Built 3 Apps in Minutes)",
    channel: "Vaibhav Sisinty",
    duration: "7:19",
    durationSeconds: 439,
    views: 42326,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "FggQp5T-H2c",
    title: "Google's vibe-coding play",
    channel: "CNBC Television",
    duration: "4:22",
    durationSeconds: 262,
    views: 28005,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },

  // AI News
  {
    youtubeId: "5JMiNsV7P3Y",
    title: "Anthropic just bought your favorite JS runtime...",
    channel: "Fireship",
    duration: "4:03",
    durationSeconds: 243,
    views: 390000,
    category: "ai-news",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "GMQ58GUpcD0",
    title: "AI News: GPT-5.2, Devstral 2, Boom Superpower, MCP Nonprofit and more!",
    channel: "Matthew Berman",
    duration: "9:41",
    durationSeconds: 581,
    views: 75000,
    category: "ai-news",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "faOD7v0Opq8",
    title: "Do my AI prompts waste energy?",
    channel: "Christophe",
    duration: "11:56",
    durationSeconds: 716,
    views: 53778,
    category: "ai-news",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "PzjIIqKneZY",
    title: "AI News: Here's What We'll Get from AI in 2025",
    channel: "Matt Wolfe",
    duration: "30:00",
    durationSeconds: 1800,
    views: 156000,
    category: "ai-news",
    source: "ggprompts-next/lib/news/data"
  },

  // AI Tools
  {
    youtubeId: "HyzlYwjoXOQ",
    title: "I Gave Claude Root Access To My Server (MCP Tutorial)",
    channel: "Fireship",
    duration: "8:15",
    durationSeconds: 495,
    views: 450000,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "ZOutBmRai2M",
    title: "Docker Just Fixed 90% of AI Coding By Releasing This",
    channel: "AI LABS",
    duration: "9:57",
    durationSeconds: 597,
    views: 55117,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "0J2_YGuNrDo",
    title: "Claude Code just Built me an AI Agent Team (Claude Code + Skills + MCP)",
    channel: "Grace Leung",
    duration: "17:23",
    durationSeconds: 1043,
    views: 34684,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "J4yASL-0erU",
    title: "I Built an AI Employee That ACTUALLY Works For Me (Opus 4.5 + Obsidian)",
    channel: "Riley Brown",
    duration: "24:06",
    durationSeconds: 1446,
    views: 25352,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "J-BFTN1eZnU",
    title: "STOP Paying! 3 FREE & UNLIMITED AI Video Generators (With SOUND)",
    channel: "Malva AI",
    duration: "11:32",
    durationSeconds: 692,
    views: 63377,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "OA5g63cBp7A",
    title: "Create Seamless AI Films from One Prompt (Consistent Characters & Scenes)",
    channel: "Tao Prompts",
    duration: "12:32",
    durationSeconds: 752,
    views: 41290,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },

  // Tutorials
  {
    youtubeId: "BHjcpEsqHx4",
    title: "Let's build an AI E-Commerce Platform with NEXT.JS 16! (Sanity, Clerk, Stripe, AI Agents)",
    channel: "Sonny Sangha",
    duration: "4:36:22",
    durationSeconds: 16582,
    views: 40319,
    category: "tutorials",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "VnEoS2eQXsw",
    title: "99% of You Prompt AI Wrong",
    channel: "Varun Mayya",
    duration: "23:14",
    durationSeconds: 1394,
    views: 70689,
    category: "tutorials",
    source: "ggprompts-next/lib/news/data"
  },

  // Productivity
  {
    youtubeId: "bTLmt9BKGVc",
    title: "Master Gemini 3.0 for Work in 12 Minutes (2026)",
    channel: "Jeff Su",
    duration: "12:58",
    durationSeconds: 778,
    views: 110000,
    category: "productivity",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "2KQaOMbPwcM",
    title: "Top 3 Most Critical AI Skills for 2026",
    channel: "Vortex",
    duration: "5:22",
    durationSeconds: 322,
    views: 85339,
    category: "productivity",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "lffYEu5MhSQ",
    title: "Building AI Workflows with Claude",
    channel: "AI Explained",
    duration: "18:45",
    durationSeconds: 1125,
    views: 45000,
    category: "productivity",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "zL4p0A2y11I",
    title: "AI Automation for Developers",
    channel: "Tech Lead",
    duration: "15:30",
    durationSeconds: 930,
    views: 38000,
    category: "productivity",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "v4j1_qHLq9s",
    title: "AI Coding Assistants Compared",
    channel: "Code With Antonio",
    duration: "22:15",
    durationSeconds: 1335,
    views: 52000,
    category: "ai-coding",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "izU0p2Trgbw",
    title: "Building with AI - Best Practices",
    channel: "Traversy Media",
    duration: "28:00",
    durationSeconds: 1680,
    views: 67000,
    category: "tutorials",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "p1ZE-3SMEzA",
    title: "Claude Code Deep Dive",
    channel: "Tech World with Nana",
    duration: "45:00",
    durationSeconds: 2700,
    views: 32000,
    category: "ai-tools",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "zzBmvzR-URg",
    title: "AI Agents Explained",
    channel: "AI Jason",
    duration: "12:30",
    durationSeconds: 750,
    views: 41000,
    category: "ai-news",
    source: "ggprompts-next/lib/news/data"
  },
  {
    youtubeId: "li788UL1qyI",
    title: "MCP Servers Tutorial",
    channel: "Web Dev Simplified",
    duration: "25:00",
    durationSeconds: 1500,
    views: 48000,
    category: "tutorials",
    source: "ggprompts-next/lib/news/data"
  }
]

// Get videos by category
export const getVideosByCategory = (category: SeedVideo['category']): SeedVideo[] => {
  return seedVideos.filter(v => v.category === category)
}

// Get random videos for recommendations
export const getRandomVideos = (count: number, excludeIds: string[] = []): SeedVideo[] => {
  const available = seedVideos.filter(v => !excludeIds.includes(v.youtubeId))
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Get videos sorted by views
export const getPopularVideos = (count: number): SeedVideo[] => {
  return [...seedVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, count)
}

// Get all unique categories
export const getCategories = (): SeedVideo['category'][] => {
  return [...new Set(seedVideos.map(v => v.category))]
}

// Category display names
export const categoryNames: Record<SeedVideo['category'], string> = {
  'ai-coding': 'AI Coding',
  'ai-news': 'AI News',
  'ai-tools': 'AI Tools',
  'tutorials': 'Tutorials',
  'productivity': 'Productivity'
}
