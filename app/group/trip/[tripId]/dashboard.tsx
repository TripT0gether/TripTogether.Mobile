/**
 * app/group/trip/[tripId]/dashboard.tsx
 *
 * Trip Dashboard — the "finalize" screen shown after the full 3-phase setup flow.
 * Members navigate here instead of revisiting individual setup steps after completion.
 *
 * Sections:
 *  1. Hero banner    — group cover photo placeholder, trip title, member avatars, status badge
 *  2. Quick actions  — Ledger card (placeholder) + Gallery card (placeholder)
 *  3. Summary ribbon — Destination / Dates / Budget from finalized polls
 *  4. Weather        — 3-day forecast via Open-Meteo (free, no key) + Nominatim geocoding
 *  5. Itinerary      — timeline of scheduled activities grouped by day
 *  6. Packing        — progress bar + item list from packingItemService
 *  7. Edit FAB       — floating button → bottom sheet with shortcuts to each setup step
 *
 * Data sources:
 *  tripService.getTripDetail (includes embedded activities, polls, packingItems),
 *  groupService.getGroupDetail, pollService.getPollDetail (for finalized option details)
 *  Weather: https://api.open-meteo.com + https://nominatim.openstreetmap.org
 *
 * Used by: Packing screen "All packed up!" CTA, group dashboard "Open Trip" button
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, Pressable, ScrollView, ActivityIndicator,
    StyleSheet, RefreshControl, Modal, Platform, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    ArrowLeft, Edit3, MapPin, Calendar, Wallet, Cloud, CloudRain,
    Sun, CloudSnow, Zap, Wind, Droplets, Package, Users, Camera,
    BookOpen, ChevronRight, Clock, Utensils, Car, Hotel, ShoppingBag,
    Music, Plane, Check, Plus, X,
} from 'lucide-react-native';

import { tripService } from '../../../../src/services/tripService';
import { groupService } from '../../../../src/services/groupService';
import { pollService } from '../../../../src/services/pollService';
import { packingItemService } from '../../../../src/services/packingItemService';
import Header from '../../../../src/components/Header';
import RetroGrid from '../../../../src/components/RetroGrid';
import { theme, shadows, fonts, radius } from '../../../../src/constants/theme';
import { showErrorToast } from '../../../../src/utils/toast';

import { TripDetail } from '../../../../src/types/trip.types';
import { GroupDetail } from '../../../../src/types/group.types';
import { ActivityGroup, Activity, ActivityCategory } from '../../../../src/types/activity.types';
import { PackingItem } from '../../../../src/types/packingItem.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const WMO_ICONS: Record<number, { label: string; icon: React.ComponentType<any>; color: string }> = {
    0:  { label: 'Clear',       icon: Sun,       color: '#F5A623' },
    1:  { label: 'Mostly clear',icon: Sun,       color: '#F5A623' },
    2:  { label: 'Partly cloudy',icon: Cloud,    color: '#9B9B9B' },
    3:  { label: 'Overcast',    icon: Cloud,     color: '#7B7B7B' },
    45: { label: 'Fog',         icon: Wind,      color: '#AAAAAA' },
    51: { label: 'Drizzle',     icon: CloudRain, color: '#4A90D9' },
    61: { label: 'Rain',        icon: CloudRain, color: '#4A90D9' },
    63: { label: 'Rain',        icon: CloudRain, color: '#4A90D9' },
    80: { label: 'Showers',     icon: CloudRain, color: '#4A90D9' },
    95: { label: 'Thunderstorm',icon: Zap,       color: '#7B5EA7' },
    99: { label: 'Thunderstorm',icon: Zap,       color: '#7B5EA7' },
    71: { label: 'Snow',        icon: CloudSnow, color: '#B0D4F1' },
};
function getWmo(code: number) {
    return WMO_ICONS[code] ?? { label: 'Unknown', icon: Cloud, color: '#9B9B9B' };
}

const ACTIVITY_ICONS: Record<ActivityCategory, React.ComponentType<any>> = {
    Food:          Utensils,
    Attraction:    MapPin,
    Transport:     Car,
    Accommodation: Hotel,
    Flight:        Plane,
    Shopping:      ShoppingBag,
    Entertainment: Music,
    Other:         MapPin,
};
const ACTIVITY_COLORS: Record<ActivityCategory, string> = {
    Food:          '#E8844A',
    Attraction:    '#A0462D',
    Transport:     '#4A90D9',
    Accommodation: '#7B5EA7',
    Flight:        '#5B9BD5',
    Shopping:      '#E65C9C',
    Entertainment: '#5A8F5E',
    Other:         '#9B9B9B',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherDay {
    date: string;
    dayName: string;
    wmoCode: number;
    maxTemp: number;
    minTemp: number;
    rainChance: number;
}

interface TripSummary {
    destination: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number | null;
    budgetLabel: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(t: string | null): string {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    return `${hr % 12 || 12}:${m} ${ampm}`;
}

function budgetLabel(amount: number): string {
    if (amount <= 500)   return 'Budget 💰';
    if (amount <= 2000)  return 'Comfort 💎';
    return 'Premium ✨';
}

// ─── Weather API ──────────────────────────────────────────────────────────────

async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TripTogether/1.0' } });
        const data = await res.json();
        if (!data.length) return null;
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch {
        return null;
    }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherDay[]> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&forecast_days=5`;
    const res = await fetch(url);
    const data = await res.json();
    const { time, weathercode, temperature_2m_max, temperature_2m_min, precipitation_probability_max } = data.daily;
    return (time as string[]).slice(0, 3).map((date: string, i: number) => {
        const d = new Date(date);
        return {
            date,
            dayName: DAY_NAMES[d.getDay()],
            wmoCode: weathercode[i],
            maxTemp: Math.round(temperature_2m_max[i]),
            minTemp: Math.round(temperature_2m_min[i]),
            rainChance: precipitation_probability_max[i] ?? 0,
        };
    });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TripDashboardScreen() {
    const router = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    // ── Core data
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [trip, setTrip] = useState<TripDetail | null>(null);
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [summary, setSummary] = useState<TripSummary>({ destination: null, startDate: null, endDate: null, budget: null, budgetLabel: null });
    const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
    const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

    // ── Weather
    const [weather, setWeather] = useState<WeatherDay[]>([]);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherLocation, setWeatherLocation] = useState<string | null>(null);

    // ── Edit FAB
    const [editSheetVisible, setEditSheetVisible] = useState(false);

    // ── Packing tab
    const [packTab, setPackTab] = useState<'personal' | 'shared'>('personal');

    // ─── Load ──────────────────────────────────────────────────────────────────

    const loadData = async () => {
        try {
            const tripData = await tripService.getTripDetail(tripId!);
            setTrip(tripData);

            // Use embedded activities — filter only scheduled ones for the itinerary view
            const scheduledActivities = (tripData.activities ?? []).filter(a => a.status === 'Scheduled');
            // Group by date for the itinerary
            const grouped: Record<string, ActivityGroup> = {};
            scheduledActivities.forEach(act => {
                const day = act.date ?? 'unknown';
                if (!grouped[day]) {
                    grouped[day] = { date: day, activities: [], totalActivities: 0 };
                }
                // Cast to Activity shape (compatible subset)
                grouped[day].activities.push(act as any);
                grouped[day].totalActivities++;
            });
            setActivityGroups(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));

            // Use embedded packing items; initialise checked state from API isChecked field
            const packData = tripData.packingItems ?? [];
            setPackingItems(packData as any);
            setCheckedIds(new Set(packData.filter(p => p.isChecked).map(p => p.id)));

            // Fetch group detail (not embedded in TripDetail)
            const groupData = await groupService.getGroupDetail(tripData.groupId);
            setGroup(groupData);

            // Extract summary from embedded polls (finalized ones)
            const allPolls = tripData.polls ?? [];
            const finalizedPolls = allPolls.filter(p => p.status === 'Finalized');

            let destination: string | null = tripData.location ?? null;
            let startDate: string | null = tripData.startDate;
            let endDate: string | null = tripData.endDate;
            let budgetAmt: number | null = (tripData.budget ?? 0) > 0 ? tripData.budget : null;
            let budgetLbl: string | null = budgetAmt ? budgetLabel(budgetAmt) : null;

            // For finalized polls, fetch details to get the winning option via isSelectFinalized
            if (finalizedPolls.length > 0) {
                const details = await Promise.all(finalizedPolls.map(p => pollService.getPollDetail(p.id)));
                for (const detail of details) {
                    // Prefer the option flagged as finalized; fall back to highest votes
                    const winner = detail.options.find(o => o.isSelectFinalized)
                        ?? [...detail.options].sort((a, b) => b.voteCount - a.voteCount)[0];
                    if (!winner) continue;
                    if (detail.type === 'Destination' && winner.textValue) destination = winner.textValue;
                    if (detail.type === 'Date') {
                        if (winner.startDate) startDate = winner.startDate;
                        if (winner.endDate)   endDate   = winner.endDate;
                    }
                    if (detail.type === 'Budget' && winner.budget) {
                        budgetAmt = winner.budget;
                        budgetLbl = budgetLabel(winner.budget);
                    }
                }
            }

            setSummary({ destination, startDate, endDate, budget: budgetAmt, budgetLabel: budgetLbl });

            // Fetch weather if we have a destination
            if (destination) {
                setWeatherLoading(true);
                setWeatherLocation(destination);
                const coords = await geocodeLocation(destination);
                if (coords) {
                    const wx = await fetchWeather(coords.lat, coords.lon);
                    setWeather(wx);
                }
                setWeatherLoading(false);
            }
        } catch (e: any) {
            showErrorToast('Error', e.message || 'Failed to load trip dashboard');
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

    // ─── Packing check ─────────────────────────────────────────────────────────

    const [togglingPackId, setTogglingPackId] = useState<string | null>(null);

    const toggleCheck = async (id: string) => {
        const isNowChecked = !checkedIds.has(id);

        // Optimistic update
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (isNowChecked) next.add(id);
            else next.delete(id);
            return next;
        });
        setTogglingPackId(id);

        try {
            await packingItemService.updatePackingItem(id, { isChecked: isNowChecked });
            setPackingItems(prev =>
                prev.map(i => i.id === id ? { ...i, isChecked: isNowChecked } : i)
            );
        } catch (e: any) {
            // Rollback
            setCheckedIds(prev => {
                const next = new Set(prev);
                if (isNowChecked) next.delete(id);
                else next.add(id);
                return next;
            });
            showErrorToast('Error', e.message || 'Could not update item');
        } finally {
            setTogglingPackId(null);
        }
    };

    // ─── Loading ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <RetroGrid>
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={s.loadingText}>Loading trip dashboard…</Text>
                </View>
            </RetroGrid>
        );
    }

    // ─── Derived ───────────────────────────────────────────────────────────────

    const members = group?.members ?? [];
    const scheduledGroups = activityGroups.filter(g =>
        g.activities.some(a => a.status === 'Scheduled')
    );
    const personalItems = packingItems.filter(i => !i.isShared);
    const sharedItems   = packingItems.filter(i => i.isShared);
    const packed     = personalItems.filter(i => checkedIds.has(i.id)).length;
    const totalPack  = personalItems.length;

    // Group packing by category
    const packGroups: Record<string, PackingItem[]> = {};
    personalItems.forEach(item => {
        const key = item.category || 'Other';
        if (!packGroups[key]) packGroups[key] = [];
        packGroups[key].push(item);
    });

    const sharedGroups: Record<string, PackingItem[]> = {};
    sharedItems.forEach(item => {
        const key = item.category || 'Other';
        if (!sharedGroups[key]) sharedGroups[key] = [];
        sharedGroups[key].push(item);
    });

    return (
        <RetroGrid>
            <Stack.Screen options={{ headerShown: false }} />
            <Header floating />

            <View style={s.screenBody}>
                {/* ── Compact title bar ── */}
                <View style={s.topBar}>
                    <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
                        <ArrowLeft size={20} color={theme.primary} />
                    </Pressable>
                    <View style={s.topBarCenter}>
                        <Text style={s.topBarTitle} numberOfLines={1}>{trip?.title ?? 'Trip'}</Text>
                        <Text style={s.topBarSub}>{members.length} members</Text>
                    </View>
                </View>

                <ScrollView
                    style={s.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
                    }
                >
                    {/* ══════════════════════════════════
                         1. HERO BANNER
                    ══════════════════════════════════ */}
                    <View style={s.hero}>
                        {/* Cover photo placeholder */}
                        <View style={s.heroCover}>
                            <View style={s.heroCoverPlaceholder}>
                                <Camera size={32} color={`${theme.primaryForeground}60`} />
                                <Text style={s.heroCoverPlaceholderText}>Group Photo</Text>
                            </View>
                            {/* Gradient overlay */}
                            <View style={s.heroOverlay} />
                        </View>

                        {/* Info over image */}
                        <View style={s.heroContent}>
                            <View style={s.heroTitleRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.heroTitle}>{trip?.title ?? 'Trip'}</Text>
                                    <Text style={s.heroSub}>{group?.name ?? ''} · {members.length} members</Text>
                                </View>
                                <View style={[s.statusBadge, ['Confirmed', 'Active', 'Completed'].includes(trip?.status ?? '') && s.statusBadgeConfirmed]}>
                                    <Text style={s.statusBadgeText}>{trip?.status ?? 'Setup'}</Text>
                                </View>
                            </View>

                            {/* Member avatar stack */}
                            <View style={s.memberRow}>
                                {members.slice(0, 6).map((m, i) => (
                                    <View
                                        key={m.userId}
                                        style={[s.memberAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 6 - i }]}
                                    >
                                        <Text style={s.memberAvatarText}>{getInitials(m.username)}</Text>
                                    </View>
                                ))}
                                {members.length > 6 && (
                                    <View style={[s.memberAvatar, s.memberAvatarMore, { marginLeft: -10 }]}>
                                        <Text style={s.memberMoreText}>+{members.length - 6}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* ══════════════════════════════════
                         2. QUICK-ACTION CARDS
                    ══════════════════════════════════ */}
                    <View style={s.quickRow}>
                        {/* Ledger card */}
                        <Pressable
                            style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.8 }]}
                            onPress={() => showErrorToast('Coming Soon', 'Ledger will be available soon!')}
                        >
                            <View style={[s.quickCardIcon, { backgroundColor: `${theme.destructive}15` }]}>
                                <BookOpen size={22} color={theme.destructive} />
                            </View>
                            <Text style={s.quickCardLabel}>Ledger</Text>
                            <Text style={[s.quickCardValue, { color: theme.destructive }]}>$0.00</Text>
                            <Text style={s.quickCardSub}>tap to track expenses</Text>
                        </Pressable>

                        {/* Gallery card */}
                        <Pressable
                            style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.8 }]}
                            onPress={() => showErrorToast('Coming Soon', 'Gallery will be available soon!')}
                        >
                            <View style={[s.quickCardIcon, { backgroundColor: `${theme.secondary}15` }]}>
                                <Camera size={22} color={theme.secondary} />
                            </View>
                            <Text style={s.quickCardLabel}>Gallery</Text>
                            <Text style={[s.quickCardValue, { color: theme.secondary }]}>0 photos</Text>
                            <Text style={s.quickCardSub}>tap to add memories</Text>
                            <View style={s.quickCardPlus}>
                                <Plus size={12} color={theme.secondary} />
                            </View>
                        </Pressable>
                    </View>

                    {/* ══════════════════════════════════
                         3. TRIP SUMMARY RIBBON
                    ══════════════════════════════════ */}
                    <View style={[s.card, shadows.retroSm]}>
                        <View style={s.cardHeader}>
                            <MapPin size={14} color={theme.primary} />
                            <Text style={s.cardTitle}>Trip Summary</Text>
                            <Pressable style={s.cardEdit} onPress={() => setEditSheetVisible(true)}>
                                <Edit3 size={12} color={theme.mutedForeground} />
                                <Text style={s.cardEditText}>Edit</Text>
                            </Pressable>
                        </View>

                        <View style={s.summaryGrid}>
                            <SummaryChip
                                icon={<MapPin size={13} color={theme.primary} />}
                                label="Destination"
                                value={summary.destination ?? 'Not set'}
                                empty={!summary.destination}
                            />
                            <SummaryChip
                                icon={<Calendar size={13} color={theme.secondary} />}
                                label="Dates"
                                value={
                                    summary.startDate
                                        ? `${fmtDate(summary.startDate)}${summary.endDate ? ` → ${fmtDate(summary.endDate)}` : ''}`
                                        : 'Not set'
                                }
                                empty={!summary.startDate}
                            />
                            <SummaryChip
                                icon={<Wallet size={13} color={theme.accent} />}
                                label="Budget"
                                value={summary.budgetLabel ?? (summary.budget ? `$${summary.budget}` : 'Not set')}
                                empty={!summary.budget}
                            />
                        </View>
                    </View>

                    {/* ══════════════════════════════════
                         4. WEATHER FORECAST
                    ══════════════════════════════════ */}
                    <View style={[s.card, shadows.retroSm]}>
                        <View style={s.cardHeader}>
                            <Sun size={14} color="#F5A623" />
                            <Text style={s.cardTitle}>Weather Forecast</Text>
                        </View>

                        {weatherLoading ? (
                            <View style={s.weatherLoading}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={s.weatherLoadingText}>Fetching weather…</Text>
                            </View>
                        ) : weather.length > 0 ? (
                            <>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }}>
                                    <View style={s.weatherRow}>
                                        {weather.map((day, i) => {
                                            const wx = getWmo(day.wmoCode);
                                            const WeatherIcon = wx.icon;
                                            return (
                                                <View
                                                    key={day.date}
                                                    style={[s.weatherCard, i === 0 && { borderColor: theme.primary, borderWidth: 2 }]}
                                                >
                                                    <Text style={[s.weatherDay, i === 0 && { color: theme.primary }]}>
                                                        {i === 0 ? 'Today' : day.dayName}
                                                    </Text>
                                                    <WeatherIcon size={28} color={wx.color} />
                                                    <View style={s.weatherTemps}>
                                                        <Text style={s.weatherHigh}>{day.maxTemp}°</Text>
                                                        <Text style={s.weatherLow}>{day.minTemp}°</Text>
                                                    </View>
                                                    <View style={s.weatherRain}>
                                                        <Droplets size={10} color="#4A90D9" />
                                                        <Text style={s.weatherRainText}>{day.rainChance}%</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                                {weatherLocation && (
                                    <Text style={s.weatherLocation}>
                                        📍 {weatherLocation}
                                    </Text>
                                )}
                            </>
                        ) : summary.destination ? (
                            <Text style={s.weatherEmpty}>
                                Could not load weather for "{summary.destination}" — check your internet connection.
                            </Text>
                        ) : (
                            <Text style={s.weatherEmpty}>
                                Finalize a Destination poll to see the weather forecast here.
                            </Text>
                        )}
                    </View>

                    {/* ══════════════════════════════════
                         5. TRIP ITINERARY
                    ══════════════════════════════════ */}
                    <View style={[s.card, shadows.retroSm]}>
                        <View style={s.cardHeader}>
                            <MapPin size={14} color={theme.primary} />
                            <Text style={s.cardTitle}>Trip Itinerary</Text>
                            <Pressable style={s.cardEdit} onPress={() => router.push(`/group/trip/${tripId}/activities` as any)}>
                                <Edit3 size={12} color={theme.mutedForeground} />
                                <Text style={s.cardEditText}>Edit</Text>
                            </Pressable>
                        </View>

                        {scheduledGroups.length === 0 ? (
                            <EmptySection
                                label="No activities scheduled yet"
                                cta="Plan Activities"
                                onCta={() => router.push(`/group/trip/${tripId}/activities` as any)}
                            />
                        ) : (
                            scheduledGroups.map((group, gi) => (
                                <ItineraryDay key={group.date} group={group} dayIndex={gi + 1} />
                            ))
                        )}
                    </View>

                    {/* ══════════════════════════════════
                         6. PACKING LIST
                    ══════════════════════════════════ */}
                    <View style={[s.card, shadows.retroSm]}>
                        <View style={s.cardHeader}>
                            <Package size={14} color={theme.primary} />
                            <Text style={s.cardTitle}>Packing List</Text>
                            <Pressable style={s.cardEdit} onPress={() => router.push(`/group/trip/${tripId}/packing` as any)}>
                                <Plus size={12} color={theme.mutedForeground} />
                                <Text style={s.cardEditText}>Item</Text>
                            </Pressable>
                        </View>

                        {/* ── Mini tab bar ── */}
                        <View style={s.packTabBar}>
                            <Pressable
                                style={[s.packTabBtn, packTab === 'personal' && s.packTabBtnActive]}
                                onPress={() => setPackTab('personal')}
                            >
                                <Package size={12} color={packTab === 'personal' ? theme.primary : theme.mutedForeground} />
                                <Text style={[s.packTabText, packTab === 'personal' && s.packTabTextActive]}>Personal</Text>
                                {totalPack > 0 && (
                                    <View style={[s.packTabBadge, packTab === 'personal' && s.packTabBadgeActive]}>
                                        <Text style={[s.packTabBadgeText, packTab === 'personal' && s.packTabBadgeTextActive]}>
                                            {packed}/{totalPack}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable
                                style={[s.packTabBtn, packTab === 'shared' && s.packTabBtnActive]}
                                onPress={() => setPackTab('shared')}
                            >
                                <Users size={12} color={packTab === 'shared' ? theme.secondary : theme.mutedForeground} />
                                <Text style={[s.packTabText, packTab === 'shared' && { color: theme.secondary, fontFamily: fonts.semiBold }]}>Shared</Text>
                                {sharedItems.length > 0 && (
                                    <View style={[s.packTabBadge, packTab === 'shared' && { backgroundColor: `${theme.secondary}20` }]}>
                                        <Text style={[s.packTabBadgeText, packTab === 'shared' && { color: theme.secondary }]}>
                                            {sharedItems.length}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>

                        {packTab === 'personal' ? (
                            <>
                                {/* Personal progress bar */}
                                {totalPack > 0 && (
                                    <View style={s.packProgress}>
                                        <View style={s.packProgressHeader}>
                                            <Text style={s.packProgressLabel}>Progress</Text>
                                            <Text style={s.packProgressCount}>{packed}/{totalPack} packed</Text>
                                        </View>
                                        <View style={s.progressTrack}>
                                            <View style={[s.progressFill, { width: `${Math.round((packed / totalPack) * 100)}%` }]} />
                                        </View>
                                    </View>
                                )}

                                {Object.keys(packGroups).length === 0 ? (
                                    <EmptySection
                                        label="No personal items yet"
                                        cta="Add Items"
                                        onCta={() => router.push(`/group/trip/${tripId}/packing` as any)}
                                    />
                                ) : (
                                    Object.entries(packGroups).map(([category, items]) => (
                                        <View key={category} style={s.packGroup}>
                                            <Text style={s.packGroupLabel}>{category}</Text>
                                            {items.map(item => {
                                                const checked = checkedIds.has(item.id);
                                                const isToggling = togglingPackId === item.id;
                                                return (
                                                    <Pressable
                                                        key={item.id}
                                                        style={s.packItemRow}
                                                        onPress={() => toggleCheck(item.id)}
                                                        disabled={isToggling}
                                                    >
                                                        <View style={[s.packCheckbox, checked && s.packCheckboxChecked]}>
                                                            {isToggling
                                                                ? <ActivityIndicator size="small" color={checked ? theme.primaryForeground : theme.primary} />
                                                                : checked && <Check size={11} color={theme.primaryForeground} />}
                                                        </View>
                                                        <Text style={[s.packItemName, checked && s.packItemNameDone]}>
                                                            {item.name}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ))
                                )}
                            </>
                        ) : (
                            // ── Shared tab
                            Object.keys(sharedGroups).length === 0 ? (
                                <EmptySection
                                    label="No shared items yet"
                                    cta="Add Shared Items"
                                    onCta={() => router.push(`/group/trip/${tripId}/packing` as any)}
                                />
                            ) : (
                                Object.entries(sharedGroups).map(([category, items]) => (
                                    <View key={category} style={s.packGroup}>
                                        <Text style={s.packGroupLabel}>{category}</Text>
                                        {items.map(item => (
                                            <View key={item.id} style={[s.packItemRow, { gap: 10 }]}>
                                                <View style={[s.packCheckbox, { borderColor: theme.secondary }]}>
                                                    <Users size={9} color={theme.secondary} />
                                                </View>
                                                <Text style={s.packItemName} numberOfLines={1}>{item.name}</Text>
                                                {item.quantityNeeded > 1 && (
                                                    <Text style={s.packItemQty}>×{item.quantityNeeded}</Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                ))
                            )
                        )}

                        <Pressable
                            style={({ pressed }) => [s.managePacking, pressed && { opacity: 0.7 }]}
                            onPress={() => router.push(`/group/trip/${tripId}/packing` as any)}
                        >
                            <Text style={s.managePackingText}>Manage full packing list</Text>
                            <ChevronRight size={14} color={theme.primary} />
                        </Pressable>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* ══════════════════════════════════
                     7. EDIT FAB
                ══════════════════════════════════ */}
                <Pressable
                    style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
                    onPress={() => setEditSheetVisible(true)}
                >
                    <Edit3 size={18} color={theme.primaryForeground} />
                    <Text style={s.fabText}>Edit</Text>
                </Pressable>
            </View>

            {/* ── Edit shortcuts bottom sheet ── */}
            <Modal
                visible={editSheetVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditSheetVisible(false)}
            >
                <View style={s.sheetOuter}>
                    <Pressable style={s.sheetBackdrop} onPress={() => setEditSheetVisible(false)} />
                    <View style={s.sheet}>
                        <View style={s.sheetHandle} />
                        <View style={s.sheetHeadRow}>
                            <Text style={s.sheetTitle}>Edit Trip Setup</Text>
                            <Pressable onPress={() => setEditSheetVisible(false)} style={s.sheetClose}>
                                <X size={16} color={theme.mutedForeground} />
                            </Pressable>
                        </View>
                        <Text style={s.sheetSub}>Jump to any step to make changes</Text>

                        {[
                            { label: 'Polls & Decisions', sub: 'Destination, dates, budget', icon: <Calendar size={20} color={theme.primary} />, route: `/group/trip/${tripId}` },
                            { label: 'Activities & Itinerary', sub: 'Schedule ideas and day plans', icon: <MapPin size={20} color={theme.secondary} />, route: `/group/trip/${tripId}/activities` },
                            { label: 'Packing List', sub: 'Personal and shared items', icon: <Package size={20} color={theme.accent} />, route: `/group/trip/${tripId}/packing` },
                        ].map(item => (
                            <Pressable
                                key={item.route}
                                style={({ pressed }) => [s.sheetItem, pressed && { backgroundColor: `${theme.primary}08` }]}
                                onPress={() => {
                                    setEditSheetVisible(false);
                                    setTimeout(() => router.push(item.route as any), 250);
                                }}
                            >
                                <View style={s.sheetItemIcon}>{item.icon}</View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.sheetItemLabel}>{item.label}</Text>
                                    <Text style={s.sheetItemSub}>{item.sub}</Text>
                                </View>
                                <ChevronRight size={16} color={theme.mutedForeground} />
                            </Pressable>
                        ))}
                    </View>
                </View>
            </Modal>
        </RetroGrid>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryChip({ icon, label, value, empty }: { icon: React.ReactNode; label: string; value: string; empty: boolean }) {
    return (
        <View style={[s.summaryChip, empty && s.summaryChipEmpty]}>
            <View style={s.summaryChipIcon}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={s.summaryChipLabel}>{label}</Text>
                <Text style={[s.summaryChipValue, empty && s.summaryChipValueEmpty]} numberOfLines={2}>
                    {value}
                </Text>
            </View>
        </View>
    );
}

function ItineraryDay({ group, dayIndex }: { group: ActivityGroup; dayIndex: number }) {
    const scheduled = group.activities.filter(a => a.status === 'Scheduled')
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));

    if (!scheduled.length) return null;

    return (
        <View style={s.itinDay}>
            <View style={s.itinDayHeader}>
                <Text style={s.itinDayLabel}>Day {dayIndex}</Text>
                <Text style={s.itinDayDate}>{fmtDate(group.date)}</Text>
            </View>
            <View style={s.itinDivider} />
            {scheduled.map((activity, i) => {
                const Icon = ACTIVITY_ICONS[activity.category] ?? MapPin;
                const color = ACTIVITY_COLORS[activity.category] ?? theme.primary;
                const isLast = i === scheduled.length - 1;
                return (
                    <View key={activity.id} style={s.itinRow}>
                        {/* Timeline line + dot */}
                        <View style={s.itinTimeline}>
                            <View style={[s.itinDot, { borderColor: color, backgroundColor: `${color}15` }]}>
                                <Icon size={11} color={color} />
                            </View>
                            {!isLast && <View style={[s.itinLine, { backgroundColor: `${color}30` }]} />}
                        </View>

                        {/* Activity info */}
                        <View style={s.itinContent}>
                            <View style={s.itinTitleRow}>
                                <Text style={s.itinTitle} numberOfLines={1}>{activity.title}</Text>
                                {activity.startTime && (
                                    <View style={s.itinTime}>
                                        <Clock size={10} color={theme.mutedForeground} />
                                        <Text style={s.itinTimeText}>{fmtTime(activity.startTime)}</Text>
                                    </View>
                                )}
                            </View>
                            {activity.locationName && (
                                <View style={s.itinLocation}>
                                    <MapPin size={10} color={theme.mutedForeground} />
                                    <Text style={s.itinLocationText} numberOfLines={1}>{activity.locationName}</Text>
                                </View>
                            )}
                            {activity.notes && (
                                <Text style={s.itinNotes} numberOfLines={2}>{activity.notes}</Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

function EmptySection({ label, cta, onCta }: { label: string; cta: string; onCta: () => void }) {
    return (
        <View style={s.emptySection}>
            <Text style={s.emptySectionText}>{label}</Text>
            <Pressable style={({ pressed }) => [s.emptyCta, pressed && { opacity: 0.7 }]} onPress={onCta}>
                <Text style={s.emptyCtaText}>{cta}</Text>
            </Pressable>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontFamily: fonts.regular, fontSize: 13, color: theme.mutedForeground },
    screenBody:  { flex: 1, flexDirection: 'column' },

    // ── Top bar
    topBar: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, paddingRight: 114,
        backgroundColor: `${theme.card}F0`,
        borderBottomWidth: 2, borderBottomColor: theme.border, gap: 10,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: radius.lg,
        backgroundColor: `${theme.primary}10`,
        justifyContent: 'center', alignItems: 'center',
    },
    topBarCenter: { flex: 1 },
    topBarTitle:  { fontFamily: fonts.bold, fontSize: 18, color: theme.foreground },
    topBarSub:    { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, marginTop: 1 },

    scroll: { flex: 1 },

    // ── Hero
    hero: { position: 'relative' },
    heroCover: {
        height: 200, backgroundColor: theme.muted,
        justifyContent: 'center', alignItems: 'center',
    },
    heroCoverPlaceholder: { alignItems: 'center', gap: 8 },
    heroCoverPlaceholderText: {
        fontFamily: fonts.medium, fontSize: 13,
        color: `${theme.foreground}50`,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    heroContent: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 16, gap: 10,
    },
    heroTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    heroTitle: { fontFamily: fonts.bold, fontSize: 22, color: '#FFFFFF' },
    heroSub:   { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
        backgroundColor: `${theme.muted}CC`,
    },
    statusBadgeConfirmed: { backgroundColor: `${theme.accent}99` },
    statusBadgeText: { fontFamily: fonts.semiBold, fontSize: 10, color: '#FFFFFF' },
    memberRow: { flexDirection: 'row', alignItems: 'center' },
    memberAvatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: `${theme.primary}CC`,
        borderWidth: 2, borderColor: '#FFFFFF',
        justifyContent: 'center', alignItems: 'center',
    },
    memberAvatarText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
    memberAvatarMore: { backgroundColor: `${theme.muted}CC` },
    memberMoreText:   { fontFamily: fonts.bold, fontSize: 9, color: theme.foreground },

    // ── Quick-action cards
    quickRow: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 0 },
    quickCard: {
        flex: 1, backgroundColor: theme.card, borderRadius: radius.xl,
        borderWidth: 2, borderColor: theme.border, padding: 14,
        ...shadows.retroSm, position: 'relative', overflow: 'hidden',
        gap: 4,
    },
    quickCardIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    quickCardLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: theme.foreground },
    quickCardValue: { fontFamily: fonts.bold, fontSize: 16 },
    quickCardSub:   { fontFamily: fonts.regular, fontSize: 10, color: theme.mutedForeground },
    quickCardPlus:  { position: 'absolute', top: 12, right: 12 },

    // ── Card template
    card: {
        backgroundColor: theme.card, borderRadius: radius.xl,
        borderWidth: 2, borderColor: theme.border, padding: 14,
        marginHorizontal: 16, marginTop: 16,
    },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: 12,
    },
    cardTitle:    { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: theme.foreground },
    cardEdit:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardEditText: { fontFamily: fonts.medium, fontSize: 12, color: theme.mutedForeground },

    // ── Summary chips
    summaryGrid: { gap: 8 },
    summaryChip: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: theme.input, borderRadius: radius.lg,
        borderWidth: 1, borderColor: theme.border, padding: 10,
    },
    summaryChipEmpty: { borderStyle: 'dashed', borderColor: `${theme.border}80` },
    summaryChipIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: `${theme.primary}15`, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    summaryChipLabel: { fontFamily: fonts.regular, fontSize: 10, color: theme.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryChipValue: { fontFamily: fonts.semiBold, fontSize: 13, color: theme.foreground, marginTop: 2 },
    summaryChipValueEmpty: { color: theme.mutedForeground, fontFamily: fonts.regular, fontStyle: 'italic' },

    // ── Weather
    weatherLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    weatherLoadingText: { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground },
    weatherRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 4 },
    weatherCard: {
        width: 90, backgroundColor: theme.input, borderRadius: radius.lg,
        borderWidth: 1.5, borderColor: theme.border, padding: 10,
        alignItems: 'center', gap: 6,
    },
    weatherDay:    { fontFamily: fonts.bold, fontSize: 11, color: theme.foreground },
    weatherTemps:  { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    weatherHigh:   { fontFamily: fonts.bold, fontSize: 16, color: theme.foreground },
    weatherLow:    { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground },
    weatherRain:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
    weatherRainText: { fontFamily: fonts.medium, fontSize: 10, color: '#4A90D9' },
    weatherEmpty:  { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground, textAlign: 'center', paddingVertical: 16 },
    weatherLocation: { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, textAlign: 'center', marginTop: 10 },

    // ── Itinerary
    itinDay: { marginBottom: 16 },
    itinDayHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
    itinDayLabel:  { fontFamily: fonts.bold, fontSize: 14, color: theme.foreground },
    itinDayDate:   { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground },
    itinDivider:   { height: 1, backgroundColor: theme.border, marginBottom: 6 },
    itinRow:       { flexDirection: 'row', gap: 10, marginBottom: 0, minHeight: 56 },
    itinTimeline:  { width: 28, alignItems: 'center' },
    itinDot: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    },
    itinLine:  { width: 2, flex: 1, marginTop: 2 },
    itinContent:   { flex: 1, paddingTop: 4, paddingBottom: 10 },
    itinTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itinTitle:     { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: theme.foreground },
    itinTime:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
    itinTimeText:  { fontFamily: fonts.bold, fontSize: 11, color: theme.primary },
    itinLocation:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    itinLocationText: { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, flex: 1 },
    itinNotes:     { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, marginTop: 3, lineHeight: 16 },

    // ── Packing
    packTabBar: { flexDirection: 'row', marginBottom: 12, backgroundColor: theme.muted, borderRadius: radius.lg, padding: 3 },
    packTabBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 5, paddingVertical: 7, paddingHorizontal: 8, borderRadius: radius.md,
    },
    packTabBtnActive: { backgroundColor: theme.card, ...shadows.retroSm },
    packTabText: { fontFamily: fonts.medium, fontSize: 12, color: theme.mutedForeground },
    packTabTextActive: { color: theme.primary, fontFamily: fonts.semiBold },
    packTabBadge: { backgroundColor: theme.border, borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 1 },
    packTabBadgeActive: { backgroundColor: `${theme.primary}20` },
    packTabBadgeText: { fontFamily: fonts.medium, fontSize: 10, color: theme.mutedForeground },
    packTabBadgeTextActive: { color: theme.primary },
    packProgress: { marginBottom: 12 },
    packProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    packProgressLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: theme.foreground },
    packProgressCount: { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground },
    progressTrack: { height: 8, backgroundColor: theme.muted, borderRadius: radius.full, overflow: 'hidden' },
    progressFill:  { height: '100%', backgroundColor: theme.accent, borderRadius: radius.full },
    packGroup:     { marginBottom: 8 },
    packGroupLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: theme.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    packItemRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    packItemQty:   { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground },
    packCheckbox: {
        width: 20, height: 20, borderRadius: radius.sm,
        borderWidth: 2, borderColor: theme.border,
        justifyContent: 'center', alignItems: 'center',
    },
    packCheckboxChecked:  { backgroundColor: theme.accent, borderColor: theme.accent },
    packItemName:         { fontFamily: fonts.medium, fontSize: 13, color: theme.foreground, flex: 1 },
    packItemNameDone:     { color: theme.mutedForeground, textDecorationLine: 'line-through' },
    managePacking: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 10, paddingVertical: 8,
        borderTopWidth: 1, borderTopColor: theme.border,
    },
    managePackingText: { fontFamily: fonts.semiBold, fontSize: 13, color: theme.primary },

    // ── Empty section
    emptySection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
    emptySectionText: { fontFamily: fonts.regular, fontSize: 13, color: theme.mutedForeground },
    emptyCta: {
        paddingHorizontal: 14, paddingVertical: 6,
        backgroundColor: `${theme.primary}15`, borderRadius: radius.md,
    },
    emptyCtaText: { fontFamily: fonts.semiBold, fontSize: 12, color: theme.primary },

    // ── FAB
    fab: {
        position: 'absolute', bottom: 24, right: 16,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.primary, borderRadius: radius.full,
        paddingHorizontal: 16, paddingVertical: 12,
        ...shadows.retro,
    },
    fabText: { fontFamily: fonts.bold, fontSize: 14, color: theme.primaryForeground },

    // ── Edit sheet
    sheetOuter:    { flex: 1, justifyContent: 'flex-end' },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: theme.primary,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    sheetHandle: {
        width: 40, height: 4, backgroundColor: theme.border,
        borderRadius: 2, alignSelf: 'center', marginBottom: 16,
    },
    sheetHeadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    sheetTitle:   { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: theme.foreground },
    sheetClose:   { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.muted, justifyContent: 'center', alignItems: 'center' },
    sheetSub:     { fontFamily: fonts.regular, fontSize: 12, color: theme.mutedForeground, marginBottom: 16 },
    sheetItem:    {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.lg,
    },
    sheetItemIcon: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: `${theme.primary}10`,
        justifyContent: 'center', alignItems: 'center',
    },
    sheetItemLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: theme.foreground },
    sheetItemSub:   { fontFamily: fonts.regular, fontSize: 11, color: theme.mutedForeground, marginTop: 2 },
});
