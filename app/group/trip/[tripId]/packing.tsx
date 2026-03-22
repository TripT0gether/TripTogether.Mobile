/**
 * app/group/trip/[tripId]/packing.tsx
 *
 * Trip setup Phase 4 — Packing List.
 * Step 3/3 in the trip setup progress bar.
 *
 * Two tabs:
 *  - Personal: user's own items (isShared=false). They can add, check-off, or delete.
 *  - Shared:   group items (isShared=true). Each item can be claimed via an assignment.
 *              Claiming calls createAssignment with no userId (assigns to current user).
 *              Un-claiming deletes the assignment.
 *
 * Data sources:
 *  - packingItemService.getTripPackingItems → all items for the trip
 *  - packingAssignmentService.getAssignmentsByPackingItemId → who brings shared items
 *  - packingAssignmentService.createAssignment / deleteAssignment → claim / unclaim
 *  - packingItemService.createPackingItem / deletePackingItem / updatePackingItem
 *
 * Used by: Trip setup flow "Next → Packing" CTA from activities screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
    Modal, Alert, StyleSheet, RefreshControl, KeyboardAvoidingView,
    Platform, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    ArrowLeft, Plus, Package, Users, Check, Trash2, X,
    PackageCheck, UserCheck, Crown,
} from 'lucide-react-native';
import { packingItemService } from '../../../../src/services/packingItemService';
import { packingAssignmentService } from '../../../../src/services/packingAssignmentService';
import { userService } from '../../../../src/services/userService';
import { tripService } from '../../../../src/services/tripService';
import { groupService } from '../../../../src/services/groupService';
import Header from '../../../../src/components/Header';
import StepProgressBar from '../../../../src/components/StepProgressBar';
import RetroGrid from '../../../../src/components/RetroGrid';
import { theme, shadows, fonts, radius } from '../../../../src/constants/theme';
import { showSuccessToast, showErrorToast } from '../../../../src/utils/toast';
import { PackingItem } from '../../../../src/types/packingItem.types';
import { PackingAssignmentSummary } from '../../../../src/types/packingAssignment.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SETUP_STEPS = [{ label: 'Polls' }, { label: 'Activities' }, { label: 'Packing' }];

type TabKey = 'personal' | 'shared';

const CATEGORY_PRESETS = ['Clothing', 'Electronics', 'Toiletries', 'Documents', 'Food & Snacks', 'Other'];

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shared item enriched with its assignment summary (who brings what) */
interface SharedItemViewModel {
    item: PackingItem;
    summary: PackingAssignmentSummary | null;
    loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase() ?? '')
        .join('');
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PackingScreen() {
    const router = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    // ── App state
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // ── Tab
    const [activeTab, setActiveTab] = useState<TabKey>('personal');

    // ── Personal items (isShared === false)
    const [personalItems, setPersonalItems] = useState<PackingItem[]>([]);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ── Shared items
    const [sharedItems, setSharedItems] = useState<SharedItemViewModel[]>([]);
    const [claimingId, setClaimingId] = useState<string | null>(null); // packingItemId being claimed/unclaimed

    // ── Leader / group tracking
    const [isLeader, setIsLeader] = useState(false);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [confirmingTrip, setConfirmingTrip] = useState(false);

    // ── Add item sheet
    const [addVisible, setAddVisible] = useState(false);
    const [addMode, setAddMode] = useState<TabKey>('personal');
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('Other');
    const [newQty, setNewQty] = useState('1');
    const [saving, setSaving] = useState(false);

    // ─── Load ──────────────────────────────────────────────────────────────────

    const loadData = async () => {
        try {
            const [items, userData, tripData] = await Promise.all([
                packingItemService.getTripPackingItems(tripId!),
                userService.getCurrentUser(),
                tripService.getTripDetail(tripId!),
            ]);
            setCurrentUserId(userData.id);
            setGroupId(tripData.groupId);

            // Resolve leader status via group member roles
            try {
                const groupData = await groupService.getGroupDetail(tripData.groupId);
                const member = groupData.members.find(m => m.userId === userData.id);
                setIsLeader(member?.role === 'Leader');
            } catch {
                setIsLeader(false);
            }

            const personal = items.filter(i => !i.isShared);
            const shared = items.filter(i => i.isShared);

            setPersonalItems(personal);
            // Initialise checked state from API's isChecked field
            setCheckedPersonalIds(new Set(personal.filter(i => i.isChecked).map(i => i.id)));

            // Build shared view models — load assignment summaries in parallel
            const sharedVMs: SharedItemViewModel[] = shared.map(item => ({
                item,
                summary: null,
                loading: true,
            }));
            setSharedItems(sharedVMs);

            // Fetch assignment summary (includes avatar URLs + aggregates) for each shared item
            await Promise.all(
                shared.map(async (item, idx) => {
                    try {
                        const summary = await packingAssignmentService.getAssignmentSummaryByPackingItemId(item.id);
                        setSharedItems(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], summary, loading: false };
                            return next;
                        });
                    } catch {
                        setSharedItems(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], summary: null, loading: false };
                            return next;
                        });
                    }
                })
            );
        } catch (e: any) {
            showErrorToast('Error', e.message || 'Failed to load packing list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (tripId) loadData(); }, [tripId]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [tripId]);

    // ─── Add item ──────────────────────────────────────────────────────────────

    const openAdd = (mode: TabKey) => {
        setAddMode(mode);
        setNewName('');
        setNewCategory('Other');
        setNewQty('1');
        setAddVisible(true);
    };

    const handleAddItem = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const qty = parseInt(newQty, 10);
            await packingItemService.createPackingItem({
                tripId: tripId!,
                name: newName.trim(),
                category: newCategory,
                isShared: addMode === 'shared',
                quantityNeeded: isNaN(qty) || qty < 1 ? 1 : qty,
            });
            showSuccessToast('Item added!', newName.trim());
            setAddVisible(false);
            setLoading(true);
            await loadData();
        } catch (e: any) {
            showErrorToast('Error', e.message || 'Could not add item');
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete item ───────────────────────────────────────────────────────────

    const handleDeleteItem = (item: PackingItem) => {
        Alert.alert('Remove item?', `"${item.name}" will be deleted.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    setDeletingId(item.id);
                    try {
                        await packingItemService.deletePackingItem(item.id);
                        showSuccessToast('Deleted', item.name);
                        if (item.isShared) {
                            setSharedItems(prev => prev.filter(vm => vm.item.id !== item.id));
                        } else {
                            setPersonalItems(prev => prev.filter(i => i.id !== item.id));
                        }
                    } catch (e: any) {
                        showErrorToast('Error', e.message || 'Could not delete');
                    } finally {
                        setDeletingId(null);
                    }
                },
            },
        ]);
    };

    // ─── Claim / unclaim shared item ───────────────────────────────────────────

    const handleClaimToggle = async (vm: SharedItemViewModel) => {
        if (!currentUserId) return;
        setClaimingId(vm.item.id);

        const existingAssignments = vm.summary?.assignments ?? [];
        const myAssignment = existingAssignments.find(a => a.userId === currentUserId);

        try {
            if (myAssignment) {
                await packingAssignmentService.deleteAssignment(myAssignment.id);
                setSharedItems(prev =>
                    prev.map(v => {
                        if (v.item.id !== vm.item.id || !v.summary) return v;
                        const newAssignments = v.summary.assignments.filter(a => a.id !== myAssignment.id);
                        const totalAssigned = newAssignments.reduce((s, a) => s + a.quantity, 0);
                        return {
                            ...v,
                            summary: {
                                ...v.summary,
                                assignments: newAssignments,
                                assignmentCount: newAssignments.length,
                                totalAssigned,
                                remaining: v.summary.quantityNeeded - totalAssigned,
                                isFullyAssigned: false,
                            },
                        };
                    })
                );
                showSuccessToast('Un-claimed', vm.item.name);
            } else {
                const newAssignment = await packingAssignmentService.createAssignment({
                    packingItemId: vm.item.id,
                    userId: null,
                    quantity: 1,
                });
                setSharedItems(prev =>
                    prev.map(v => {
                        if (v.item.id !== vm.item.id) return v;
                        const base = v.summary ?? {
                            packingItemId: vm.item.id,
                            packingItemName: vm.item.name,
                            category: vm.item.category,
                            isShared: true,
                            quantityNeeded: vm.item.quantityNeeded,
                            totalAssigned: 0,
                            remaining: vm.item.quantityNeeded,
                            isFullyAssigned: false,
                            assignmentCount: 0,
                            assignments: [],
                        };
                        const newAssignments = [...base.assignments, newAssignment];
                        const totalAssigned = newAssignments.reduce((s, a) => s + a.quantity, 0);
                        return {
                            ...v,
                            summary: {
                                ...base,
                                assignments: newAssignments,
                                assignmentCount: newAssignments.length,
                                totalAssigned,
                                remaining: base.quantityNeeded - totalAssigned,
                                isFullyAssigned: totalAssigned >= base.quantityNeeded,
                            },
                        };
                    })
                );
                showSuccessToast("I'll bring it!", vm.item.name);
            }
        } catch (e: any) {
            showErrorToast('Error', e.message || 'Could not update assignment');
        } finally {
            setClaimingId(null);
        }
    };

    // ─── Check / uncheck personal item (persisted via API) ──────────────────────
    const [checkedPersonalIds, setCheckedPersonalIds] = useState<Set<string>>(new Set());

    const togglePersonalCheck = async (id: string) => {
        const isNowChecked = !checkedPersonalIds.has(id);

        // Optimistic update
        setCheckedPersonalIds(prev => {
            const next = new Set(prev);
            if (isNowChecked) next.add(id);
            else next.delete(id);
            return next;
        });
        setTogglingId(id);

        try {
            await packingItemService.updatePackingItem(id, { isChecked: isNowChecked });
            // Update the local item so isChecked reflects truth
            setPersonalItems(prev =>
                prev.map(i => i.id === id ? { ...i, isChecked: isNowChecked } : i)
            );
        } catch (e: any) {
            // Rollback optimistic update
            setCheckedPersonalIds(prev => {
                const next = new Set(prev);
                if (isNowChecked) next.delete(id);
                else next.add(id);
                return next;
            });
            showErrorToast('Error', e.message || 'Could not update item');
        } finally {
            setTogglingId(null);
        }
    };

    // ─── Confirm Trip (leader only) ────────────────────────────────────────────

    const handleConfirmTrip = async () => {
        setConfirmingTrip(true);
        try {
            await tripService.updateTripStatus(tripId!, 'Confirmed');
            showSuccessToast('Trip Confirmed!', 'All set — have a great trip!');
            router.push(`/group/trip/${tripId}/dashboard` as any);
        } catch (e: any) {
            showErrorToast('Error', e.message || 'Could not confirm trip');
        } finally {
            setConfirmingTrip(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    const packedCount = personalItems.filter(i => checkedPersonalIds.has(i.id)).length;

    if (loading) {
        return (
            <RetroGrid>
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={s.loadingText}>Loading packing list…</Text>
                </View>
            </RetroGrid>
        );
    }

    const totalPersonal = personalItems.length;
    const totalShared = sharedItems.length;
    const assignedShared = sharedItems.filter(vm =>
        vm.summary?.assignments.some(a => a.userId === currentUserId)
    ).length;

    return (
        <RetroGrid>
            <Stack.Screen options={{ headerShown: false }} />
            <Header floating />

            <View style={s.screenBody}>
            {/* ── Title bar ── */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                    <ArrowLeft size={20} color={theme.primary} />
                </Pressable>
                <View style={s.headerCenter}>
                    <Text style={s.headerTitle}>Packing List</Text>
                    <Text style={s.headerSub}>Phase 4 · Gear up for the trip</Text>
                </View>
            </View>

            {/* ── Step progress ── */}
            <StepProgressBar steps={SETUP_STEPS} currentStep={2} />

            {/* ── Tab bar ── */}
            <View style={s.tabBar}>
                <Pressable
                    style={[s.tab, activeTab === 'personal' && s.tabActive]}
                    onPress={() => setActiveTab('personal')}
                >
                    <Package size={14} color={activeTab === 'personal' ? theme.primary : theme.mutedForeground} />
                    <Text style={[s.tabText, activeTab === 'personal' && s.tabTextActive]}>
                        Personal
                    </Text>
                    {totalPersonal > 0 && (
                        <View style={[s.tabBadge, activeTab === 'personal' && s.tabBadgeActive]}>
                            <Text style={[s.tabBadgeText, activeTab === 'personal' && s.tabBadgeTextActive]}>
                                {packedCount}/{totalPersonal}
                            </Text>
                        </View>
                    )}
                </Pressable>
                <Pressable
                    style={[s.tab, activeTab === 'shared' && s.tabActive]}
                    onPress={() => setActiveTab('shared')}
                >
                    <Users size={14} color={activeTab === 'shared' ? theme.primary : theme.mutedForeground} />
                    <Text style={[s.tabText, activeTab === 'shared' && s.tabTextActive]}>
                        Shared
                    </Text>
                    {totalShared > 0 && (
                        <View style={[s.tabBadge, activeTab === 'shared' && s.tabBadgeActive]}>
                            <Text style={[s.tabBadgeText, activeTab === 'shared' && s.tabBadgeTextActive]}>
                                {assignedShared}/{totalShared}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* ── Content ── */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
            >
                {activeTab === 'personal' ? (
                    <PersonalTab
                        items={personalItems}
                        checkedIds={checkedPersonalIds}
                        togglingId={togglingId}
                        deletingId={deletingId}
                        onToggle={togglePersonalCheck}
                        onDelete={handleDeleteItem}
                        onAdd={() => openAdd('personal')}
                    />
                ) : (
                    <SharedTab
                        items={sharedItems}
                        currentUserId={currentUserId}
                        claimingId={claimingId}
                        deletingId={deletingId}
                        onClaimToggle={handleClaimToggle}
                        onDelete={handleDeleteItem}
                        onAdd={() => openAdd('shared')}
                    />
                )}

                {/* ── Leader-only: Confirm Trip CTA ── */}
                {isLeader ? (
                    <Pressable
                        style={({ pressed }) => [s.doneBtn, confirmingTrip && { opacity: 0.7 }, pressed && { opacity: 0.8 }]}
                        onPress={handleConfirmTrip}
                        disabled={confirmingTrip}
                    >
                        {confirmingTrip ? (
                            <ActivityIndicator size="small" color={theme.primaryForeground} />
                        ) : (
                            <>
                                <Crown size={16} color={theme.primaryForeground} />
                                <Text style={s.doneBtnText}>Confirm Trip &amp; Move to Dashboard</Text>
                            </>
                        )}
                    </Pressable>
                ) : null}

                {/* ── Back to Group shortcut (all users) ── */}
                {groupId ? (
                    <Pressable
                        style={({ pressed }) => [s.backToGroupBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => router.push(`/group/${groupId}` as any)}
                    >
                        <ArrowLeft size={15} color={theme.mutedForeground} />
                        <Text style={s.backToGroupBtnText}>Back to Group</Text>
                    </Pressable>
                ) : null}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Add Item Sheet ── */}
            <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
                <KeyboardAvoidingView style={s.sheetOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={s.sheetBackdrop} onPress={() => setAddVisible(false)} />
                    <View style={s.sheet}>
                        <View style={s.sheetHeader}>
                            <View>
                                <Text style={s.sheetTitle}>
                                    {addMode === 'personal' ? 'Add Personal Item' : 'Add Shared Item'}
                                </Text>
                                <Text style={s.sheetSubtitle}>
                                    {addMode === 'personal'
                                        ? 'Only you will see this item'
                                        : 'Anyone in the group can claim this'}
                                </Text>
                            </View>
                            <Pressable onPress={() => setAddVisible(false)} style={s.sheetClose}>
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Item name */}
                            <Text style={s.fieldLabel}>Item Name <Text style={{ color: theme.destructive }}>*</Text></Text>
                            <TextInput
                                style={s.input}
                                placeholder="e.g. Sunscreen SPF 50"
                                placeholderTextColor={theme.mutedForeground}
                                value={newName}
                                onChangeText={setNewName}
                                returnKeyType="done"
                                autoFocus
                            />

                            {/* Category chips */}
                            <Text style={s.fieldLabel}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                <View style={s.categoryRow}>
                                    {CATEGORY_PRESETS.map(cat => (
                                        <Pressable
                                            key={cat}
                                            style={[s.categoryChip, newCategory === cat && s.categoryChipActive]}
                                            onPress={() => setNewCategory(cat)}
                                        >
                                            <Text style={[s.categoryChipText, newCategory === cat && s.categoryChipTextActive]}>
                                                {cat}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* Quantity (shared only) */}
                            {addMode === 'shared' && (
                                <>
                                    <Text style={s.fieldLabel}>Quantity Needed</Text>
                                    <TextInput
                                        style={[s.input, { width: 80 }]}
                                        keyboardType="number-pad"
                                        value={newQty}
                                        onChangeText={setNewQty}
                                        returnKeyType="done"
                                    />
                                </>
                            )}

                            <View style={s.sheetActions}>
                                <Pressable style={s.cancelBtn} onPress={() => setAddVisible(false)}>
                                    <Text style={s.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[s.submitBtn, (!newName.trim() || saving) && { opacity: 0.5 }]}
                                    onPress={handleAddItem}
                                    disabled={!newName.trim() || saving}
                                >
                                    {saving
                                        ? <ActivityIndicator size="small" color={theme.primaryForeground} />
                                        : <Text style={s.submitText}>Add Item</Text>}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            </View>
        </RetroGrid>
    );
}

// ─── Personal Tab ─────────────────────────────────────────────────────────────

interface PersonalTabProps {
    items: PackingItem[];
    checkedIds: Set<string>;
    togglingId: string | null;
    deletingId: string | null;
    onToggle: (id: string) => void;
    onDelete: (item: PackingItem) => void;
    onAdd: () => void;
}

function PersonalTab({ items, checkedIds, togglingId, deletingId, onToggle, onDelete, onAdd }: PersonalTabProps) {
    const packed = items.filter(i => checkedIds.has(i.id)).length;
    const total = items.length;

    // Group by category
    const groups: Record<string, PackingItem[]> = {};
    items.forEach(item => {
        const key = item.category || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    return (
        <View style={{ gap: 12 }}>
            {/* Section header */}
            <View style={[s.sectionCard, shadows.retroSm]}>
                <View style={s.sectionHeaderRow}>
                    <View style={s.sectionHeaderLeft}>
                        <Package size={16} color={theme.primary} />
                        <Text style={s.sectionTitle}>Your Packing List</Text>
                    </View>
                    <Text style={s.sectionMeta}>{packed}/{total} packed</Text>
                </View>

                {/* Progress bar */}
                {total > 0 && (
                    <View style={s.progressBarTrack}>
                        <View style={[s.progressBarFill, { width: `${Math.round((packed / total) * 100)}%` }]} />
                    </View>
                )}
            </View>

            {/* Item groups */}
            {Object.keys(groups).length === 0 ? (
                <EmptyState
                    icon={<Package size={36} color={theme.muted} />}
                    title="No Personal Items"
                    subtitle="Add what you personally need to bring"
                    onAdd={onAdd}
                />
            ) : (
                Object.entries(groups).map(([category, catItems]) => (
                    <View key={category} style={[s.groupCard, shadows.retroSm]}>
                        <Text style={s.groupTitle}>{category}</Text>
                        {catItems.map(item => {
                            const checked = checkedIds.has(item.id);
                            return (
                                <View key={item.id} style={[s.itemRow, checked && s.itemRowChecked]}>
                                    <Pressable
                                        style={[s.checkbox, checked && s.checkboxChecked]}
                                        onPress={() => onToggle(item.id)}
                                        hitSlop={8}
                                        disabled={togglingId === item.id}
                                    >
                                        {togglingId === item.id
                                            ? <ActivityIndicator size="small" color={checked ? theme.primaryForeground : theme.primary} />
                                            : checked && <Check size={12} color={theme.primaryForeground} />}
                                    </Pressable>
                                    <Text style={[s.itemName, checked && s.itemNameChecked]} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Pressable
                                        style={s.deleteBtn}
                                        onPress={() => onDelete(item)}
                                        hitSlop={8}
                                        disabled={deletingId === item.id}
                                    >
                                        {deletingId === item.id
                                            ? <ActivityIndicator size="small" color={theme.destructive} />
                                            : <Trash2 size={14} color={theme.destructive} />}
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                ))
            )}

            {/* Add button */}
            <Pressable
                style={({ pressed }) => [s.addItemBtn, pressed && { opacity: 0.7 }]}
                onPress={onAdd}
            >
                <Plus size={15} color={theme.primary} />
                <Text style={s.addItemBtnText}>Add Personal Item</Text>
            </Pressable>
        </View>
    );
}

// ─── Shared Tab ────────────────────────────────────────────────────────────────

interface SharedTabProps {
    items: SharedItemViewModel[];
    currentUserId: string | null;
    claimingId: string | null;
    deletingId: string | null;
    onClaimToggle: (vm: SharedItemViewModel) => void;
    onDelete: (item: PackingItem) => void;
    onAdd: () => void;
}

function SharedTab({ items, currentUserId, claimingId, deletingId, onClaimToggle, onDelete, onAdd }: SharedTabProps) {
    const coveredCount = items.filter(vm => vm.summary?.isFullyAssigned).length;

    // Group by category — same pattern as PersonalTab
    const groups: Record<string, SharedItemViewModel[]> = {};
    items.forEach(vm => {
        const key = vm.item.category || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push(vm);
    });

    return (
        <View style={{ gap: 12 }}>
            {/* Section header — mirrors PersonalTab header */}
            <View style={[s.sectionCard, shadows.retroSm]}>
                <View style={s.sectionHeaderRow}>
                    <View style={s.sectionHeaderLeft}>
                        <Users size={16} color={theme.secondary} />
                        <Text style={[s.sectionTitle, { color: theme.secondary }]}>Shared Items</Text>
                    </View>
                    <Text style={s.sectionMeta}>
                        {items.length > 0 ? `${coveredCount}/${items.length} covered` : 'tap to claim'}
                    </Text>
                </View>
                {items.length > 0 && (
                    <View style={s.progressBarTrack}>
                        <View style={[s.progressBarFill, { width: `${Math.round((coveredCount / items.length) * 100)}%`, backgroundColor: theme.secondary }]} />
                    </View>
                )}
            </View>

            {/* Item groups */}
            {Object.keys(groups).length === 0 ? (
                <EmptyState
                    icon={<Users size={36} color={theme.muted} />}
                    title="No Shared Items"
                    subtitle="Add items the group needs someone to bring"
                    onAdd={onAdd}
                />
            ) : (
                Object.entries(groups).map(([category, catVMs]) => (
                    <View key={category} style={[s.groupCard, shadows.retroSm]}>
                        <Text style={s.groupTitle}>{category}</Text>
                        {catVMs.map(vm => {
                            const assignments = vm.summary?.assignments ?? [];
                            const myAssignment = assignments.find(a => a.userId === currentUserId);
                            const isClaimed = !!myAssignment;
                            const isProcessing = claimingId === vm.item.id;
                            const isDeleting = deletingId === vm.item.id;

                            return (
                                <View
                                    key={vm.item.id}
                                    style={[s.itemRow, isClaimed && s.itemRowChecked]}
                                >
                                    {/* Claim toggle — styled like a checkbox */}
                                    <Pressable
                                        style={[s.checkbox, isClaimed && s.checkboxClaimed]}
                                        onPress={() => onClaimToggle(vm)}
                                        hitSlop={8}
                                        disabled={isProcessing || vm.loading}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={isClaimed ? theme.primaryForeground : theme.secondary} />
                                        ) : isClaimed ? (
                                            <UserCheck size={12} color={theme.primaryForeground} />
                                        ) : null}
                                    </Pressable>

                                    {/* Name + assignee info */}
                                    <View style={s.sharedItemCenter}>
                                        <Text style={[s.itemName, isClaimed && s.itemNameClaimed]} numberOfLines={1}>
                                            {vm.item.name}
                                        </Text>
                                        {vm.loading ? (
                                            <ActivityIndicator size="small" color={theme.mutedForeground} style={{ alignSelf: 'flex-start' }} />
                                        ) : assignments.length > 0 ? (
                                            <View style={s.assigneeInlineRow}>
                                                {/* Stacked avatars */}
                                                {assignments.slice(0, 4).map((a, i) => (
                                                    <View
                                                        key={a.id}
                                                        style={[
                                                            s.assigneeAvatar,
                                                            { marginLeft: i === 0 ? 0 : -6, zIndex: 4 - i },
                                                            a.userId === currentUserId && s.assigneeAvatarMe,
                                                        ]}
                                                    >
                                                        {a.userAvatarUrl ? (
                                                            <Image source={{ uri: a.userAvatarUrl }} style={s.assigneeAvatarImg} />
                                                        ) : (
                                                            <Text style={s.assigneeAvatarText}>{getInitials(a.userName)}</Text>
                                                        )}
                                                    </View>
                                                ))}
                                                {assignments.length > 4 && (
                                                    <View style={[s.assigneeAvatar, s.assigneeAvatarOverflow, { marginLeft: -6 }]}>
                                                        <Text style={s.assigneeAvatarText}>+{assignments.length - 4}</Text>
                                                    </View>
                                                )}
                                                {/* Names */}
                                                <Text style={s.assigneeNames} numberOfLines={1}>
                                                    {assignments
                                                        .map(a => a.userId === currentUserId ? 'You' : a.userName.split(' ')[0])
                                                        .join(', ')}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={s.noAssigneeText}>No one yet — tap to claim</Text>
                                        )}
                                    </View>

                                    {/* Qty badge */}
                                    {vm.item.quantityNeeded > 1 && (
                                        <Text style={s.itemQty}>×{vm.item.quantityNeeded}</Text>
                                    )}

                                    {/* Delete */}
                                    <Pressable
                                        style={s.deleteBtn}
                                        onPress={() => onDelete(vm.item)}
                                        hitSlop={8}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting
                                            ? <ActivityIndicator size="small" color={theme.destructive} />
                                            : <Trash2 size={14} color={theme.destructive} />}
                                    </Pressable>
                                </View>
                            );
                        })}
                    </View>
                ))
            )}

            {/* Add button */}
            <Pressable
                style={({ pressed }) => [s.addItemBtn, { borderColor: theme.secondary }, pressed && { opacity: 0.7 }]}
                onPress={onAdd}
            >
                <Plus size={15} color={theme.secondary} />
                <Text style={[s.addItemBtnText, { color: theme.secondary }]}>Add Shared Item</Text>
            </Pressable>
        </View>
    );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle, onAdd }: {
    icon: React.ReactNode; title: string; subtitle: string; onAdd: () => void;
}) {
    return (
        <View style={s.emptyCard}>
            {icon}
            <Text style={s.emptyTitle}>{title}</Text>
            <Text style={s.emptySubtitle}>{subtitle}</Text>
            <Pressable style={({ pressed }) => [s.emptyAddBtn, pressed && { opacity: 0.7 }]} onPress={onAdd}>
                <Plus size={14} color={theme.primaryForeground} />
                <Text style={s.emptyAddBtnText}>Add First Item</Text>
            </Pressable>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    // ── Layout
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontFamily: fonts.regular, fontSize: 13, color: theme.mutedForeground },
    screenBody: { flex: 1, flexDirection: 'column' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, paddingRight: 114,
        backgroundColor: `${theme.card}F0`,
        borderBottomWidth: 2, borderBottomColor: theme.border, gap: 10,
    },
    backBtn: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: `${theme.primary}10`, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1 },
    headerTitle: { fontFamily: fonts.bold, fontSize: 20, color: theme.foreground },
    headerSub: { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground, marginTop: 2 },

    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12 },

    // ── Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: theme.card,
        borderBottomWidth: 2,
        borderBottomColor: theme.border,
        paddingHorizontal: 16,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12,
        borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: theme.primary },
    tabText: { fontFamily: fonts.medium, fontSize: 13, color: theme.mutedForeground },
    tabTextActive: { color: theme.primary, fontFamily: fonts.semiBold },
    tabBadge: {
        backgroundColor: theme.muted, borderRadius: radius.full,
        paddingHorizontal: 6, paddingVertical: 1,
    },
    tabBadgeActive: { backgroundColor: `${theme.primary}20` },
    tabBadgeText: { fontFamily: fonts.medium, fontSize: 10, color: theme.mutedForeground },
    tabBadgeTextActive: { color: theme.primary },

    // ── Section cards
    sectionCard: {
        backgroundColor: theme.card, borderRadius: radius.lg,
        borderWidth: 2, borderColor: theme.border, padding: 14,
        gap: 8,
    },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: theme.foreground },
    sectionMeta: { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground },
    sectionHint: { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, lineHeight: 16 },

    // ── Progress bar
    progressBarTrack: {
        height: 6, backgroundColor: theme.muted, borderRadius: radius.full, overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%', backgroundColor: theme.accent, borderRadius: radius.full,
    },

    // ── Group card
    groupCard: {
        backgroundColor: theme.card, borderRadius: radius.lg,
        borderWidth: 2, borderColor: theme.border, overflow: 'hidden',
    },
    groupTitle: {
        fontFamily: fonts.semiBold, fontSize: 11, color: theme.mutedForeground,
        textTransform: 'uppercase', letterSpacing: 0.8,
        paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    },

    // ── Personal item row
    itemRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        borderTopWidth: 1, borderTopColor: theme.border,
    },
    itemRowChecked: { backgroundColor: `${theme.accent}08` },
    checkbox: {
        width: 20, height: 20, borderRadius: radius.sm,
        borderWidth: 2, borderColor: theme.border,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: theme.accent, borderColor: theme.accent },
    itemName: {
        flex: 1, fontFamily: fonts.medium, fontSize: 13, color: theme.foreground,
    },
    itemNameChecked: {
        color: theme.mutedForeground,
        textDecorationLine: 'line-through',
    },
    itemQty: { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, marginTop: 1 },

    deleteBtn: { padding: 4 },

    // ── Shared item row extras (on top of the shared itemRow / checkbox styles)
    checkboxClaimed: { backgroundColor: theme.secondary, borderColor: theme.secondary },
    itemNameClaimed: { color: theme.secondary },

    sharedItemCenter: { flex: 1, gap: 3 },

    assigneeInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    assigneeAvatar: {
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: `${theme.secondary}25`,
        borderWidth: 1.5, borderColor: theme.card,
        alignItems: 'center', justifyContent: 'center',
    },
    assigneeAvatarMe: { backgroundColor: `${theme.primary}30`, borderColor: theme.primary },
    assigneeAvatarOverflow: { backgroundColor: theme.muted },
    assigneeAvatarImg: { width: 18, height: 18, borderRadius: 9 },
    assigneeAvatarText: { fontFamily: fonts.bold, fontSize: 7, color: theme.foreground },
    assigneeNames: {
        fontFamily: fonts.medium, fontSize: 10, color: theme.secondary,
        flexShrink: 1,
    },
    noAssigneeText: {
        fontFamily: fonts.regular, fontSize: 10, color: theme.mutedForeground,
        fontStyle: 'italic',
    },

    // ── Add item button
    addItemBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderWidth: 1.5, borderColor: theme.primary, borderStyle: 'dashed',
        borderRadius: radius.lg, paddingVertical: 12,
        backgroundColor: `${theme.primary}06`,
    },
    addItemBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: theme.primary },

    // ── Done CTA
    doneBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: theme.primary, borderRadius: radius.lg,
        paddingVertical: 14, marginTop: 4,
        ...shadows.retro,
    },
    doneBtnText: { fontFamily: fonts.bold, fontSize: 15, color: theme.primaryForeground },

    // ── Back to Group shortcut
    backToGroupBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 10, paddingVertical: 12, borderRadius: radius.lg,
        borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.card,
    },
    backToGroupBtnText: { fontFamily: fonts.medium, color: theme.mutedForeground, fontSize: 14 },

    // ── Empty state
    emptyCard: {
        alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: theme.card, borderRadius: radius.lg,
        borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed',
        padding: 32,
    },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 15, color: theme.foreground },
    emptySubtitle: { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground, textAlign: 'center' },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.primary, borderRadius: radius.md,
        paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
    },
    emptyAddBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: theme.primaryForeground },

    // ── Sheet
    sheetOuter: { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: theme.border,
        padding: 20, maxHeight: '80%',
    },
    sheetHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 20,
    },
    sheetTitle: { fontFamily: fonts.bold, fontSize: 16, color: theme.foreground },
    sheetSubtitle: { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, marginTop: 2 },
    sheetClose: { padding: 4 },

    // ── Form
    fieldLabel: {
        fontFamily: fonts.semiBold, fontSize: 12, color: theme.foreground,
        marginBottom: 6, marginTop: 4,
    },
    input: {
        backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border,
        borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
        fontFamily: fonts.regular, fontSize: 13, color: theme.foreground,
        marginBottom: 16,
    },
    categoryRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    categoryChip: {
        borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.full,
        paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.input,
    },
    categoryChipActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}12` },
    categoryChipText: { fontFamily: fonts.medium, fontSize: 12, color: theme.mutedForeground },
    categoryChipTextActive: { color: theme.primary, fontFamily: fonts.semiBold },

    sheetActions: {
        flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 16,
    },
    cancelBtn: {
        flex: 1, borderWidth: 2, borderColor: theme.border, borderRadius: radius.md,
        paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
    },
    cancelText: { fontFamily: fonts.semiBold, fontSize: 13, color: theme.mutedForeground },
    submitBtn: {
        flex: 2, backgroundColor: theme.primary, borderRadius: radius.md,
        paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
    },
    submitText: { fontFamily: fonts.bold, fontSize: 13, color: theme.primaryForeground },
});
