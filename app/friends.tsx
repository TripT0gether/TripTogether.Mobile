/**
 * friends.tsx
 * 
 * Friends management screen with user search and friend request handling.
 * Provides tabbed interface for discovering users, managing incoming/outgoing friend requests.
 * Implements the complete friendship workflow from search to connection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    PanResponder,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, UserPlus, UserCheck, Check, X, Clock, ArrowLeft, Users, UserMinus } from 'lucide-react-native';
import { friendshipService } from '../src/services/friendshipService';
import {
    UserSearchResult,
    PaginatedUserSearchResponse,
    FriendRequestListItem,
    PaginatedFriendRequestsResponse,
    Friend,
    PaginatedFriendsResponse,
} from '../src/types/friendship.types';
import { showSuccessToast, showErrorToast } from '../src/utils/toast';
import RetroGrid from '../src/components/RetroGrid';
import { theme, shadows, fonts, radius } from '../src/constants/theme';

type Tab = 'friends' | 'requests' | 'search';
type RequestType = 'received' | 'sent';

export default function FriendsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('friends');
    const [requestType, setRequestType] = useState<RequestType>('received');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searchPagination, setSearchPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
    });

    const [receivedRequests, setReceivedRequests] = useState<FriendRequestListItem[]>([]);
    const [receivedPagination, setReceivedPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
    });

    const [sentRequests, setSentRequests] = useState<FriendRequestListItem[]>([]);
    const [sentPagination, setSentPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
    });

    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsPagination, setFriendsPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
    });

    const [friendSearchTerm, setFriendSearchTerm] = useState('');

    const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (activeTab === 'requests') {
            if (requestType === 'received') {
                fetchReceivedRequests();
            } else {
                fetchSentRequests();
            }
        } else if (activeTab === 'friends') {
            fetchFriends();
        }
    }, [activeTab, requestType]);

    const performSearch = async () => {
        if (searchTerm.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const response: PaginatedUserSearchResponse = await friendshipService.searchUsers({
                searchTerm: searchTerm.trim(),
                pageNumber: 1,
                pageSize: 10,
            });

            setSearchResults(response.items);
            setSearchPagination({
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                totalCount: response.totalCount,
            });
        } catch (error: any) {
            showErrorToast('Search Failed', error.message || 'Could not search users');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivedRequests = async () => {
        setLoading(true);
        try {
            const response: PaginatedFriendRequestsResponse = await friendshipService.getFriendRequests({
                type: 'Received',
                pageNumber: 1,
                pageSize: 10,
            });

            setReceivedRequests(response.items);
            setReceivedPagination({
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                totalCount: response.totalCount,
            });
        } catch (error: any) {
            showErrorToast('Failed to Load', error.message || 'Could not load friend requests');
        } finally {
            setLoading(false);
        }
    };

    const fetchSentRequests = async () => {
        setLoading(true);
        try {
            const response: PaginatedFriendRequestsResponse = await friendshipService.getFriendRequests({
                type: 'Sent',
                pageNumber: 1,
                pageSize: 10,
            });

            setSentRequests(response.items);
            setSentPagination({
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                totalCount: response.totalCount,
            });
        } catch (error: any) {
            showErrorToast('Failed to Load', error.message || 'Could not load sent requests');
        } finally {
            setLoading(false);
        }
    };

    const fetchFriends = async () => {
        setLoading(true);
        try {
            const response: PaginatedFriendsResponse = await friendshipService.getFriends({
                pageNumber: 1,
                pageSize: 10,
            });

            setFriends(response.items);
            setFriendsPagination({
                currentPage: response.currentPage,
                totalPages: response.totalPages,
                totalCount: response.totalCount,
            });
        } catch (error: any) {
            showErrorToast('Failed to Load', error.message || 'Could not load friends list');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 'search') {
            await performSearch();
        } else if (activeTab === 'requests') {
            if (requestType === 'received') {
                await fetchReceivedRequests();
            } else {
                await fetchSentRequests();
            }
        } else if (activeTab === 'friends') {
            await fetchFriends();
        }
        setRefreshing(false);
    }, [activeTab, requestType, searchTerm]);

    const handleSendRequest = async (userId: string) => {
        setPendingActions(prev => new Set(prev).add(userId));
        try {
            await friendshipService.sendFriendRequest(userId);
            showSuccessToast('Request Sent', 'Friend request sent successfully');
            await performSearch();
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not send friend request');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const handleAcceptRequest = async (friendshipId: string) => {
        setPendingActions(prev => new Set(prev).add(friendshipId));
        try {
            await friendshipService.acceptFriendRequest(friendshipId);
            showSuccessToast('Request Accepted', 'You are now friends!');
            await fetchReceivedRequests();
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not accept request');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(friendshipId);
                return next;
            });
        }
    };

    const handleRejectRequest = async (friendshipId: string) => {
        setPendingActions(prev => new Set(prev).add(friendshipId));
        try {
            await friendshipService.rejectFriendRequest(friendshipId);
            showSuccessToast('Request Rejected', 'Friend request declined');
            await fetchReceivedRequests();
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not reject request');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(friendshipId);
                return next;
            });
        }
    };

    const handleUnfriend = async (friendshipId: string, username: string) => {
        Alert.alert(
            'Unfriend User',
            `Are you sure you want to unfriend ${username}?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Unfriend',
                    style: 'destructive',
                    onPress: async () => {
                        setPendingActions(prev => new Set(prev).add(friendshipId));
                        try {
                            await friendshipService.unfriend(friendshipId);
                            setFriends(prev => prev.filter(friend => friend.friendId !== friendshipId));
                            showSuccessToast('Unfriended', `You are no longer friends with ${username}`);
                            await fetchFriends();
                        } catch (error: any) {
                            showErrorToast('Failed', error.message || 'Could not unfriend user');
                        } finally {
                            setPendingActions(prev => {
                                const next = new Set(prev);
                                next.delete(friendshipId);
                                return next;
                            });
                        }
                    },
                },
            ],
        );
    };

    const getInitials = (username: string) => {
        const names = username.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return username.substring(0, 2).toUpperCase();
    };

    const renderSearchTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Search size={18} color={theme.mutedForeground} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by username or email..."
                        placeholderTextColor={theme.mutedForeground}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        onSubmitEditing={performSearch}
                        returnKeyType="search"
                    />
                    {searchTerm.length > 0 && (
                        <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
                            <X size={18} color={theme.mutedForeground} />
                        </Pressable>
                    )}
                </View>
                <Pressable
                    onPress={performSearch}
                    style={({ pressed }) => [
                        styles.searchButton,
                        pressed && styles.searchButtonPressed,
                    ]}
                >
                    <Text style={styles.searchButtonText}>Search</Text>
                </Pressable>
            </View>

            {loading && searchResults.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : searchResults.length === 0 ? (
                <View style={styles.emptyState}>
                    <UserPlus size={48} color={theme.muted} />
                    <Text style={styles.emptyTitle}>Find Friends</Text>
                    <Text style={styles.emptySubtitle}>
                        Search for users by username or email to send friend requests
                    </Text>
                </View>
            ) : (
                <View style={styles.resultsList}>
                    {searchResults.map((user) => (
                        <View key={user.id} style={[styles.userCard, shadows.retroSm]}>
                            <View style={styles.userInfo}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{getInitials(user.username)}</Text>
                                </View>
                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{user.username}</Text>
                                    <Text style={styles.userEmail}>{user.email}</Text>
                                    {user.isEmailVerified && (
                                        <View style={styles.verifiedBadge}>
                                            <UserCheck size={12} color={theme.accent} />
                                            <Text style={styles.verifiedText}>Verified</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <Pressable
                                onPress={() => handleSendRequest(user.id)}
                                disabled={pendingActions.has(user.id)}
                                style={({ pressed }) => [
                                    styles.addButton,
                                    pressed && styles.addButtonPressed,
                                    pendingActions.has(user.id) && styles.addButtonDisabled,
                                ]}
                            >
                                {pendingActions.has(user.id) ? (
                                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                                ) : (
                                    <>
                                        <UserPlus size={16} color={theme.primaryForeground} />
                                        <Text style={styles.addButtonText}>Add</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    const renderRequestsTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.requestTypeToggle}>
                <Pressable
                    onPress={() => setRequestType('received')}
                    style={[
                        styles.toggleButton,
                        requestType === 'received' && styles.toggleButtonActive,
                    ]}
                >
                    <Text style={[
                        styles.toggleText,
                        requestType === 'received' && styles.toggleTextActive,
                    ]}>
                        Received
                    </Text>
                    {receivedPagination.totalCount > 0 && (
                        <View style={styles.toggleBadge}>
                            <Text style={styles.toggleBadgeText}>{receivedPagination.totalCount}</Text>
                        </View>
                    )}
                </Pressable>
                <Pressable
                    onPress={() => setRequestType('sent')}
                    style={[
                        styles.toggleButton,
                        requestType === 'sent' && styles.toggleButtonActive,
                    ]}
                >
                    <Text style={[
                        styles.toggleText,
                        requestType === 'sent' && styles.toggleTextActive,
                    ]}>
                        Sent
                    </Text>
                </Pressable>
            </View>

            {requestType === 'received' ? (
                loading && receivedRequests.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : receivedRequests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Clock size={48} color={theme.muted} />
                        <Text style={styles.emptyTitle}>No Requests</Text>
                        <Text style={styles.emptySubtitle}>
                            You don't have any pending friend requests
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resultsList}>
                        {receivedRequests.map((request) => (
                            <View key={request.friendshipId} style={[styles.requestCard, shadows.retroSm]}>
                                <View style={styles.userInfo}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{getInitials(request.username)}</Text>
                                    </View>
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userName}>{request.username}</Text>
                                        <Text style={styles.requestDate}>
                                            {new Date(request.requestDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.requestActions}>
                                    <Pressable
                                        onPress={() => handleAcceptRequest(request.friendshipId)}
                                        disabled={pendingActions.has(request.friendshipId)}
                                        style={({ pressed }) => [
                                            styles.acceptButton,
                                            pressed && styles.acceptButtonPressed,
                                        ]}
                                    >
                                        {pendingActions.has(request.friendshipId) ? (
                                            <ActivityIndicator size="small" color={theme.primaryForeground} />
                                        ) : (
                                            <>
                                                <Check size={16} color={theme.primaryForeground} />
                                                <Text style={styles.acceptButtonText}>Accept</Text>
                                            </>
                                        )}
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleRejectRequest(request.friendshipId)}
                                        disabled={pendingActions.has(request.friendshipId)}
                                        style={({ pressed }) => [
                                            styles.rejectButton,
                                            pressed && styles.rejectButtonPressed,
                                        ]}
                                    >
                                        <X size={16} color={theme.destructive} />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )
            ) : (
                loading && sentRequests.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : sentRequests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <UserPlus size={48} color={theme.muted} />
                        <Text style={styles.emptyTitle}>No Sent Requests</Text>
                        <Text style={styles.emptySubtitle}>
                            You haven't sent any friend requests yet
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resultsList}>
                        {sentRequests.map((request) => (
                            <View key={request.friendshipId} style={[styles.sentCard, shadows.retroSm]}>
                                <View style={styles.userInfo}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{getInitials(request.username)}</Text>
                                    </View>
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userName}>{request.username}</Text>
                                        <Text style={styles.requestDate}>
                                            Sent {new Date(request.requestDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.pendingBadge}>
                                    <Clock size={14} color={theme.mutedForeground} />
                                    <Text style={styles.pendingText}>Pending</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )
            )}
        </View>
    );

    const renderSentTab = () => (
        <View style={styles.tabContent}>
            {loading && sentRequests.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : sentRequests.length === 0 ? (
                <View style={styles.emptyState}>
                    <UserPlus size={48} color={theme.muted} />
                    <Text style={styles.emptyTitle}>No Sent Requests</Text>
                    <Text style={styles.emptySubtitle}>
                        You haven't sent any friend requests yet
                    </Text>
                </View>
            ) : (
                <View style={styles.resultsList}>
                    {sentRequests.map((request) => (
                        <View key={request.friendshipId} style={[styles.sentCard, shadows.retroSm]}>
                            <View style={styles.userInfo}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{getInitials(request.username)}</Text>
                                </View>
                                <View style={styles.userDetails}>
                                    <Text style={styles.userName}>{request.username}</Text>
                                    <Text style={styles.requestDate}>
                                        Sent {new Date(request.requestDate).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.pendingBadge}>
                                <Clock size={14} color={theme.mutedForeground} />
                                <Text style={styles.pendingText}>Pending</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    const renderFriendsTab = () => {
        const filteredFriends = friends.filter(friend =>
            friend.username.toLowerCase().includes(friendSearchTerm.toLowerCase()) ||
            friend.email.toLowerCase().includes(friendSearchTerm.toLowerCase())
        );

        return (
            <View style={styles.tabContent}>
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={18} color={theme.mutedForeground} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search friends..."
                            placeholderTextColor={theme.mutedForeground}
                            value={friendSearchTerm}
                            onChangeText={setFriendSearchTerm}
                            returnKeyType="search"
                        />
                        {friendSearchTerm.length > 0 && (
                            <Pressable onPress={() => setFriendSearchTerm('')} hitSlop={8}>
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {loading && friends.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : filteredFriends.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Users size={48} color={theme.muted} />
                        <Text style={styles.emptyTitle}>
                            {friendSearchTerm ? 'No Friends Found' : 'No Friends Yet'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {friendSearchTerm
                                ? `No friends match "${friendSearchTerm}"`
                                : 'Start adding friends to see them here'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resultsList}>
                        {filteredFriends.map((friend) => (
                            <View key={friend.friendId} style={[styles.friendCard, shadows.retroSm]}>
                                <View style={styles.userInfo}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{getInitials(friend.username)}</Text>
                                    </View>
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userName}>{friend.username}</Text>
                                        <Text style={styles.userEmail}>{friend.email}</Text>
                                        <Text style={styles.friendSince}>
                                            Friends since {new Date(friend.friendsSince).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    onPress={() => handleUnfriend(friend.friendId, friend.username)}
                                    style={styles.unfriendButton}
                                    disabled={pendingActions.has(friend.friendId)}
                                >
                                    {pendingActions.has(friend.friendId) ? (
                                        <ActivityIndicator size="small" color={theme.destructive} />
                                    ) : (
                                        <UserMinus size={18} color={theme.destructive} />
                                    )}
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const tabOrder: Tab[] = ['friends', 'requests', 'search'];
    const currentTabIndex = tabOrder.indexOf(activeTab);

    const panResponder = PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const { dx, dy } = gestureState;
            return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
            const SWIPE_THRESHOLD = 80;
            const { dx } = gestureState;

            if (Math.abs(dx) > SWIPE_THRESHOLD) {
                if (dx > 0 && currentTabIndex > 0) {
                    setActiveTab(tabOrder[currentTabIndex - 1]);
                } else if (dx < 0 && currentTabIndex < tabOrder.length - 1) {
                    setActiveTab(tabOrder[currentTabIndex + 1]);
                }
            }
        },
    });

    return (
        <RetroGrid>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <ArrowLeft size={24} color={theme.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Friends</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabs}>
                <Pressable
                    onPress={() => setActiveTab('friends')}
                    style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
                        Friends
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('requests')}
                    style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                        Requests
                    </Text>
                    {receivedPagination.totalCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{receivedPagination.totalCount}</Text>
                        </View>
                    )}
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('search')}
                    style={[styles.tab, activeTab === 'search' && styles.tabActive]}
                >
                    <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
                        Search
                    </Text>
                </Pressable>
            </View>

            <View style={styles.scrollView} {...panResponder.panHandlers}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={theme.primary}
                        />
                    }
                >
                    {activeTab === 'friends' && renderFriendsTab()}
                    {activeTab === 'requests' && renderRequestsTab()}
                    {activeTab === 'search' && renderSearchTab()}
                </ScrollView>
            </View>
        </RetroGrid>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: `${theme.card}F0`,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 8,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: theme.muted,
        gap: 6,
    },
    tabActive: {
        backgroundColor: theme.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
    },
    tabTextActive: {
        color: theme.primaryForeground,
    },
    badge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.destructive,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontFamily: fonts.bold,
        color: theme.destructiveForeground,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    tabContent: {
        paddingTop: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    searchInputWrapper: {
        flex: 1,
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
    searchButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: theme.primary,
        justifyContent: 'center',
    },
    searchButtonPressed: {
        opacity: 0.9,
    },
    searchButtonText: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: theme.primaryForeground,
    },
    loadingContainer: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
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
    resultsList: {
        gap: 12,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    sentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${theme.primary}20`,
        borderWidth: 2,
        borderColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    userDetails: {
        flex: 1,
        gap: 2,
    },
    userName: {
        fontSize: 15,
        fontFamily: fonts.semiBold,
        color: theme.foreground,
    },
    userEmail: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    requestDate: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: `${theme.accent}15`,
        borderRadius: 8,
        marginTop: 2,
    },
    verifiedText: {
        fontSize: 10,
        fontFamily: fonts.medium,
        color: theme.accent,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: theme.primary,
    },
    addButtonPressed: {
        opacity: 0.9,
    },
    addButtonDisabled: {
        opacity: 0.6,
    },
    addButtonText: {
        fontSize: 13,
        fontFamily: fonts.semiBold,
        color: theme.primaryForeground,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.md,
        backgroundColor: theme.accent,
    },
    acceptButtonPressed: {
        opacity: 0.9,
    },
    acceptButtonText: {
        fontSize: 13,
        fontFamily: fonts.semiBold,
        color: theme.primaryForeground,
    },
    rejectButton: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: theme.destructive,
        backgroundColor: theme.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectButtonPressed: {
        backgroundColor: `${theme.destructive}10`,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: theme.muted,
        borderRadius: radius.md,
    },
    pendingText: {
        fontSize: 12,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    friendSince: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginTop: 2,
    },
    friendBadge: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: `${theme.accent}15`,
        borderWidth: 2,
        borderColor: theme.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestTypeToggle: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: theme.muted,
        borderWidth: 2,
        borderColor: theme.border,
        gap: 6,
    },
    toggleButtonActive: {
        backgroundColor: theme.card,
        borderColor: theme.primary,
    },
    toggleText: {
        fontSize: 13,
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
    },
    toggleTextActive: {
        color: theme.primary,
    },
    toggleBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: theme.destructive,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleBadgeText: {
        fontSize: 10,
        fontFamily: fonts.bold,
        color: theme.destructiveForeground,
    },
    unfriendButton: {
        padding: 8,
        borderRadius: radius.full,
        backgroundColor: theme.destructive + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
