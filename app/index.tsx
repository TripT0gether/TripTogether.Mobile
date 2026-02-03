import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, BookOpen, Users, Camera, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { authService } from '../src/services/authService';
import Header from '../src/components/Header';
import RetroGrid from '../src/components/RetroGrid';
import CreateGroupDialog from '../src/components/CreateGroupDialog';
import { theme, shadows } from '../src/constants/theme';

// Mock data for demonstration
const mockGroups = [
    {
        id: '1',
        name: 'Lisbon Friends',
        members: 5,
        youOwe: 45.5,
        youAreOwed: 20.0,
        trips: 2,
    },
    {
        id: '2',
        name: 'Tokyo Squad',
        members: 4,
        youOwe: 0,
        youAreOwed: 85.0,
        trips: 1,
    },
    {
        id: '3',
        name: 'Berlin Crew',
        members: 6,
        youOwe: 30.0,
        youAreOwed: 30.0,
        trips: 3,
    },
];

export default function IndexScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [groups, setGroups] = useState(mockGroups);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const authenticated = await authService.isAuthenticated();
            setIsAuthenticated(authenticated);

            if (!authenticated) {
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            router.replace('/(auth)/login');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = (name: string) => {
        const newGroup = {
            id: String(groups.length + 1),
            name,
            members: 1,
            youOwe: 0,
            youAreOwed: 0,
            trips: 0,
        };
        setGroups([...groups, newGroup]);
        setShowCreateDialog(false);
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <RetroGrid>
            {/* Header with Avatar */}
            <Header />

            <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 80 }}>
                {/* Hero Card */}
                <View
                    className="p-6 mb-6 rounded-xl border-2"
                    style={{
                        backgroundColor: theme.card,
                        borderColor: theme.primary,
                        ...shadows.retro,
                    }}
                >
                    <Text className="text-xl font-bold mb-2" style={{ color: theme.foreground }}>
                        Start Your Adventure
                    </Text>
                    <Text className="text-sm mb-4" style={{ color: theme.mutedForeground }}>
                        Create a group and manage trips, expenses, and memories together
                    </Text>
                    <Pressable
                        onPress={() => setShowCreateDialog(true)}
                        className="flex-row items-center justify-center py-4 rounded-lg"
                        style={{ backgroundColor: theme.primary }}
                    >
                        <Plus size={18} color={theme.primaryForeground} />
                        <Text className="font-bold ml-2" style={{ color: theme.primaryForeground }}>
                            Create New Group
                        </Text>
                    </Pressable>
                </View>

                {/* Groups List */}
                <Text className="text-lg font-bold mb-3" style={{ color: theme.foreground }}>
                    Your Groups
                </Text>

                <View className="gap-3">
                    {groups.map((group, index) => {
                        const netBalance = group.youAreOwed - group.youOwe;
                        const isSettled = netBalance === 0 && group.youOwe === 0;

                        return (
                            <Pressable
                                key={group.id}
                                onPress={() => router.push(`/group/${group.id}`)}
                                className="rounded-xl border-2 p-4"
                                style={({ pressed }) => ({
                                    backgroundColor: theme.card,
                                    borderColor: pressed ? theme.primary : theme.border,
                                    transform: [{ translateY: pressed ? 2 : 0 }],
                                    ...shadows.retroSm,
                                })}
                            >
                                {/* Top Row */}
                                <View className="flex-row items-start justify-between mb-3">
                                    <View className="flex-1">
                                        <Text className="text-base font-bold" style={{ color: theme.foreground }}>
                                            {group.name}
                                        </Text>
                                        <View className="flex-row items-center gap-3 mt-1.5">
                                            <View className="flex-row items-center gap-1">
                                                <Users size={14} color={theme.mutedForeground} />
                                                <Text className="text-xs font-medium" style={{ color: theme.mutedForeground }}>
                                                    {group.members}
                                                </Text>
                                            </View>
                                            <Text className="text-xs font-medium" style={{ color: theme.mutedForeground }}>
                                                {group.trips} {group.trips === 1 ? 'trip' : 'trips'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Balance */}
                                    <View className="items-end">
                                        <Text className="text-xs font-medium mb-0.5" style={{ color: theme.mutedForeground }}>
                                            Balance
                                        </Text>
                                        {isSettled ? (
                                            <Text className="text-sm font-bold" style={{ color: theme.mutedForeground }}>
                                                Settled
                                            </Text>
                                        ) : netBalance > 0 ? (
                                            <View className="flex-row items-center gap-1">
                                                <TrendingUp size={14} color={theme.accent} />
                                                <Text className="text-lg font-bold" style={{ color: theme.accent }}>
                                                    +${netBalance.toFixed(2)}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center gap-1">
                                                <TrendingDown size={14} color={theme.destructive} />
                                                <Text className="text-lg font-bold" style={{ color: theme.destructive }}>
                                                    -${Math.abs(netBalance).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Bottom Actions */}
                                <View
                                    className="flex-row gap-2 pt-3"
                                    style={{ borderTopWidth: 1, borderTopColor: theme.border }}
                                >
                                    <View
                                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded"
                                        style={{ backgroundColor: `${theme.muted}80` }}
                                    >
                                        <BookOpen size={14} color={theme.foreground} />
                                        <Text className="text-xs font-semibold" style={{ color: theme.foreground }}>
                                            Ledger
                                        </Text>
                                    </View>
                                    <View
                                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded"
                                        style={{ backgroundColor: `${theme.muted}80` }}
                                    >
                                        <Camera size={14} color={theme.foreground} />
                                        <Text className="text-xs font-semibold" style={{ color: theme.foreground }}>
                                            Gallery
                                        </Text>
                                    </View>
                                    <View className="px-2 items-center justify-center">
                                        <ArrowRight size={16} color={theme.mutedForeground} />
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Create Group Dialog */}
            <CreateGroupDialog
                visible={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreateGroup={handleCreateGroup}
            />
        </RetroGrid>
    );
}
