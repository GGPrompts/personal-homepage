import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import {
  parsePyradioStations,
  resolveStationUrls,
  type RadioStation,
} from '@/lib/radio-utils'

const PYRADIO_STATIONS_PATH = path.join(
  os.homedir(),
  '.config',
  'pyradio',
  'stations.csv'
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const resolve = searchParams.get('resolve') === 'true'

    // Check if file exists
    try {
      await fs.access(PYRADIO_STATIONS_PATH)
    } catch {
      return NextResponse.json(
        {
          stations: [],
          message: 'No pyradio stations file found at ~/.config/pyradio/stations.csv',
          path: PYRADIO_STATIONS_PATH,
        },
        { status: 200 }
      )
    }

    // Read the stations file
    const content = await fs.readFile(PYRADIO_STATIONS_PATH, 'utf-8')

    // Parse the CSV
    let stations = parsePyradioStations(content)

    // Optionally resolve playlist URLs to direct streams
    if (resolve) {
      stations = await resolveStationUrls(stations)
    }

    return NextResponse.json({
      stations,
      count: stations.length,
      path: PYRADIO_STATIONS_PATH,
    })
  } catch (error) {
    console.error('Error reading pyradio stations:', error)
    return NextResponse.json(
      {
        error: 'Failed to read pyradio stations',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
