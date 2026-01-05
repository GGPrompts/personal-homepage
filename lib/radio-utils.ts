/**
 * Radio utility functions for parsing and resolving stream URLs
 */

export interface RadioStation {
  id: string
  name: string
  url: string
  encoding?: string
  icon?: string
  source: 'pyradio' | 'radiobrowser' | 'custom'
}

/**
 * Parse a pyradio stations.csv file content
 * Format: Station Name,http://stream.url/stream.mp3,encoding,icon,...
 */
export function parsePyradioStations(csvContent: string): RadioStation[] {
  const stations: RadioStation[] = []
  const lines = csvContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments (lines starting with #)
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Parse CSV - handle quoted fields
    const fields = parseCSVLine(trimmed)

    if (fields.length >= 2) {
      const name = fields[0].trim()
      const url = fields[1].trim()
      const encoding = fields[2]?.trim() || undefined
      const icon = fields[3]?.trim() || undefined

      if (name && url) {
        stations.push({
          id: `pyradio-${Buffer.from(name + url).toString('base64').substring(0, 16)}`,
          name,
          url,
          encoding,
          icon,
          source: 'pyradio',
        })
      }
    }
  }

  return stations
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Don't forget the last field
  fields.push(current)

  return fields
}

/**
 * Check if a URL is a playlist format that needs resolving
 */
export function isPlaylistUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  return (
    lowerUrl.endsWith('.pls') ||
    lowerUrl.endsWith('.m3u') ||
    lowerUrl.endsWith('.m3u8') ||
    lowerUrl.includes('.pls?') ||
    lowerUrl.includes('.m3u?') ||
    lowerUrl.includes('.m3u8?')
  )
}

/**
 * Parse a PLS playlist and extract stream URLs
 */
export function parsePLS(content: string): string[] {
  const urls: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Match File1=, File2=, etc.
    const match = trimmed.match(/^File\d+=(.+)$/i)
    if (match) {
      urls.push(match[1].trim())
    }
  }

  return urls
}

/**
 * Parse an M3U/M3U8 playlist and extract stream URLs
 */
export function parseM3U(content: string): string[] {
  const urls: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines, comments, and EXTINF lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    // Valid URLs start with http(s):// or are relative paths
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      urls.push(trimmed)
    }
  }

  return urls
}

/**
 * Resolve a playlist URL to get the actual stream URL
 * Returns the original URL if it's already a direct stream
 */
export async function resolveStreamUrl(url: string): Promise<string> {
  if (!isPlaylistUrl(url)) {
    return url
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RadioPlayer/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`Failed to fetch playlist: ${url}`)
      return url
    }

    const content = await response.text()
    const lowerUrl = url.toLowerCase()

    let streamUrls: string[] = []

    if (lowerUrl.includes('.pls')) {
      streamUrls = parsePLS(content)
    } else if (lowerUrl.includes('.m3u')) {
      streamUrls = parseM3U(content)
    }

    // Return the first valid stream URL, or the original if none found
    return streamUrls[0] || url
  } catch (error) {
    console.warn(`Error resolving playlist URL: ${url}`, error)
    return url
  }
}

/**
 * Resolve all station URLs in a list
 */
export async function resolveStationUrls(stations: RadioStation[]): Promise<RadioStation[]> {
  const resolved = await Promise.all(
    stations.map(async (station) => {
      const resolvedUrl = await resolveStreamUrl(station.url)
      return {
        ...station,
        url: resolvedUrl,
      }
    })
  )
  return resolved
}
