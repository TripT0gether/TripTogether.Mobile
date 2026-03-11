/**
 * group/[id].tsx
 *
 * Group detail screen with tabbed navigation for managing a single group.
 * Shows trips, members, invite info, and settings (leader-only) in separate tabs.
 * Uses dynamic routing via Expo Router to receive groupId from URL params.
 *
 * Data Sources:
 * - groupService.getGroupDetail → group info + members list
 * - tripService.getGroupTrips → trip list for the group
 * - groupInviteService.getActiveInvite → shareable invite token/URL
 * - userService.getCurrentUser → current user to determine leader status
 *
 * Used by: Navigation from home screen group cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Share,
    StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Map,
    Users,
    Link,
    Settings,
    Plus,
    Calendar,
    DollarSign,
    Crown,
    Copy,
    Clock,
    Trash2,
    Save,
    AlertTriangle,
    X,
} from 'lucide-react-native';
import { groupService } from '../../src/services/groupService';
import { tripService } from '../../src/services/tripService';
import { groupInviteService } from '../../src/services/groupInviteService';
import { userService } from '../../src/services/userService';
import { GroupDetail, GroupMember } from '../../src/types/group.types';
import { Trip } from '../../src/types/trip.types';
import { GroupInvite } from '../../src/types/groupInvite.types';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';
import RetroGrid from '../../src/components/RetroGrid';
import Header from '../../src/components/Header';
import { theme, shadows, fonts, radius } from '../../src/constants/theme';

type Tab = 'trips' | 'members' | 'invite' | 'settings';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Planning: { bg: `${theme.primary}20`, text: theme.primary },
    Confirmed: { bg: `${theme.accent}20`, text: theme.accent },
    Ongoing: { bg: `${theme.secondary}20`, text: theme.secondary },
    Completed: { bg: `${theme.mutedForeground}20`, text: theme.mutedForeground },
    Cancelled: { bg: `${theme.destructive}20`, text: theme.destructive },
};

export default function GroupDetailScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('trips');

    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [invite, setInvite] = useState<GroupInvite | null>(null);
    const [inviteLoaded, setInviteLoaded] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLeader, setIsLeader] = useState(false);

    const [editingName, setEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (groupId) loadData();
    }, [groupId]);

    useEffect(() => {
        if (activeTab === 'invite' && !inviteLoaded && groupId) {
            loadInvite();
        }
    }, [activeTab]);

    const loadData = async () => {
        try {
            const [groupData, userData, tripsData] = await Promise.all([
                groupService.getGroupDetail(groupId!),
                userService.getCurrentUser(),
                tripService.getGroupTrips(groupId!, {
                    sortBy: 'CreatedAt',
                    sortDescending: true,
                    pageSize: 50,
                }),
            ]);

            setGroup(groupData);
            setCurrentUserId(userData.id);
            setTrips(tripsData.items);
            setNewGroupName(groupData.name);

            const currentMember = groupData.members.find(
                (m: GroupMember) => m.userId === userData.id
            );
            setIsLeader(currentMember?.role === 'Leader');
        } catch (error: any) {
            showErrorToast('Error', error.message || 'Failed to load group');
        } finally {
            setLoading(false);
        }
    };

    const loadInvite = async () => {
        try {
            const inviteData = await groupInviteService.getActiveInvite(groupId!);
            setInvite(inviteData);
        } catch (error: any) {
            setInvite(null);
        } finally {
            setInviteLoaded(true);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        if (activeTab === 'invite') {
            await loadInvite();
        } else {
            await loadData();
        }
        setRefreshing(false);
    }, [activeTab, groupId]);

    const handleCopyToken = async () => {
        if (!invite?.token) return;
        try {
            await Share.share({ message: invite.token });
        } catch {
            // user dismissed
        }
    };

    const handleCopyUrl = async () => {
        if (!invite?.inviteUrl) return;
        try {
            await Share.share({ message: invite.inviteUrl, url: invite.inviteUrl });
        } catch {
            // user dismissed
        }
    };

    const handleRenameGroup = async () => {
        if (!newGroupName.trim() || !groupId) return;
        setSaving(true);
        try {
            await groupService.updateGroup(groupId, { name: newGroupName.trim() });
            setGroup((prev) => prev ? { ...prev, name: newGroupName.trim() } : prev);
            setEditingName(false);
            showSuccessToast('Updated', 'Group name updated');
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not rename group');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = () => {
        Alert.alert(
            'Delete Group',
            'This will permanently delete the group and all its data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await groupService.deleteGroup(groupId!);
                            showSuccessToast('Deleted', 'Group has been deleted');
                            router.replace('/');
                        } catch (error: any) {
                            showErrorToast('Failed', error.message || 'Could not delete group');
                        }
                    },
                },
            ]
        );
    };

    const formatDateRange = (start: string | null, end: string | null) => {
        if (!start && !end) return 'No dates set';
        const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (start && end) return `${fmt(start)} — ${fmt(end)}`;
        return start ? fmt(start) : fmt(end!);
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getTimeUntilExpiry = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        return `${minutes}m remaining`;
    };

    const availableTabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'trips', label: 'Trips', icon: Map },
        { key: 'members', label: 'Members', icon: Users },
        { key: 'invite', label: 'Invite', icon: Link },
        ...(isLeader ? [{ key: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
    ];

    // ── Trips Tab ────────────────────────────────────────────────────────
    const renderTripsTab = () => (
        <View style={s.tabBody}>

            {trips.length === 0 ? (
                <View style={s.emptyState}>
                    <Map size={48} color={theme.muted} />
                    <Text style={s.emptyTitle}>No Trips Yet</Text>
                    <Text style={s.emptySubtitle}>
                        Create your first trip to start planning adventures with this group
                    </Text>
                </View>
            ) : (
                <View style={s.tripsList}>
                    {trips.map((trip) => {
                        const statusColor = STATUS_COLORS[trip.status] || STATUS_COLORS.Planning;
                        return (
                            <Pressable
                                key={trip.id}
                                style={({ pressed }) => [
                                    s.tripCard,
                                    shadows.retroSm,
                                    pressed && s.tripCardPressed,
                                ]}
                            >
                                <View style={s.tripCardHeader}>
                                    <Text style={s.tripTitle} numberOfLines={1}>{trip.title}</Text>
                                    <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                                        <Text style={[s.statusText, { color: statusColor.text }]}>
                                            {trip.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.tripMeta}>
                                    <View style={s.tripMetaRow}>
                                        <Calendar size={14} color={theme.mutedForeground} />
                                        <Text style={s.tripMetaText}>
                                            {formatDateRange(trip.planningRangeStart, trip.planningRangeEnd)}
                                        </Text>
                                    </View>
                                    {trip.budget > 0 && (
                                        <View style={s.tripMetaRow}>
                                            <DollarSign size={14} color={theme.mutedForeground} />
                                            <Text style={s.tripMetaText}>
                                                {trip.budget.toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={s.tripCreatedAt}>
                                    Created {new Date(trip.createdAt).toLocaleDateString()}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );

    // ── Members Tab ──────────────────────────────────────────────────────
    const renderMembersTab = () => (
        <View style={s.tabBody}>
            <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Members</Text>
                <Text style={s.sectionCount}>
                    {group?.members.length || 0} {(group?.members.length || 0) === 1 ? 'member' : 'members'}
                </Text>
            </View>
            <View style={s.membersList}>
                {group?.members
                    .sort((a, b) => (a.role === 'Leader' ? -1 : 1))
                    .map((member) => (
                        <View key={member.userId} style={[s.memberCard, shadows.retroSm]}>
                            <View style={s.memberInfo}>
                                <View style={s.memberAvatar}>
                                    <Text style={s.memberAvatarText}>
                                        {getInitials(member.username)}
                                    </Text>
                                </View>
                                <View style={s.memberDetails}>
                                    <View style={s.memberNameRow}>
                                        <Text style={s.memberName}>{member.username}</Text>
                                        {member.role === 'Leader' && (
                                            <View style={s.leaderBadge}>
                                                <Crown size={10} color={theme.primaryForeground} />
                                                <Text style={s.leaderBadgeText}>Leader</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={s.memberEmail}>{member.email}</Text>
                                </View>
                            </View>
                            <View style={[
                                s.statusDot,
                                { backgroundColor: member.status === 'Active' ? theme.accent : theme.muted }
                            ]} />
                        </View>
                    ))}
            </View>
        </View>
    );

    // ── Invite Tab ───────────────────────────────────────────────────────
    const renderInviteTab = () => (
        <View style={s.tabBody}>
            {!inviteLoaded ? (
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : !invite ? (
                <View style={s.emptyState}>
                    <Link size={48} color={theme.muted} />
                    <Text style={s.emptyTitle}>No Active Invite</Text>
                    <Text style={s.emptySubtitle}>
                        There is no active invite link for this group
                    </Text>
                </View>
            ) : (
                <View style={s.inviteContent}>
                    <View style={[s.inviteCard, shadows.retro]}>
                        <View style={s.inviteHeader}>
                            <Link size={20} color={theme.secondary} />
                            <Text style={s.inviteTitle}>Invite Link</Text>
                        </View>

                        <View style={s.inviteField}>
                            <Text style={s.inviteLabel}>Token</Text>
                            <View style={s.inviteTokenRow}>
                                <Text style={s.inviteTokenText} numberOfLines={1}>
                                    {invite.token}
                                </Text>
                                <Pressable onPress={handleCopyToken} style={s.copyButton}>
                                    <Copy size={16} color={theme.primary} />
                                </Pressable>
                            </View>
                        </View>

                        <View style={s.inviteField}>
                            <Text style={s.inviteLabel}>Share URL</Text>
                            <View style={s.inviteTokenRow}>
                                <Text style={s.inviteUrlText} numberOfLines={2}>
                                    {invite.inviteUrl}
                                </Text>
                                <Pressable onPress={handleCopyUrl} style={s.copyButton}>
                                    <Copy size={16} color={theme.primary} />
                                </Pressable>
                            </View>
                        </View>

                        <View style={s.inviteExpiryRow}>
                            <Clock size={14} color={invite.isExpired ? theme.destructive : theme.accent} />
                            <Text style={[
                                s.inviteExpiryText,
                                { color: invite.isExpired ? theme.destructive : theme.accent }
                            ]}>
                                {invite.isExpired ? 'Expired' : getTimeUntilExpiry(invite.expiresAt)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    // ── Settings Tab (Leader only) ───────────────────────────────────────
    const renderSettingsTab = () => (
        <View style={s.tabBody}>
            <View style={[s.settingsCard, shadows.retroSm]}>
                <Text style={s.settingsCardTitle}>Group Name</Text>
                {editingName ? (
                    <View style={s.renameRow}>
                        <TextInput
                            style={s.renameInput}
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            placeholder="Enter group name"
                            placeholderTextColor={theme.mutedForeground}
                            autoFocus
                        />
                        <View style={s.renameActions}>
                            <Pressable
                                onPress={() => {
                                    setEditingName(false);
                                    setNewGroupName(group?.name || '');
                                }}
                                style={s.renameCancelBtn}
                            >
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                            <Pressable
                                onPress={handleRenameGroup}
                                disabled={saving || !newGroupName.trim()}
                                style={[s.renameSaveBtn, (saving || !newGroupName.trim()) && s.btnDisabled]}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                                ) : (
                                    <Save size={18} color={theme.primaryForeground} />
                                )}
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable onPress={() => setEditingName(true)} style={s.renameDisplay}>
                        <Text style={s.renameDisplayText}>{group?.name}</Text>
                        <Text style={s.renameTapHint}>Tap to edit</Text>
                    </Pressable>
                )}
            </View>

            <View style={s.dangerZone}>
                <View style={s.dangerHeader}>
                    <AlertTriangle size={20} color={theme.destructive} />
                    <Text style={s.dangerTitle}>Danger Zone</Text>
                </View>
                <Text style={s.dangerDescription}>
                    Deleting this group will remove all trips, expenses, and data permanently.
                </Text>
                <Pressable onPress={handleDeleteGroup} style={s.deleteButton}>
                    <Trash2 size={18} color={theme.destructive} />
                    <Text style={s.deleteButtonText}>Delete Group</Text>
                </Pressable>
            </View>
        </View>
    );

    // ── Loading / Error States ───────────────────────────────────────────
    if (loading) {
        return (
            <RetroGrid>
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={s.loadingText}>Loading group...</Text>
                </View>
            </RetroGrid>
        );
    }

    if (!group) {
        return (
            <RetroGrid>
                <View style={s.loadingContainer}>
                    <AlertTriangle size={48} color={theme.destructive} />
                    <Text style={s.errorText}>Failed to load group</Text>
                    <Pressable onPress={() => { setLoading(true); loadData(); }} style={s.retryButton}>
                        <Text style={s.retryButtonText}>Retry</Text>
                    </Pressable>
                </View>
            </RetroGrid>
        );
    }

    return (
        <RetroGrid>
            <Header floating />

            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <ArrowLeft size={24} color={theme.primary} />
                </Pressable>
                <View style={s.headerCenter}>
                    <Text style={s.headerTitle} numberOfLines={1}>{group.name}</Text>
                    <Text style={s.headerSubtitle}>
                        {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                    </Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            {/* Tab Content */}
            <ScrollView
                style={s.scrollView}
                contentContainerStyle={s.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.primary}
                    />
                }
            >
                {activeTab === 'trips' && renderTripsTab()}
                {activeTab === 'members' && renderMembersTab()}
                {activeTab === 'invite' && renderInviteTab()}
                {activeTab === 'settings' && isLeader && renderSettingsTab()}
            </ScrollView>

            {/* Bottom Tab Bar */}
            <View style={s.bottomBar}>
                {availableTabs.map((tab, index) => {
                    const isActive = activeTab === tab.key;
                    const IconComponent = tab.icon;

                    const isMidpoint = index === Math.floor(availableTabs.length / 2);

                    return (
                        <React.Fragment key={tab.key}>
                            {isMidpoint && (
                                <Pressable
                                    onPress={() => {
                                        showSuccessToast('Coming Soon', 'Create trip flow will be added');
                                    }}
                                    style={({ pressed }) => [
                                        s.fab,
                                        shadows.retro,
                                        pressed && s.fabPressed,
                                    ]}
                                >
                                    <Plus size={26} color={theme.primaryForeground} />
                                </Pressable>
                            )}
                            <Pressable
                                onPress={() => setActiveTab(tab.key)}
                                style={[s.bottomTab, isActive && s.bottomTabActive]}
                            >
                                <IconComponent
                                    size={20}
                                    color={isActive ? theme.primary : theme.mutedForeground}
                                />
                                <Text style={[s.bottomTabText, isActive && s.bottomTabTextActive]}>
                                    {tab.label}
                                </Text>
                                {isActive && <View style={s.bottomTabIndicator} />}
                            </Pressable>
                        </React.Fragment>
                    );
                })}
            </View>
        </RetroGrid>
    );
}

