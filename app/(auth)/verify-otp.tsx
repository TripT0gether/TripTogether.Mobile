import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../../src/services/authService';
import { showErrorToast, showSuccessToast } from '../../src/utils/toast';
import { Mail, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react-native';
import RetroGrid from '../../src/components/RetroGrid';
import { theme, shadows, fonts } from '../../src/constants/theme';

export default function VerifyOtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            showErrorToast('Invalid OTP', 'Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);

        try {
            await authService.verifyOtp({ email, otp });
            showSuccessToast('Email Verified!', 'You can now sign in to your account');
            router.replace('/(auth)/login');
        } catch (err: any) {
            showErrorToast('Verification Failed', err.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setResending(true);

        try {
            await authService.resendOtp(email);
            showSuccessToast('Code Resent!', 'Check your email for a new code');
        } catch (err: any) {
            showErrorToast('Resend Failed', err.message || 'Could not resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <RetroGrid>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, padding: 24 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <Pressable
                        onPress={() => router.back()}
                        className="flex-row items-center mb-4"
                    >
                        <ArrowLeft size={24} color={theme.primary} />
                        <Text
                            className="font-semibold ml-2"
                            style={{ color: theme.primary }}
                        >
                            Back
                        </Text>
                    </Pressable>

                    {/* Icon & Title */}
                    <View className="items-center mb-8 mt-4">
                        <View
                            className="w-20 h-20 rounded-full items-center justify-center mb-4"
                            style={{ backgroundColor: `${theme.primary}15` }}
                        >
                            <Mail size={40} color={theme.primary} />
                        </View>
                        <Text
                            className="text-2xl font-bold text-center"
                            style={{ color: theme.foreground }}
                        >
                            Check Your Email
                        </Text>
                        <Text
                            className="text-sm text-center mt-2"
                            style={{ color: theme.mutedForeground }}
                        >
                            We've sent a 6-digit code to
                        </Text>
                        <Text
                            className="text-sm font-semibold text-center"
                            style={{ color: theme.primary }}
                        >
                            {email}
                        </Text>
                    </View>

                    {/* OTP Card */}
                    <View
                        className="rounded-xl border-2 p-6 mb-6"
                        style={{
                            backgroundColor: theme.card,
                            borderColor: theme.primary,
                            ...shadows.retro,
                        }}
                    >
                        <Text
                            className="text-sm font-semibold mb-2 text-center"
                            style={{ color: theme.mutedForeground }}
                        >
                            Verification Code
                        </Text>

                        {/* OTP Input */}
                        <TextInput
                            className="rounded-lg border-2 px-4 py-4 text-2xl text-center tracking-widest font-bold mb-6"
                            style={{
                                backgroundColor: theme.input,
                                borderColor: theme.border,
                                color: theme.foreground,
                            }}
                            placeholder="000000"
                            placeholderTextColor={theme.mutedForeground}
                            value={otp}
                            onChangeText={(text) => {
                                setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                            }}
                            keyboardType="number-pad"
                            maxLength={6}
                            editable={!loading}
                            autoFocus
                        />

                        {/* Verify Button */}
                        <Pressable
                            className={`flex-row items-center justify-center py-4 rounded-lg mb-4 ${loading ? 'opacity-50' : ''}`}
                            style={{ backgroundColor: theme.primary }}
                            onPress={handleVerifyOtp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.primaryForeground} />
                            ) : (
                                <>
                                    <CheckCircle2 size={20} color={theme.primaryForeground} />
                                    <Text
                                        className="text-lg font-bold ml-2"
                                        style={{ color: theme.primaryForeground }}
                                    >
                                        Verify Email
                                    </Text>
                                </>
                            )}
                        </Pressable>

                        {/* Divider */}
                        <View className="flex-row items-center my-4">
                            <View className="flex-1 h-[1px]" style={{ backgroundColor: theme.border }} />
                            <Text className="mx-3 text-sm" style={{ color: theme.mutedForeground }}>or</Text>
                            <View className="flex-1 h-[1px]" style={{ backgroundColor: theme.border }} />
                        </View>

                        {/* Resend Button */}
                        <Pressable
                            className={`flex-row items-center justify-center py-3 rounded-lg border-2 ${resending ? 'opacity-50' : ''}`}
                            style={{
                                borderColor: theme.primary,
                                backgroundColor: theme.card,
                            }}
                            onPress={handleResendOtp}
                            disabled={resending || loading}
                        >
                            {resending ? (
                                <ActivityIndicator size="small" color={theme.primary} />
                            ) : (
                                <>
                                    <RefreshCw size={18} color={theme.primary} />
                                    <Text
                                        className="text-base font-semibold ml-2"
                                        style={{ color: theme.primary }}
                                    >
                                        Resend Code
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    {/* Footer Tip */}
                    <View
                        className="rounded-lg border-2 p-4"
                        style={{
                            backgroundColor: `${theme.accent}10`,
                            borderColor: theme.accent,
                        }}
                    >
                        <Text
                            className="text-xs text-center"
                            style={{ color: theme.mutedForeground }}
                        >
                            💡 Check your spam folder if you don't see the email
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </RetroGrid>
    );
}
