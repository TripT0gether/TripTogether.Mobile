/**
 * group/trip/[tripId].tsx
 *
 * Trip setup screen with full poll management flow.
 * Shows trip info, lists polls, supports creating/voting/closing/finalizing polls.
 * Each poll type (Date, Time, Budget) can only exist once per trip.
 *
 * Data Sources:
 * - tripService.getTripDetail → trip info
 * - pollService.getTripPolls → poll list
 * - pollService.getPollDetail → expanded poll with options
 * - voteService → cast/change/remove votes
 *
 * Used by: Navigation from group screen trip cards
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
    RefreshControl, Alert, StyleSheet, Modal, Animated, Platform,
    LayoutAnimation, UIManager, KeyboardAvoidingView,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    ArrowLeft, Plus, Calendar, DollarSign, Clock, X, Check,
    ChevronDown, ChevronUp, Vote, BarChart3, Lock, Sparkles,
    AlertTriangle, MapPin, Users, Crown, CheckCircle2, Trash2,
} from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { tripService } from '../../../src/services/tripService';
import { pollService } from '../../../src/services/pollService';
import { voteService } from '../../../src/services/voteService';
import { userService } from '../../../src/services/userService';
import { TripDetail } from '../../../src/types/trip.types';
import { Poll, PollDetail, PollOption, PollType, PollStatus, AddPollOptionPayload } from '../../../src/types/poll.types';
import { Vote as VoteType } from '../../../src/types/vote.types';
import { showSuccessToast, showErrorToast } from '../../../src/utils/toast';
import RetroGrid from '../../../src/components/RetroGrid';
import Header from '../../../src/components/Header';
import StepProgressBar from '../../../src/components/StepProgressBar';
import { theme, shadows, fonts, radius } from '../../../src/constants/theme';

const POLL_TYPE_CONFIG: Record<PollType, { icon: any; label: string; color: string }> = {
    Date: { icon: Calendar, label: 'Date', color: theme.primary },
    Time: { icon: Clock, label: 'Time', color: theme.secondary },
    Destination: { icon: MapPin, label: 'Destination', color: theme.accent },
    Budget: { icon: DollarSign, label: 'Budget', color: '#D4A017' },
};

const STATUS_BADGE: Record<PollStatus, { bg: string; text: string }> = {
    Open: { bg: `${theme.accent}20`, text: theme.accent },
    Closed: { bg: `${theme.primary}20`, text: theme.primary },
    Finalized: { bg: `${theme.secondary}20`, text: theme.secondary },
};

const TRIP_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Setup: { bg: `${theme.muted}`, text: theme.mutedForeground },
    Planning: { bg: `${theme.primary}20`, text: theme.primary },
    Confirmed: { bg: `${theme.accent}20`, text: theme.accent },
    Active: { bg: `${theme.secondary}20`, text: theme.secondary },
    Completed: { bg: `${theme.mutedForeground}20`, text: theme.mutedForeground },
};

// Available poll types for trip-level polls
const AVAILABLE_POLL_TYPES: PollType[] = ['Date', 'Time', 'Destination', 'Budget'];

// Trip setup steps
const SETUP_STEPS = [
    { label: 'Polls' },
    { label: 'Activities' },
    { label: 'Packing' },
];

export default function TripSetupScreen() {
    const router = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [trip, setTrip] = useState<TripDetail | null>(null);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLeader, setIsLeader] = useState(false);

    // Expanded poll detail
    const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
    const [pollDetail, setPollDetail] = useState<PollDetail | null>(null);
    const [myVotes, setMyVotes] = useState<VoteType[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

    // Create poll modal
    const [createPollVisible, setCreatePollVisible] = useState(false);
    const [newPollType, setNewPollType] = useState<PollType | null>(null);
    const [newPollTitle, setNewPollTitle] = useState('');
    const [creatingPoll, setCreatingPoll] = useState(false);

    // Add option modal
    const [addOptionVisible, setAddOptionVisible] = useState(false);
    const [addingOption, setAddingOption] = useState(false);
    // Date option fields
    const [optStartDate, setOptStartDate] = useState<Date | null>(null);
    const [optEndDate, setOptEndDate] = useState<Date | null>(null);
    const [showOptStartPicker, setShowOptStartPicker] = useState(false);
    const [showOptEndPicker, setShowOptEndPicker] = useState(false);
    // Time option fields — two native clock pickers for start and end
    const [optStartTime, setOptStartTime] = useState<Date | null>(null);
    const [optEndTime, setOptEndTime] = useState<Date | null>(null);
    const [showOptStartTimePicker, setShowOptStartTimePicker] = useState(false);
    const [showOptEndTimePicker, setShowOptEndTimePicker] = useState(false);
    // Budget option field
    const [optBudget, setOptBudget] = useState('');
    // Destination option field
    const [optDestinationText, setOptDestinationText] = useState('');

    // Finalize modal
    const [finalizeVisible, setFinalizeVisible] = useState(false);
    const [selectedFinalizeOption, setSelectedFinalizeOption] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);

    // ── Data Loading ──────────────────────────────────────────────
    const loadData = async () => {
        try {
            const [tripData, userData, pollsData] = await Promise.all([
                tripService.getTripDetail(tripId!),
                userService.getCurrentUser(),
                pollService.getTripPolls(tripId!, { scope: 'TripOnly', pageSize: 50 }),
            ]);
            setTrip(tripData);
            setCurrentUserId(userData.id);
            setPolls(pollsData.items);
            setIsLeader(true); // TODO: pass from parent or fetch group

            // Redirect to dashboard for statuses that no longer need the setup wizard
            if (['Confirmed', 'Active', 'Completed'].includes(tripData.status)) {
                router.replace(`/group/trip/${tripId}/dashboard` as any);
                return;
            }
        } catch (error: any) {
            showErrorToast('Error', error.message || 'Failed to load trip');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tripId) loadData();
    }, [tripId]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [tripId]);

    // ── Poll Detail / Expand ──────────────────────────────────────
    const togglePollExpand = async (pollId: string) => {
        if (expandedPollId === pollId) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedPollId(null);
            setPollDetail(null);
            setMyVotes([]);
            return;
        }
        setLoadingDetail(true);
        setExpandedPollId(pollId);
        try {
            const [detail, votes] = await Promise.all([
                pollService.getPollDetail(pollId),
                voteService.getMyVotes(pollId),
            ]);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setPollDetail(detail);
            setMyVotes(votes);
        } catch (error: any) {
            showErrorToast('Error', error.message || 'Failed to load poll');
            setExpandedPollId(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    // ── Vote Actions ──────────────────────────────────────────────
    const handleVote = async (optionId: string) => {
        if (!pollDetail || votingOptionId) return;
        setVotingOptionId(optionId);
        try {
            const existingVote = myVotes.find(v => v.pollOptionId !== optionId);
            if (existingVote && pollDetail.type !== 'Date') {
                // Change vote for non-Date polls
                await voteService.changeVote(pollDetail.id, optionId);
            } else {
                const alreadyVoted = myVotes.find(v => v.pollOptionId === optionId);
                if (alreadyVoted) {
                    await voteService.removeVote(alreadyVoted.id);
                } else {
                    await voteService.castVote({ pollOptionId: optionId });
                }
            }
            // Refresh poll detail
            const [detail, votes] = await Promise.all([
                pollService.getPollDetail(pollDetail.id),
                voteService.getMyVotes(pollDetail.id),
            ]);
            setPollDetail(detail);
            setMyVotes(votes);
            // Update poll in list
            setPolls(prev => prev.map(p => p.id === detail.id
                ? { ...p, totalVotes: detail.totalVotes } : p));
        } catch (error: any) {
            showErrorToast('Vote Failed', error.message || 'Could not process vote');
        } finally {
            setVotingOptionId(null);
        }
    };

    // ── Create Poll ───────────────────────────────────────────────
    const existingPollTypes = polls
        .filter(p => p.status !== 'Finalized')
        .map(p => p.type);

    const handleCreatePoll = async () => {
        if (!newPollType || !newPollTitle.trim()) return;
        setCreatingPoll(true);
        try {
            const newPoll = await pollService.createPoll({
                tripId: tripId!,
                type: newPollType,
                title: newPollTitle.trim(),
            });
            setPolls(prev => [newPoll, ...prev]);
            setCreatePollVisible(false);
            setNewPollType(null);
            setNewPollTitle('');
            showSuccessToast('Created', `${newPollType} poll created`);
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not create poll');
        } finally {
            setCreatingPoll(false);
        }
    };

    // ── Add Option ────────────────────────────────────────────────
    const resetOptionFields = () => {
        setOptStartDate(null);
        setOptEndDate(null);
        setShowOptStartPicker(false);
        setShowOptEndPicker(false);
        setOptStartTime(null);
        setOptEndTime(null);
        setShowOptStartTimePicker(false);
        setShowOptEndTimePicker(false);
        setOptBudget('');
        setOptDestinationText('');
    };

    const handleAddOption = async () => {
        if (!pollDetail) return;
        setAddingOption(true);
        try {
            let payload: AddPollOptionPayload = {};
            if (pollDetail.type === 'Date') {
                if (!optStartDate) { showErrorToast('Required', 'Start date is required'); setAddingOption(false); return; }
                const toStr = (d: Date) => {
                    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                payload = { startDate: toStr(optStartDate), endDate: optEndDate ? toStr(optEndDate) : null };
            } else if (pollDetail.type === 'Time') {
                if (!optStartTime) { showErrorToast('Required', 'Start time is required'); setAddingOption(false); return; }
                const toTimeStr = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                payload = { startTime: toTimeStr(optStartTime), endTime: optEndTime ? toTimeStr(optEndTime) : null };
            } else if (pollDetail.type === 'Budget') {
                const val = parseFloat(optBudget);
                if (!val || val <= 0) { showErrorToast('Required', 'Budget must be a positive number'); setAddingOption(false); return; }
                payload = { budget: val };
            } else if (pollDetail.type === 'Destination') {
                if (!optDestinationText.trim()) { showErrorToast('Required', 'Destination name is required'); setAddingOption(false); return; }
                payload = { textValue: optDestinationText.trim() };
            }
            await pollService.addPollOption(pollDetail.id, payload);
            const detail = await pollService.getPollDetail(pollDetail.id);
            setPollDetail(detail);
            setPolls(prev => prev.map(p => p.id === detail.id ? { ...p, optionCount: detail.options.length } : p));
            setAddOptionVisible(false);
            resetOptionFields();
            showSuccessToast('Added', 'Option added');
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not add option');
        } finally {
            setAddingOption(false);
        }
    };

    // ── Close Poll ────────────────────────────────────────────────
    const handleClosePoll = (pollId: string) => {
        Alert.alert('Close Poll', 'No more votes will be accepted after closing.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Close', onPress: async () => {
                    try {
                        const updated = await pollService.closePoll(pollId);
                        setPolls(prev => prev.map(p => p.id === pollId ? { ...p, status: updated.status } : p));
                        if (pollDetail?.id === pollId) {
                            setPollDetail(prev => prev ? { ...prev, status: updated.status } : null);
                        }
                        showSuccessToast('Closed', 'Poll has been closed');
                    } catch (error: any) {
                        showErrorToast('Failed', error.message || 'Could not close poll');
                    }
                },
            },
        ]);
    };

    // ── Finalize Poll ─────────────────────────────────────────────
    const handleFinalize = async () => {
        if (!pollDetail || !selectedFinalizeOption) return;
        setFinalizing(true);
        try {
            const updated = await pollService.finalizePoll({
                pollId: pollDetail.id,
                selectedOptionId: selectedFinalizeOption,
            });
            setPolls(prev => prev.map(p => p.id === pollDetail.id ? { ...p, status: updated.status } : p));
            setPollDetail(prev => prev ? { ...prev, status: updated.status } : null);
            setFinalizeVisible(false);
            setSelectedFinalizeOption(null);
            showSuccessToast('Finalized', 'Decision has been locked in!');
            await loadData();
        } catch (error: any) {
            showErrorToast('Failed', error.message || 'Could not finalize');
        } finally {
            setFinalizing(false);
        }
    };

    // ── Delete Poll ───────────────────────────────────────────────
    const handleDeletePoll = (pollId: string) => {
        Alert.alert('Delete Poll', 'This will permanently remove this poll.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await pollService.deletePoll(pollId);
                        setPolls(prev => prev.filter(p => p.id !== pollId));
                        if (expandedPollId === pollId) {
                            setExpandedPollId(null);
                            setPollDetail(null);
                        }
                        showSuccessToast('Deleted', 'Poll removed');
                    } catch (error: any) {
                        showErrorToast('Failed', error.message || 'Could not delete poll');
                    }
                },
            },
        ]);
    };

    // ── Helpers ────────────────────────────────────────────────────
    const formatDate = (d: string | null) => {
        if (!d) return 'Not set';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateShort = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatOptionLabel = (opt: PollOption, type: PollType): string => {
        if (type === 'Date') {
            const s = opt.startDate ? new Date(opt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            const e = opt.endDate ? new Date(opt.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return e ? `${s} → ${e}` : s;
        }
        if (type === 'Time') return opt.textValue || `${opt.startTime || ''}${opt.endTime ? ' - ' + opt.endTime : ''}`;
        if (type === 'Budget') return opt.budget ? `$${opt.budget.toLocaleString()}` : '';
        if (type === 'Destination') return opt.textValue || '';
        return opt.textValue || '';
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <RetroGrid>
                <View style={s.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={s.loadingText}>Loading trip...</Text>
                </View>
            </RetroGrid>
        );
    }
    if (!trip) {
        return (
            <RetroGrid>
                <View style={s.centered}>
                    <AlertTriangle size={48} color={theme.destructive} />
                    <Text style={s.errorText}>Failed to load trip</Text>
                    <Pressable onPress={() => { setLoading(true); loadData(); }} style={s.retryBtn}>
                        <Text style={s.retryBtnText}>Retry</Text>
                    </Pressable>
                </View>
            </RetroGrid>
        );
    }

    const tripStatusColor = TRIP_STATUS_COLORS[trip.status] || TRIP_STATUS_COLORS.Planning;

    return (
        <RetroGrid>
            {/* Hide the default Expo Router native stack header */}
            <Stack.Screen options={{ headerShown: false }} />

            {/* Floating bell + avatar pill — absolutely positioned over screen */}
            <Header floating />

            {/* ── Title bar: back arrow + trip name + status badge ── */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                    <ArrowLeft size={20} color={theme.primary} />
                </Pressable>
                <View style={s.headerCenter}>
                    <Text style={s.headerTitle} numberOfLines={1}>{trip.title}</Text>
                    <View style={s.headerSub}>
                        <View style={[s.statusBadge, { backgroundColor: tripStatusColor.bg }]}>
                            <Text style={[s.statusText, { color: tripStatusColor.text }]}>{trip.status}</Text>
                        </View>
                        <Text style={s.headerSubText}>{trip.groupName}</Text>
                    </View>
                </View>
            </View>

            {/* ── Step Progress Bar ─────────────────────────── */}
            <StepProgressBar steps={SETUP_STEPS} currentStep={0} />

            {/* ── Content ─────────────────────────────────────── */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
            >
                {/* ── Trip Info Card ──────────────────────────── */}
                <View style={[s.card, shadows.retroSm]}>
                    {/* Date range chip row */}
                    <View style={s.infoChipRow}>
                        {/* Planning range chip */}
                        <View style={s.infoChip}>
                            <Calendar size={13} color={theme.primary} />
                            <View>
                                <Text style={s.infoChipLabel}>Planning</Text>
                                <Text style={s.infoChipValue}>
                                    {trip.planningRangeStart
                                        ? `${formatDateShort(trip.planningRangeStart)}${trip.planningRangeEnd ? ' → ' + formatDateShort(trip.planningRangeEnd) : ''}`
                                        : 'Not set'}
                                </Text>
                            </View>
                        </View>

                        <View style={s.infoChipDivider} />

                        {/* Budget chip */}
                        <View style={s.infoChip}>
                            <DollarSign size={13} color={'#D4A017'} />
                            <View>
                                <Text style={s.infoChipLabel}>Budget</Text>
                                <Text style={[s.infoChipValue, (trip.budget ?? 0) > 0 && { color: '#D4A017' }]}>
                                    {(trip.budget ?? 0) > 0 ? `$${trip.budget!.toLocaleString()}` : 'Not set'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Confirmed dates banner — only when finalized */}
                    {trip.startDate && (
                        <View style={s.confirmedBanner}>
                            <CheckCircle2 size={13} color={theme.accent} />
                            <Text style={s.confirmedBannerText}>
                                Confirmed: {formatDateShort(trip.startDate)}{trip.endDate ? ' → ' + formatDateShort(trip.endDate) : ''}
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Polls Section ───────────────────────────── */}
                <View style={s.sectionHeader}>
                    <View style={s.sectionHeaderLeft}>
                        <BarChart3 size={16} color={theme.primary} />
                        <Text style={s.sectionTitle}>Polls</Text>
                        <View style={s.badge}><Text style={s.badgeText}>{polls.length}</Text></View>
                    </View>
                    <Pressable
                        style={({ pressed }) => [s.createPollBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => setCreatePollVisible(true)}
                    >
                        <Plus size={14} color={theme.primaryForeground} />
                        <Text style={s.createPollBtnText}>Create Poll</Text>
                    </Pressable>
                </View>

                {/* Poll type indicators */}
                <View style={s.typeIndicatorRow}>
                    {AVAILABLE_POLL_TYPES.map(type => {
                        const cfg = POLL_TYPE_CONFIG[type];
                        const Icon = cfg.icon;
                        const exists = polls.some(p => p.type === type);
                        const finalized = polls.some(p => p.type === type && p.status === 'Finalized');
                        return (
                            <View key={type} style={[s.typeIndicator, exists && { borderColor: cfg.color }, finalized && { backgroundColor: `${cfg.color}15` }]}>
                                <Icon size={16} color={exists ? cfg.color : theme.mutedForeground} />
                                <Text style={[s.typeIndicatorText, exists && { color: cfg.color }]}>{cfg.label}</Text>
                                {finalized && <CheckCircle2 size={13} color={cfg.color} />}
                            </View>
                        );
                    })}
                </View>

                {polls.length === 0 ? (
                    <View style={s.emptyCard}>
                        <Vote size={36} color={theme.muted} />
                        <Text style={s.emptyTitle}>No Polls Yet</Text>
                        <Text style={s.emptySubtitle}>Create a poll to start voting on trip details</Text>
                    </View>
                ) : (
                    polls.map(poll => {
                        const cfg = POLL_TYPE_CONFIG[poll.type];
                        const Icon = cfg.icon;
                        const statusBadge = STATUS_BADGE[poll.status];
                        const isExpanded = expandedPollId === poll.id;
                        const canManage = currentUserId === poll.createdBy || isLeader;

                        return (
                            <View key={poll.id} style={[s.pollCard, shadows.retroSm]}>
                                {/* Poll Header (tap to expand) */}
                                <Pressable
                                    style={s.pollCardHeader}
                                    onPress={() => togglePollExpand(poll.id)}
                                >
                                    <View style={[s.pollTypeIcon, { backgroundColor: `${cfg.color}15` }]}>
                                        <Icon size={16} color={cfg.color} />
                                    </View>
                                    <View style={s.pollHeaderInfo}>
                                        <Text style={s.pollTitle} numberOfLines={1}>{poll.title}</Text>
                                        <View style={s.pollMeta}>
                                            <View style={[s.pollStatusBadge, { backgroundColor: statusBadge.bg }]}>
                                                <Text style={[s.pollStatusText, { color: statusBadge.text }]}>{poll.status}</Text>
                                            </View>
                                            <Text style={s.pollMetaText}>{poll.optionCount} options · {poll.totalVotes} votes</Text>
                                        </View>
                                    </View>
                                    {isExpanded ? <ChevronUp size={18} color={theme.mutedForeground} /> : <ChevronDown size={18} color={theme.mutedForeground} />}
                                </Pressable>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <View style={s.pollExpanded}>
                                        {loadingDetail ? (
                                            <ActivityIndicator color={theme.primary} style={{ padding: 16 }} />
                                        ) : pollDetail ? (
                                            <>
                                                {/* Options list */}
                                                {pollDetail.options.map(opt => {
                                                    const myVote = myVotes.find(v => v.pollOptionId === opt.id);
                                                    const isVoted = !!myVote;
                                                    const isFinalized = opt.isSelectFinalized;
                                                    const totalVotes = pollDetail.options.reduce((sum, o) => sum + o.voteCount, 0);
                                                    const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;

                                                    return (
                                                        <Pressable
                                                            key={opt.id}
                                                            style={[
                                                                s.optionRow,
                                                                isVoted && s.optionRowVoted,
                                                                isFinalized && s.optionRowFinalized,
                                                            ]}
                                                            onPress={() => pollDetail.status === 'Open' ? handleVote(opt.id) : null}
                                                            disabled={pollDetail.status !== 'Open' || !!votingOptionId}
                                                        >
                                                            <View style={s.optionContent}>
                                                                <View style={[s.voteIndicator, isVoted && s.voteIndicatorActive]}>
                                                                    {votingOptionId === opt.id ? (
                                                                        <ActivityIndicator size="small" color={theme.primary} />
                                                                    ) : isVoted ? (
                                                                        <Check size={14} color={theme.primaryForeground} />
                                                                    ) : null}
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                        <Text style={[s.optionLabel, isVoted && { color: theme.primary, fontFamily: fonts.semiBold }]}>
                                                                            {formatOptionLabel(opt, pollDetail.type)}
                                                                        </Text>
                                                                        {isFinalized && (
                                                                            <View style={s.finalizedBadge}>
                                                                                <Crown size={10} color={theme.accent} />
                                                                                <Text style={s.finalizedBadgeText}>Chosen</Text>
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                    <View style={s.optionBar}>
                                                                        <View style={[s.optionBarFill, { width: `${pct}%`, backgroundColor: isFinalized ? theme.accent : isVoted ? theme.primary : theme.muted }]} />
                                                                    </View>
                                                                </View>
                                                                <Text style={s.optionVoteCount}>{opt.voteCount} ({pct}%)</Text>
                                                            </View>
                                                        </Pressable>
                                                    );
                                                })}

                                                {/* Actions */}
                                                <View style={s.pollActions}>
                                                    {pollDetail.status === 'Open' && (
                                                        <Pressable
                                                            style={({ pressed }) => [s.pollActionBtn, pressed && { opacity: 0.7 }]}
                                                            onPress={() => { resetOptionFields(); setAddOptionVisible(true); }}
                                                        >
                                                            <Plus size={14} color={theme.primary} />
                                                            <Text style={s.pollActionText}>Add Option</Text>
                                                        </Pressable>
                                                    )}
                                                    {pollDetail.status === 'Open' && canManage && (
                                                        <Pressable
                                                            style={({ pressed }) => [s.pollActionBtn, pressed && { opacity: 0.7 }]}
                                                            onPress={() => handleClosePoll(pollDetail.id)}
                                                        >
                                                            <Lock size={14} color={theme.primary} />
                                                            <Text style={s.pollActionText}>Close</Text>
                                                        </Pressable>
                                                    )}
                                                    {pollDetail.status === 'Closed' && isLeader && (
                                                        <Pressable
                                                            style={({ pressed }) => [s.pollActionBtn, s.pollActionBtnAccent, pressed && { opacity: 0.7 }]}
                                                            onPress={() => { setSelectedFinalizeOption(null); setFinalizeVisible(true); }}
                                                        >
                                                            <Sparkles size={14} color={theme.accent} />
                                                            <Text style={[s.pollActionText, { color: theme.accent }]}>Finalize</Text>
                                                        </Pressable>
                                                    )}
                                                    {canManage && pollDetail.status !== 'Finalized' && (
                                                        <Pressable
                                                            style={({ pressed }) => [s.pollActionBtn, pressed && { opacity: 0.7 }]}
                                                            onPress={() => handleDeletePoll(pollDetail.id)}
                                                        >
                                                            <Trash2 size={14} color={theme.destructive} />
                                                            <Text style={[s.pollActionText, { color: theme.destructive }]}>Delete</Text>
                                                        </Pressable>
                                                    )}
                                                </View>
                                            </>
                                        ) : null}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}

                {/* ── Next Step CTA ───────────────────────────── */}
                <Pressable
                    style={({ pressed }) => [s.nextStepBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => router.push(`/group/trip/${tripId}/activities` as any)}
                >
                    <Text style={s.nextStepBtnText}>Next: Plan Activities</Text>
                    <ChevronDown size={16} color={theme.primaryForeground} style={{ transform: [{ rotate: '-90deg' }] }} />
                </Pressable>

                {/* ── Back to Group shortcut ───────────────────── */}
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

            {/* ── Create Poll Modal ───────────────────────── */}
            <Modal visible={createPollVisible} transparent animationType="fade" onRequestClose={() => setCreatePollVisible(false)}>
                <Pressable style={s.modalBackdrop} onPress={() => setCreatePollVisible(false)}>
                    <Pressable onPress={e => e.stopPropagation()} style={s.modalContainer}>
                        <View style={[s.modalContent, shadows.retro]}>
                            <View style={s.modalHeader}>
                                <Text style={s.modalTitle}>Create Poll</Text>
                                <Pressable onPress={() => setCreatePollVisible(false)} style={s.modalClose}>
                                    <X size={18} color={theme.mutedForeground} />
                                </Pressable>
                            </View>

                            <Text style={s.fieldLabel}>Poll Type</Text>
                            <View style={s.typeGrid}>
                                {AVAILABLE_POLL_TYPES.map(type => {
                                    const cfg = POLL_TYPE_CONFIG[type];
                                    const Icon = cfg.icon;
                                    const disabled = existingPollTypes.includes(type);
                                    const selected = newPollType === type;
                                    const TYPE_HINTS: Record<PollType, string> = {
                                        Date: 'Vote on travel dates',
                                        Time: 'Pick a departure time',
                                        Destination: 'Vote on where to go',
                                        Budget: 'Agree on a budget',
                                    };
                                    return (
                                        <Pressable
                                            key={type}
                                            style={[
                                                s.typeOption,
                                                selected && { borderColor: cfg.color, backgroundColor: `${cfg.color}10` },
                                                disabled && { opacity: 0.4 },
                                            ]}
                                            onPress={() => !disabled && setNewPollType(type)}
                                            disabled={disabled}
                                        >
                                            <View style={[s.typeOptionIconWrap, { backgroundColor: selected ? `${cfg.color}20` : theme.muted }]}>
                                                <Icon size={22} color={selected ? cfg.color : theme.mutedForeground} />
                                            </View>
                                            <Text style={[s.typeOptionLabel, selected && { color: cfg.color, fontFamily: fonts.bold }]}>{cfg.label}</Text>
                                            <Text style={s.typeOptionHint}>{disabled ? 'Already exists' : TYPE_HINTS[type]}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Text style={s.fieldLabel}>Title</Text>
                            <TextInput
                                style={s.modalInput}
                                placeholder="e.g. When should we go?"
                                placeholderTextColor={theme.mutedForeground}
                                value={newPollTitle}
                                onChangeText={setNewPollTitle}
                            />

                            <View style={s.modalActions}>
                                <Pressable style={s.modalCancelBtn} onPress={() => setCreatePollVisible(false)}>
                                    <Text style={s.modalCancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[s.modalSubmitBtn, (!newPollType || !newPollTitle.trim()) && { opacity: 0.5 }]}
                                    onPress={handleCreatePoll}
                                    disabled={creatingPoll || !newPollType || !newPollTitle.trim()}
                                >
                                    {creatingPoll ? <ActivityIndicator color={theme.primaryForeground} size="small" />
                                        : <Text style={s.modalSubmitText}>Create</Text>}
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Add Option Modal ────────────────────────── */}
            <Modal visible={addOptionVisible} transparent animationType="slide" onRequestClose={() => setAddOptionVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.optModalOuter}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddOptionVisible(false)} />
                    <View style={[s.optModalSheet, shadows.retro]}>
                        {/* Coloured type header */}
                        {pollDetail && (() => {
                            const cfg = POLL_TYPE_CONFIG[pollDetail.type];
                            const Icon = cfg.icon;
                            return (
                                <View style={[s.optModalTypeHeader, { backgroundColor: `${cfg.color}15`, borderBottomColor: `${cfg.color}30` }]}>
                                    <View style={[s.optModalTypeIconWrap, { backgroundColor: `${cfg.color}20` }]}>
                                        <Icon size={22} color={cfg.color} />
                                    </View>
                                    <View>
                                        <Text style={[s.optModalTypeLabel, { color: cfg.color }]}>{cfg.label} Poll</Text>
                                        <Text style={s.optModalTypeHint}>Add a new option for members to vote on</Text>
                                    </View>
                                    <Pressable onPress={() => setAddOptionVisible(false)} style={s.optModalCloseBtn}>
                                        <X size={18} color={theme.mutedForeground} />
                                    </Pressable>
                                </View>
                            );
                        })()}

                        <View style={s.optModalBody}>
                            {/* DATE type */}
                            {pollDetail?.type === 'Date' && (
                                <>
                                    <Text style={s.optFieldLabel}>Start Date <Text style={s.optFieldRequired}>*</Text></Text>
                                    <Pressable style={[s.optPickerBtn, optStartDate && s.optPickerBtnActive]} onPress={() => setShowOptStartPicker(!showOptStartPicker)}>
                                        <Calendar size={16} color={optStartDate ? theme.primary : theme.mutedForeground} />
                                        <Text style={[s.optPickerText, optStartDate && { color: theme.foreground, fontFamily: fonts.semiBold }]}>
                                            {optStartDate ? optStartDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Tap to select start date'}
                                        </Text>
                                    </Pressable>
                                    {showOptStartPicker && (
                                        <DateTimePicker value={optStartDate || tomorrow} mode="date" minimumDate={tomorrow}
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(_e, d) => { if (Platform.OS === 'android') setShowOptStartPicker(false); if (d) { setOptStartDate(d); if (optEndDate && d > optEndDate) setOptEndDate(null); } }} />
                                    )}

                                    <Text style={[s.optFieldLabel, { marginTop: 16 }]}>End Date <Text style={s.optFieldOptional}>(optional)</Text></Text>
                                    <Pressable style={[s.optPickerBtn, optEndDate && s.optPickerBtnActive]} onPress={() => setShowOptEndPicker(!showOptEndPicker)}>
                                        <Calendar size={16} color={optEndDate ? theme.primary : theme.mutedForeground} />
                                        <Text style={[s.optPickerText, optEndDate && { color: theme.foreground, fontFamily: fonts.semiBold }]}>
                                            {optEndDate ? optEndDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Tap to select end date'}
                                        </Text>
                                    </Pressable>
                                    {showOptEndPicker && (
                                        <DateTimePicker value={optEndDate || optStartDate || tomorrow} mode="date" minimumDate={optStartDate || tomorrow}
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(_e, d) => { if (Platform.OS === 'android') setShowOptEndPicker(false); if (d) setOptEndDate(d); }} />
                                    )}
                                </>
                            )}

                            {/* TIME type — native clock pickers */}
                            {pollDetail?.type === 'Time' && (
                                <>
                                    <Text style={s.optFieldLabel}>Start Time <Text style={s.optFieldRequired}>*</Text></Text>
                                    <Pressable style={[s.optPickerBtn, optStartTime && s.optPickerBtnActive]} onPress={() => setShowOptStartTimePicker(!showOptStartTimePicker)}>
                                        <Clock size={16} color={optStartTime ? theme.secondary : theme.mutedForeground} />
                                        <Text style={[s.optPickerText, optStartTime && { color: theme.foreground, fontFamily: fonts.semiBold }]}>
                                            {optStartTime ? optStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Tap to select start time'}
                                        </Text>
                                    </Pressable>
                                    {showOptStartTimePicker && (
                                        <DateTimePicker value={optStartTime || new Date()} mode="time" is24Hour
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(_e, d) => { if (Platform.OS === 'android') setShowOptStartTimePicker(false); if (d) setOptStartTime(d); }} />
                                    )}

                                    <Text style={[s.optFieldLabel, { marginTop: 16 }]}>End Time <Text style={s.optFieldOptional}>(optional)</Text></Text>
                                    <Pressable style={[s.optPickerBtn, optEndTime && s.optPickerBtnActive]} onPress={() => setShowOptEndTimePicker(!showOptEndTimePicker)}>
                                        <Clock size={16} color={optEndTime ? theme.secondary : theme.mutedForeground} />
                                        <Text style={[s.optPickerText, optEndTime && { color: theme.foreground, fontFamily: fonts.semiBold }]}>
                                            {optEndTime ? optEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Tap to select end time'}
                                        </Text>
                                    </Pressable>
                                    {showOptEndTimePicker && (
                                        <DateTimePicker value={optEndTime || optStartTime || new Date()} mode="time" is24Hour
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(_e, d) => { if (Platform.OS === 'android') setShowOptEndTimePicker(false); if (d) setOptEndTime(d); }} />
                                    )}
                                </>
                            )}

                            {/* DESTINATION type */}
                            {pollDetail?.type === 'Destination' && (
                                <>
                                    <Text style={s.optFieldLabel}>Destination Name <Text style={s.optFieldRequired}>*</Text></Text>
                                    <TextInput
                                        style={s.optTextInput}
                                        placeholder="e.g. Da Nang, Hoi An, Phu Quoc…"
                                        placeholderTextColor={theme.mutedForeground}
                                        value={optDestinationText}
                                        onChangeText={setOptDestinationText}
                                        autoFocus
                                    />
                                </>
                            )}

                            {/* BUDGET type */}
                            {pollDetail?.type === 'Budget' && (
                                <>
                                    <Text style={s.optFieldLabel}>Budget Amount <Text style={s.optFieldRequired}>*</Text></Text>
                                    <View style={s.optBudgetRow}>
                                        <View style={s.optBudgetPrefix}>
                                            <DollarSign size={18} color={theme.mutedForeground} />
                                        </View>
                                        <TextInput
                                            style={s.optBudgetInput}
                                            placeholder="0"
                                            placeholderTextColor={theme.mutedForeground}
                                            value={optBudget}
                                            onChangeText={t => setOptBudget(t.replace(/[^0-9.]/g, ''))}
                                            keyboardType="numeric"
                                            autoFocus
                                        />
                                    </View>
                                    <Text style={s.optBudgetHint}>Enter estimated cost in USD per person</Text>
                                </>
                            )}

                            {/* Actions */}
                            <View style={s.optModalActions}>
                                <Pressable style={s.optCancelBtn} onPress={() => setAddOptionVisible(false)}>
                                    <Text style={s.optCancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[s.optSubmitBtn, { backgroundColor: pollDetail ? POLL_TYPE_CONFIG[pollDetail.type].color : theme.primary }]}
                                    onPress={handleAddOption}
                                    disabled={addingOption}
                                >
                                    {addingOption
                                        ? <ActivityIndicator color={theme.primaryForeground} size="small" />
                                        : <Text style={s.optSubmitText}>Add Option</Text>}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Finalize Modal ──────────────────────────── */}
            <Modal visible={finalizeVisible} transparent animationType="fade" onRequestClose={() => setFinalizeVisible(false)}>
                <Pressable style={s.modalBackdrop} onPress={() => setFinalizeVisible(false)}>
                    <Pressable onPress={e => e.stopPropagation()} style={s.modalContainer}>
                        <View style={[s.modalContent, shadows.retro]}>
                            <View style={s.modalHeader}>
                                <View style={s.modalHeaderLeft}>
                                    <Sparkles size={18} color={theme.accent} />
                                    <Text style={s.modalTitle}>Finalize Decision</Text>
                                </View>
                                <Pressable onPress={() => setFinalizeVisible(false)} style={s.modalClose}>
                                    <X size={18} color={theme.mutedForeground} />
                                </Pressable>
                            </View>

                            <Text style={s.finalizeHint}>Select the winning option to lock in the decision:</Text>

                            {pollDetail?.options.map(opt => {
                                const selected = selectedFinalizeOption === opt.id;
                                return (
                                    <Pressable key={opt.id} style={[s.finalizeOption, selected && s.finalizeOptionSelected]} onPress={() => setSelectedFinalizeOption(opt.id)}>
                                        <View style={[s.finalizeRadio, selected && s.finalizeRadioSelected]}>
                                            {selected && <View style={s.finalizeRadioDot} />}
                                        </View>
                                        <Text style={[s.finalizeOptionText, selected && { fontFamily: fonts.semiBold, color: theme.primary }]}>
                                            {formatOptionLabel(opt, pollDetail.type)}
                                        </Text>
                                        <Text style={s.finalizeVotes}>{opt.voteCount} votes</Text>
                                    </Pressable>
                                );
                            })}

                            <View style={[s.modalActions, { marginTop: 16 }]}>
                                <Pressable style={s.modalCancelBtn} onPress={() => setFinalizeVisible(false)}>
                                    <Text style={s.modalCancelText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[s.modalSubmitBtnAccent, !selectedFinalizeOption && { opacity: 0.5 }]}
                                    onPress={handleFinalize}
                                    disabled={finalizing || !selectedFinalizeOption}
                                >
                                    {finalizing ? <ActivityIndicator color={theme.accentForeground} size="small" />
                                        : <Text style={s.modalSubmitTextAccent}>Confirm</Text>}
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </RetroGrid>
    );
}

// ── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 16, fontSize: 16, fontFamily: fonts.medium, color: theme.mutedForeground },
    errorText: { marginTop: 16, fontSize: 18, fontFamily: fonts.bold, color: theme.destructive, marginBottom: 16 },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.primary, borderRadius: radius.lg },
    retryBtnText: { fontSize: 16, fontFamily: fonts.bold, color: theme.primaryForeground },

    // Header — back + title on same row; floating Header pill overlays top-right of screen absolutely
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, paddingRight: 114, backgroundColor: `${theme.card}F0`, borderBottomWidth: 2, borderBottomColor: theme.border, gap: 10 },
    backBtn: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: `${theme.primary}10`, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 20, fontFamily: fonts.bold, color: theme.foreground },
    headerSub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    headerSubText: { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
    statusText: { fontSize: 11, fontFamily: fonts.semiBold },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

    // Card
    card: { backgroundColor: theme.card, borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, padding: 16, marginBottom: 16, gap: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { fontSize: 13, fontFamily: fonts.medium, color: theme.mutedForeground },
    infoValue: { fontSize: 13, fontFamily: fonts.regular, color: theme.foreground, flex: 1 },
    // Info chips — compact two-column row inside the card
    infoChipRow: { flexDirection: 'row', alignItems: 'stretch', gap: 0 },
    infoChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    infoChipLabel: { fontSize: 10, fontFamily: fonts.medium, color: theme.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    infoChipValue: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.foreground },
    infoChipDivider: { width: 1, backgroundColor: theme.border, marginHorizontal: 12, alignSelf: 'stretch' },
    confirmedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${theme.accent}10`, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
    confirmedBannerText: { fontSize: 12, fontFamily: fonts.semiBold, color: theme.accent, flex: 1 },

    // Section
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 16, fontFamily: fonts.bold, color: theme.foreground },
    badge: { backgroundColor: `${theme.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
    badgeText: { fontSize: 12, fontFamily: fonts.semiBold, color: theme.primary },
    createPollBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg },
    createPollBtnText: { fontSize: 12, fontFamily: fonts.semiBold, color: theme.primaryForeground },

    // Type indicators
    typeIndicatorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 2, borderColor: theme.border },
    typeIndicatorText: { fontSize: 13, fontFamily: fonts.semiBold, color: theme.mutedForeground },

    // Empty
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontFamily: fonts.bold, color: theme.mutedForeground },
    emptySubtitle: { fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground },

    // Poll Card
    pollCard: { backgroundColor: theme.card, borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, marginBottom: 12, overflow: 'hidden' },
    pollCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    pollTypeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    pollHeaderInfo: { flex: 1 },
    pollTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: theme.foreground },
    pollMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    pollStatusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
    pollStatusText: { fontSize: 10, fontFamily: fonts.semiBold },
    pollMetaText: { fontSize: 11, fontFamily: fonts.regular, color: theme.mutedForeground },
    pollExpanded: { borderTopWidth: 1, borderTopColor: theme.border },

    // Option row
    optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: `${theme.border}60` },
    optionRowVoted: { backgroundColor: `${theme.primary}06` },
    optionRowFinalized: { backgroundColor: `${theme.accent}08`, borderLeftWidth: 3, borderLeftColor: theme.accent },
    finalizedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${theme.accent}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
    finalizedBadgeText: { fontSize: 10, fontFamily: fonts.semiBold, color: theme.accent },
    optionContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    voteIndicator: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    voteIndicatorActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    optionLabel: { fontSize: 13, fontFamily: fonts.regular, color: theme.foreground },
    optionBar: { height: 4, backgroundColor: `${theme.border}40`, borderRadius: 2, marginTop: 4 },
    optionBarFill: { height: 4, borderRadius: 2 },
    optionVoteCount: { fontSize: 12, fontFamily: fonts.medium, color: theme.mutedForeground, minWidth: 50, textAlign: 'right' },

    // Poll actions
    pollActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
    pollActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg, borderWidth: 1.5, borderColor: theme.border },
    pollActionBtnAccent: { borderColor: theme.accent },
    pollActionText: { fontSize: 12, fontFamily: fonts.medium, color: theme.primary },

    // Modal shared
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    modalContainer: { width: '100%', maxWidth: 448 },
    modalContainerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    modalContent: { backgroundColor: theme.card, borderRadius: radius.xl, borderWidth: 2, borderColor: theme.primary, padding: 24 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalTitle: { fontSize: 18, fontFamily: fonts.bold, color: theme.foreground },
    modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.muted, justifyContent: 'center', alignItems: 'center' },
    fieldLabel: { fontSize: 14, fontFamily: fonts.medium, color: theme.foreground, marginBottom: 8 },
    modalInput: { backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: fonts.regular, color: theme.foreground, marginBottom: 12 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 2, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.card },
    modalCancelText: { fontFamily: fonts.semiBold, color: theme.mutedForeground, fontSize: 15 },
    modalSubmitBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: theme.primary, alignItems: 'center' },
    modalSubmitText: { fontFamily: fonts.semiBold, color: theme.primaryForeground, fontSize: 15 },
    modalSubmitBtnAccent: { flex: 1, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: theme.accent, alignItems: 'center' },
    modalSubmitTextAccent: { fontFamily: fonts.semiBold, color: theme.accentForeground, fontSize: 15 },

    // Type grid — 2×2 wrapped layout
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    typeOption: {
        width: '47%',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.input,
        gap: 8,
    },
    typeOptionIconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    typeOptionLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: theme.foreground, textAlign: 'center' },
    typeOptionHint: { fontSize: 11, fontFamily: fonts.regular, color: theme.mutedForeground, textAlign: 'center' },

    // Date picker btn
    datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
    datePickerBtnActive: { borderColor: theme.primary },
    datePickerText: { fontSize: 14, fontFamily: fonts.regular, color: theme.mutedForeground },

    // Budget input
    budgetInputRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
    budgetPrefixIcon: { position: 'absolute', left: 12, zIndex: 1 },

    // Finalize
    finalizeHint: { fontSize: 13, fontFamily: fonts.regular, color: theme.mutedForeground, marginBottom: 12 },
    finalizeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: theme.border, marginBottom: 8 },
    finalizeOptionSelected: { borderColor: theme.primary, backgroundColor: `${theme.primary}08` },
    finalizeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    finalizeRadioSelected: { borderColor: theme.primary },
    finalizeRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary },
    finalizeOptionText: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: theme.foreground },
    finalizeVotes: { fontSize: 12, fontFamily: fonts.medium, color: theme.mutedForeground },

    // Add-option bottom sheet modal
    optModalOuter: { flex: 1, justifyContent: 'flex-end' },
    optModalSheet: {
        backgroundColor: theme.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: theme.border,
        overflow: 'hidden',
    },
    optModalTypeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    optModalTypeIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optModalTypeLabel: { fontSize: 16, fontFamily: fonts.bold, flex: 1 },
    optModalTypeHint: { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground, marginTop: 1 },
    optModalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.muted, justifyContent: 'center', alignItems: 'center' },
    optModalBody: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
    // Field labels
    optFieldLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: theme.foreground, marginBottom: 8 },
    optFieldRequired: { color: theme.destructive },
    optFieldOptional: { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground },
    // Picker buttons (date / time)
    optPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: radius.xl,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 4,
    },
    optPickerBtnActive: { borderColor: theme.primary, backgroundColor: `${theme.primary}08` },
    optPickerText: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: theme.mutedForeground },
    // Text input (destination)
    optTextInput: {
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: radius.xl,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: fonts.regular,
        color: theme.foreground,
    },
    // Budget input
    optBudgetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.input, borderWidth: 2, borderColor: theme.border, borderRadius: radius.xl, paddingHorizontal: 16, overflow: 'hidden' },
    optBudgetPrefix: { marginRight: 8 },
    optBudgetInput: { flex: 1, paddingVertical: 14, fontSize: 20, fontFamily: fonts.bold, color: theme.foreground },
    optBudgetHint: { fontSize: 12, fontFamily: fonts.regular, color: theme.mutedForeground, marginTop: 8 },
    // Actions
    optModalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    optCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.xl, borderWidth: 2, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.card },
    optCancelText: { fontFamily: fonts.semiBold, color: theme.mutedForeground, fontSize: 15 },
    optSubmitBtn: { flex: 2, paddingVertical: 14, borderRadius: radius.xl, alignItems: 'center' },
    optSubmitText: { fontFamily: fonts.bold, color: theme.primaryForeground, fontSize: 15 },

    // Next step CTA
    nextStepBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 24,
        paddingVertical: 16,
        borderRadius: radius.xl,
        backgroundColor: theme.primary,
    },
    nextStepBtnText: { fontFamily: fonts.bold, color: theme.primaryForeground, fontSize: 15 },

    // Back to Group shortcut
    backToGroupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: radius.xl,
        borderWidth: 1.5,
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    backToGroupBtnText: { fontFamily: fonts.medium, color: theme.mutedForeground, fontSize: 14 },
});
