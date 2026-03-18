/**
 * StepProgressBar.tsx
 *
 * Horizontal step indicator for the trip setup flow.
 * Shows numbered step circles connected by lines, with completed/active/future states.
 * Used at the top of each trip setup step screen so users always know where they are.
 *
 * Props:
 *   steps       — array of { label: string } objects
 *   currentStep — 0-indexed number of the active step
 *
 * Used by: [tripId].tsx (Step 1: Polls), [tripId]/packing.tsx (Step 2: Packing)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { theme, fonts, radius } from '../constants/theme';

interface Step {
    label: string;
}

interface StepProgressBarProps {
    steps: Step[];
    currentStep: number;
}

export default function StepProgressBar({ steps, currentStep }: StepProgressBarProps) {
    return (
        <View style={s.container}>
            {steps.map((step, index) => {
                const isDone = index < currentStep;
                const isActive = index === currentStep;
                const isLast = index === steps.length - 1;

                return (
                    <React.Fragment key={index}>
                        {/* Step node */}
                        <View style={s.stepNode}>
                            {/* Circle */}
                            <View style={[
                                s.circle,
                                isDone && s.circleDone,
                                isActive && s.circleActive,
                            ]}>
                                {isDone
                                    ? <Check size={10} color={theme.primaryForeground} strokeWidth={3} />
                                    : <Text style={[s.circleText, isActive && s.circleTextActive]}>{index + 1}</Text>
                                }
                            </View>
                            {/* Label */}
                            <Text style={[
                                s.label,
                                isActive && s.labelActive,
                                isDone && s.labelDone,
                            ]} numberOfLines={1}>
                                {step.label}
                            </Text>
                        </View>

                        {/* Connector line between steps */}
                        {!isLast && (
                            <View style={[s.line, isDone && s.lineDone]} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.card,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },

    // Each step node: circle + label stacked
    stepNode: {
        alignItems: 'center',
        gap: 4,
    },

    // Line between nodes — grows to fill space
    line: {
        flex: 1,
        height: 2,
        backgroundColor: theme.border,
        marginBottom: 16, // align with circle center above label
        marginHorizontal: 4,
    },
    lineDone: {
        backgroundColor: theme.primary,
    },

    // Circles
    circle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: theme.border,
        backgroundColor: theme.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleDone: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    circleActive: {
        borderColor: theme.primary,
        backgroundColor: `${theme.primary}15`,
    },

    // Texts inside circle
    circleText: {
        fontSize: 11,
        fontFamily: fonts.semiBold,
        color: theme.mutedForeground,
    },
    circleTextActive: {
        color: theme.primary,
    },

    // Step labels
    label: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        textAlign: 'center',
    },
    labelActive: {
        fontFamily: fonts.bold,
        color: theme.primary,
    },
    labelDone: {
        color: theme.foreground,
        fontFamily: fonts.medium,
    },
});
