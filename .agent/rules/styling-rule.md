---
trigger: always_on
---

# TripTogether - UI Styling Guide & Ruleset

## Overview

TripTogether uses a **"Clean 80s Retro"** design aesthetic - a vintage computer-inspired palette with earth tones, combining modern usability with nostalgic visual elements. The design is mobile-first and emphasizes clarity, consistency, and delightful micro-interactions.

---

## 1. Color System

### 1.1 Design Tokens (CSS Variables)

All colors are defined using the **OKLCH** color space for perceptual uniformity.

#### Light Mode (`:root`)

| Token | OKLCH Value | Usage |
|-------|-------------|-------|
| `--background` | `oklch(0.95 0.02 85)` | Main app background |
| `--foreground` | `oklch(0.25 0.03 45)` | Primary text color |
| `--card` | `oklch(0.98 0.01 85)` | Card surfaces |
| `--card-foreground` | `oklch(0.25 0.03 45)` | Card text |
| `--popover` | `oklch(0.98 0.01 85)` | Popover backgrounds |
| `--popover-foreground` | `oklch(0.25 0.03 45)` | Popover text |
| `--primary` | `oklch(0.50 0.12 35)` | Primary brand color (warm brown) |
| `--primary-foreground` | `oklch(0.98 0.01 85)` | Text on primary |
| `--secondary` | `oklch(0.45 0.10 205)` | Secondary color (teal) |
| `--secondary-foreground` | `oklch(0.98 0.01 85)` | Text on secondary |
| `--muted` | `oklch(0.88 0.02 85)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.50 0.02 45)` | Secondary/helper text |
| `--accent` | `oklch(0.60 0.14 125)` | Accent color (green - positive) |
| `--accent-foreground` | `oklch(0.98 0.01 85)` | Text on accent |
| `--destructive` | `oklch(0.55 0.20 25)` | Error/negative states (red) |
| `--destructive-foreground` | `oklch(0.98 0.01 85)` | Text on destructive |
| `--border` | `oklch(0.80 0.02 85)` | Border color |
| `--input` | `oklch(0.92 0.02 85)` | Input backgrounds |
| `--ring` | `oklch(0.50 0.12 35)` | Focus ring color |

#### Dark Mode (`.dark`)

| Token | OKLCH Value | Usage |
|-------|-------------|-------|
| `--background` | `oklch(0.20 0.03 45)` | Main app background |
| `--foreground` | `oklch(0.95 0.02 85)` | Primary text color |
| `--card` | `oklch(0.23 0.03 45)` | Card surfaces |
| `--primary` | `oklch(0.65 0.12 35)` | Primary brand color (lighter) |
| `--secondary` | `oklch(0.60 0.10 205)` | Secondary color (lighter) |
| `--muted` | `oklch(0.30 0.03 45)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.65 0.02 85)` | Secondary text |
| `--accent` | `oklch(0.70 0.14 125)` | Accent color (brighter green) |
| `--destructive` | `oklch(0.60 0.20 25)` | Error states |
| `--border` | `oklch(0.35 0.03 45)` | Border color |
| `--input` | `oklch(0.28 0.03 45)` | Input backgrounds |

### 1.2 Semantic Color Usage

```
Primary     → Main actions, branding, links, active states
Secondary   → Alternate actions, info states, tags
Accent      → Success, positive values (money owed TO you), confirmations
Destructive → Errors, warnings, negative values (money YOU owe)
Muted       → Disabled states, subtle backgrounds, secondary info
```

### 1.3 Financial Color Conventions

