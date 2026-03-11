/**
 * useAutoHideHeader.ts
 *
 * Scroll-direction-aware hook that animates a header off-screen when
 * the user scrolls down, and smoothly brings it back on any upward scroll.
 * Uses Animated with useNativeDriver for 60fps performance.
 *
 * Returns:
 * - headerTranslateY: Animated.Value to apply as translateY on the header
 * - onScroll: handler to attach to ScrollView/FlatList
 * - headerHeight: constant used for content padding
 */

import { useRef, useCallback } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

const HEADER_HEIGHT = 90;
const SCROLL_THRESHOLD = 10;

export function useAutoHideHeader(height = HEADER_HEIGHT) {
    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const isHeaderVisible = useRef(true);

    const animateHeader = useCallback((toValue: number) => {
        Animated.spring(headerTranslateY, {
            toValue,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
        }).start();
    }, []);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastScrollY.current;

        if (currentY <= 0) {
            if (!isHeaderVisible.current) {
                isHeaderVisible.current = true;
                animateHeader(0);
            }
            lastScrollY.current = currentY;
            return;
        }

        if (diff > SCROLL_THRESHOLD && isHeaderVisible.current) {
            isHeaderVisible.current = false;
            animateHeader(-height);
        } else if (diff < -SCROLL_THRESHOLD && !isHeaderVisible.current) {
            isHeaderVisible.current = true;
            animateHeader(0);
        }

        lastScrollY.current = currentY;
    }, [height]);

    return { headerTranslateY, onScroll, headerHeight: height };
}
