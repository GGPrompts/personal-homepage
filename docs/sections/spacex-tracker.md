# SpaceX Tracker

SpaceX launch schedule and mission history.

## Files
- `app/sections/spacex-tracker.tsx` - Main component

## Features
- Upcoming launches with countdown
- Past launches with success/failure status
- Launch details:
  - Mission patch
  - Rocket info
  - Payload details
  - Landing attempts/successes
  - YouTube webcast links
- Rocket statistics
- Core reuse tracking
- Live countdown timer

## APIs
- SpaceX API (r/SpaceX)

## TabzChrome Selectors
- `data-tabz-section="spacex"` - Container
- `data-tabz-action="refresh-launches"` - Refresh
- `data-tabz-action="view-launch"` - View details
- `data-tabz-action="watch-webcast"` - Open YouTube
- `data-tabz-region="countdown"` - Next launch countdown
- `data-tabz-region="upcoming"` - Upcoming launches
- `data-tabz-region="past"` - Past launches
- `data-tabz-list="launches"` - Launch list
- `data-tabz-item="launch"` - Individual launch

## State
- TanStack Query for caching
