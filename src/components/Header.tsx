import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, LogOut, Bell, HelpCircle } from 'lucide-react-native';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { theme, shadows, fonts } from '../constants/theme';
import type { User as UserType } from '../types/user.types';

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    useEffect(() => {
        loadUserProfile();
    }, []);

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

    const handleLogout = async () => {
        try {
            await authService.logout();
            showSuccessToast('Logged Out', 'See you next time!');
            setMenuVisible(false);
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

            {/* User Menu Modal */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable
                    className="flex-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onPress={() => setMenuVisible(false)}
                >
                    <View
                        className="absolute top-16 right-4 rounded-xl border-2 p-2 min-w-[240px]"
                        style={{
                            backgroundColor: theme.card,
                            borderColor: theme.primary,
                            ...shadows.retro,
                        }}
                    >
                        {/* User Info */}
                        <View
                            className="px-3 py-3 border-b-2"
                            style={{ borderBottomColor: theme.border }}
                        >
                            <Text
                                className="text-base font-bold"
                                style={{ color: theme.foreground, fontFamily: fonts.bold }}
                            >
                                {user?.username || 'User'}
                            </Text>
                            <Text
                                className="text-sm"
                                style={{ color: theme.mutedForeground, fontFamily: fonts.regular }}
                            >
                                {user?.email || 'email@example.com'}
                            </Text>
                            {user?.isEmailVerified && (
                                <View className="flex-row items-center gap-1 mt-1">
                                    <View
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: theme.accent }}
                                    />
                                    <Text
                                        className="text-xs"
                                        style={{ color: theme.accent, fontFamily: fonts.regular }}
                                    >
                                        Verified
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Menu Items */}
                        <View className="py-1">
                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:opacity-70"
                                onPress={() => {
                                    setMenuVisible(false);
                                    router.push('/profile');
                                }}
                            >
                                <User size={20} color={theme.primary} />
                                <Text style={{ color: theme.foreground, fontFamily: fonts.regular }} className="text-base">
                                    Profile
                                </Text>
                            </Pressable>

                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:opacity-70"
                                onPress={() => setMenuVisible(false)}
                            >
                                <Settings size={20} color={theme.primary} />
                                <Text style={{ color: theme.foreground, fontFamily: fonts.regular }} className="text-base">
                                    Settings
                                </Text>
                            </Pressable>

                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:opacity-70"
                                onPress={() => setMenuVisible(false)}
                            >
                                <Bell size={20} color={theme.primary} />
                                <Text style={{ color: theme.foreground, fontFamily: fonts.regular }} className="text-base">
                                    Notifications
                                </Text>
                            </Pressable>

                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:opacity-70"
                                onPress={() => setMenuVisible(false)}
                            >
                                <HelpCircle size={20} color={theme.primary} />
                                <Text style={{ color: theme.foreground, fontFamily: fonts.regular }} className="text-base">
                                    Help & Support
                                </Text>
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View
                            className="h-[2px] my-1"
                            style={{ backgroundColor: theme.border }}
                        />

                        {/* Logout */}
                        <Pressable
                            className="flex-row items-center gap-3 px-3 py-3 rounded-lg active:opacity-70"
                            onPress={handleLogout}
                        >
                            <LogOut size={20} color={theme.destructive} />
                            <Text
                                className="text-base font-semibold"
                                style={{ color: theme.destructive, fontFamily: fonts.semiBold }}
                            >
                                Logout
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}
