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
import { showErrorToast, showSuccessToast } from '../../src/utils/toast';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        // Validation
        if (!email || !password) {
            showErrorToast('Missing Fields', 'Please fill in all fields');
            return;
        }

        if (!validateEmail(email)) {
            showErrorToast('Invalid Email', 'Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showErrorToast('Invalid Password', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await authService.login({ email, password });
            showSuccessToast('Welcome back!', 'Login successful');
            router.replace('/');
        } catch (err: any) {
            showErrorToast('Login Failed', err.message || 'Please check your credentials and try again');
        } finally {
            setLoading(false);
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
                        Group travel made simple
                    </Text>
                </View>

                {/* Login Card */}
                <View className="bg-[#FAF8F3] rounded-lg border-2 border-[#7A5C47] p-6 mb-6 shadow-lg">
                    <Text className="text-xl font-bold text-[#3D3530] mb-1">
                        Welcome Back
                    </Text>
                    <Text className="text-sm text-[#7A6F65] mb-6">
                        Sign in to continue your adventure
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
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    {/* Password Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-[#3D3530] mb-1">
                            Password
                        </Text>
                        <TextInput
                            className="bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-md px-3 py-3 text-base text-[#3D3530]"
                            placeholder="Enter your password"
                            placeholderTextColor="#7A6F65"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                    </View>

                    {/* Login Button */}
                    <Pressable
                        className={`bg-[#7A5C47] border-2 border-[#7A5C47] rounded-md py-3 px-6 items-center justify-center mt-3 ${loading ? 'opacity-50' : ''
                            }`}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAF8F3" />
                        ) : (
                            <Text className="text-base font-semibold text-[#FAF8F3]">
                                Sign In
                            </Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    <View className="flex-row items-center my-6">
                        <View className="flex-1 h-[1px] bg-[#D4CCC0]" />
                        <Text className="mx-3 text-sm text-[#7A6F65]">or</Text>
                        <View className="flex-1 h-[1px] bg-[#D4CCC0]" />
                    </View>

                    {/* Register Link */}
                    <Pressable
                        className="items-center"
                        onPress={() => router.push('/(auth)/register')}
                        disabled={loading}
                    >
                        <Text className="text-sm text-[#7A6F65]">
                            Don't have an account?{' '}
                            <Text className="font-bold text-[#7A5C47]">Create one</Text>
                        </Text>
                    </Pressable>
                </View>

                {/* Footer */}
                <Text className="text-xs text-[#7A6F65] text-center">
                    By signing in, you agree to our Terms of Service
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
