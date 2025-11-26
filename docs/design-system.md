# Design System

Uses the same design system as portfolio-style-guides project, with 10 theme variants and glassmorphism utilities.

## Themes

Ten theme variants available:

| Theme | Primary Color | Description |
|-------|--------------|-------------|
| **Terminal** (default) | Green/cyan | Classic terminal aesthetic |
| **Amber** | Golden amber | Warm, retro feel |
| **Carbon** | Neutral grays | Minimal, monochrome |
| **Light** | Blue | Light mode variant |
| **Ocean** | Aqua/turquoise | Deep sea blues |
| **Sunset** | Orange/coral | Warm purple-pink |
| **Forest** | Lime/chartreuse | Nature greens |
| **Midnight** | Magenta/fuchsia | Deep purple nights |
| **Neon** | Hot pink/cyan | Electric, vibrant |
| **Slate** | Sky blue | Professional blue-gray |

### Theme Variables (Terminal)

```css
--primary: hsl(160 84% 39%)      /* Terminal green/cyan */
--background: hsl(220 13% 5%)    /* Dark slate */
--border: hsl(160 60% 25%)       /* Cyan border */
--primary-rgb: 16 185 129        /* For glow effects */
```

## Glassmorphism Utilities

```css
.glass        /* Semi-transparent with blur, theme-aware */
.glass-dark   /* Darker glass effect */
.glass-overlay /* High-opacity for readable overlays */
.terminal-glow /* Text glow effect */
.border-glow  /* Border glow effect */
```

Each glass class has theme-specific overrides for proper appearance across all themes.

## Background Options

Set via theme customizer (background style dropdown):

| Style | Description |
|-------|-------------|
| `gradient` | Default radial gradient background |
| `mesh` | Multi-point mesh gradient (modern look) |
| `textured` | Noise/grain texture overlay |
| `minimal` | Subtle vignette only |
| `none` | No background effect |

### Background Tones

Independent of theme, controls body background gradient:

- Charcoal, Deep Purple, Pure Black, Light
- Ocean, Sunset, Forest, Midnight, Neon Dark, Slate

Light theme automatically converts dark tones to pastel equivalents.

## JSON Viewer Syntax Highlighting

The `JsonViewer` component uses theme-aware colors:

| Element | Default Color | Purpose |
|---------|---------------|---------|
| Keys | `--primary` | Object property names |
| Strings | Teal (160°) | String values |
| Numbers | Cyan (200°) | Numeric values |
| Booleans | Amber (35°) | true/false |
| Null | `--muted-foreground` | null values (italic) |
| Punctuation | `--muted-foreground` | Commas, colons |
| Brackets | `--foreground` @ 70% | {}, [] |

Each theme has custom color overrides in `globals.css` (search for "JSON VIEWER").

## Gradient Text

Use `.gradient-text-theme` for theme-aware gradient text:

```html
<span className="gradient-text-theme">Gradient Text</span>
```

Each theme defines its own gradient colors.

## Usage Guidelines

### Cards and Panels
- Use `glass` and `glass-dark` classes for cards/panels
- Use `terminal-glow` for headings
- Glass classes automatically adapt to each theme

### Responsive Design
- Test mobile layout (Sheet drawer navigation)
- Use `lg:` prefix for desktop-specific styles
- Mobile-first approach

### Animations

Available animation utilities:
- `.animate-gradient` - Gradient position shift (3s)
- `.animate-gradient-fast` - Faster (2s)
- `.animate-gradient-slow` - Slower (5s)
- `.animate-gradient-pulse` - With opacity pulse

## File Locations

| File | Purpose |
|------|---------|
| `app/globals.css` | Theme definitions, utilities, JSON viewer styles |
| `components/ThemeProvider.tsx` | Theme context and persistence |
| `components/ThemeCustomizer.tsx` | Quick theme switcher (header) |
| `components/ThemeSettingsPanel.tsx` | Full settings panel |
| `components/BackgroundProvider.tsx` | Background style context |
| `components/MasterBackground.tsx` | Animated background renderer |
| `components/JsonViewer.tsx` | Syntax-highlighted JSON display |

## Related Project

Components and styling sourced from:
```
~/projects/portfolio-style-guides/
├── components/ui/          # shadcn/ui components
├── app/templates/          # 118 production templates for reference
└── app/globals.css         # Theme system and glassmorphism utilities
```
