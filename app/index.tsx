import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../src/services/authService';
import Header from '../src/components/Header';

// Mock data for demonstration
const mockGroups = [
    {
        id: '1',
        name: 'Lisbon Friends',
        memberCount: 5,
        tripCount: 2,
        balance: -25.50,
        photoCount: 24,
    },
    {
        id: '2',
        name: 'Tokyo Squad',
        memberCount: 4,
        tripCount: 1,
        balance: 85.00,
        photoCount: 18,
    },
    {
        id: '3',
        name: 'Berlin Crew',
        memberCount: 6,
        tripCount: 3,
        balance: 0.00,
        photoCount: 42,
    },
];

export default function IndexScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const authenticated = await authService.isAuthenticated();
            setIsAuthenticated(authenticated);

            if (!authenticated) {
                // Redirect to login if not authenticated
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            router.replace('/(auth)/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#F5F1E8] items-center justify-center">
                <ActivityIndicator size="large" color="#7A5C47" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect to login
    }

    return (
        <View className="flex-1 bg-[#F5F1E8]">
            {/* Header with Avatar */}
            <Header />

            <ScrollView className="flex-1 px-4 py-6">
                {/* Hero Section */}
                <View className="bg-[#FAF8F3] rounded-lg border-2 border-[#7A5C47] p-6 mb-6 shadow-lg">
                    <Text className="text-xl font-bold text-[#3D3530] mb-2">
                        Start Your Adventure
                    </Text>
                    <Text className="text-sm text-[#7A6F65] mb-4">
                        Create a group and manage trips, expenses, and memories together
                    </Text>

                    <Pressable
                        className="bg-[#7A5C47] border-2 border-[#7A5C47] rounded-md py-3 px-6 items-center"
                        onPress={() => {
                            // TODO: Navigate to create group screen
                            console.log('Create new group');
                        }}
                    >
                        <Text className="text-base font-semibold text-[#FAF8F3]">
                            + Create New Group
                        </Text>
                    </Pressable>
                </View>

                {/* Your Groups Section */}
                <View className="mb-4">
                    <Text className="text-lg font-bold text-[#3D3530] mb-3">
                        Your Groups
                    </Text>

                    {mockGroups.map((group) => (
                        <Pressable
                            key={group.id}
                            className="bg-[#FAF8F3] rounded-lg border-2 border-[#D4CCC0] p-4 mb-3 active:border-[#7A5C47]"
                            onPress={() => {
                                // TODO: Navigate to group detail
                                console.log('Navigate to group:', group.id);
                            }}
                        >
                            {/* Group Header */}
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-[#3D3530] mb-1">
                                        {group.name}
                                    </Text>
                                    <View className="flex-row items-center gap-3">
                                        <Text className="text-xs text-[#7A6F65]">
                                            👥 {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                        </Text>
                                        <Text className="text-xs text-[#7A6F65]">
                                            ✈️ {group.tripCount} {group.tripCount === 1 ? 'trip' : 'trips'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Balance Badge */}
                                <View className="items-end">
                                    <Text className="text-xs text-[#7A6F65] mb-1">Ledger</Text>
                                    <Text
                                        className={`text-base font-bold ${group.balance > 0
                                            ? 'text-[#6B8E4E]'
                                            : group.balance < 0
                                                ? 'text-[#A85442]'
                                                : 'text-[#7A6F65]'
                                            }`}
                                    >
                                        {group.balance > 0 ? '+' : ''}${Math.abs(group.balance).toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            {/* Quick Actions */}
                            <View className="flex-row gap-2">
                                <Pressable
                                    className="flex-1 bg-[#EDE9DF] border border-[#D4CCC0] rounded-md py-2 px-3 flex-row items-center justify-center gap-1"
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        console.log('Open ledger for:', group.id);
                                    }}
                                >
                                    <Text className="text-sm">📒</Text>
                                    <Text className="text-sm font-semibold text-[#3D3530]">
                                        Ledger
                                    </Text>
                                </Pressable>

                                <Pressable
                                    className="flex-1 bg-[#EDE9DF] border border-[#D4CCC0] rounded-md py-2 px-3 flex-row items-center justify-center gap-1"
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        console.log('Open gallery for:', group.id);
                                    }}
                                >
                                    <Text className="text-sm">📷</Text>
                                    <Text className="text-sm font-semibold text-[#3D3530]">
                                        Gallery
                                    </Text>
                                </Pressable>

                                <Pressable
                                    className="bg-[#EDE9DF] border border-[#D4CCC0] rounded-md py-2 px-3 items-center justify-center"
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        console.log('More options for:', group.id);
                                    }}
                                >
                                    <Text className="text-sm">→</Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    ))}
                </View>

                {/* Empty State (if no groups) */}
                {mockGroups.length === 0 && (
                    <View className="bg-[#FAF8F3] rounded-lg border-2 border-dashed border-[#D4CCC0] p-8 items-center">
                        <Text className="text-4xl mb-3">🌍</Text>
                        <Text className="text-base font-semibold text-[#3D3530] mb-1 text-center">
                            No groups yet
                        </Text>
                        <Text className="text-sm text-[#7A6F65] text-center">
                            Create your first group to start planning trips together
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
