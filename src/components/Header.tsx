import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, LogOut, Bell, HelpCircle } from 'lucide-react-native';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { showSuccessToast, showErrorToast } from '../utils/toast';
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
            showErrorToast('Profile Error', 'Failed to load profile');
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

    // Get user initials for avatar
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
            <View className="bg-[#FAF8F3] border-b-2 border-[#D4CCC0] px-4 py-4">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-[#7A5C47]">TripTogether</Text>
                        <Text className="text-sm text-[#7A6F65]">Group travel made simple</Text>
                    </View>

                    {/* Avatar Button */}
                    <Pressable
                        onPress={() => setMenuVisible(true)}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7A5C47]/20 to-[#5B8C85]/20 items-center justify-center border-2 border-[#7A5C47]"
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#7A5C47" />
                        ) : (
                            <Text className="text-[#7A5C47] font-bold text-base">
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
                    className="flex-1 bg-black/50"
                    onPress={() => setMenuVisible(false)}
                >
                    <View className="absolute top-16 right-4 bg-[#FAF8F3] rounded-xl border-2 border-[#7A5C47] p-2 min-w-[240px] shadow-lg">
                        {/* User Info */}
                        <View className="px-3 py-3 border-b-2 border-[#D4CCC0]">
                            <Text className="text-base font-bold text-[#3D3530]">
                                {user?.username || 'User'}
                            </Text>
                            <Text className="text-sm text-[#7A6F65]">
                                {user?.email || 'email@example.com'}
                            </Text>
                            {user?.isEmailVerified && (
                                <View className="flex-row items-center gap-1 mt-1">
                                    <View className="w-2 h-2 rounded-full bg-[#6B8E4E]" />
                                    <Text className="text-xs text-[#6B8E4E]">Verified</Text>
                                </View>
                            )}
                        </View>

                        {/* Menu Items */}
                        <View className="py-1">
                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 active:bg-[#7A5C47]/10 rounded-lg"
                                onPress={() => {
                                    setMenuVisible(false);
                                    // TODO: Navigate to profile
                                }}
                            >
                                <User size={20} color="#7A5C47" />
                                <Text className="text-base text-[#3D3530]">Profile</Text>
                            </Pressable>

                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 active:bg-[#7A5C47]/10 rounded-lg"
                                onPress={() => {
                                    setMenuVisible(false);
                                    // TODO: Navigate to settings
                                }}
                            >
                                <Settings size={20} color="#7A5C47" />
                                <Text className="text-base text-[#3D3530]">Settings</Text>
                            </Pressable>

                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 active:bg-[#7A5C47]/10 rounded-lg"
                                onPress={() => {
                                    setMenuVisible(false);
                                    // TODO: Navigate to notifications
                                }}
                            >
                                <Bell size={20} color="#7A5C47" />
                                <Text className="text-base text-[#3D3530]">Notifications</Text>
                            </Pressable>

                            <Pressable
                                className="flex-row items-center gap-3 px-3 py-3 active:bg-[#7A5C47]/10 rounded-lg"
                                onPress={() => {
                                    setMenuVisible(false);
                                    // TODO: Navigate to help
                                }}
                            >
                                <HelpCircle size={20} color="#7A5C47" />
                                <Text className="text-base text-[#3D3530]">Help & Support</Text>
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View className="h-[2px] bg-[#D4CCC0] my-1" />

                        {/* Logout */}
                        <Pressable
                            className="flex-row items-center gap-3 px-3 py-3 active:bg-[#A85442]/10 rounded-lg"
                            onPress={handleLogout}
                        >
                            <LogOut size={20} color="#A85442" />
                            <Text className="text-base text-[#A85442] font-semibold">Logout</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}
