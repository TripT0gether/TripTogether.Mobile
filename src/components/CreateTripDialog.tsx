/**
 * CreateTripDialog.tsx
 *
 * Modal dialog for creating a new trip within a group.
 * Collects trip title (required), planning date range (optional), and budget (optional).
 * Uses the native DateTimePicker for date selection on both platforms.
 *
 * Purpose:
 * - Provide a clean, retro-styled modal for trip creation
 * - Validate input before submission (title required)
 * - Handle loading states and error feedback
 *
 * Key Exports:
 * - CreateTripDialog: Modal component with controlled visibility
 *
 * Used by: Group detail screen (app/group/[id].tsx)
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Platform,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { X, Map, Calendar, DollarSign } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme, shadows, fonts, radius } from '../constants/theme';

interface CreateTripDialogProps {
    visible: boolean;
    groupId: string;
    onClose: () => void;
    onCreateTrip: (payload: {
        groupId: string;
        title: string;
        planningRangeStart?: string | null;
        planningRangeEnd?: string | null;
        budget?: number;
    }) => Promise<void>;
}

export default function CreateTripDialog({
    visible,
    groupId,
    onClose,
    onCreateTrip,
}: CreateTripDialogProps) {
    const [title, setTitle] = useState('');
    const [budget, setBudget] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
        setTitle('');
        setBudget('');
        setStartDate(null);
        setEndDate(null);
        setShowStartPicker(false);
        setShowEndPicker(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Not set';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const toDateOnlyString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleStartDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowStartPicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);
            if (endDate && selectedDate > endDate) {
                setEndDate(null);
            }
        }
    };

    const handleEndDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowEndPicker(false);
        if (selectedDate) {
            setEndDate(selectedDate);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return;

        setLoading(true);
        try {
            const parsedBudget = budget ? parseFloat(budget) : undefined;
            await onCreateTrip({
                groupId,
                title: title.trim(),
                planningRangeStart: startDate ? toDateOnlyString(startDate) : null,
                planningRangeEnd: endDate ? toDateOnlyString(endDate) : null,
                budget: parsedBudget && !isNaN(parsedBudget) ? parsedBudget : undefined,
            });
            resetForm();
        } catch (error) {
            // Parent handles error toast
        } finally {
            setLoading(false);
        }
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable style={s.backdrop} onPress={handleClose}>
                <Pressable onPress={(e) => e.stopPropagation()} style={s.dialogContainer}>
                    <View style={[s.dialog, shadows.retro]}>
                        {/* Header */}
                        <View style={s.header}>
                            <View style={s.headerLeft}>
                                <View style={s.iconContainer}>
                                    <Map size={20} color={theme.primary} />
                                </View>
                                <Text style={s.title}>New Trip</Text>
                            </View>
                            <Pressable onPress={handleClose} style={s.closeButton}>
                                <X size={18} color={theme.mutedForeground} />
                            </Pressable>
                        </View>

                        {/* Trip Title */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Trip Title</Text>
                            <TextInput
                                style={s.input}
                                placeholder="e.g. Weekend in Vũng Tàu"
                                placeholderTextColor={theme.mutedForeground}
                                value={title}
                                onChangeText={setTitle}
                                autoFocus
                            />
                        </View>

                        {/* Date Range */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Planning Date Range</Text>
                            <Text style={s.hint}>
                                Optional — helps narrow down dates during polling
                            </Text>
                            <View style={s.dateRow}>
                                <Pressable
                                    style={[s.dateBtn, startDate && s.dateBtnActive]}
                                    onPress={() => setShowStartPicker(!showStartPicker)}
                                >
                                    <Calendar size={14} color={startDate ? theme.primary : theme.mutedForeground} />
                                    <Text style={[s.dateBtnText, startDate && s.dateBtnTextActive]}>
                                        {formatDate(startDate)}
                                    </Text>
                                </Pressable>

                                <Text style={s.dateSeparator}>→</Text>

                                <Pressable
                                    style={[s.dateBtn, endDate && s.dateBtnActive]}
                                    onPress={() => setShowEndPicker(!showEndPicker)}
                                >
                                    <Calendar size={14} color={endDate ? theme.primary : theme.mutedForeground} />
                                    <Text style={[s.dateBtnText, endDate && s.dateBtnTextActive]}>
                                        {formatDate(endDate)}
                                    </Text>
                                </Pressable>
                            </View>

                            {showStartPicker && (
                                <DateTimePicker
                                    value={startDate || tomorrow}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={tomorrow}
                                    onChange={handleStartDateChange}
                                />
                            )}
                            {showEndPicker && (
                                <DateTimePicker
                                    value={endDate || startDate || tomorrow}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={startDate || tomorrow}
                                    onChange={handleEndDateChange}
                                />
                            )}
                        </View>

                        {/* Budget */}
                        <View style={s.fieldGroup}>
                            <Text style={s.label}>Estimated Budget</Text>
                            <Text style={s.hint}>Optional — can be refined via poll later</Text>
                            <View style={s.budgetRow}>
                                <View style={s.budgetPrefix}>
                                    <DollarSign size={16} color={theme.mutedForeground} />
                                </View>
                                <TextInput
                                    style={[s.input, s.budgetInput]}
                                    placeholder="0"
                                    placeholderTextColor={theme.mutedForeground}
                                    value={budget}
                                    onChangeText={(text) => setBudget(text.replace(/[^0-9.]/g, ''))}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={s.actions}>
                            <Pressable
                                onPress={handleClose}
                                style={({ pressed }) => ([
                                    s.cancelButton,
                                    pressed && s.buttonPressed,
                                ].filter(Boolean) as StyleProp<ViewStyle>)}
                            >
                                <Text style={s.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleCreate}
                                disabled={loading || !title.trim()}
                                style={({ pressed }) => ([
                                    s.createButton,
                                    (!title.trim() || loading) && s.createButtonDisabled,
                                    pressed && !loading && title.trim() && s.buttonPressed,
                                ].filter(Boolean) as StyleProp<ViewStyle>)}
                            >
                                {loading ? (
                                    <ActivityIndicator color={theme.primaryForeground} size="small" />
                                ) : (
                                    <Text style={s.createButtonText}>Create Trip</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 448,
    },
    dialog: {
        backgroundColor: theme.card,
        borderRadius: radius.xl,
        borderWidth: 2,
        borderColor: theme.primary,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${theme.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.foreground,
        marginBottom: 4,
    },
    hint: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: radius.lg,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: fonts.regular,
        color: theme.foreground,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.input,
        borderWidth: 2,
        borderColor: theme.border,
        borderRadius: radius.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dateBtnActive: {
        borderColor: theme.primary,
        backgroundColor: `${theme.primary}08`,
    },
    dateBtnText: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    dateBtnTextActive: {
        color: theme.foreground,
        fontFamily: fonts.medium,
    },
    dateSeparator: {
        fontSize: 16,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
    },
    budgetRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    budgetPrefix: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
    },
    budgetInput: {
        flex: 1,
        paddingLeft: 36,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: theme.border,
        alignItems: 'center',
        backgroundColor: theme.card,
    },
    cancelButtonText: {
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
        fontSize: 16,
    },
    createButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: theme.primary,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontFamily: fonts.semiBold,
        color: theme.primaryForeground,
        fontSize: 16,
    },
    buttonPressed: {
        opacity: 0.7,
    },
});
