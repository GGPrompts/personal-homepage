# Design System

Uses the same design system as portfolio-style-guides project.

## Themes

Four theme variants available:
1. **Terminal** (default) - Green/cyan on dark
2. **Amber** - Warm amber tones
3. **Carbon** - Neutral grays
4. **Light** - Light mode variant

### Theme Variables (Terminal)

```css
--primary: hsl(160 84% 39%)      /* Terminal green/cyan */
--background: hsl(220 13% 5%)    /* Dark slate */
--border: hsl(160 60% 25%)       /* Cyan border */
```

## Glassmorphism Utilities

```css
.glass        /* Semi-transparent with blur */
.glass-dark   /* Darker glass effect */
.terminal-glow /* Text glow effect */
.border-glow  /* Border glow effect */
```

## Background Options

Set via theme customizer:
- `gradient` - Default gradient background
- `mesh` - Mesh gradient
- `textured` - Textured background
- `minimal` - Minimal/clean
- `none` - No background effect

## Usage Guidelines

### Cards and Panels
- Use `glass` and `glass-dark` classes for cards/panels
- Use `terminal-glow` for headings

### Consistency
- Maintain consistency with the 4 theme variants
- Test mobile layout (Sheet drawer navigation)

## File Locations

- Global CSS: `app/globals.css`
- Theme provider: `components/ThemeProvider.tsx`
- Theme customizer: `components/ThemeCustomizer.tsx`
- Background provider: `components/BackgroundProvider.tsx`
- Master background: `components/MasterBackground.tsx`

## Related Project

Components and styling sourced from:
```
~/projects/portfolio-style-guides/
├── components/ui/          # shadcn/ui components
├── app/templates/          # 95+ production templates for reference
└── app/globals.css         # Theme system and glassmorphism utilities
```
