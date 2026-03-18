/**
 * group/[id].tsx
 *
 * Redesigned group detail screen – single scrollable page layout.
 * Shows group header, member avatars row, quick actions, trip cards,
 * active invite banner, and a leader-only settings bottom sheet.
 *
 * Data Sources:
 * - groupService.getGroupDetail → group info + members list
 * - tripService.getGroupTrips → trip list for the group
 * - groupInviteService.getActiveInvite → shareable invite token/URL
 * - userService.getCurrentUser → current user to determine leader status
 *
 * Used by: Navigation from home screen group cards
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Modal,
    Animated,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useRouter, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Map,
    Users,
    Plus,
    Calendar,
    DollarSign,
    Crown,
    Clock,
    Trash2,
    Save,
    AlertTriangle,
    X,
    Settings,
    Share2,
    UserPlus,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Copy,
} from 'lucide-react-native';
import { groupService } from '../../src/services/groupService';
import { tripService } from '../../src/services/tripService';
import { groupInviteService } from '../../src/services/groupInviteService';
import { userService } from '../../src/services/userService';
import { GroupDetail, GroupMember } from '../../src/types/group.types';
import { Trip } from '../../src/types/trip.types';
import { GroupInvite } from '../../src/types/groupInvite.types';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';
import * as Clipboard from 'expo-clipboard';
import RetroGrid from '../../src/components/RetroGrid';
import Header from '../../src/components/Header';
import CreateTripDialog from '../../src/components/CreateTripDialog';
import { tripService as tripSvc } from '../../src/services/tripService';
import { theme, shadows, fonts, radius, spacing } from '../../src/constants/theme';
import { CreateTripPayload } from '../../src/types/trip.types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

    // ── State ────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [invite, setInvite] = useState<GroupInvite | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLeader, setIsLeader] = useState(false);

    // Member list toggle
    const [membersExpanded, setMembersExpanded] = useState(false);

    // Invite Dialog
    const [inviteDialogVisible, setInviteDialogVisible] = useState(false);

    // Create Trip Dialog
    const [createTripVisible, setCreateTripVisible] = useState(false);

    // Settings bottom sheet
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [saving, setSaving] = useState(false);
    const sheetAnim = useRef(new Animated.Value(0)).current;

    // ── Data Loading ─────────────────────────────────────────────────────
    useEffect(() => {
        if (groupId) loadData();
    }, [groupId]);

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

            // Load invite in background
            try {
                const inviteData = await groupInviteService.getActiveInvite(groupId!);
                setInvite(inviteData);
            } catch {
                setInvite(null);
            }
        } catch (error: any) {
            showErrorToast('Error', error.message || 'Failed to load group');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [groupId]);

    // ── Actions ──────────────────────────────────────────────────────────
    const handleShareInviteClick = () => {
        if (!invite?.inviteUrl) {
            showErrorToast('No Invite', 'No active invite link available');
            return;
        }
        setInviteDialogVisible(true);
    };

    const handleCopyLink = async () => {
        if (!invite?.inviteUrl) return;
        try {
            await Clipboard.setStringAsync(invite.inviteUrl);
            showSuccessToast('Copied', 'Invite link copied to clipboard');
        } catch {
            showErrorToast('Failed', 'Could not copy link');
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

    const handleCreateTrip = async (payload: CreateTripPayload) => {
        const newTrip = await tripSvc.createTrip(payload);
        setTrips((prev) => [newTrip, ...prev]);
        setCreateTripVisible(false);
        showSuccessToast('Created', `Trip "${newTrip.title}" created`);
    };

    // ── Settings Sheet Animation ─────────────────────────────────────────
    const openSettings = () => {
        setSettingsVisible(true);
        setEditingName(false);
        setNewGroupName(group?.name || '');
        Animated.spring(sheetAnim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 20,
            stiffness: 180,
        }).start();
    };

    const closeSettings = () => {
        Animated.timing(sheetAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setSettingsVisible(false);
            setEditingName(false);
        });
    };

    // ── Helpers ──────────────────────────────────────────────────────────
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
        if (hours > 0) return `${hours}h ${minutes}m left`;
        return `${minutes}m left`;
    };

    // ── Loading / Error States ───────────────────────────────────────────
    if (loading) {
        return (
            <RetroGrid>
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={s.loadingText}>Loading group...</Text>
                </View>
            </RetroGrid>
        );
    }

    if (!group) {
        return (
            <RetroGrid>
                <View style={s.centered}>
                    <AlertTriangle size={48} color={theme.destructive} />
                    <Text style={s.errorText}>Failed to load group</Text>
                    <Pressable onPress={() => { setLoading(true); loadData(); }} style={s.retryBtn}>
                        <Text style={s.retryBtnText}>Retry</Text>
                    </Pressable>
                </View>
            </RetroGrid>
        );
    }

    const leader = group.members.find((m) => m.role === 'Leader');

    return (
        <RetroGrid>
            <Header floating />

            {/* ── Group Header ─────────────────────────────────────── */}
            <View style={s.groupHeader}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                    <ArrowLeft size={22} color={theme.primary} />
                </Pressable>

                <View style={s.groupHeaderCenter}>
                    <Text style={s.groupName} numberOfLines={1}>{group.name}</Text>
                    <View style={s.groupSubRow}>
                        <Users size={12} color={theme.mutedForeground} />
                        <Text style={s.groupSubText}>
                            {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                        </Text>
                        {leader && (
                            <>
                                <Text style={s.groupSubDot}>·</Text>
                                <Crown size={12} color={theme.primary} />
                                <Text style={s.groupSubText}>{leader.username}</Text>
                            </>
                        )}
                    </View>
                </View>


            </View>

            {/* ── Scrollable Body ─────────────────────────────────── */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.primary}
                    />
                }
            >
                {/* ── Members Section ──────────────────────────── */}
                <View style={s.section}>
                    <Pressable
                        style={s.sectionHeaderRow}
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setMembersExpanded(!membersExpanded);
                        }}
                    >
                        <Users size={16} color={theme.primary} />
                        <Text style={s.sectionTitle}>Members</Text>
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{group.members.length}</Text>
                        </View>
                    </Pressable>
                    <View style={s.memberList}>
                        {group.members
                            .sort((a, b) => (a.role === 'Leader' ? -1 : 1))
                            .slice(0, membersExpanded ? undefined : 3)
                            .map((member, index, array) => (
                                <View
                                    key={member.userId}
                                    style={[
                                        s.memberRow,
                                        (index < array.length - 1 || group.members.length > 3) && s.memberRowBorder
                                    ]}
                                >
                                    {/* Avatar */}
                                    <View style={[
                                        s.memberAvatar,
                                        member.role === 'Leader' && s.memberAvatarLeader,
                                    ]}>
                                        <Text style={s.memberAvatarText}>
                                            {getInitials(member.username)}
                                        </Text>
                                    </View>

                                    {/* Info */}
                                    <View style={s.memberInfo}>
                                        <View style={s.memberNameRow}>
                                            <Text style={s.memberName} numberOfLines={1}>
                                                {member.username}
                                            </Text>
                                            {member.role === 'Leader' && (
                                                <View style={s.leaderBadge}>
                                                    <Crown size={10} color={theme.primaryForeground} />
                                                    <Text style={s.leaderBadgeText}>Leader</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={s.memberEmail} numberOfLines={1}>
                                            {member.email}
                                        </Text>
                                    </View>

                                    {/* Active indicator */}
                                    <View style={[
                                        s.memberStatusDot,
                                        { backgroundColor: member.status === 'Active' ? theme.accent : theme.muted }
                                    ]} />
                                </View>
                            ))}
                        {group.members.length > 3 && (
                            <Pressable
                                style={[s.memberRow, { justifyContent: 'center', paddingVertical: 12 }]}
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setMembersExpanded(!membersExpanded);
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: theme.primary }}>
                                        {membersExpanded ? 'Hide members' : `View all ${group.members.length} members`}
                                    </Text>
                                    {membersExpanded ? (
                                        <ChevronUp size={16} color={theme.primary} />
                                    ) : (
                                        <ChevronDown size={16} color={theme.primary} />
                                    )}
                                </View>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* ── Quick Actions ───────────────────────────────── */}
                <View style={s.actionsRow}>
                    <Pressable
                        style={({ pressed }) => [
                            s.actionBtn,
                            s.actionBtnPrimary,
                            shadows.retroSm,
                            pressed && s.actionBtnPressed,
                        ]}
                        onPress={() => setCreateTripVisible(true)}
                    >
                        <Plus size={16} color={theme.primaryForeground} />
                        <Text style={s.actionBtnPrimaryText}>New Trip</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            s.actionBtn,
                            s.actionBtnSecondary,
                            shadows.retroSm,
                            pressed && s.actionBtnPressed,
                        ]}
                        onPress={handleShareInviteClick}
                    >
                        <Share2 size={16} color={theme.secondary} />
                        <Text style={s.actionBtnSecondaryText}>Share Invite</Text>
                    </Pressable>
                </View>

                {/* ── Group Settings (Leader only) ─────────────────── */}
                {isLeader && (
                    <Pressable
                        style={({ pressed }) => [
                            s.settingsBtn,
                            shadows.retroSm,
                            pressed && s.actionBtnPressed,
                        ]}
                        onPress={openSettings}
                    >
                        <Settings size={16} color={theme.mutedForeground} />
                        <Text style={s.settingsBtnText}>Group Settings</Text>
                    </Pressable>
                )}

                {/* ── Trips Section ───────────────────────────────── */}
                <View style={s.section}>
                    <View style={s.sectionHeaderRow}>
                        <Map size={16} color={theme.primary} />
                        <Text style={s.sectionTitle}>Trips</Text>
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{trips.length}</Text>
                        </View>
                    </View>

                    {trips.length === 0 ? (
                        <View style={s.emptyTrips}>
                            <Map size={36} color={theme.muted} />
                            <Text style={s.emptyTitle}>No Trips Yet</Text>
                            <Text style={s.emptySubtitle}>
                                Tap "New Trip" to plan your first adventure
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
                                        onPress={() => router.push(`/group/trip/${trip.id}`)}
                                    >
                                        {/* Top row: Title + Status */}
                                        <View style={s.tripTopRow}>
                                            <Text style={s.tripTitle} numberOfLines={1}>
                                                {trip.title}
                                            </Text>
                                            <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                                                <Text style={[s.statusText, { color: statusColor.text }]}>
                                                    {trip.status}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Bottom row: Date + Budget */}
                                        <View style={s.tripBottomRow}>
                                            <View style={s.tripMetaItem}>
                                                <Calendar size={13} color={theme.mutedForeground} />
                                                <Text style={s.tripMetaText}>
                                                    {formatDateRange(trip.planningRangeStart, trip.planningRangeEnd)}
                                                </Text>
                                            </View>
                                            {trip.budget > 0 && (
                                                <View style={s.tripMetaItem}>
                                                    <DollarSign size={13} color={theme.mutedForeground} />
                                                    <Text style={s.tripMetaText}>
                                                        {trip.budget.toLocaleString()}
                                                    </Text>
                                                </View>
                                            )}
                                            <ChevronRight
                                                size={16}
                                                color={theme.mutedForeground}
                                                style={{ marginLeft: 'auto' }}
                                            />
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Bottom spacing */}
                <View style={{ height: 32 }} />
            </ScrollView>

            {/* ── Invite Dialog Modal ─────────── */}
            <Modal
                visible={inviteDialogVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setInviteDialogVisible(false)}
            >
                <Pressable style={s.dialogOverlay} onPress={() => setInviteDialogVisible(false)}>
                    <Pressable style={s.dialogContainer} onPress={() => { }}>
                        <View style={s.dialogHeader}>
                            <View style={s.dialogIconBadge}>
                                <Share2 size={24} color={theme.primary} />
                            </View>
                            <Pressable onPress={() => setInviteDialogVisible(false)} hitSlop={12} style={s.dialogCloseBtn}>
                                <X size={20} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        <Text style={s.dialogTitle}>Invite Friends</Text>
                        <Text style={s.dialogSubtitle}>
                            Share this link with your friends so they can join the group "{group.name}".
                        </Text>

                        {invite && !invite.isExpired ? (
                            <>
                                <Pressable style={s.dialogLinkBox} onPress={handleCopyLink}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={s.dialogLinkText} numberOfLines={1} ellipsizeMode="tail">
                                            {invite.inviteUrl}
                                        </Text>
                                    </View>
                                    <View style={s.dialogCopyBtn}>
                                        <Copy size={16} color={theme.primaryForeground} />
                                    </View>
                                </Pressable>

                                <View style={s.dialogExpiryRow}>
                                    <Clock size={14} color={theme.mutedForeground} />
                                    <Text style={s.dialogExpiryText}>
                                        Expires in {getTimeUntilExpiry(invite.expiresAt)}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <View style={s.dialogExpiredBox}>
                                <AlertTriangle size={20} color={theme.destructive} />
                                <Text style={s.dialogExpiredText}>This invite link has expired or is invalid.</Text>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Settings Bottom Sheet (Leader only) ─────────── */}
            <Modal
                visible={settingsVisible}
                transparent
                animationType="none"
                onRequestClose={closeSettings}
            >
                <Pressable style={s.sheetOverlay} onPress={closeSettings}>
                    <Animated.View
                        style={[
                            s.sheetContainer,
                            {
                                transform: [{
                                    translateY: sheetAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [400, 0],
                                    }),
                                }],
                                opacity: sheetAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 0.8, 1],
                                }),
                            },
                        ]}
                    >
                        <Pressable onPress={() => { /* prevent close */ }}>
                            {/* Sheet handle */}
                            <View style={s.sheetHandle} />

                            <View style={s.sheetHeader}>
                                <Settings size={18} color={theme.primary} />
                                <Text style={s.sheetTitle}>Group Settings</Text>
                                <Pressable onPress={closeSettings} hitSlop={12}>
                                    <X size={20} color={theme.mutedForeground} />
                                </Pressable>
                            </View>

                            {/* Rename Section */}
                            <View style={s.sheetSection}>
                                <Text style={s.sheetLabel}>GROUP NAME</Text>
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
                                                <X size={16} color={theme.mutedForeground} />
                                            </Pressable>
                                            <Pressable
                                                onPress={handleRenameGroup}
                                                disabled={saving || !newGroupName.trim()}
                                                style={[
                                                    s.renameSaveBtn,
                                                    (saving || !newGroupName.trim()) && s.btnDisabled,
                                                ]}
                                            >
                                                {saving ? (
                                                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                                                ) : (
                                                    <Save size={16} color={theme.primaryForeground} />
                                                )}
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : (
                                    <Pressable onPress={() => setEditingName(true)} style={s.renameDisplay}>
                                        <Text style={s.renameDisplayText}>{group.name}</Text>
                                        <Text style={s.renameTapHint}>Tap to edit</Text>
                                    </Pressable>
                                )}
                            </View>

                            {/* Danger Zone */}
                            <View style={s.dangerZone}>
                                <View style={s.dangerHeader}>
                                    <AlertTriangle size={16} color={theme.destructive} />
                                    <Text style={s.dangerTitle}>Danger Zone</Text>
                                </View>
                                <Text style={s.dangerDesc}>
                                    Permanently delete this group and all associated data.
                                </Text>
                                <Pressable onPress={handleDeleteGroup} style={s.deleteBtn}>
                                    <Trash2 size={16} color={theme.destructive} />
                                    <Text style={s.deleteBtnText}>Delete Group</Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>

            {/* ── Create Trip Dialog ──────────────────── */}
            <CreateTripDialog
                visible={createTripVisible}
                groupId={groupId!}
                onClose={() => setCreateTripVisible(false)}
                onCreateTrip={handleCreateTrip}
            />
        </RetroGrid>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    // ── Loading / Error ──
    centered: {
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
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: theme.primary,
        borderRadius: radius.lg,
    },
    retryBtnText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },

    // ── Group Header ──
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: `${theme.card}F0`,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
        gap: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: radius.lg,
        backgroundColor: `${theme.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupHeaderCenter: {
        flex: 1,
    },
    groupName: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    groupSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    groupSubText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    groupSubDot: {
        fontSize: 12,
        color: theme.mutedForeground,
        marginHorizontal: 2,
    },


    // ── Scroll ──
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // ── Sections ──
    section: {
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    badge: {
        backgroundColor: `${theme.primary}20`,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: fonts.bold,
        color: theme.primary,
    },

    // ── Member List ──
    memberList: {
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 12,
    },
    memberRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${theme.primary}15`,
        borderWidth: 2,
        borderColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    memberAvatarLeader: {
        borderColor: theme.primary,
        backgroundColor: `${theme.primary}25`,
    },
    memberAvatarText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    memberInfo: {
        flex: 1,
        gap: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    memberName: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        color: theme.foreground,
        flexShrink: 1,
    },
    memberEmail: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    leaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radius.full,
        backgroundColor: theme.primary,
        flexShrink: 0,
    },
    leaderBadgeText: {
        fontSize: 9,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    memberStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },

    // ── Quick Actions ──
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: radius.xl,
        borderWidth: 2,
    },
    actionBtnPrimary: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    actionBtnSecondary: {
        backgroundColor: theme.card,
        borderColor: theme.secondary,
    },
    actionBtnPressed: {
        transform: [{ translateY: -2 }],
        opacity: 0.9,
    },
    actionBtnPrimaryText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    actionBtnSecondaryText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: theme.secondary,
    },
    settingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 11,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
        marginBottom: 20,
    },
    settingsBtnText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: theme.mutedForeground,
    },

    // ── Trips List ──
    tripsList: {
        gap: 10,
    },
    tripCard: {
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    tripCardPressed: {
        borderColor: theme.primary,
        transform: [{ translateY: -2 }],
    },
    tripTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    tripTitle: {
        flex: 1,
        fontSize: 15,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    statusText: {
        fontSize: 11,
        fontFamily: fonts.semiBold,
    },
    tripBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tripMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tripMetaText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },

    // ── Empty Trips ──
    emptyTrips: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        borderStyle: 'dashed',
        backgroundColor: `${theme.card}80`,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginTop: 12,
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        textAlign: 'center',
        lineHeight: 18,
    },

    // ── Dialog Styles ──
    dialogOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.card,
        borderRadius: 24, // custom large radius
        padding: 24,
        borderWidth: 2,
        borderColor: theme.border,
        ...shadows.retroSm,
    },
    dialogHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    dialogIconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${theme.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialogCloseBtn: {
        backgroundColor: theme.muted,
        borderRadius: radius.full,
        padding: 6,
    },
    dialogTitle: {
        fontSize: 22,
        fontFamily: fonts.bold,
        color: theme.foreground,
        marginBottom: 8,
    },
    dialogSubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        lineHeight: 20,
        marginBottom: 24,
    },
    dialogLinkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: radius.lg,
        paddingLeft: 14,
        paddingRight: 6,
        paddingVertical: 6,
        marginBottom: 12,
    },
    dialogLinkText: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.foreground,
    },
    dialogCopyBtn: {
        width: 32,
        height: 32,
        borderRadius: radius.md,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialogExpiryRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dialogExpiryText: {
        fontSize: 13,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    dialogPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.primary,
        paddingVertical: 14,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.primary,
    },
    dialogPrimaryBtnText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    dialogExpiredBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: `${theme.destructive}15`,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: `${theme.destructive}50`,
    },
    dialogExpiredText: {
        flex: 1,
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.destructive,
        lineHeight: 20,
    },

    // ── Settings Bottom Sheet ──
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: theme.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: theme.border,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.muted,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    sheetTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },

    // ── Sheet Sections ──
    sheetSection: {
        marginBottom: 24,
    },
    sheetLabel: {
        fontSize: 11,
        fontFamily: fonts.bold,
        color: theme.mutedForeground,
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    renameRow: {
        gap: 8,
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
        marginTop: 4,
    },
    renameCancelBtn: {
        width: 36,
        height: 36,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.muted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    renameSaveBtn: {
        width: 36,
        height: 36,
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
        marginTop: 2,
    },

    // ── Danger Zone ──
    dangerZone: {
        padding: 16,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.destructive,
        backgroundColor: `${theme.destructive}10`,
    },
    dangerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dangerTitle: {
        fontSize: 15,
        fontFamily: fonts.bold,
        color: theme.destructive,
    },
    dangerDesc: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: theme.foreground,
        marginBottom: 12,
        lineHeight: 18,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: radius.lg,
        backgroundColor: theme.destructive,
    },
    deleteBtnText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
});
