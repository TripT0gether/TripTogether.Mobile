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
import { useRouter } from 'expo-router';
import { authService } from '../../src/services/authService';

export default function RegisterScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        gender: true, // true = male, false = female
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleRegister = async () => {
        setError('');

        if (!formData.email || !formData.username || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (formData.username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await authService.register({
                email: formData.email,
                username: formData.username,
                password: formData.password,
                gender: formData.gender,
            });

            router.push({
                pathname: '/(auth)/verify-otp',
                params: { email: formData.email },
            });
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError('');
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-[#F5F1E8]"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, padding: 32, paddingTop: 32 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className="items-center mb-6">
                    <Text className="text-3xl font-bold text-[#7A5C47] mb-1">
                        TripTogether
                    </Text>
                    <Text className="text-sm text-[#7A6F65]">
                        Start your adventure today
                    </Text>
                </View>

                {/* Register Card */}
                <View className="bg-[#FAF8F3] rounded-lg border-2 border-[#7A5C47] p-6 mb-6 shadow-lg">
                    <Text className="text-xl font-bold text-[#3D3530] mb-1">
                        Create Account
                    </Text>
                    <Text className="text-sm text-[#7A6F65] mb-4">
                        Join the community and plan amazing trips
                    </Text>

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Email
                        </Text>
                        <TextInput
                            className="bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-md px-3 py-3 text-base text-[#3D3530]"
                            placeholder="your@email.com"
                            placeholderTextColor="#7A6F65"
                            value={formData.email}
                            onChangeText={(text) => updateFormData('email', text)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    {/* Username Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Username
                        </Text>
                        <TextInput
                            className="bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-md px-3 py-3 text-base text-[#3D3530]"
                            placeholder="Choose a username"
                            placeholderTextColor="#7A6F65"
                            value={formData.username}
                            onChangeText={(text) => updateFormData('username', text)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    {/* Gender Selection */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Gender
                        </Text>
                        <View className="flex-row gap-2">
                            <Pressable
                                className={`flex-1 py-3 rounded-md border-2 ${formData.gender
                                        ? 'border-[#7A5C47] bg-[#7A5C471A]'
                                        : 'border-[#D4CCC0] bg-[#FAF8F3]'
                                    } items-center`}
                                onPress={() => updateFormData('gender', true)}
                                disabled={loading}
                            >
                                <Text
                                    className={`text-base font-semibold ${formData.gender ? 'text-[#7A5C47]' : 'text-[#7A6F65]'
                                        }`}
                                >
                                    Male
                                </Text>
                            </Pressable>
                            <Pressable
                                className={`flex-1 py-3 rounded-md border-2 ${!formData.gender
                                        ? 'border-[#7A5C47] bg-[#7A5C471A]'
                                        : 'border-[#D4CCC0] bg-[#FAF8F3]'
                                    } items-center`}
                                onPress={() => updateFormData('gender', false)}
                                disabled={loading}
                            >
                                <Text
                                    className={`text-base font-semibold ${!formData.gender ? 'text-[#7A5C47]' : 'text-[#7A6F65]'
                                        }`}
                                >
                                    Female
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Password Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Password
                        </Text>
                        <TextInput
                            className="bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-md px-3 py-3 text-base text-[#3D3530]"
                            placeholder="At least 6 characters"
                            placeholderTextColor="#7A6F65"
                            value={formData.password}
                            onChangeText={(text) => updateFormData('password', text)}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    {/* Confirm Password Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Confirm Password
                        </Text>
                        <TextInput
                            className="bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-md px-3 py-3 text-base text-[#3D3530]"
                            placeholder="Re-enter your password"
                            placeholderTextColor="#7A6F65"
                            value={formData.confirmPassword}
                            onChangeText={(text) => updateFormData('confirmPassword', text)}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <Text className="text-sm text-[#A85442] mt-1 mb-2">{error}</Text>
                    ) : null}

                    {/* Register Button */}
                    <Pressable
                        className={`bg-[#7A5C47] border-2 border-[#7A5C47] rounded-md py-3 px-6 items-center justify-center mt-3 ${loading ? 'opacity-50' : ''
                            }`}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAF8F3" />
                        ) : (
                            <Text className="text-base font-semibold text-[#FAF8F3]">
                                Create Account
                            </Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    <View className="flex-row items-center my-6">
                        <View className="flex-1 h-[1px] bg-[#D4CCC0]" />
                        <Text className="mx-3 text-sm text-[#7A6F65]">or</Text>
                        <View className="flex-1 h-[1px] bg-[#D4CCC0]" />
                    </View>

                    {/* Login Link */}
                    <Pressable
                        className="items-center"
                        onPress={() => router.push('/(auth)/login')}
                        disabled={loading}
                    >
                        <Text className="text-sm text-[#7A6F65]">
                            Already have an account?{' '}
                            <Text className="font-bold text-[#7A5C47]">Sign in</Text>
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