- **Positive balance** (you're owed): `text-accent` with `TrendingUp` icon
- **Negative balance** (you owe): `text-destructive` with `TrendingDown` icon
- **Settled/Zero balance**: `text-muted-foreground`

---

## 2. Typography

### 2.1 Font Family

**Primary Font**: IBM Plex Mono
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- Applied via: `font-sans` class
- Fallback: `'Geist Mono', 'Geist Mono Fallback'`

```tsx
// layout.tsx configuration
const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans' 
});
```

### 2.2 Typography Scale

| Element | Class | Size | Weight |
|---------|-------|------|--------|
| Page Title | `text-2xl font-bold` | 24px | 700 |
| Section Header | `text-xl font-bold` | 20px | 700 |
| Card Title | `text-lg font-bold` | 18px | 700 |
| Subheader | `text-base font-bold` | 16px | 700 |
| Body Text | `text-sm` | 14px | 400 |
| Small/Helper | `text-xs` | 12px | 400 |
| Labels | `text-xs font-medium` | 12px | 500 |
| Mono Values | `font-mono text-lg font-bold` | 18px | 700 |

### 2.3 Text Colors

```
text-foreground       → Primary content
text-muted-foreground → Secondary/helper text
text-primary          → Emphasis, links
text-accent           → Success messages
text-destructive      → Error messages
```

---

## 3. Spacing System

### 3.1 Base Spacing (Tailwind Scale)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight inline spacing |
| `gap-1.5` | 6px | Icon + text pairs |
| `gap-2` | 8px | Small component spacing |
| `gap-3` | 12px | Card internal sections |
| `gap-4` | 16px | Standard spacing |
| `gap-6` | 24px | Section spacing |

### 3.2 Padding Patterns

```
Cards:           p-4, p-6 (larger feature cards)
Buttons:         px-3 py-1.5 (sm), px-4 py-2 (default)
Inputs:          px-3 py-2
List Items:      p-3, p-4
Page Container:  px-4 py-6
Header:          px-4 py-3, py-5
```

### 3.3 Container Widths

```
max-w-2xl  → Main content container (672px)
max-w-md   → Dialogs, modals (448px)
w-full     → Full-width elements
```

---

## 4. Border & Radius System

### 4.1 Border Radius

| Class | Value | Usage |
|-------|-------|-------|
| `rounded` | 4px | Small elements, tags |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards, dialogs |
| `rounded-xl` | 12px | Feature cards |
| `rounded-2xl` | 16px | Large cards |
| `rounded-3xl` | 24px | Hero cards |
| `rounded-full` | 9999px | Avatars, pills, icons |

### 4.2 Border Patterns

```
border-2 border-border       → Standard card border
border-2 border-primary      → Selected/active state
border border-primary/20     → Subtle highlight
border-t border-border       → Divider line
border-dashed border-border  → Upload areas, CTAs
```

---

## 5. Shadow System

### 5.1 Retro Shadow Classes

```css
.retro-shadow {
  box-shadow: 4px 4px 0 oklch(0.50 0.12 35 / 0.15);
}

.retro-shadow-sm {
  box-shadow: 2px 2px 0 oklch(0.50 0.12 35 / 0.1);
}
```

### 5.2 Usage

- Feature cards: `retro-shadow`
- Interactive cards: `retro-shadow` + `retro-card-hover`
- Subtle elements: `retro-shadow-sm`

---

## 6. Layout Patterns

### 6.1 Page Structure

```tsx
<div className="min-h-screen bg-background">
  {/* Sticky Header */}
  <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-2 border-border">
    <div className="container mx-auto px-4 py-3">
      {/* Header content */}
    </div>
  </header>

  {/* Main Content */}
  <main className="container mx-auto px-4 py-6 max-w-2xl pb-20">
    {/* Page content */}
  </main>

  {/* Optional: Fixed Bottom Navigation */}
  <nav className="fixed bottom-0 left-0 right-0 ...">
    {/* Nav items */}
  </nav>
</div>
```

### 6.2 Card Layouts

```tsx
// Standard Card
<Card className="p-4 border-2 border-border">
  {/* Content */}
</Card>

// Feature Card with Shadow
<Card className="p-6 bg-card border-2 border-primary retro-shadow retro-card-hover">
  {/* Content */}
</Card>

// Interactive Card
<Card className="p-4 hover:border-primary transition-all cursor-pointer border-2 retro-card-hover">
  {/* Content */}
</Card>
```

### 6.3 Grid Patterns

```tsx
// 2-column grid
<div className="grid grid-cols-2 gap-2">

// 3-column grid (stats)
<div className="grid grid-cols-3 gap-3">

// Auto-fit responsive grid
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
```

### 6.4 Flexbox Patterns

```tsx
// Header row
<div className="flex items-center justify-between">

// Icon + Text pair
<div className="flex items-center gap-1.5">

// Vertical stack
<div className="flex flex-col gap-4">

// Centered content
<div className="flex items-center justify-center">
```

---

## 7. Component Patterns

### 7.1 Buttons

```tsx
// Primary Button
<Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold pixel-button">

// Ghost Button
<Button variant="ghost" className="hover:bg-primary/10">

// Outline Button
<Button variant="outline" className="border-2 bg-transparent">

// Icon Button
<Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10">

// Full-width CTA
<Button size="lg" className="w-full">
```

### 7.2 Inputs

```tsx
// Standard Input
<Input className="border-2 border-border focus:border-primary" />

// Large Input
<Input className="text-lg p-4 border-2" />

// Select Dropdown
<select className="w-full p-2 rounded-lg bg-card border-2 border-border text-sm font-medium focus:border-primary outline-none">
```

### 7.3 Tabs

```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-xl">
    <TabsTrigger value="tab1" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
      Tab 1
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    {/* Content */}
  </TabsContent>
</Tabs>
```

### 7.4 Avatars

```tsx
// Member Avatar
<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-sm">
  {name.charAt(0)}
</div>

// Small Avatar
<div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
  {initial}
</div>

// Stacked Avatars
<div className="flex -space-x-2">
  {avatars.map((a, i) => (
    <div key={i} className="w-7 h-7 rounded-full border-2 border-card ...">
      {a}
    </div>
  ))}
</div>
```

### 7.5 Status Badges

```tsx
// Admin Badge
<span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
  Admin
</span>

// Confirmed Badge
<div className="flex items-center gap-1 text-accent">
  <CheckCircle2 className="h-4 w-4" />
  <span className="text-xs font-medium">Confirmed</span>
</div>

// Pending Badge
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
  Pending
</span>
```

---

## 8. Icons

### 8.1 Icon Library

**Primary**: Lucide React

### 8.2 Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| XS | `h-3 w-3` | Inline with small text |
| SM | `h-3.5 w-3.5` | List items, badges |
| MD | `h-4 w-4` | Buttons, inputs |
| LG | `h-5 w-5` | Headers, emphasis |
| XL | `h-6 w-6` | Feature icons |

### 8.3 Common Icons

```
Navigation: ArrowLeft, ArrowRight, Home, Users, Camera, BookOpen
Actions: Plus, Edit, Check, X, Download, Upload, Copy
Status: TrendingUp, TrendingDown, Clock, Calendar, MapPin
Features: Heart, MessageCircle, Send, Sparkles, Zap
Time: Sunrise, Sun, Sunset, Moon
```

---

## 9. Animation & Effects

### 9.1 Transition Classes

```
transition-all           → All properties
transition-colors        → Color changes only
transition-transform     → Transform changes

Duration: default (150ms)
Timing: ease-in-out (default)
```

### 9.2 Hover Effects

```css
/* Card hover lift */
.retro-card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.retro-card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 6px 6px 0 oklch(0.50 0.12 35 / 0.2);
}
.retro-card-hover:active {
  transform: translateY(-2px);
  box-shadow: 3px 3px 0 oklch(0.50 0.12 35 / 0.2);
}

/* Button press */
.pixel-button:active::after {
  width: 300px;
  height: 300px;
}

/* Instagram-style card */
.instagram-card:active {
  transform: scale(0.98);
}
```
---

## 10. Do's and Don'ts

### Do's

- Use semantic color tokens (`text-foreground`, `bg-card`)
- Apply `retro-shadow` to feature cards
- Use `gap-*` for spacing between elements
- Maintain consistent border radius (`rounded-lg` for cards)
- Use IBM Plex Mono for all text
- Apply hover states to interactive elements
- Use the established icon size scale

### Don'ts

- Don't use raw color values (no `#ffffff` or `rgb()`)
- Don't mix shadow systems (stick to retro shadows)
- Don't use margin for spacing between siblings (use gap)
- Don't exceed `max-w-2xl` for main content
- Don't use fonts other than IBM Plex Mono
- Don't forget touch states for mobile
- Don't use inconsistent border widths (stick to `border-2`)

---