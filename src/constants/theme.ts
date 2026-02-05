/**
 * Retro Theme Colors - Updated to match prototype
 * Warm terracotta/rust tones for a fresh, vibrant retro feel
 * 
 * Colors extracted from prototype design
 */

export const colors = {
    // Light Mode (Default) - Matching prototype
    light: {
        background: '#F9F6F0',      // Warm cream background
        foreground: '#2B1810',      // Very dark brown for text
        card: '#FFFCF7',            // Slightly warmer white for cards
        cardForeground: '#2B1810',  // Dark brown text on cards
        popover: '#FFFCF7',
        popoverForeground: '#2B1810',
        primary: '#A0462D',         // Terracotta/rust - main brand color from prototype
        primaryForeground: '#FFFCF7', // Cream text on primary
        secondary: '#7B9B7D',       // Sage green for secondary actions
        secondaryForeground: '#FFFCF7',
        muted: '#E8E0D5',           // Muted beige
        mutedForeground: '#6B5D52', // Medium brown for muted text
        accent: '#5A8F5E',          // Fresh sage green for positive/success
        accentForeground: '#FFFCF7',
        destructive: '#C84B3E',     // Warm red for negative/errors
        destructiveForeground: '#FFFCF7',
        border: '#D4C4B0',          // Soft tan border
        input: '#F0EBE3',           // Light warm gray for inputs
        ring: '#A0462D',            // Terracotta ring color
    },

    // Dark Mode - More vibrant for dark theme
    dark: {
        background: '#1C1410',
        foreground: '#F9F6F0',
        card: '#2A2117',
        cardForeground: '#F9F6F0',
        popover: '#2A2117',
        popoverForeground: '#F9F6F0',
        primary: '#C85A3E',         // Brighter terracotta for dark mode
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

// Current theme (can be extended for dark mode support)
export const theme = colors.light;

// Shadow styles for retro effect - using terracotta
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

// Spacing
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
};

// Border radius
export const radius = {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    full: 9999,
};

// Font families - IBM Plex Mono
export const fonts = {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
    semiBold: 'IBMPlexMono_600SemiBold',
    bold: 'IBMPlexMono_700Bold',
};
