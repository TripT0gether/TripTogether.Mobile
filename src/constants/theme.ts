/**
 * theme.ts
 * 
 * Central design system configuration for TripTogether mobile app.
 * Implements a "Clean 80s Retro" aesthetic with warm earth tones and vintage computer-inspired colors.
 * 
 * Purpose:
 * - Provides consistent color palette across light and dark modes
 * - Exports reusable design tokens (spacing, radius, shadows, fonts)
 * - Ensures brand consistency with terracotta/rust primary color (#A0462D)
 * 
 * Key Exports:
 * - colors: Light and dark mode color palettes with semantic naming (primary, accent, destructive, etc.)
 * - theme: Current active theme (defaults to light mode)
 * - shadows: Retro-style hard shadows (no blur) using terracotta color
 * - spacing: Consistent spacing scale (xs: 4px → 2xl: 32px)
 * - radius: Border radius scale (sm: 4px → full: 9999px)
 * - fonts: IBM Plex Mono font family weights
 * 
 * Design Philosophy:
 * - OKLCH color space for perceptual uniformity (referenced in web prototype)
 * - Warm neutrals (cream, beige, brown) instead of gray
 * - Terracotta (#A0462D) as signature brand color
 * - Hard retro shadows with no blur radius
 * - Monospace typography (IBM Plex Mono) for vintage terminal feel
 * 
 * Used by: All UI components, screens, and styled elements throughout the app
 */

export const colors = {
    light: {
        background: '#F9F6F0',
        foreground: '#2B1810',
        card: '#FFFCF7',
        cardForeground: '#2B1810',
        popover: '#FFFCF7',
        popoverForeground: '#2B1810',
        primary: '#A0462D',
        primaryForeground: '#FFFCF7',
        secondary: '#7B9B7D',
        secondaryForeground: '#FFFCF7',
        muted: '#E8E0D5',
        mutedForeground: '#6B5D52',
        accent: '#5A8F5E',
        accentForeground: '#FFFCF7',
        destructive: '#C84B3E',
        destructiveForeground: '#FFFCF7',
        border: '#D4C4B0',
        input: '#F0EBE3',
        ring: '#A0462D',
    },

    dark: {
        background: '#1C1410',
        foreground: '#F9F6F0',
        card: '#2A2117',
        cardForeground: '#F9F6F0',
        popover: '#2A2117',
        popoverForeground: '#F9F6F0',
        primary: '#C85A3E',
        primaryForeground: '#1C1410',
        secondary: '#8FB391',
        secondaryForeground: '#1C1410',
        muted: '#3A2F24',
        mutedForeground: '#BDB3A8',
        accent: '#6FA573',
        accentForeground: '#1C1410',
        destructive: '#E85D4F',
        destructiveForeground: '#FFFCF7',
        border: '#4A3D32',
        input: '#342B22',
        ring: '#C85A3E',
    },
};

export const theme = colors.light;

export const shadows = {
    retro: {
        shadowColor: '#A0462D',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 0,
        elevation: 4,
    },
    retroSm: {
        shadowColor: '#A0462D',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 0,
        elevation: 2,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
};

export const radius = {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    full: 9999,
};

export const fonts = {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
    semiBold: 'IBMPlexMono_600SemiBold',
    bold: 'IBMPlexMono_700Bold',
};
