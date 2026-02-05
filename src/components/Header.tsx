import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, LogOut, Bell, HelpCircle } from 'lucide-react-native';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { theme, shadows, fonts } from '../constants/theme';
import type { User as UserType } from '../types/user.types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.6; // 60% of screen

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    // Animation values
    const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Pan responder for swipe gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to downward swipes
                return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // If swiped down more than 150px, close the sheet
                if (gestureState.dy > 150 || gestureState.vy > 0.5) {
                    closeSheet();
                } else {
                    // Bounce back to open position
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 7,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        loadUserProfile();
    }, []);

    useEffect(() => {
        if (menuVisible) {
            // Slide up and fade in backdrop
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 10,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [menuVisible]);

    const loadUserProfile = async () => {
        try {
            const profile = await userService.getCurrentUser();
            setUser(profile);
        } catch (error: any) {
            console.error('Failed to load user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: BOTTOM_SHEET_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setMenuVisible(false);
            slideAnim.setValue(BOTTOM_SHEET_HEIGHT);
        });
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            showSuccessToast('Logged Out', 'See you next time!');
            closeSheet();
            router.replace('/(auth)/login');
        } catch (error: any) {
            showErrorToast('Logout Failed', error.message || 'Please try again');
        }
    };

    const getInitials = () => {
        if (!user?.username) return '?';
        const names = user.username.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return user.username.substring(0, 2).toUpperCase();
    };

    return (
        <>
            {/* Header */}
            <View
                className="px-4 py-5 border-b-2"
                style={{
                    backgroundColor: `${theme.card}F0`,
                    borderBottomColor: theme.border,
                }}
            >
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: theme.primary, fontFamily: fonts.bold }}
                        >
                            TripTogether
                        </Text>
                        <Text
                            className="text-xs mt-1 font-medium"
                            style={{ color: theme.mutedForeground, fontFamily: fonts.medium }}
                        >
                            Group travel made simple
                        </Text>
                    </View>

                    {/* Avatar Button */}
                    <Pressable
                        onPress={() => setMenuVisible(true)}
                        className="w-12 h-12 rounded-full items-center justify-center border-2"
                        style={{
                            backgroundColor: `${theme.primary}15`,
                            borderColor: theme.primary,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                            <Text
                                className="font-bold text-base"
                                style={{ color: theme.primary, fontFamily: fonts.bold }}
                            >
                                {getInitials()}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Bottom Sheet Modal */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="none"
                onRequestClose={closeSheet}
            >
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.bottomSheet,
                        {
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Handle/Drag Indicator */}
                    <View style={styles.handle} />

                    <View style={styles.content}>
                        {/* User Info */}
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.username || 'User'}</Text>
                            <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
                            {user?.isEmailVerified && (
                                <View className="flex-row items-center gap-1 mt-1">
                                    <View
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: theme.accent }}
                                    />
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            )}
                        </View>

                        {/* Menu Items */}
                        <View style={styles.menuItems}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItem,
                                    pressed && styles.menuItemPressed,
                                ]}
                                onPress={() => {
                                    closeSheet();
                                    setTimeout(() => router.push('/profile'), 300);
                                }}
                            >
                                <User size={24} color={theme.primary} />
                                <Text style={styles.menuItemText}>Profile</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItem,
                                    pressed && styles.menuItemPressed,
                                ]}
                                onPress={closeSheet}
                            >
                                <Settings size={24} color={theme.primary} />
                                <Text style={styles.menuItemText}>Settings</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItem,
                                    pressed && styles.menuItemPressed,
                                ]}
                                onPress={closeSheet}
                            >
                                <Bell size={24} color={theme.primary} />
                                <Text style={styles.menuItemText}>Notifications</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.menuItem,
                                    pressed && styles.menuItemPressed,
                                ]}
                                onPress={closeSheet}
                            >
                                <HelpCircle size={24} color={theme.primary} />
                                <Text style={styles.menuItemText}>Help & Support</Text>
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Logout */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.logoutButton,
                                pressed && styles.menuItemPressed,
                            ]}
                            onPress={handleLogout}
                        >
                            <LogOut size={24} color={theme.destructive} />
                            <Text style={styles.logoutText}>Logout</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: BOTTOM_SHEET_HEIGHT,
        backgroundColor: theme.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: theme.primary,
        ...shadows.retro,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: theme.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    userInfo: {
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
        marginBottom: 8,
    },
    userName: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    verifiedText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.accent,
    },
    menuItems: {
        paddingVertical: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        minHeight: 56,
    },
    menuItemPressed: {
        backgroundColor: `${theme.primary}10`,
    },
    menuItemText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: theme.foreground,
    },
    divider: {
        height: 2,
        backgroundColor: theme.border,
        marginVertical: 8,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        minHeight: 56,
    },
    logoutText: {
        fontSize: 16,
        fontFamily: fonts.semiBold,
        color: theme.destructive,
    },
});
