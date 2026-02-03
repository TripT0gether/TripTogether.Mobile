import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { theme } from '../constants/theme';

interface RetroGridProps {
    children: React.ReactNode;
}

/**
 * RetroGrid - Provides the retro grid background pattern
 * Used as a wrapper component for screens
 */
export default function RetroGrid({ children }: RetroGridProps) {
    return (
        <View style={styles.container}>
            {/* Grid Background */}
            <View style={styles.gridContainer}>
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                        <Pattern
                            id="retroGrid"
                            width="24"
                            height="24"
                            patternUnits="userSpaceOnUse"
                        >
                            <Line
                                x1="24"
                                y1="0"
                                x2="24"
                                y2="24"
                                stroke={theme.primary}
                                strokeWidth="1"
                                strokeOpacity="0.05"
                            />
                            <Line
                                x1="0"
                                y1="24"
                                x2="24"
                                y2="24"
                                stroke={theme.primary}
                                strokeWidth="1"
                                strokeOpacity="0.05"
                            />
                        </Pattern>
                    </Defs>
                    <Rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="url(#retroGrid)"
                    />
                </Svg>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    gridContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
    },
});