const s = StyleSheet.create({
    // Loading / Error
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.destructive,
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: theme.primary,
        borderRadius: radius.lg,
    },
    retryButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: `${theme.card}F0`,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginTop: 2,
    },

    // Bottom Tab Bar
    bottomBar: {
        flexDirection: 'row',
        borderTopWidth: 2,
        borderTopColor: theme.border,
        backgroundColor: theme.card,
        paddingBottom: 20,
        paddingTop: 8,
    },
    bottomTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 3,
    },
    bottomTabActive: {
        // active state handled by text/icon color + indicator
    },
    bottomTabText: {
        fontSize: 11,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    bottomTabTextActive: {
        color: theme.primary,
        fontFamily: fonts.bold,
    },
    bottomTabIndicator: {
        position: 'absolute',
        top: 0,
        width: 20,
        height: 3,
        borderRadius: 2,
        backgroundColor: theme.primary,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },

    // Tab body
    tabBody: {
        paddingTop: 16,
    },

    // ── FAB (Create Trip) ──
    fab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -28,
        borderWidth: 3,
        borderColor: theme.card,
    },
    fabPressed: {
        transform: [{ scale: 0.92 }],
    },

    // ── Trips Tab ──
    tripsList: {
        gap: 12,
    },
    tripCard: {
        padding: 16,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    tripCardPressed: {
        borderColor: theme.primary,
        transform: [{ translateY: -2 }],
    },
    tripCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    tripTitle: {
        flex: 1,
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
    },
    statusText: {
        fontSize: 11,
        fontFamily: fonts.semiBold,
    },
    tripMeta: {
        gap: 6,
        marginBottom: 8,
    },
    tripMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tripMetaText: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    tripCreatedAt: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginTop: 4,
    },

    // ── Members Tab ──
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    sectionCount: {
        fontSize: 12,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    membersList: {
        gap: 10,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    memberInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: `${theme.primary}20`,
        borderWidth: 2,
        borderColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberAvatarText: {
        fontSize: 15,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    memberDetails: {
        flex: 1,
        gap: 2,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    memberName: {
        fontSize: 15,
        fontFamily: fonts.semiBold,
        color: theme.foreground,
    },
    memberEmail: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    leaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.full,
        backgroundColor: theme.primary,
    },
    leaderBadgeText: {
        fontSize: 10,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    // ── Invite Tab ──
    inviteContent: {
        gap: 16,
    },
    inviteCard: {
        padding: 20,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.secondary,
        backgroundColor: theme.card,
    },
    inviteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
    },
    inviteTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    inviteField: {
        marginBottom: 16,
    },
    inviteLabel: {
        fontSize: 11,
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    inviteTokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: radius.lg,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
    },
    inviteTokenText: {
        flex: 1,
        fontSize: 13,
        fontFamily: fonts.regular,
        color: theme.foreground,
    },
    inviteUrlText: {
        flex: 1,
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.secondary,
    },
    copyButton: {
        padding: 6,
        borderRadius: radius.md,
        backgroundColor: `${theme.primary}15`,
    },
    inviteExpiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    inviteExpiryText: {
        fontSize: 13,
        fontFamily: fonts.medium,
    },

    // ── Settings Tab ──
    settingsCard: {
        padding: 20,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
        marginBottom: 20,
    },
    settingsCardTitle: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginBottom: 12,
    },
    renameRow: {
        gap: 10,
    },
    renameInput: {
        fontSize: 15,
        fontFamily: fonts.regular,
        color: theme.foreground,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: radius.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    renameActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
    renameCancelBtn: {
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.muted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    renameSaveBtn: {
        width: 40,
        height: 40,
        borderRadius: radius.lg,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnDisabled: {
        opacity: 0.5,
    },
    renameDisplay: {
        padding: 12,
        borderRadius: radius.lg,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
    },
    renameDisplayText: {
        fontSize: 15,
        fontFamily: fonts.medium,
        color: theme.foreground,
    },
    renameTapHint: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginTop: 4,
    },

    dangerZone: {
        padding: 20,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.destructive,
        backgroundColor: `${theme.destructive}10`,
    },
    dangerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    dangerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.destructive,
    },
    dangerDescription: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.foreground,
        marginBottom: 16,
        lineHeight: 20,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: theme.destructive,
        borderWidth: 2,
        borderColor: theme.destructive,
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },

    // ── Empty / Shared ──
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
});
