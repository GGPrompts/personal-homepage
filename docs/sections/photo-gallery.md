# Photo Gallery

Photo management with EXIF data and lightbox viewer.

## Files
- `app/sections/photo-gallery.tsx` - Main component
- `components/LocalMediaBrowser.tsx` - Local file browser
- `hooks/useMediaLibrary.ts` - Media file handling

## Features
- Photo grid view
- Lightbox viewer with zoom
- Album organization
- EXIF metadata display:
  - Camera model
  - Lens info
  - Focal length, aperture
  - Shutter speed, ISO
- Slideshow mode
- Upload photos
- Browse local media directory
- Favorites system
- Search by title/tags
- Sort options (date, name, size)
- Demo mode with sample photos

## Local Media
- Browse configured media directories
- Supports JPG, PNG, WebP, GIF
- Extracts EXIF where available

## TabzChrome Selectors
- `data-tabz-section="photo-gallery"` - Container
- `data-tabz-input="search"` - Search photos
- `data-tabz-action="upload-photo"` - Upload file
- `data-tabz-action="view-photo"` - Open lightbox
- `data-tabz-action="next-photo"` - Lightbox next
- `data-tabz-action="prev-photo"` - Lightbox previous
- `data-tabz-action="close-lightbox"` - Close viewer
- `data-tabz-action="toggle-favorite"` - Star photo
- `data-tabz-action="start-slideshow"` - Slideshow
- `data-tabz-action="create-album"` - New album
- `data-tabz-list="photos"` - Photo grid
- `data-tabz-item="photo"` - Individual photo

## State
- Custom photos in localStorage
- Demo mode preference in localStorage
