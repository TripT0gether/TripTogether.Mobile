/**
 * app/group/trip/[tripId]/activities.tsx
 *
 * Trip itinerary planner — Step 2 of the trip setup flow.
 * Layout: vertical list of day-cards, each with Morning / Afternoon / Evening drop zones.
 * Activities are dragged between slots across any day with smooth Animated feedback.
 *
 * Drag & drop: PanResponder per activity chip lifts on long-press, moves freely across
 * the screen, and drops onto the target slot determined by absolute touch position.
 *
 * Data Sources:
 * - tripService.getTripDetail   → confirmed date range for day generation
 * - activityService             → CRUD for activities
 *
 * Used by: Trip setup flow "Next → Activities" CTA from polls screen
 */

import React, {
    useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
    View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
    Modal, Alert, StyleSheet, PanResponder, Animated, Platform,
    KeyboardAvoidingView, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    ArrowLeft, Plus, Clock, MapPin, AlignLeft, X,
    Plane, Hotel, UtensilsCrossed, Compass, Trash2, Edit2,
    Link, ChevronRight, Sun, Sunrise, Sunset,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { tripService }       from '../../../../src/services/tripService';
import { activityService }   from '../../../../src/services/activityService';
import Header                from '../../../../src/components/Header';
import StepProgressBar       from '../../../../src/components/StepProgressBar';
import RetroGrid             from '../../../../src/components/RetroGrid';
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

type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';
const TIME_SLOTS: TimeSlot[] = ['Morning', 'Afternoon', 'Evening'];

const SLOT_CONFIG: Record<TimeSlot, { label: string; icon: any; color: string; timeRange: string }> = {
    Morning:   { label: 'Morning',   icon: Sunrise,  color: '#E07B39', timeRange: '06:00–12:00' },
    Afternoon: { label: 'Afternoon', icon: Sun,       color: '#D4A017', timeRange: '12:00–18:00' },
    Evening:   { label: 'Evening',   icon: Sunset,    color: theme.secondary, timeRange: '18:00–24:00' },
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

    // Prefer confirmed dates; fall back to planning range
    const start = trip.startDate ?? trip.planningRangeStart;
    const end   = trip.endDate   ?? trip.planningRangeEnd;

    if (!start || !end) return keys; // No date info yet — only Idea Bucket shown

    const startDate = new Date(start);
    const endDate   = new Date(end);
    // Clamp: don't generate more than 30 days
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
    key: string;              // date ISO string or UNSCHEDULED_KEY
    label: string;            // "Day 1", "Day 2", "Unscheduled"
    dateDisplay: string;      // "17 Apr" or ""
    slots: Record<TimeSlot, Activity[]>;
}

interface DropZoneLayout {
    y: number;
    height: number;
    dayKey: string;
    slot: TimeSlot;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
    const router  = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [trip,       setTrip]       = useState<TripDetail | null>(null);
    const [days,       setDays]       = useState<DayData[]>([]);

    // Drag state
    const [dragging,     setDragging]     = useState(false);
    const [dragActivity, setDragActivity] = useState<Activity | null>(null);
    const dragX         = useRef(new Animated.Value(0)).current;
    const dragY         = useRef(new Animated.Value(0)).current;
    const dragScale     = useRef(new Animated.Value(1)).current;
    const dropZones     = useRef<DropZoneLayout[]>([]);
    const scrollOffsetY = useRef(0);

    // Add sheet
    const [addVisible,     setAddVisible]     = useState(false);
    const [addTargetDay,   setAddTargetDay]   = useState<string>(UNSCHEDULED_KEY);
    const [addTargetSlot,  setAddTargetSlot]  = useState<TimeSlot>('Morning');
    const [saving,         setSaving]         = useState(false);
    const [newTitle,       setNewTitle]       = useState('');
    const [newCategory,    setNewCategory]    = useState<ActivityCategory>('Attraction');
    const [newStatus,      setNewStatus]      = useState<ActivityStatus>('Idea');
    const [newLocation,    setNewLocation]    = useState('');
    const [newNotes,       setNewNotes]       = useState('');
    const [newLinkUrl,     setNewLinkUrl]     = useState('');
    const [newStartTime,   setNewStartTime]   = useState<Date | null>(null);
    const [newEndTime,     setNewEndTime]     = useState<Date | null>(null);
    const [showNewStart,   setShowNewStart]   = useState(false);
    const [showNewEnd,     setShowNewEnd]     = useState(false);
    const [showExtra,      setShowExtra]      = useState(false);

    // Detail / edit sheet
    const [detail,         setDetail]        = useState<Activity | null>(null);
    const [editMode,       setEditMode]      = useState(false);
    const [editTitle,      setEditTitle]     = useState('');
    const [editCategory,   setEditCategory]  = useState<ActivityCategory>('Attraction');
    const [editStatus,     setEditStatus]    = useState<ActivityStatus>('Idea');
    const [editLocation,   setEditLocation]  = useState('');
    const [editNotes,      setEditNotes]     = useState('');
    const [editLinkUrl,    setEditLinkUrl]   = useState('');
    const [editStartTime,  setEditStartTime] = useState<Date | null>(null);
    const [editEndTime,    setEditEndTime]   = useState<Date | null>(null);
    const [showEditStart,  setShowEditStart] = useState(false);
    const [showEditEnd,    setShowEditEnd]   = useState(false);
    const [deleting,       setDeleting]      = useState(false);

    // ── Load ───────────────────────────────────────────────────────────────────
    const buildDays = (tripData: TripDetail, groups: any[]): DayData[] => {
        const keys = generateDayKeys(tripData);
        // Build activity map
        const actMap: Record<string, Activity[]> = {};
        groups.forEach((g: any) => {
            const key = isUnscheduled(g.date) ? UNSCHEDULED_KEY : g.date;
            actMap[key] = (actMap[key] || []).concat(g.activities);
        });

        return keys.map((key, idx) => {
            const acts: Activity[] = actMap[key] ?? [];
            const slots: Record<TimeSlot, Activity[]> = {
                Morning: [], Afternoon: [], Evening: [],
            };
            acts.forEach(a => {
                slots[slotForTime(a.startTime)].push(a);
            });
            return {
                key,
                label: key === UNSCHEDULED_KEY ? '📦 Idea Bucket' : `Day ${idx}`,
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
    const registerDropZone = (dayKey: string, slot: TimeSlot, y: number, height: number) => {
        const existing = dropZones.current.findIndex(z => z.dayKey === dayKey && z.slot === slot);
        const zone: DropZoneLayout = { y, height, dayKey, slot };
        if (existing >= 0) dropZones.current[existing] = zone;
        else dropZones.current.push(zone);
    };

    const findDropTarget = (touchY: number): { dayKey: string; slot: TimeSlot } | null => {
        const absY = touchY + scrollOffsetY.current;
        for (const zone of dropZones.current) {
            if (absY >= zone.y && absY <= zone.y + zone.height) {
                return { dayKey: zone.dayKey, slot: zone.slot };
            }
        }
        return null;
    };

    // ── Drag ───────────────────────────────────────────────────────────────────
    const createPanResponder = (activity: Activity) =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8,
            onPanResponderGrant: (e, g) => {
                setDragActivity(activity);
                setDragging(true);
                dragX.setValue(g.x0 - 80);
                dragY.setValue(g.y0 - 30);
                Animated.spring(dragScale, { toValue: 1.06, useNativeDriver: true, tension: 200, friction: 10 }).start();
            },
            onPanResponderMove: (_, g) => {
                dragX.setValue(g.moveX - 80);
                dragY.setValue(g.moveY - 30);
            },
            onPanResponderRelease: async (_, g) => {
                Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }).start();
                setDragging(false);

                const target = findDropTarget(g.moveY);
                if (!target || (target.dayKey === activity.date && target.slot === slotForTime(activity.startTime))) {
                    setDragActivity(null);
                    return;
                }

                const newDate = target.dayKey === UNSCHEDULED_KEY ? UNSCHEDULED_DATE : target.dayKey;
                // Set a default time for the slot
                const slotDefaultTime = target.slot === 'Morning' ? '09:00' : target.slot === 'Afternoon' ? '14:00' : '19:00';
                try {
                    await activityService.updateActivity(activity.id, {
                        date: newDate,
                        startTime: slotDefaultTime,
                    });
                    await loadData();
                } catch (e: any) {
                    showErrorToast('Move failed', e.message);
                }
                setDragActivity(null);
            },
            onPanResponderTerminate: () => {
                Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }).start();
                setDragging(false);
                setDragActivity(null);
            },
        });

    // ── Create ─────────────────────────────────────────────────────────────────
    const openAdd = (dayKey: string, slot: TimeSlot) => {
        setAddTargetDay(dayKey);
        setAddTargetSlot(slot);
        setNewTitle(''); setNewCategory('Attraction');
        // Idea Bucket → Idea status; day slot → Scheduled
        setNewStatus(dayKey === UNSCHEDULED_KEY ? 'Idea' : 'Scheduled');
        setNewLocation(''); setNewNotes(''); setNewLinkUrl('');
        setNewStartTime(null); setNewEndTime(null); setShowExtra(false);
        setAddVisible(true);
    };

    // Format a Date to TimeOnly "HH:mm:ss" as the backend expects
    const toTimeOnly = (d: Date) => {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}:00`;
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setSaving(true);
        try {
            // Idea status always goes to bucket regardless of which slot was tapped
            const date = (newStatus === 'Idea' || addTargetDay === UNSCHEDULED_KEY)
                ? UNSCHEDULED_DATE
                : addTargetDay;
            const defaultTime = addTargetSlot === 'Morning' ? '09:00:00' : addTargetSlot === 'Afternoon' ? '14:00:00' : '19:00:00';
            const payload: CreateActivityPayload = {
                tripId: tripId!,
                title: newTitle.trim(),
                category: newCategory,
                status: newStatus,
                date,
                startTime: newStartTime ? toTimeOnly(newStartTime) : (newStatus === 'Scheduled' ? defaultTime : null),
                endTime:   newEndTime   ? toTimeOnly(newEndTime)   : null,
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
            const toTimeOnly = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:00`;
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
    const openDetail = (a: Activity) => {
        setDetail(a); setEditMode(false);
        setEditTitle(a.title);
        setEditCategory(a.category);
        setEditStatus(a.status);
        setEditLocation(a.locationName || '');
        setEditNotes(a.notes || '');
        setEditLinkUrl(a.linkUrl || '');
        setEditStartTime(a.startTime ? timeStrToDate(a.startTime) : null);
        setEditEndTime(a.endTime   ? timeStrToDate(a.endTime)   : null);
    };

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

            {/* Floating notification + avatar (from Header.tsx) */}
            <Header floating />

            <View style={s.screenBody}>
                {/* ── Title bar ──────────────────────────────────────────── */}
                <View style={s.titleBar}>
                    <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                        <ArrowLeft size={20} color={theme.primary} />
                    </Pressable>
                    <View style={s.titleCenter}>
                        <Text style={s.screenTitle} numberOfLines={1}>{trip?.title ?? 'Activities'}</Text>
                        <Text style={s.screenSub}>Plan your itinerary</Text>
                    </View>
                </View>

                {/* ── Step progress ───────────────────────────────────────── */}
                <StepProgressBar steps={SETUP_STEPS} currentStep={1} />

                {/* ── Day list ─────────────────────────────────────────────── */}
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
                            createPanResponder={createPanResponder}
                            onPressActivity={openDetail}
                            onPressAdd={openAdd}
                            registerDropZone={registerDropZone}
                        />
                    ))}

                    {/* Next step */}
                    <Pressable
                        style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => router.push(`/group/trip/${tripId}/packing` as any)}
                    >
                        <Text style={s.nextBtnText}>Next: Packing List</Text>
                        <ChevronRight size={16} color={theme.primaryForeground} />
                    </Pressable>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>

            {/* ── Floating drag ghost ─────────────────────────────────── */}
            {dragging && dragActivity && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        s.dragGhost,
                        { transform: [{ translateX: dragX }, { translateY: dragY }, { scale: dragScale }] },
                    ]}
                >
                    <View style={[s.activityChip, { borderColor: theme.primary, opacity: 0.92 }]}>
                        {React.createElement(CATEGORY_CONFIG[dragActivity.category]?.icon ?? Compass, { size: 13, color: CATEGORY_CONFIG[dragActivity.category]?.color ?? theme.primary })}
                        <Text style={s.chipTitle} numberOfLines={1}>{dragActivity.title}</Text>
                    </View>
                </Animated.View>
            )}

            {/* ── Add Activity Sheet ─────────────────────────────────── */}
            <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
                <KeyboardAvoidingView style={s.sheetOuter} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <Pressable style={s.sheetBackdrop} onPress={() => setAddVisible(false)} />
                    <View style={s.sheet}>
                        <View style={s.sheetHeader}>
                            <Text style={s.sheetTitle}>New Activity</Text>
                            <Text style={s.sheetSubtitle}>
                                {addTargetDay === UNSCHEDULED_KEY ? 'Idea Bucket' : `${days.find(d => d.key === addTargetDay)?.label} · ${SLOT_CONFIG[addTargetSlot].label}`}
                            </Text>
                            <Pressable onPress={() => setAddVisible(false)} style={s.sheetClose}>
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Status: Idea vs Scheduled */}
                            <Text style={s.fieldLabel}>Status</Text>
                            <View style={[s.statusRow, { marginBottom: 16 }]}>
                                {(['Idea', 'Scheduled'] as ActivityStatus[]).map(st => {
                                    const isIdea = st === 'Idea';
                                    const sel = newStatus === st;
                                    const color = isIdea ? theme.mutedForeground : theme.accent;
                                    return (
                                        <Pressable
                                            key={st}
                                            style={[s.statusChip, { flex: 1, alignItems: 'center' }, sel && { borderColor: color, backgroundColor: `${color}15` }]}
                                            onPress={() => setNewStatus(st)}
                                        >
                                            <Text style={[s.statusChipText, sel && { color, fontFamily: fonts.bold }]}>
                                                {isIdea ? '📦  Idea' : '📅  Scheduled'}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: theme.mutedForeground, fontFamily: fonts.regular, marginTop: 2 }}>
                                                {isIdea ? 'Goes to bucket' : 'Places on day'}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Category */}
                            <Text style={s.fieldLabel}>Category</Text>
                            <View style={s.categoryRow}>
                                {DISPLAY_CATEGORIES.map(cat => {
                                    const cfg = CATEGORY_CONFIG[cat];
                                    const Icon = cfg.icon;
                                    const sel = newCategory === cat;
                                    return (
                                        <Pressable key={cat} style={[s.catChip, sel && { borderColor: cfg.color, backgroundColor: `${cfg.color}18` }]} onPress={() => setNewCategory(cat)}>
                                            <Icon size={18} color={sel ? cfg.color : theme.mutedForeground} />
                                            <Text style={[s.catLabel, sel && { color: cfg.color, fontFamily: fonts.bold }]}>{cfg.label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Title */}
                            <Text style={s.fieldLabel}>Title <Text style={{ color: theme.destructive }}>*</Text></Text>
                            <TextInput style={s.input} placeholder="e.g. Hotel check-in, Seafood lunch…" placeholderTextColor={theme.mutedForeground} value={newTitle} onChangeText={setNewTitle} returnKeyType="done" />

                            {/* Time row */}
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

                            {/* Extra fields toggle */}
                            <Pressable style={s.extraToggle} onPress={() => setShowExtra(v => !v)}>
                                <AlignLeft size={13} color={theme.primary} />
                                <Text style={s.extraToggleText}>{showExtra ? 'Hide optional fields' : 'Add details +'}</Text>
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
                                <Pressable style={[s.submitBtn, (!newTitle.trim() || saving) && { opacity: 0.5 }]} onPress={handleCreate} disabled={!newTitle.trim() || saving}>
                                    {saving ? <ActivityIndicator size="small" color={theme.primaryForeground} /> : <Text style={s.submitText}>Add Activity</Text>}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Detail / Edit Sheet ────────────────────────────────── */}
            {detail && (
                <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => { setDetail(null); setEditMode(false); }}>
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
                                    /* ── Edit form ── */
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

                                        {/* Time row */}
                                        <View style={s.timeRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.fieldLabel}>Start Time</Text>
                                                <Pressable style={[s.pickerBtn, editStartTime && s.pickerBtnActive]} onPress={() => setShowEditStart(true)}>
                                                    <Clock size={14} color={editStartTime ? theme.primary : theme.mutedForeground} />
                                                    <Text style={[s.pickerText, editStartTime && { color: theme.foreground }]}>
                                                        {editStartTime ? editStartTime.toTimeString().slice(0, 5) : 'Start'}
                                                    </Text>
                                                </Pressable>
                                                {showEditStart && (
                                                    <DateTimePicker mode="time" value={editStartTime ?? new Date()} is24Hour display="spinner"
                                                        onChange={(_, d) => { setShowEditStart(false); if (d) setEditStartTime(d); }} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.fieldLabel}>End Time</Text>
                                                <Pressable style={[s.pickerBtn, editEndTime && s.pickerBtnActive]} onPress={() => setShowEditEnd(true)}>
                                                    <Clock size={14} color={editEndTime ? theme.primary : theme.mutedForeground} />
                                                    <Text style={[s.pickerText, editEndTime && { color: theme.foreground }]}>
                                                        {editEndTime ? editEndTime.toTimeString().slice(0, 5) : 'End'}
                                                    </Text>
                                                </Pressable>
                                                {showEditEnd && (
                                                    <DateTimePicker mode="time" value={editEndTime ?? new Date()} is24Hour display="spinner"
                                                        onChange={(_, d) => { setShowEditEnd(false); if (d) setEditEndTime(d); }} />
                                                )}
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
                                            {(['Idea','Scheduled','Done','Cancelled'] as ActivityStatus[]).map(st => (
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
                                    /* ── Read-only detail ── */
                                    <View style={{ gap: 10 }}>
                                        {/* Category badge */}
                                        <View style={s.detailCatRow}>
                                            {React.createElement(CATEGORY_CONFIG[detail.category]?.icon ?? Compass, { size: 15, color: CATEGORY_CONFIG[detail.category]?.color ?? theme.primary })}
                                            <Text style={[s.detailCatText, { color: CATEGORY_CONFIG[detail.category]?.color ?? theme.primary }]}>
                                                {CATEGORY_CONFIG[detail.category]?.label ?? detail.category}
                                            </Text>
                                            <View style={s.statusPill}>
                                                <Text style={s.statusPillText}>{detail.status}</Text>
                                            </View>
                                        </View>

                                        {/* Time */}
                                        {(detail.startTime || detail.endTime) && (
                                            <View style={s.detailRow}>
                                                <Clock size={14} color={theme.mutedForeground} />
                                                <Text style={s.detailRowText}>
                                                    {fmtTime(detail.startTime)}
                                                    {detail.endTime ? ` → ${fmtTime(detail.endTime)}` : ''}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Location */}
                                        {detail.locationName && (
                                            <View style={s.detailRow}>
                                                <MapPin size={14} color={theme.mutedForeground} />
                                                <Text style={s.detailRowText}>{detail.locationName}</Text>
                                            </View>
                                        )}

                                        {/* Link */}
                                        {detail.linkUrl && (
                                            <View style={s.detailRow}>
                                                <Link size={14} color={theme.secondary} />
                                                <Text style={[s.detailRowText, { color: theme.secondary }]} numberOfLines={1}>{detail.linkUrl}</Text>
                                            </View>
                                        )}

                                        {/* Notes */}
                                        {detail.notes && (
                                            <View style={s.detailRow}>
                                                <AlignLeft size={14} color={theme.mutedForeground} />
                                                <Text style={s.detailRowText}>{detail.notes}</Text>
                                            </View>
                                        )}

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
    createPanResponder: (a: Activity) => ReturnType<typeof PanResponder.create>;
    onPressActivity: (a: Activity) => void;
    onPressAdd: (dayKey: string, slot: TimeSlot) => void;
    registerDropZone: (dayKey: string, slot: TimeSlot, y: number, height: number) => void;
}

function DayCard({ day, draggingId, createPanResponder, onPressActivity, onPressAdd, registerDropZone }: DayCardProps) {
    // Idea Bucket — distinct flat-list layout
    if (day.key === UNSCHEDULED_KEY) {
        const allActs = [...day.slots.Morning, ...day.slots.Afternoon, ...day.slots.Evening];
        return (
            <View
                style={s.bucketCard}
                ref={(ref: any) => {
                    if (ref) {
                        ref.measure?.((_x: number, _y: number, _w: number, h: number, _px: number, py: number) => {
                            registerDropZone(day.key, 'Morning', py, h);
                        });
                    }
                }}
            >
                {/* Bucket header */}
                <View style={s.bucketHeader}>
                    <Text style={s.bucketLabel}>📦  Idea Bucket</Text>
                    <Text style={s.bucketSub}>Drag ideas onto a day when ready</Text>
                </View>

                {/* Flat chip list */}
                {allActs.length === 0 ? (
                    <Text style={s.bucketEmpty}>No ideas yet. Tap below to add one.</Text>
                ) : (
                    allActs.map(a => (
                        <ActivityChip
                            key={a.id}
                            activity={a}
                            isDragging={a.id === draggingId}
                            onPress={() => onPressActivity(a)}
                            panResponder={createPanResponder(a)}
                        />
                    ))
                )}

                {/* Single add button */}
                <Pressable style={s.bucketAddBtn} onPress={() => onPressAdd(day.key, 'Morning')}>
                    <Text style={s.bucketAddText}>+ Add an Idea</Text>
                </Pressable>
            </View>
        );
    }

    // Regular day card with time slots
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
                    draggingId={draggingId}
                    createPanResponder={createPanResponder}
                    onPressActivity={onPressActivity}
                    onPressAdd={onPressAdd}
                    registerDropZone={registerDropZone}
                />
            ))}
        </View>
    );
}

// ─── SlotZone ─────────────────────────────────────────────────────────────────

interface SlotZoneProps {
    slot: TimeSlot;
    activities: Activity[];
    dayKey: string;
    draggingId: string | null;
    createPanResponder: (a: Activity) => ReturnType<typeof PanResponder.create>;
    onPressActivity: (a: Activity) => void;
    onPressAdd: (dayKey: string, slot: TimeSlot) => void;
    registerDropZone: (dayKey: string, slot: TimeSlot, y: number, height: number) => void;
}

function SlotZone({ slot, activities, dayKey, draggingId, createPanResponder, onPressActivity, onPressAdd, registerDropZone }: SlotZoneProps) {
    const cfg = SLOT_CONFIG[slot];
    const Icon = cfg.icon;

    return (
        <View
            style={s.slotZone}
            onLayout={e => {
                // Will be combined with pageY via measure in a real impl; using layout y for basic zone detection
            }}
            ref={(ref: any) => {
                if (ref) {
                    ref.measure?.((_x: number, _y: number, _w: number, h: number, _px: number, py: number) => {
                        registerDropZone(dayKey, slot, py, h);
                    });
                }
            }}
        >
            {/* Slot label row */}
            <View style={s.slotHeader}>
                <Icon size={14} color={cfg.color} />
                <Text style={[s.slotLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>

            {/* Activity chips */}
            {activities.map(a => (
                <ActivityChip
                    key={a.id}
                    activity={a}
                    isDragging={a.id === draggingId}
                    onPress={() => onPressActivity(a)}
                    panResponder={createPanResponder(a)}
                />
            ))}

            {/* Drop target placeholder */}
            <Pressable style={s.dropZonePlaceholder} onPress={() => onPressAdd(dayKey, slot)}>
                <Text style={s.dropZoneText}>+ Tap to add or drop here</Text>
            </Pressable>
        </View>
    );
}

// ─── ActivityChip ─────────────────────────────────────────────────────────────

interface ActivityChipProps {
    activity: Activity;
    isDragging: boolean;
    onPress: () => void;
    panResponder: ReturnType<typeof PanResponder.create>;
}

function ActivityChip({ activity, isDragging, onPress, panResponder }: ActivityChipProps) {
    const cfg = CATEGORY_CONFIG[activity.category] ?? CATEGORY_CONFIG.Other;
    const Icon = cfg.icon;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scale, { toValue: isDragging ? 0.96 : 1, useNativeDriver: true, tension: 200, friction: 12 }).start();
    }, [isDragging]);

    return (
        <Animated.View
            style={[s.activityChip, isDragging && s.activityChipDragging, { transform: [{ scale }] }]}
            {...panResponder.panHandlers}
        >
            <Pressable style={s.chipPressable} onPress={onPress}>
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
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
    screenBody: { flex: 1, flexDirection: 'column' },

    // Title bar
    titleBar: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingTop: 80, paddingBottom: 12,
        backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    backBtn:     { padding: 4 },
    titleCenter: { flex: 1 },
    screenTitle: { fontSize: 18, fontFamily: fonts.bold, color: theme.foreground },
    screenSub:   { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground, marginTop: 1 },

    // Scroll
    scroll:        { flex: 1 },
    scrollContent: { padding: 12, gap: 12, flexGrow: 1 },

    // ── Idea Bucket card — dashed, amber-tinted, no time slots
    bucketCard: {
        backgroundColor: `${theme.primary}08`,
        borderRadius: radius.xl, borderWidth: 2,
        borderColor: `${theme.primary}50`, borderStyle: 'dashed',
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

    // ── Day card (Morning / Afternoon / Evening)
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

    // Slot zone (Morning / Afternoon / Evening)
    slotZone: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: `${theme.border}80` },
    slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    slotLabel:  { fontSize: 12, fontFamily: fonts.semiBold },

    // Drop zone
    dropZonePlaceholder: {
        borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed',
        borderRadius: radius.lg, paddingVertical: 8, alignItems: 'center', marginTop: 4,
    },
    dropZoneText: { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground },

    // Activity chip
    activityChip: {
        backgroundColor: theme.input, borderRadius: radius.lg,
        borderWidth: 1.5, borderColor: theme.border, marginBottom: 6, overflow: 'hidden',
    },
    activityChipDragging: { opacity: 0.3 },
    chipPressable: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
    chipIcon:  { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    chipBody:  { flex: 1, gap: 2 },
    chipTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.foreground },
    chipMeta:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
    chipMetaText: { fontSize: 10, fontFamily: fonts.regular, color: theme.mutedForeground },
    chipTime:  { fontSize: 11, fontFamily: fonts.bold, color: theme.primary },

    // Drag ghost (follows finger)
    dragGhost: { position: 'absolute', zIndex: 999, width: 200 },

    // Next btn
    nextBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 15, borderRadius: radius.xl, backgroundColor: theme.primary, marginTop: 8,
    },
    nextBtnText: { fontSize: 15, fontFamily: fonts.bold, color: theme.primaryForeground },

    // Sheet
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

    // Fields
    fieldLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.foreground, marginBottom: 8 },
    input: {
        backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border,
        borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, fontFamily: fonts.regular, color: theme.foreground, marginBottom: 14,
    },
    notesInput: { height: 76, textAlignVertical: 'top' },

    // Category chips
    categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    catChip: {
        flex: 1, alignItems: 'center', paddingVertical: 10, gap: 5,
        borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.input,
    },
    catLabel: { fontSize: 11, fontFamily: fonts.medium, color: theme.mutedForeground, textAlign: 'center' },

    // Time row (side by side)
    timeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    pickerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.input,
        borderWidth: 2, borderColor: theme.border, borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 10,
    },
    pickerBtnActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}08` },
    pickerText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground },

    // Extra toggle
    extraToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    extraToggleText: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.primary },

    // Status chips
    statusRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
    statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.input },
    statusChipActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}12` },
    statusChipText: { fontSize: 12, fontFamily: fonts.medium, color: theme.mutedForeground },
    statusChipTextActive: { color: theme.primary, fontFamily: fonts.bold },

    // Sheet actions
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
    cancelBtn:    { flex: 1, paddingVertical: 13, borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, alignItems: 'center' },
    cancelText:   { fontSize: 14, fontFamily: fonts.semiBold, color: theme.mutedForeground },
    submitBtn:    { flex: 2, paddingVertical: 13, borderRadius: radius.xl, backgroundColor: theme.primary, alignItems: 'center' },
    submitText:   { fontSize: 14, fontFamily: fonts.bold, color: theme.primaryForeground },

    // Detail view
    detailCatRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    detailCatText:    { fontSize: 13, fontFamily: fonts.semiBold },
    statusPill:       { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, backgroundColor: `${theme.primary}15`, borderWidth: 1, borderColor: `${theme.primary}30` },
    statusPillText:   { fontSize: 11, fontFamily: fonts.medium, color: theme.primary },
    detailRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    detailRowText:    { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: theme.foreground, lineHeight: 20 },
    detailEmpty:      { fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground, textAlign: 'center', marginTop: 12 },
});
