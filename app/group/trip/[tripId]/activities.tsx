/**
 * app/group/trip/[tripId]/activities.tsx
 *
 * Trip itinerary planner — Step 2 of the trip setup flow.
 * Layout: vertical list of day-cards, each with Morning / Afternoon / Evening drop zones.
 *
 * Performance architecture:
 * - DayCard, SlotZone, and ActivityChip are wrapped in React.memo with stable prop
 *   references so zero re-renders happen during drag movement.
 * - Active drop-zone highlight and insertion placeholder are driven entirely by a
 *   Reanimated shared value (activeZoneShared) — no React state, no bridge round-trips.
 * - The drag ghost's position AND opacity are Reanimated shared values; the Animated.View
 *   is always mounted (opacity: 0 when idle) so there is no mount cost on drag start.
 * - PanResponder instances are cached in a Map keyed by activity id+date+startTime and
 *   reused across renders; only recreated when the activity's slot actually changes.
 * - Drops are applied optimistically to local state immediately; the API call happens in
 *   the background and reverts on failure.
 *
 * Data Sources:
 * - tripService.getTripDetail   → confirmed date range for day generation
 * - activityService             → CRUD for activities
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
    Modal, Alert, StyleSheet, PanResponder, Platform,
    KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming, SharedValue,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    ArrowLeft, Clock, MapPin, AlignLeft, X,
    Plane, Hotel, UtensilsCrossed, Compass, Trash2, Edit2,
    Link, ChevronRight, Sun, Sunrise, Sunset,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { tripService }     from '../../../../src/services/tripService';
import { activityService } from '../../../../src/services/activityService';
import Header              from '../../../../src/components/Header';
import StepProgressBar     from '../../../../src/components/StepProgressBar';
import RetroGrid           from '../../../../src/components/RetroGrid';
import { theme, shadows, fonts, radius } from '../../../../src/constants/theme';
import { showSuccessToast, showErrorToast } from '../../../../src/utils/toast';
import {
    Activity, ActivityCategory, ActivityStatus,
    CreateActivityPayload, UpdateActivityPayload,
} from '../../../../src/types/activity.types';
import { TripDetail } from '../../../../src/types/trip.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SETUP_STEPS      = [{ label: 'Polls' }, { label: 'Activities' }, { label: 'Packing' }];
const UNSCHEDULED_DATE = '0001-01-01';
const UNSCHEDULED_KEY  = 'unscheduled';
const BUCKET_ZONE_KEY  = `${UNSCHEDULED_KEY}:Morning`;

type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';
const TIME_SLOTS: TimeSlot[] = ['Morning', 'Afternoon', 'Evening'];

const SLOT_CONFIG: Record<TimeSlot, { label: string; icon: any; color: string }> = {
    Morning:   { label: 'Morning',   icon: Sunrise, color: '#E07B39'      },
    Afternoon: { label: 'Afternoon', icon: Sun,     color: '#D4A017'      },
    Evening:   { label: 'Evening',   icon: Sunset,  color: theme.secondary },
};

const SLOT_DEFAULT_TIMES: Record<TimeSlot, string> = {
    Morning:   '09:00:00',
    Afternoon: '14:00:00',
    Evening:   '19:00:00',
};

const CATEGORY_CONFIG: Record<ActivityCategory, { icon: any; color: string; label: string }> = {
    Flight:        { icon: Plane,           color: theme.secondary,       label: 'Flight'        },
    Accommodation: { icon: Hotel,           color: '#D4A017',             label: 'Hotel'         },
    Food:          { icon: UtensilsCrossed, color: theme.accent,          label: 'Food'          },
    Attraction:    { icon: Compass,         color: theme.primary,         label: 'Attraction'    },
    Transport:     { icon: Plane,           color: theme.secondary,       label: 'Transport'     },
    Shopping:      { icon: Compass,         color: '#9B59B6',             label: 'Shopping'      },
    Entertainment: { icon: Compass,         color: '#E67E22',             label: 'Entertainment' },
    Other:         { icon: Compass,         color: theme.mutedForeground, label: 'Other'         },
};

const DISPLAY_CATEGORIES: ActivityCategory[] = ['Flight', 'Accommodation', 'Food', 'Attraction'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDayKeys(trip: TripDetail | null): string[] {
    const keys: string[] = [UNSCHEDULED_KEY];
    if (!trip) return keys;
    const start = trip.startDate ?? trip.planningRangeStart;
    const end   = trip.endDate   ?? trip.planningRangeEnd;
    if (!start || !end) return keys;
    const startDate = new Date(start);
    const endDate   = new Date(end);
    for (let d = new Date(startDate); d <= endDate && keys.length < 31; d.setDate(d.getDate() + 1)) {
        keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
}

function isUnscheduled(date: string | null | undefined): boolean {
    return !date || date.startsWith('0001') || date === UNSCHEDULED_KEY;
}

function slotForTime(timeStr: string | null): TimeSlot {
    if (!timeStr) return 'Morning';
    const h = parseInt(timeStr.slice(0, 2), 10);
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
}

function fmtTime(t: string | null) {
    if (!t) return '';
    return t.slice(0, 5);
}

function fmtDateShort(isoDate: string): string {
    try {
        const d = new Date(isoDate);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return isoDate; }
}

function timeStrToDate(s: string): Date {
    const [h, m] = s.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
    key: string;
    label: string;
    dateDisplay: string;
    slots: Record<TimeSlot, Activity[]>;
}

interface DropZoneLayout {
    y: number;
    height: number;
    dayKey: string;
    slot: TimeSlot;
    zoneKey: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
    const router     = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [trip,       setTrip]       = useState<TripDetail | null>(null);
    const [days,       setDays]       = useState<DayData[]>([]);
    const daysRef = useRef<DayData[]>([]);
    daysRef.current = days;

    // ── Drag state ─────────────────────────────────────────────────────────────
    // dragActivity = null means idle; set on grant, cleared on release/terminate.
    // No separate `dragging` boolean — ghost opacity is driven by Reanimated.
    const [dragActivity, setDragActivity] = useState<Activity | null>(null);
    const panResponderCache = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());

    // Reanimated shared values — all visual drag feedback happens on the UI thread.
    // activeZoneShared holds "${dayKey}:${slot}" while hovering a zone, "" otherwise.
    // This replaces React state so zero re-renders occur during drag movement.
    const dragX           = useSharedValue(0);
    const dragY           = useSharedValue(0);
    const dragScale       = useSharedValue(1);
    const ghostOpacity    = useSharedValue(0);
    const activeZoneShared = useSharedValue('');

    const ghostStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: dragX.value },
            { translateY: dragY.value },
            { scale: dragScale.value },
        ],
        opacity: ghostOpacity.value,
    }));

    const dropZones     = useRef<DropZoneLayout[]>([]);
    const scrollOffsetY = useRef(0);

    // ── Add sheet ──────────────────────────────────────────────────────────────
    const [addVisible,    setAddVisible]    = useState(false);
    const [addTargetDay,  setAddTargetDay]  = useState<string>(UNSCHEDULED_KEY);
    const [addTargetSlot, setAddTargetSlot] = useState<TimeSlot>('Morning');
    const [saving,        setSaving]        = useState(false);
    const [newTitle,      setNewTitle]      = useState('');
    const [newCategory,   setNewCategory]   = useState<ActivityCategory>('Attraction');
    const [newStatus,     setNewStatus]     = useState<ActivityStatus>('Idea');
    const [newLocation,   setNewLocation]   = useState('');
    const [newNotes,      setNewNotes]      = useState('');
    const [newLinkUrl,    setNewLinkUrl]    = useState('');
    const [newStartTime,  setNewStartTime]  = useState<Date | null>(null);
    const [newEndTime,    setNewEndTime]    = useState<Date | null>(null);
    const [showNewStart,  setShowNewStart]  = useState(false);
    const [showNewEnd,    setShowNewEnd]    = useState(false);
    const [showExtra,     setShowExtra]     = useState(false);

    // ── Detail / edit sheet ────────────────────────────────────────────────────
    const [detail,        setDetail]        = useState<Activity | null>(null);
    const [editMode,      setEditMode]      = useState(false);
    const [editTitle,     setEditTitle]     = useState('');
    const [editCategory,  setEditCategory]  = useState<ActivityCategory>('Attraction');
    const [editStatus,    setEditStatus]    = useState<ActivityStatus>('Idea');
    const [editLocation,  setEditLocation]  = useState('');
    const [editNotes,     setEditNotes]     = useState('');
    const [editLinkUrl,   setEditLinkUrl]   = useState('');
    const [editStartTime, setEditStartTime] = useState<Date | null>(null);
    const [editEndTime,   setEditEndTime]   = useState<Date | null>(null);
    const [showEditStart, setShowEditStart] = useState(false);
    const [showEditEnd,   setShowEditEnd]   = useState(false);
    const [deleting,      setDeleting]      = useState(false);

    // ── Load ───────────────────────────────────────────────────────────────────
    const buildDays = (tripData: TripDetail, groups: any[]): DayData[] => {
        const keys = generateDayKeys(tripData);
        const actMap: Record<string, Activity[]> = {};
        groups.forEach((g: any) => {
            const key = isUnscheduled(g.date) ? UNSCHEDULED_KEY : g.date;
            actMap[key] = (actMap[key] || []).concat(g.activities);
        });
        return keys.map((key, idx) => {
            const acts: Activity[] = actMap[key] ?? [];
            const slots: Record<TimeSlot, Activity[]> = { Morning: [], Afternoon: [], Evening: [] };
            acts.forEach(a => { slots[slotForTime(a.startTime)].push(a); });
            return {
                key,
                label:       key === UNSCHEDULED_KEY ? '📦 Idea Bucket' : `Day ${idx}`,
                dateDisplay: key === UNSCHEDULED_KEY ? '' : fmtDateShort(key),
                slots,
            };
        });
    };

    const loadData = async () => {
        try {
            const [tripData, groups] = await Promise.all([
                tripService.getTripDetail(tripId!),
                activityService.getTripActivities(tripId!),
            ]);
            setTrip(tripData);
            setDays(buildDays(tripData, groups));
            panResponderCache.current.clear();
        } catch (e: any) {
            showErrorToast('Error', e.message || 'Failed to load activities');
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

    // ── Drop zone registration ─────────────────────────────────────────────────
    const registerDropZone = useCallback((dayKey: string, slot: TimeSlot, y: number, height: number) => {
        const zoneKey = `${dayKey}:${slot}`;
        const existing = dropZones.current.findIndex(z => z.zoneKey === zoneKey);
        const zone: DropZoneLayout = { y, height, dayKey, slot, zoneKey };
        if (existing >= 0) dropZones.current[existing] = zone;
        else dropZones.current.push(zone);
    }, []);

    const findDropTarget = useCallback((touchY: number): DropZoneLayout | null => {
        const absY = touchY + scrollOffsetY.current;
        for (const zone of dropZones.current) {
            if (absY >= zone.y && absY <= zone.y + zone.height) return zone;
        }
        return null;
    }, []);

    // ── Optimistic local move ──────────────────────────────────────────────────
    const moveActivityLocally = useCallback((
        activity: Activity,
        newDayKey: string,
        newSlot: TimeSlot,
        newStartTime: string | null,
    ) => {
        setDays(prev => {
            const next = prev.map(d => ({
                ...d,
                slots: {
                    Morning:   d.slots.Morning.filter(a => a.id !== activity.id),
                    Afternoon: d.slots.Afternoon.filter(a => a.id !== activity.id),
                    Evening:   d.slots.Evening.filter(a => a.id !== activity.id),
                },
            }));
            const targetDay = next.find(d => d.key === newDayKey);
            if (targetDay) {
                const newStatus: ActivityStatus = newDayKey === UNSCHEDULED_KEY
                    ? 'Idea'
                    : activity.status === 'Idea' ? 'Scheduled' : activity.status;
                targetDay.slots[newSlot].push({
                    ...activity,
                    date:      newDayKey === UNSCHEDULED_KEY ? UNSCHEDULED_DATE : newDayKey,
                    startTime: newStartTime,
                    status:    newStatus,
                });
            }
            return next;
        });
    }, []);

    // ── Drop handler ───────────────────────────────────────────────────────────
    const handleDrop = useCallback(async (activity: Activity, newDayKey: string, newSlot: TimeSlot) => {
        setDragActivity(null);

        let newStartTime: string | null = null;
        if (newDayKey !== UNSCHEDULED_KEY) {
            newStartTime = (activity.startTime && slotForTime(activity.startTime) === newSlot)
                ? activity.startTime
                : SLOT_DEFAULT_TIMES[newSlot];
        }

        const prevDays = daysRef.current;
        moveActivityLocally(activity, newDayKey, newSlot, newStartTime);

        try {
            await activityService.updateActivity(activity.id, {
                date:      newDayKey === UNSCHEDULED_KEY ? UNSCHEDULED_DATE : newDayKey,
                startTime: newStartTime,
                status:    (newDayKey === UNSCHEDULED_KEY ? 'Idea'
                    : activity.status === 'Idea' ? 'Scheduled' : activity.status) as ActivityStatus,
            } as UpdateActivityPayload);
        } catch (e: any) {
            setDays(prevDays);
            showErrorToast('Move failed', e.message);
        }
    }, [moveActivityLocally]);

    // ── Memoised PanResponder factory ──────────────────────────────────────────
    // Each PanResponder is cached by activity id+date+startTime and reused across
    // renders. Only evicted when the activity moves to a new slot (cache key changes).
    const getOrCreatePanResponder = useCallback((activity: Activity) => {
        const cacheKey = `${activity.id}:${activity.date}:${activity.startTime}`;
        if (panResponderCache.current.has(cacheKey)) {
            return panResponderCache.current.get(cacheKey)!;
        }

        for (const key of panResponderCache.current.keys()) {
            if (key.startsWith(`${activity.id}:`)) {
                panResponderCache.current.delete(key);
                break;
            }
        }

        const pr = PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8,

            onPanResponderGrant: (_, g) => {
                setDragActivity(activity);
                dragX.value    = g.x0 - 80;
                dragY.value    = g.y0 - 30;
                dragScale.value   = withSpring(1.06, { damping: 12, stiffness: 250 });
                ghostOpacity.value = withSpring(1,    { damping: 14, stiffness: 220 });
            },

            onPanResponderMove: (_, g) => {
                // Pure Reanimated writes — zero React state, zero re-renders
                dragX.value = g.moveX - 80;
                dragY.value = g.moveY - 30;

                const zone = findDropTarget(g.moveY);
                const newKey = zone ? zone.zoneKey : '';
                if (activeZoneShared.value !== newKey) {
                    activeZoneShared.value = newKey;
                }
            },

            onPanResponderRelease: (_, g) => {
                dragScale.value    = withSpring(1, { damping: 12, stiffness: 250 });
                ghostOpacity.value = withTiming(0,  { duration: 150 });
                activeZoneShared.value = '';

                const zone = findDropTarget(g.moveY);
                const currentDayKey = isUnscheduled(activity.date) ? UNSCHEDULED_KEY : activity.date;
                const currentSlot   = slotForTime(activity.startTime);

                if (zone && !(zone.dayKey === currentDayKey && zone.slot === currentSlot)) {
                    handleDrop(activity, zone.dayKey, zone.slot);
                } else {
                    setDragActivity(null);
                }
            },

            onPanResponderTerminate: () => {
                dragScale.value    = withSpring(1, { damping: 12, stiffness: 250 });
                ghostOpacity.value = withTiming(0,  { duration: 150 });
                activeZoneShared.value = '';
                setDragActivity(null);
            },
        });

        panResponderCache.current.set(cacheKey, pr);
        return pr;
    }, [findDropTarget, handleDrop]);

    // ── Create ─────────────────────────────────────────────────────────────────
    const openAdd = useCallback((dayKey: string, slot: TimeSlot) => {
        setAddTargetDay(dayKey);
        setAddTargetSlot(slot);
        setNewTitle('');
        setNewCategory('Attraction');
        setNewStatus(dayKey === UNSCHEDULED_KEY ? 'Idea' : 'Scheduled');
        setNewLocation(''); setNewNotes(''); setNewLinkUrl('');
        setNewStartTime(null); setNewEndTime(null);
        setShowExtra(false);
        setAddVisible(true);
    }, []);

    const toTimeOnly = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setSaving(true);
        try {
            const date = (newStatus === 'Idea' || addTargetDay === UNSCHEDULED_KEY)
                ? UNSCHEDULED_DATE
                : addTargetDay;
            const payload: CreateActivityPayload = {
                tripId:      tripId!,
                title:       newTitle.trim(),
                category:    newCategory,
                status:      newStatus,
                date,
                startTime:   newStartTime
                    ? toTimeOnly(newStartTime)
                    : (newStatus === 'Scheduled' ? SLOT_DEFAULT_TIMES[addTargetSlot] : null),
                endTime:     newEndTime ? toTimeOnly(newEndTime) : null,
                locationName: newLocation.trim() || null,
                notes:        newNotes.trim()    || null,
                linkUrl:      newLinkUrl.trim()  || null,
            };
            await activityService.createActivity(payload);
            showSuccessToast('Activity added!', newTitle.trim());
            setAddVisible(false);
            await loadData();
        } catch (e: any) {
            showErrorToast('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = (id: string) => {
        Alert.alert('Remove activity?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                setDeleting(true);
                try {
                    await activityService.deleteActivity(id);
                    showSuccessToast('Deleted', '');
                    setDetail(null);
                    await loadData();
                } catch (e: any) { showErrorToast('Error', e.message); }
                finally { setDeleting(false); }
            }},
        ]);
    };

    // ── Update ─────────────────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!detail || !editTitle.trim()) return;
        setSaving(true);
        try {
            const payload: UpdateActivityPayload = {
                title:        editTitle.trim(),
                category:     editCategory,
                status:       editStatus,
                locationName: editLocation.trim() || null,
                notes:        editNotes.trim()    || null,
                linkUrl:      editLinkUrl.trim()  || null,
                startTime: editStartTime ? toTimeOnly(editStartTime) : null,
                endTime:   editEndTime   ? toTimeOnly(editEndTime)   : null,
            };
            await activityService.updateActivity(detail.id, payload);
            showSuccessToast('Updated!', editTitle.trim());
            setDetail(null); setEditMode(false);
            await loadData();
        } catch (e: any) { showErrorToast('Error', e.message); }
        finally { setSaving(false); }
    };

    // ── Open detail ────────────────────────────────────────────────────────────
    const openDetail = useCallback((a: Activity) => {
        setDetail(a); setEditMode(false);
        setEditTitle(a.title);
        setEditCategory(a.category);
        setEditStatus(a.status);
        setEditLocation(a.locationName || '');
        setEditNotes(a.notes || '');
        setEditLinkUrl(a.linkUrl || '');
        setEditStartTime(a.startTime ? timeStrToDate(a.startTime) : null);
        setEditEndTime(a.endTime    ? timeStrToDate(a.endTime)    : null);
    }, []);

    // ─── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <RetroGrid>
                <View style={s.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
            </RetroGrid>
        );
    }

    return (
        <RetroGrid>
            <Stack.Screen options={{ headerShown: false }} />
            <Header floating />

            <View style={s.screenBody}>
                <View style={s.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                        <ArrowLeft size={20} color={theme.primary} />
                    </Pressable>
                    <View style={s.headerCenter}>
                        <Text style={s.headerTitle} numberOfLines={1}>{trip?.title ?? 'Activities'}</Text>
                        <Text style={s.headerSub}>Plan your itinerary</Text>
                    </View>
                </View>

                <StepProgressBar steps={SETUP_STEPS} currentStep={1} />

                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={e => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
                >
                    {days.map(day => (
                        <DayCard
                            key={day.key}
                            day={day}
                            draggingId={dragActivity?.id ?? null}
                            dragActivity={dragActivity}
                            activeZoneShared={activeZoneShared}
                            getOrCreatePanResponder={getOrCreatePanResponder}
                            onPressActivity={openDetail}
                            onPressAdd={openAdd}
                            registerDropZone={registerDropZone}
                        />
                    ))}

                    <Pressable
                        style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => router.push(`/group/trip/${tripId}/packing` as any)}
                    >
                        <Text style={s.nextBtnText}>Next: Packing List</Text>
                        <ChevronRight size={16} color={theme.primaryForeground} />
                    </Pressable>

                    {trip?.groupId ? (
                        <Pressable
                            style={({ pressed }) => [s.backToGroupBtn, pressed && { opacity: 0.8 }]}
                            onPress={() => router.push(`/group/${trip.groupId}` as any)}
                        >
                            <ArrowLeft size={15} color={theme.mutedForeground} />
                            <Text style={s.backToGroupBtnText}>Back to Group</Text>
                        </Pressable>
                    ) : null}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>

            {/* Ghost — always mounted, opacity/position driven by Reanimated shared values.
                No mount/unmount overhead on drag start/end. Content updates only when
                dragActivity changes (React state), which is 2× per drag at most. */}
            <Animated.View pointerEvents="none" style={[s.dragGhost, ghostStyle]}>
                {dragActivity && (
                    <View style={[s.activityChip, { borderColor: theme.primary, opacity: 0.92 }]}>
                        {React.createElement(
                            CATEGORY_CONFIG[dragActivity.category]?.icon ?? Compass,
                            { size: 13, color: CATEGORY_CONFIG[dragActivity.category]?.color ?? theme.primary }
                        )}
                        <Text style={s.chipTitle} numberOfLines={1}>{dragActivity.title}</Text>
                    </View>
                )}
            </Animated.View>

            {/* ── Add Activity Sheet ─────────────────────────────────────── */}
            <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
                <KeyboardAvoidingView style={s.sheetOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={s.sheetBackdrop} onPress={() => setAddVisible(false)} />
                    <View style={s.sheet}>
                        <View style={s.sheetHeader}>
                            <Text style={s.sheetTitle}>New Activity</Text>
                            <Text style={s.sheetSubtitle}>
                                {addTargetDay === UNSCHEDULED_KEY
                                    ? 'Idea Bucket'
                                    : `${days.find(d => d.key === addTargetDay)?.label} · ${SLOT_CONFIG[addTargetSlot].label}`}
                            </Text>
                            <Pressable onPress={() => setAddVisible(false)} style={s.sheetClose}>
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                            {/* 1 — Title */}
                            <Text style={s.fieldLabel}>
                                Title <Text style={{ color: theme.destructive }}>*</Text>
                            </Text>
                            <TextInput
                                style={s.input}
                                placeholder="e.g. Hotel check-in, Seafood lunch…"
                                placeholderTextColor={theme.mutedForeground}
                                value={newTitle}
                                onChangeText={setNewTitle}
                                returnKeyType="done"
                                autoFocus
                            />

                            {/* 2 — Category */}
                            <Text style={s.fieldLabel}>Category</Text>
                            <View style={s.categoryRow}>
                                {DISPLAY_CATEGORIES.map(cat => {
                                    const cfg = CATEGORY_CONFIG[cat];
                                    const Icon = cfg.icon;
                                    const sel = newCategory === cat;
                                    return (
                                        <Pressable
                                            key={cat}
                                            style={[s.catChip, sel && { borderColor: cfg.color, backgroundColor: `${cfg.color}18` }]}
                                            onPress={() => setNewCategory(cat)}
                                        >
                                            <Icon size={18} color={sel ? cfg.color : theme.mutedForeground} />
                                            <Text style={[s.catLabel, sel && { color: cfg.color, fontFamily: fonts.bold }]}>{cfg.label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* 3 — Status toggle */}
                            <View style={s.statusToggleRow}>
                                <Text style={s.statusToggleLabel}>Save as</Text>
                                {(['Idea', 'Scheduled'] as ActivityStatus[]).map(st => {
                                    const sel   = newStatus === st;
                                    const color = st === 'Idea' ? theme.mutedForeground : theme.accent;
                                    return (
                                        <Pressable
                                            key={st}
                                            style={[s.statusToggleChip, sel && { borderColor: color, backgroundColor: `${color}12` }]}
                                            onPress={() => setNewStatus(st)}
                                        >
                                            <Text style={[s.statusToggleText, sel && { color, fontFamily: fonts.bold }]}>
                                                {st === 'Idea' ? '📦 Idea' : '📅 Scheduled'}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* 4 — Time pickers (Scheduled only) */}
                            {newStatus === 'Scheduled' && (
                                <View style={s.timeRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.fieldLabel}>Start Time</Text>
                                        <Pressable style={[s.pickerBtn, newStartTime && s.pickerBtnActive]} onPress={() => setShowNewStart(true)}>
                                            <Clock size={14} color={newStartTime ? theme.primary : theme.mutedForeground} />
                                            <Text style={[s.pickerText, newStartTime && { color: theme.foreground }]}>
                                                {newStartTime ? newStartTime.toTimeString().slice(0, 5) : 'Start'}
                                            </Text>
                                        </Pressable>
                                        {showNewStart && (
                                            <DateTimePicker mode="time" value={newStartTime ?? new Date()} is24Hour display="spinner"
                                                onChange={(_, d) => { setShowNewStart(false); if (d) setNewStartTime(d); }} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.fieldLabel}>End Time</Text>
                                        <Pressable style={[s.pickerBtn, newEndTime && s.pickerBtnActive]} onPress={() => setShowNewEnd(true)}>
                                            <Clock size={14} color={newEndTime ? theme.primary : theme.mutedForeground} />
                                            <Text style={[s.pickerText, newEndTime && { color: theme.foreground }]}>
                                                {newEndTime ? newEndTime.toTimeString().slice(0, 5) : 'End'}
                                            </Text>
                                        </Pressable>
                                        {showNewEnd && (
                                            <DateTimePicker mode="time" value={newEndTime ?? new Date()} is24Hour display="spinner"
                                                onChange={(_, d) => { setShowNewEnd(false); if (d) setNewEndTime(d); }} />
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* 5 — Optional details */}
                            <Pressable style={s.extraToggle} onPress={() => setShowExtra(v => !v)}>
                                <AlignLeft size={13} color={theme.primary} />
                                <Text style={s.extraToggleText}>{showExtra ? 'Hide details' : 'Add details +'}</Text>
                            </Pressable>

                            {showExtra && (
                                <View>
                                    <Text style={s.fieldLabel}>Location</Text>
                                    <TextInput style={s.input} placeholder="Location name" placeholderTextColor={theme.mutedForeground} value={newLocation} onChangeText={setNewLocation} />
                                    <Text style={s.fieldLabel}>Link / Website</Text>
                                    <TextInput style={s.input} placeholder="https://…" placeholderTextColor={theme.mutedForeground} value={newLinkUrl} onChangeText={setNewLinkUrl} keyboardType="url" autoCapitalize="none" />
                                    <Text style={s.fieldLabel}>Notes</Text>
                                    <TextInput style={[s.input, s.notesInput]} placeholder="Any extra info…" placeholderTextColor={theme.mutedForeground} value={newNotes} onChangeText={setNewNotes} multiline numberOfLines={3} />
                                </View>
                            )}

                            <View style={s.sheetActions}>
                                <Pressable style={s.cancelBtn} onPress={() => setAddVisible(false)}>
                                    <Text style={s.cancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[s.submitBtn, (!newTitle.trim() || saving) && { opacity: 0.5 }]}
                                    onPress={handleCreate}
                                    disabled={!newTitle.trim() || saving}
                                >
                                    {saving
                                        ? <ActivityIndicator size="small" color={theme.primaryForeground} />
                                        : <Text style={s.submitText}>Add Activity</Text>}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Detail / Edit Sheet ──────────────────────────────────── */}
            {detail && (
                <Modal visible transparent animationType="slide" onRequestClose={() => { setDetail(null); setEditMode(false); }}>
                    <KeyboardAvoidingView style={s.sheetOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <Pressable style={s.sheetBackdrop} onPress={() => { setDetail(null); setEditMode(false); }} />
                        <View style={s.sheet}>
                            <View style={s.sheetHeader}>
                                <Text style={s.sheetTitle}>{editMode ? 'Edit Activity' : detail.title}</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {!editMode && (
                                        <>
                                            <Pressable style={s.iconBtn} onPress={() => setEditMode(true)}>
                                                <Edit2 size={15} color={theme.primary} />
                                            </Pressable>
                                            <Pressable style={s.iconBtn} onPress={() => handleDelete(detail.id)}>
                                                {deleting ? <ActivityIndicator size="small" color={theme.destructive} /> : <Trash2 size={15} color={theme.destructive} />}
                                            </Pressable>
                                        </>
                                    )}
                                    <Pressable style={s.sheetClose} onPress={() => { setDetail(null); setEditMode(false); }}>
                                        <X size={18} color={theme.mutedForeground} />
                                    </Pressable>
                                </View>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {editMode ? (
                                    <View>
                                        <Text style={s.fieldLabel}>Category</Text>
                                        <View style={s.categoryRow}>
                                            {DISPLAY_CATEGORIES.map(cat => {
                                                const cfg = CATEGORY_CONFIG[cat]; const Icon = cfg.icon; const sel = editCategory === cat;
                                                return (
                                                    <Pressable key={cat} style={[s.catChip, sel && { borderColor: cfg.color, backgroundColor: `${cfg.color}18` }]} onPress={() => setEditCategory(cat)}>
                                                        <Icon size={18} color={sel ? cfg.color : theme.mutedForeground} />
                                                        <Text style={[s.catLabel, sel && { color: cfg.color, fontFamily: fonts.bold }]}>{cfg.label}</Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>

                                        <Text style={s.fieldLabel}>Title <Text style={{ color: theme.destructive }}>*</Text></Text>
                                        <TextInput style={s.input} value={editTitle} onChangeText={setEditTitle} placeholderTextColor={theme.mutedForeground} />

                                        <View style={s.timeRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.fieldLabel}>Start Time</Text>
                                                <Pressable style={[s.pickerBtn, editStartTime && s.pickerBtnActive]} onPress={() => setShowEditStart(true)}>
                                                    <Clock size={14} color={editStartTime ? theme.primary : theme.mutedForeground} />
                                                    <Text style={[s.pickerText, editStartTime && { color: theme.foreground }]}>{editStartTime ? editStartTime.toTimeString().slice(0, 5) : 'Start'}</Text>
                                                </Pressable>
                                                {showEditStart && <DateTimePicker mode="time" value={editStartTime ?? new Date()} is24Hour display="spinner" onChange={(_, d) => { setShowEditStart(false); if (d) setEditStartTime(d); }} />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.fieldLabel}>End Time</Text>
                                                <Pressable style={[s.pickerBtn, editEndTime && s.pickerBtnActive]} onPress={() => setShowEditEnd(true)}>
                                                    <Clock size={14} color={editEndTime ? theme.primary : theme.mutedForeground} />
                                                    <Text style={[s.pickerText, editEndTime && { color: theme.foreground }]}>{editEndTime ? editEndTime.toTimeString().slice(0, 5) : 'End'}</Text>
                                                </Pressable>
                                                {showEditEnd && <DateTimePicker mode="time" value={editEndTime ?? new Date()} is24Hour display="spinner" onChange={(_, d) => { setShowEditEnd(false); if (d) setEditEndTime(d); }} />}
                                            </View>
                                        </View>

                                        <Text style={s.fieldLabel}>Location</Text>
                                        <TextInput style={s.input} placeholder="Location" placeholderTextColor={theme.mutedForeground} value={editLocation} onChangeText={setEditLocation} />
                                        <Text style={s.fieldLabel}>Link / Website</Text>
                                        <TextInput style={s.input} placeholder="https://…" placeholderTextColor={theme.mutedForeground} value={editLinkUrl} onChangeText={setEditLinkUrl} keyboardType="url" autoCapitalize="none" />
                                        <Text style={s.fieldLabel}>Notes</Text>
                                        <TextInput style={[s.input, s.notesInput]} placeholder="Notes…" placeholderTextColor={theme.mutedForeground} value={editNotes} onChangeText={setEditNotes} multiline numberOfLines={3} />

                                        <Text style={s.fieldLabel}>Status</Text>
                                        <View style={s.statusRow}>
                                            {(['Idea', 'Scheduled', 'Done', 'Cancelled'] as ActivityStatus[]).map(st => (
                                                <Pressable key={st} style={[s.statusChip, editStatus === st && s.statusChipActive]} onPress={() => setEditStatus(st)}>
                                                    <Text style={[s.statusChipText, editStatus === st && s.statusChipTextActive]}>{st}</Text>
                                                </Pressable>
                                            ))}
                                        </View>

                                        <View style={s.sheetActions}>
                                            <Pressable style={s.cancelBtn} onPress={() => setEditMode(false)}>
                                                <Text style={s.cancelText}>Cancel</Text>
                                            </Pressable>
                                            <Pressable style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleUpdate} disabled={saving}>
                                                {saving ? <ActivityIndicator size="small" color={theme.primaryForeground} /> : <Text style={s.submitText}>Save Changes</Text>}
                                            </Pressable>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        <View style={s.detailCatRow}>
                                            {React.createElement(CATEGORY_CONFIG[detail.category]?.icon ?? Compass, { size: 15, color: CATEGORY_CONFIG[detail.category]?.color ?? theme.primary })}
                                            <Text style={[s.detailCatText, { color: CATEGORY_CONFIG[detail.category]?.color ?? theme.primary }]}>{CATEGORY_CONFIG[detail.category]?.label ?? detail.category}</Text>
                                            <View style={s.statusPill}><Text style={s.statusPillText}>{detail.status}</Text></View>
                                        </View>
                                        {(detail.startTime || detail.endTime) && (
                                            <View style={s.detailRow}>
                                                <Clock size={14} color={theme.mutedForeground} />
                                                <Text style={s.detailRowText}>{fmtTime(detail.startTime)}{detail.endTime ? ` → ${fmtTime(detail.endTime)}` : ''}</Text>
                                            </View>
                                        )}
                                        {detail.locationName && <View style={s.detailRow}><MapPin size={14} color={theme.mutedForeground} /><Text style={s.detailRowText}>{detail.locationName}</Text></View>}
                                        {detail.linkUrl && <View style={s.detailRow}><Link size={14} color={theme.secondary} /><Text style={[s.detailRowText, { color: theme.secondary }]} numberOfLines={1}>{detail.linkUrl}</Text></View>}
                                        {detail.notes && <View style={s.detailRow}><AlignLeft size={14} color={theme.mutedForeground} /><Text style={s.detailRowText}>{detail.notes}</Text></View>}
                                        {!detail.startTime && !detail.locationName && !detail.linkUrl && !detail.notes && (
                                            <Text style={s.detailEmpty}>No additional details. Tap Edit to add info.</Text>
                                        )}
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            )}
        </RetroGrid>
    );
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

interface DayCardProps {
    day: DayData;
    draggingId: string | null;
    dragActivity: Activity | null;
    activeZoneShared: SharedValue<string>;
    getOrCreatePanResponder: (a: Activity) => ReturnType<typeof PanResponder.create>;
    onPressActivity: (a: Activity) => void;
    onPressAdd: (dayKey: string, slot: TimeSlot) => void;
    registerDropZone: (dayKey: string, slot: TimeSlot, y: number, height: number) => void;
}

const DayCard = memo(function DayCard({ day, draggingId, dragActivity, activeZoneShared, getOrCreatePanResponder, onPressActivity, onPressAdd, registerDropZone }: DayCardProps) {
    // Idea Bucket — animated border/background driven by shared value (no React state)
    const bucketStyle = useAnimatedStyle(() => {
        const isActive = activeZoneShared.value === BUCKET_ZONE_KEY;
        return {
            borderColor:     withTiming(isActive ? theme.primary : `${theme.primary}50`,    { duration: 120 }),
            backgroundColor: withTiming(isActive ? `${theme.primary}12` : `${theme.primary}08`, { duration: 120 }),
        };
    });

    if (day.key === UNSCHEDULED_KEY) {
        const allActs = [...day.slots.Morning, ...day.slots.Afternoon, ...day.slots.Evening];
        return (
            <Animated.View
                style={[s.bucketCard, bucketStyle]}
                ref={(ref: any) => {
                    if (ref) {
                        ref.measure?.((
                            _x: number, _y: number, _w: number, h: number, _px: number, py: number,
                        ) => {
                            registerDropZone(day.key, 'Morning', py, h);
                        });
                    }
                }}
            >
                <View style={s.bucketHeader}>
                    <Text style={s.bucketLabel}>📦  Idea Bucket</Text>
                    <Text style={s.bucketSub}>Drag ideas onto a day when ready</Text>
                </View>

                {allActs.length === 0 ? (
                    <Text style={s.bucketEmpty}>No ideas yet. Tap below to add one.</Text>
                ) : (
                    allActs.map(a => (
                        <ActivityChip
                            key={a.id}
                            activity={a}
                            isDragging={a.id === draggingId}
                            onPressActivity={onPressActivity}
                            panResponder={getOrCreatePanResponder(a)}
                        />
                    ))
                )}

                {/* Animated placeholder — height driven by activeZoneShared on UI thread */}
                <BucketPlaceholder
                    activeZoneShared={activeZoneShared}
                    title={dragActivity?.title ?? ''}
                />

                <Pressable style={s.bucketAddBtn} onPress={() => onPressAdd(day.key, 'Morning')}>
                    <Text style={s.bucketAddText}>+ Add an Idea</Text>
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <View style={s.dayCard}>
            <View style={s.dayHeader}>
                <Text style={s.dayLabel}>{day.label}</Text>
                {day.dateDisplay ? <Text style={s.dayDate}>{day.dateDisplay}</Text> : null}
            </View>
            {TIME_SLOTS.map(slot => (
                <SlotZone
                    key={slot}
                    slot={slot}
                    activities={day.slots[slot]}
                    dayKey={day.key}
                    zoneKey={`${day.key}:${slot}`}
                    draggingId={draggingId}
                    dragActivityTitle={dragActivity?.title ?? ''}
                    activeZoneShared={activeZoneShared}
                    getOrCreatePanResponder={getOrCreatePanResponder}
                    onPressActivity={onPressActivity}
                    onPressAdd={onPressAdd}
                    registerDropZone={registerDropZone}
                />
            ))}
        </View>
    );
});

// ─── BucketPlaceholder ─────────────────────────────────────────────────────────
// Animated insertion chip for the Idea Bucket — pure Reanimated, no React state.

interface BucketPlaceholderProps {
    activeZoneShared: SharedValue<string>;
    title: string;
}

const BucketPlaceholder = memo(function BucketPlaceholder({ activeZoneShared, title }: BucketPlaceholderProps) {
    const style = useAnimatedStyle(() => {
        const isActive = activeZoneShared.value === BUCKET_ZONE_KEY;
        return {
            height:       withTiming(isActive ? 40 : 0,   { duration: 140 }),
            opacity:      withTiming(isActive ? 0.6 : 0,  { duration: 140 }),
            marginBottom: withTiming(isActive ? 6 : 0,    { duration: 140 }),
            overflow:     'hidden',
        };
    });
    return (
        <Animated.View style={[s.placeholderChip, style]}>
            <Text style={s.placeholderText} numberOfLines={1}>{title}</Text>
        </Animated.View>
    );
});

// ─── SlotZone ─────────────────────────────────────────────────────────────────

interface SlotZoneProps {
    slot: TimeSlot;
    activities: Activity[];
    dayKey: string;
    zoneKey: string;
    draggingId: string | null;
    dragActivityTitle: string;
    activeZoneShared: SharedValue<string>;
    getOrCreatePanResponder: (a: Activity) => ReturnType<typeof PanResponder.create>;
    onPressActivity: (a: Activity) => void;
    onPressAdd: (dayKey: string, slot: TimeSlot) => void;
    registerDropZone: (dayKey: string, slot: TimeSlot, y: number, height: number) => void;
}

const SlotZone = memo(function SlotZone({ slot, activities, dayKey, zoneKey, draggingId, dragActivityTitle, activeZoneShared, getOrCreatePanResponder, onPressActivity, onPressAdd, registerDropZone }: SlotZoneProps) {
    const cfg  = SLOT_CONFIG[slot];
    const Icon = cfg.icon;

    // Background highlight — runs on UI thread, zero React re-renders
    const highlightStyle = useAnimatedStyle(() => {
        const isActive = activeZoneShared.value === zoneKey;
        return {
            backgroundColor: withTiming(isActive ? `${theme.primary}07` : 'transparent', { duration: 100 }),
            borderBottomColor: withTiming(isActive ? `${theme.primary}60` : `${theme.border}80`, { duration: 100 }),
        };
    });

    // Insertion placeholder — height animates from 0 → chip height, pushing items apart
    const placeholderStyle = useAnimatedStyle(() => {
        const isActive = activeZoneShared.value === zoneKey;
        return {
            height:       withTiming(isActive ? 40 : 0,  { duration: 140 }),
            opacity:      withTiming(isActive ? 0.6 : 0, { duration: 140 }),
            marginBottom: withTiming(isActive ? 6 : 0,   { duration: 140 }),
            overflow:     'hidden',
        };
    });

    // Drop hint text fades in/out
    const hintStyle = useAnimatedStyle(() => {
        const isActive = activeZoneShared.value === zoneKey;
        return { opacity: withTiming(isActive ? 1 : 0, { duration: 100 }) };
    });
    const normalHintStyle = useAnimatedStyle(() => {
        const isActive = activeZoneShared.value === zoneKey;
        return { opacity: withTiming(isActive ? 0 : 1, { duration: 100 }) };
    });

    return (
        <Animated.View
            style={[s.slotZone, highlightStyle]}
            ref={(ref: any) => {
                if (ref) {
                    ref.measure?.((
                        _x: number, _y: number, _w: number, h: number, _px: number, py: number,
                    ) => {
                        registerDropZone(dayKey, slot, py, h);
                    });
                }
            }}
        >
            <View style={s.slotHeader}>
                <Icon size={14} color={cfg.color} />
                <Text style={[s.slotLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>

            {activities.map(a => (
                <ActivityChip
                    key={a.id}
                    activity={a}
                    isDragging={a.id === draggingId}
                    onPressActivity={onPressActivity}
                    panResponder={getOrCreatePanResponder(a)}
                />
            ))}

            {/* Insertion placeholder — animated via Reanimated, pushes items apart */}
            <Animated.View style={[s.placeholderChip, placeholderStyle]}>
                <Text style={s.placeholderText} numberOfLines={1}>{dragActivityTitle}</Text>
            </Animated.View>

            {/* Drop zone tap button with animated hint text */}
            <Pressable style={s.dropZonePlaceholder} onPress={() => onPressAdd(dayKey, slot)}>
                <View style={{ alignItems: 'center' }}>
                    <Animated.Text style={[s.dropZoneText, normalHintStyle]}>
                        + Tap to add or drop here
                    </Animated.Text>
                    <Animated.Text style={[s.dropZoneText, s.dropZoneTextActive, { position: 'absolute' }, hintStyle]}>
                        Release to drop
                    </Animated.Text>
                </View>
            </Pressable>
        </Animated.View>
    );
});

// ─── ActivityChip ─────────────────────────────────────────────────────────────

interface ActivityChipProps {
    activity: Activity;
    isDragging: boolean;
    onPressActivity: (a: Activity) => void;
    panResponder: ReturnType<typeof PanResponder.create>;
}

// memo + stable onPressActivity ref = chip only re-renders when its own data changes
const ActivityChip = memo(function ActivityChip({ activity, isDragging, onPressActivity, panResponder }: ActivityChipProps) {
    const cfg  = CATEGORY_CONFIG[activity.category] ?? CATEGORY_CONFIG.Other;
    const Icon = cfg.icon;

    const scale = useSharedValue(1);
    useEffect(() => {
        scale.value = withSpring(isDragging ? 0.95 : 1, { damping: 15, stiffness: 200 });
    }, [isDragging]);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View
            style={[s.activityChip, isDragging && s.activityChipDragging, animStyle]}
            {...panResponder.panHandlers}
        >
            <Pressable style={s.chipPressable} onPress={() => onPressActivity(activity)}>
                <View style={[s.chipIcon, { backgroundColor: `${cfg.color}18` }]}>
                    <Icon size={13} color={cfg.color} />
                </View>
                <View style={s.chipBody}>
                    <Text style={s.chipTitle} numberOfLines={1}>{activity.title}</Text>
                    {activity.locationName && (
                        <View style={s.chipMeta}>
                            <MapPin size={9} color={theme.mutedForeground} />
                            <Text style={s.chipMetaText} numberOfLines={1}>{activity.locationName}</Text>
                        </View>
                    )}
                </View>
                {activity.startTime && (
                    <Text style={s.chipTime}>{fmtTime(activity.startTime)}</Text>
                )}
            </Pressable>
        </Animated.View>
    );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
    screenBody: { flex: 1, flexDirection: 'column' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, paddingRight: 114,
        backgroundColor: `${theme.card}F0`, borderBottomWidth: 2, borderBottomColor: theme.border, gap: 10,
    },
    backBtn:      { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: `${theme.primary}10`, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1 },
    headerTitle:  { fontSize: 20, fontFamily: fonts.bold, color: theme.foreground },
    headerSub:    { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground, marginTop: 2 },

    scroll:        { flex: 1 },
    scrollContent: { padding: 12, gap: 12, flexGrow: 1 },

    // ── Idea Bucket
    bucketCard: {
        borderRadius: radius.xl, borderWidth: 2, borderStyle: 'dashed',
        padding: 14, gap: 8,
    },
    bucketHeader: { gap: 2, marginBottom: 4 },
    bucketLabel:  { fontSize: 16, fontFamily: fonts.bold, color: theme.primary },
    bucketSub:    { fontSize: 11, fontFamily: fonts.regular, color: theme.mutedForeground },
    bucketEmpty:  { fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground, textAlign: 'center', paddingVertical: 10 },
    bucketAddBtn: {
        marginTop: 4, paddingVertical: 10, borderRadius: radius.lg,
        borderWidth: 1.5, borderColor: `${theme.primary}40`, borderStyle: 'dashed',
        alignItems: 'center',
    },
    bucketAddText: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.primary },

    // ── Day card
    dayCard: {
        backgroundColor: theme.card, borderRadius: radius.xl,
        borderWidth: 2, borderColor: theme.border,
        ...shadows.retroSm, overflow: 'hidden',
    },
    dayHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
        borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    dayLabel: { fontSize: 15, fontFamily: fonts.bold, color: theme.foreground },
    dayDate:  { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground },

    // ── Slot zone (outer view — animated)
    slotZone: {
        paddingHorizontal: 10, paddingVertical: 8,
        borderBottomWidth: 1,
    },
    slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    slotLabel:  { fontSize: 12, fontFamily: fonts.semiBold },

    // ── Drop zone
    dropZonePlaceholder: {
        borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed',
        borderRadius: radius.lg, paddingVertical: 8, alignItems: 'center', marginTop: 4,
    },
    dropZoneText:       { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground },
    dropZoneTextActive: { color: theme.primary, fontFamily: fonts.semiBold },

    // ── Drag insertion placeholder chip
    placeholderChip: {
        borderWidth: 1.5, borderColor: theme.primary, borderStyle: 'dashed',
        borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 10,
        backgroundColor: `${theme.primary}08`,
    },
    placeholderText: { fontSize: 13, fontFamily: fonts.regular, color: theme.primary },

    // ── Activity chip
    activityChip: {
        backgroundColor: theme.input, borderRadius: radius.lg,
        borderWidth: 1.5, borderColor: theme.border, marginBottom: 6, overflow: 'hidden',
    },
    activityChipDragging: { opacity: 0.3 },
    chipPressable: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
    chipIcon:      { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    chipBody:      { flex: 1, gap: 2 },
    chipTitle:     { fontSize: 13, fontFamily: fonts.semiBold, color: theme.foreground },
    chipMeta:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
    chipMetaText:  { fontSize: 10, fontFamily: fonts.regular, color: theme.mutedForeground },
    chipTime:      { fontSize: 11, fontFamily: fonts.bold, color: theme.primary },

    // ── Drag ghost (always mounted, opacity = 0 when idle)
    dragGhost: { position: 'absolute', zIndex: 999, width: 200 },

    // ── Navigation buttons
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 15, borderRadius: radius.xl, backgroundColor: theme.primary, marginTop: 8,
    },
    nextBtnText: { fontSize: 15, fontFamily: fonts.bold, color: theme.primaryForeground },
    backToGroupBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 10, paddingVertical: 12, borderRadius: radius.xl,
        borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.card,
    },
    backToGroupBtnText: { fontFamily: fonts.medium, color: theme.mutedForeground, fontSize: 14 },

    // ── Sheet
    sheetOuter:    { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: theme.border,
        paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%',
    },
    sheetHeader: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 16,
    },
    sheetTitle:    { flex: 1, fontSize: 17, fontFamily: fonts.bold, color: theme.foreground },
    sheetSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground, marginRight: 8 },
    sheetClose:    { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.muted, justifyContent: 'center', alignItems: 'center' },
    iconBtn:       { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.muted, justifyContent: 'center', alignItems: 'center' },

    // ── Fields
    fieldLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.foreground, marginBottom: 8 },
    input: {
        backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border,
        borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, fontFamily: fonts.regular, color: theme.foreground, marginBottom: 14,
    },
    notesInput: { height: 76, textAlignVertical: 'top' },

    // ── Category chips
    categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    catChip: {
        flex: 1, alignItems: 'center', paddingVertical: 10, gap: 5,
        borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.input,
    },
    catLabel: { fontSize: 11, fontFamily: fonts.medium, color: theme.mutedForeground, textAlign: 'center' },

    // ── Status toggle
    statusToggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    statusToggleLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.mutedForeground },
    statusToggleChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.input },
    statusToggleText:  { fontSize: 12, fontFamily: fonts.medium, color: theme.mutedForeground },

    // ── Time row
    timeRow:         { flexDirection: 'row', gap: 10, marginBottom: 14 },
    pickerBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border, borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 10 },
    pickerBtnActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}08` },
    pickerText:      { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground },

    // ── Extra toggle
    extraToggle:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    extraToggleText: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.primary },

    // ── Status chips (edit sheet)
    statusRow:            { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
    statusChip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.input },
    statusChipActive:     { borderColor: theme.primary, backgroundColor: `${theme.primary}12` },
    statusChipText:       { fontSize: 12, fontFamily: fonts.medium, color: theme.mutedForeground },
    statusChipTextActive: { color: theme.primary, fontFamily: fonts.bold },

    // ── Sheet actions
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
    cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, alignItems: 'center' },
    cancelText:   { fontSize: 14, fontFamily: fonts.semiBold, color: theme.mutedForeground },
    submitBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.xl, backgroundColor: theme.primary, alignItems: 'center' },
    submitText:   { fontSize: 14, fontFamily: fonts.bold, color: theme.primaryForeground },

    // ── Detail view
    detailCatRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    detailCatText:    { fontSize: 13, fontFamily: fonts.semiBold },
    statusPill:       { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, backgroundColor: `${theme.primary}15`, borderWidth: 1, borderColor: `${theme.primary}30` },
    statusPillText:   { fontSize: 11, fontFamily: fonts.medium, color: theme.primary },
    detailRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    detailRowText:    { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: theme.foreground, lineHeight: 20 },
    detailEmpty:      { fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground, textAlign: 'center', marginTop: 12 },
});
