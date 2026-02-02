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

export default function VerifyOtpScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email as string;

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const handleVerifyOtp = async () => {
        setError('');

        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            await authService.verifyOtp({ email, otp });
            // Navigate to login after successful verification
            router.replace('/(auth)/login');
        } catch (err: any) {
            setError(err.message || 'OTP verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setResendSuccess(false);
        setResending(true);

        try {
            await authService.resendOtp(email);
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-[#F5F1E8]"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, padding: 32, justifyContent: 'center' }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className="items-center mb-8">
                    <Text className="text-3xl font-bold text-[#7A5C47] mb-1">
                        TripTogether
                    </Text>
                    <Text className="text-sm text-[#7A6F65]">
                        Verify your email address
                    </Text>
                </View>

                {/* OTP Card */}
                <View className="bg-[#FAF8F3] rounded-lg border-2 border-[#7A5C47] p-6 mb-6 shadow-lg">
                    <Text className="text-xl font-bold text-[#3D3530] mb-1">
                        Check Your Email
                    </Text>
                    <Text className="text-sm text-[#7A6F65] mb-6">
                        We've sent a 6-digit code to{'\n'}
                        <Text className="font-semibold text-[#3D3530]">{email}</Text>
                    </Text>

                    {/* OTP Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Verification Code
                        </Text>
                        <TextInput
                            className={`bg-[#EDE9DF] border-2 ${error ? 'border-[#A85442]' : 'border-[#D4CCC0]'
                                } rounded-md px-3 py-3 text-base text-[#3D3530] text-center tracking-widest`}
                            placeholder="000000"
                            placeholderTextColor="#7A6F65"
                            value={otp}
                            onChangeText={(text) => {
                                setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                                setError('');
                            }}
                            keyboardType="number-pad"
                            maxLength={6}
                            editable={!loading}
                        />
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <Text className="text-sm text-[#A85442] mt-1 mb-2">{error}</Text>
                    ) : null}

                    {/* Success Message */}
                    {resendSuccess ? (
                        <Text className="text-sm text-[#6B8E4E] mt-1 mb-2">
                            OTP resent successfully!
                        </Text>
                    ) : null}

                    {/* Verify Button */}
                    <Pressable
                        className={`bg-[#7A5C47] border-2 border-[#7A5C47] rounded-md py-3 px-6 items-center justify-center mt-3 ${loading ? 'opacity-50' : ''
                            }`}
                        onPress={handleVerifyOtp}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAF8F3" />
                        ) : (
                            <Text className="text-base font-semibold text-[#FAF8F3]">
                                Verify Email
                            </Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    <View className="flex-row items-center my-6">
                        <View className="flex-1 h-[1px] bg-[#D4CCC0]" />
                        <Text className="mx-3 text-sm text-[#7A6F65]">or</Text>
                        <View className="flex-1 h-[1px] bg-[#D4CCC0]" />
                    </View>

                    {/* Resend OTP */}
                    <Pressable
                        className="items-center"
                        onPress={handleResendOtp}
                        disabled={resending || loading}
                    >
                        {resending ? (
                            <ActivityIndicator size="small" color="#7A5C47" />
                        ) : (
                            <Text className="text-sm text-[#7A6F65]">
                                Didn't receive the code?{' '}
                                <Text className="font-bold text-[#7A5C47]">Resend</Text>
                            </Text>
                        )}
                    </Pressable>
                </View>

                {/* Footer */}
                <Text className="text-xs text-[#7A6F65] text-center">
                    Check your spam folder if you don't see the email
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
