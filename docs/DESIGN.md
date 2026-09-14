---
name: Garment OS
colors:
  surface: '#fcf8fb'
  surface-dim: '#dcd9dc'
  surface-bright: '#fcf8fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#414753'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#717785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005cbb'
  primary: '#0059b5'
  on-primary: '#ffffff'
  primary-container: '#0071e3'
  on-primary-container: '#fcfbff'
  inverse-primary: '#abc7ff'
  secondary: '#5e5e63'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfe4'
  on-secondary-container: '#626267'
  tertiary: '#5a5b60'
  on-tertiary: '#ffffff'
  tertiary-container: '#737478'
  on-tertiary-container: '#fcfbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#abc7ff'
  on-primary-fixed: '#001b3f'
  on-primary-fixed-variant: '#00458f'
  secondary-fixed: '#e3e2e7'
  secondary-fixed-dim: '#c7c6cb'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46464b'
  tertiary-fixed: '#e2e2e7'
  tertiary-fixed-dim: '#c6c6cb'
  on-tertiary-fixed: '#1a1c1f'
  on-tertiary-fixed-variant: '#45474b'
  background: '#fcf8fb'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  page-title:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '600'
    lineHeight: 41px
    letterSpacing: -0.01em
  section-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  card-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  numeric-data:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px
  container-padding: 32px
  gutter: 24px
---

## Brand & Style
The design system embodies the "Apple Internally Developed" aesthetic: a tool designed for professionals who demand precision, clarity, and a sense of calm efficiency. The brand personality is authoritative yet invisible, allowing the craftsmanship of garment manufacturing to take center stage.

The style is a refined **Minimalism** blended with **Corporate Modern** sensibilities. It prioritizes high-quality typography, generous negative space, and a rigid adherence to a functional hierarchy. Every pixel must feel intentional, avoiding decorative flourishes in favor of structural elegance and high-craftsmanship.

## Colors
The palette is intentionally restrained to evoke an "expensive" and professional atmosphere. 

- **Background:** A light gray (`#F5F5F7`) provides a soft canvas that reduces eye strain compared to pure white.
- **Surface:** Pure white (`#FFFFFF`) is reserved for interactive cards, sheets, and modal containers to create clear elevation.
- **Typography:** Primary text uses a deep onyx (`#1D1D1F`) for maximum legibility, while secondary text uses a muted slate (`#6E6E73`) for metadata.
- **Accent:** The primary blue (`#0071E3`) is used sparingly for primary actions, active states, and critical paths. 
- **Borders:** Thin, subtle strokes (`#D2D2D7`) define boundaries without creating visual noise.

## Typography
The system utilizes **Inter** as its core typeface to replicate the systematic clarity of SF Pro. 

### Key Rules:
- **Numerical Precision:** All numbers, especially in manufacturing tables or inventory counts, must use **Bold** weights and tabular figures (`tnum`) to ensure columns of data align perfectly.
- **Hierarchy:** Use weight over color to denote importance. Headlines should feel substantial and grounded.
- **Mobile Scaling:** For mobile devices, `display` scales to 32px and `page-title` scales to 28px. All other sizes remains constant to maintain legibility.

## Layout & Spacing
The layout relies on a strict **8px grid system**. This spacing rhythm ensures a consistent vertical and horizontal cadence across all views.

- **Grid Strategy:** Use a 12-column fluid grid for desktop views with 24px gutters. 
- **Margins:** High-level containers utilize "generous" 32px or 48px padding to prevent the UI from feeling cramped.
- **Content Density:** In data-heavy environments (like Bill of Materials or Production Schedules), padding can be reduced to 12px (1.5x base), but white space around major sections must remain expansive.
- **Responsive Behavior:** On mobile, side margins shrink to 16px, and multi-column grids collapse into a single-stack vertical flow.

## Elevation & Depth
This design system avoids heavy drop shadows. Depth is primarily communicated through **Tonal Layering** and **Glassmorphism**.

- **Surface Strategy:** Background elements live on `#F5F5F7`. Active containers and cards sit on `#FFFFFF`.
- **Shadows:** When necessary (e.g., a floating card or popover), use a dual-layer shadow:
  - `0 1px 2px rgba(0,0,0,0.02)`
  - `0 8px 16px rgba(0,0,0,0.04)`
- **Modals & Overlays:** Use a `20px` backdrop-blur (saturate 180%) on full-screen overlays to maintain context while focusing the user's attention.
- **Borders:** All cards and inputs must have a 1px solid border in `#D2D2D7`. This "framing" technique is preferred over elevation for a cleaner, more technical look.

## Shapes
The shape language is "Soft-Modern," utilizing large corner radii to offset the rigid professional nature of the software.

- **Cards:** Use a `24px` radius for all primary containers and dashboard widgets.
- **Interactive Elements:** Buttons, text inputs, and dropdowns use a `16px` radius. 
- **Small Components:** Chips and tags use an `8px` or fully rounded pill-shape depending on the context.

## Components

### Buttons
- **Primary:** Background `#0071E3`, Text `#FFFFFF`, 16px radius. Subtle scale down (0.98) on click.
- **Secondary:** Background `#FFFFFF`, Border `#D2D2D7`, Text `#1D1D1F`.
- **Tertiary/Ghost:** No background, Blue or Neutral text. Used for low-priority actions.

### Inputs
- **Text Fields:** 16px radius, `#FFFFFF` background, 1px `#D2D2D7` border. On focus, the border changes to `#0071E3` with a 2px blue "glow" at 10% opacity.
- **Labels:** Always use the `caption` style in `Secondary Text` color, positioned 8px above the input.

### Cards
- White background, 24px radius, 1px border. Padding should be at least 24px.
- Use `Card Title` for headers, often paired with a subtle `Lucide` icon (2px stroke).

### Lists & Tables
- **Table Rows:** 56px minimum height. 1px bottom border in `#F5F5F7`.
- **Selection:** Use a light blue tint (`#0071E3` at 5% opacity) for selected rows.

### Status Indicators
- **Success:** Green tint, **Warning:** Amber tint, **Error:** Red tint.
- Use these colors only for status dots or subtle background washes; never for large structural elements.

### Interaction & Motion
- All transitions are **200ms Ease-Out**. 
- Hover states on cards should trigger a very subtle lift (moving 2px up) and a slight darkening of the border.