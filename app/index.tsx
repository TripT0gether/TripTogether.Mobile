import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    TextInput,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Plus,
    Users,
    ArrowRight,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react-native';
import { authService } from '../src/services/authService';
import { groupService } from '../src/services/groupService';
import { Group, PaginatedGroupsResponse } from '../src/types/group.types';
import Header from '../src/components/Header';
import RetroGrid from '../src/components/RetroGrid';
import CreateGroupDialog from '../src/components/CreateGroupDialog';
import { theme, shadows, fonts, radius } from '../src/constants/theme';

const PAGE_SIZE = 10;

export default function IndexScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Groups data
    const [groups, setGroups] = useState<Group[]>([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNext: false,
        hasPrevious: false,
    });

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchGroups(1, searchQuery);
        }
    }, [isAuthenticated, searchQuery]);

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

    const fetchGroups = async (page: number, search?: string) => {
        try {
            const response: PaginatedGroupsResponse = await groupService.getMyGroups({
                pageNumber: page,
                pageSize: PAGE_SIZE,
                searchTerm: search || undefined,
                sortBy: 'createdAt',
                ascending: false,
            });

            setGroups(response.items);
            setPagination({
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                totalCount: response.totalCount,
                hasNext: response.hasNext,
                hasPrevious: response.hasPrevious,
            });
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchGroups(1, searchQuery);
        setRefreshing(false);
    }, [searchQuery]);

    const handleSearch = () => {
        setSearchQuery(searchTerm);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setSearchQuery('');
    };

    const handleNextPage = () => {
        if (pagination.hasNext) {
            fetchGroups(pagination.currentPage + 1, searchQuery);
        }
    };

    const handlePrevPage = () => {
        if (pagination.hasPrevious) {
            fetchGroups(pagination.currentPage - 1, searchQuery);
        }
    };

    const handleCreateGroup = async (name: string) => {
        try {
            await groupService.createGroup({ name });
            setShowCreateDialog(false);
            handleRefresh();
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <RetroGrid>
            <Header />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.primary}
                    />
                }
            >
                {/* Hero Card */}
                <View style={[styles.heroCard, shadows.retro]}>
                    <Text style={styles.heroTitle}>Start Your Adventure</Text>
                    <Text style={styles.heroSubtitle}>
                        Create a group and manage trips, expenses, and memories together
                    </Text>
                    <Pressable
                        onPress={() => setShowCreateDialog(true)}
                        style={({ pressed }) => [
                            styles.createButton,
                            pressed && styles.createButtonPressed,
                        ]}
                    >
                        <Plus size={18} color={theme.primaryForeground} />
                        <Text style={styles.createButtonText}>Create New Group</Text>
                    </Pressable>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={16} color={theme.mutedForeground} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search groups..."
                            placeholderTextColor={theme.mutedForeground}
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchTerm.length > 0 && (
                            <Pressable onPress={handleClearSearch} hitSlop={8}>
                                <X size={16} color={theme.mutedForeground} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Groups Header */}
                <View style={styles.groupsHeader}>
                    <Text style={styles.groupsTitle}>Your Groups</Text>
                    {pagination.totalCount > 0 && (
                        <Text style={styles.groupsCount}>
                            {pagination.totalCount} {pagination.totalCount === 1 ? 'group' : 'groups'}
                        </Text>
                    )}
                </View>

                {/* Groups List */}
                {groups.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={theme.muted} />
                        <Text style={styles.emptyTitle}>No groups yet</Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery
                                ? 'No groups match your search'
                                : 'Create your first group to start planning trips!'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.groupsList}>
                        {groups.map((group, index) => (
                            <Pressable
                                key={group.id}
                                onPress={() => router.push(`/group/${group.id}`)}
                                style={({ pressed }) => [
                                    styles.groupCard,
                                    shadows.retroSm,
                                    pressed && styles.groupCardPressed,
                                ]}
                            >
                                {/* Top Row */}
                                <View style={styles.groupCardTop}>
                                    <View style={styles.groupInfo}>
                                        <Text style={styles.groupName}>{group.name}</Text>
                                        <View style={styles.groupMeta}>
                                            <View style={styles.memberBadge}>
                                                <Users size={14} color={theme.mutedForeground} />
                                                <Text style={styles.memberCount}>{group.memberCount}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.arrowContainer}>
                                        <ArrowRight size={20} color={theme.mutedForeground} />
                                    </View>
                                </View>

                                {/* Created Date */}
                                <Text style={styles.createdAt}>
                                    Created {new Date(group.createdAt).toLocaleDateString()}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <View style={styles.pagination}>
                        <Pressable
                            onPress={handlePrevPage}
                            disabled={!pagination.hasPrevious}
                            style={({ pressed }) => [
                                styles.pageButton,
                                !pagination.hasPrevious && styles.pageButtonDisabled,
                                pressed && pagination.hasPrevious && styles.pageButtonPressed,
                            ]}
                        >
                            <ChevronLeft
                                size={20}
                                color={pagination.hasPrevious ? theme.foreground : theme.muted}
                            />
                        </Pressable>

                        <Text style={styles.pageText}>
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </Text>

                        <Pressable
                            onPress={handleNextPage}
                            disabled={!pagination.hasNext}
                            style={({ pressed }) => [
                                styles.pageButton,
                                !pagination.hasNext && styles.pageButtonDisabled,
                                pressed && pagination.hasNext && styles.pageButtonPressed,
                            ]}
                        >
                            <ChevronRight
                                size={20}
                                color={pagination.hasNext ? theme.foreground : theme.muted}
                            />
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            <CreateGroupDialog
                visible={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreateGroup={handleCreateGroup}
            />
        </RetroGrid>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 100,
    },

    // Hero Card
    heroCard: {
        padding: 24,
        marginBottom: 20,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.primary,
        backgroundColor: theme.card,
    },
    heroTitle: {
        fontSize: 22,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginBottom: 20,
        lineHeight: 20,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: radius.lg,
        backgroundColor: theme.primary,
    },
    createButtonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    createButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: theme.primaryForeground,
        marginLeft: 8,
    },

    // Search
    searchContainer: {
        marginBottom: 20,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.input,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.foreground,
        padding: 0,
    },

    // Groups Header
    groupsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    groupsTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    groupsCount: {
        fontSize: 12,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },

    // Groups List
    groupsList: {
        gap: 12,
    },
    groupCard: {
        padding: 16,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    groupCardPressed: {
        borderColor: theme.primary,
        transform: [{ translateY: -2 }],
    },
    groupCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginBottom: 6,
    },
    groupMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberCount: {
        fontSize: 13,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    arrowContainer: {
        padding: 4,
    },
    createdAt: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginTop: 10,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Pagination
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 16,
    },
    pageButton: {
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    pageButtonPressed: {
        borderColor: theme.primary,
        backgroundColor: theme.muted,
    },
    pageText: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.foreground,
    },
});
