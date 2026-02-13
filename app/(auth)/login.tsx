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
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';
import { authService } from '../../src/services/authService';
import { showErrorToast, showSuccessToast } from '../../src/utils/toast';
import RetroGrid from '../../src/components/RetroGrid';
import { theme, shadows, fonts } from '../../src/constants/theme';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showErrorToast('Missing Fields', 'Please fill in all fields');
            return;
        }

        if (!validateEmail(email)) {
            showErrorToast('Invalid Email', 'Please enter a valid email address');
            return;
        }

        // if (password.length < 6) {
        //     showErrorToast('Invalid Password', 'Password must be at least 6 characters');
        //     return;
        // }

        setLoading(true);

        try {
            await authService.login({ email, password });
            showSuccessToast('Welcome back!', 'Login successful');
            router.replace('/');
        } catch (err: any) {
            showErrorToast('Login Failed', err.message || 'Please check your credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <RetroGrid>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="items-center mb-8">
                        <Text style={styles.appTitle}>
                            TripTogether
                        </Text>
                        <Text style={styles.appSubtitle}>
                            Group travel made simple
                        </Text>
                    </View>

                    {/* Login Card */}
                    <View
                        className="rounded-xl border-2 p-6 mb-6"
                        style={{
                            backgroundColor: theme.card,
                            borderColor: theme.primary,
                            ...shadows.retro,
                        }}
                    >
                        <View className="flex-row items-center gap-3 mb-2">
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center"
                                style={{ backgroundColor: `${theme.primary}15` }}
                            >
                                <LogIn size={20} color={theme.primary} />
                            </View>
                            <Text style={styles.cardTitle}>
                                Welcome Back
                            </Text>
                        </View>
                        <Text style={styles.cardSubtitle}>
                            Sign in to continue your adventure
                        </Text>

                        {/* Email Input */}
                        <View className="mb-4">
                            <Text style={styles.inputLabel}>
                                Email
                            </Text>
                            <View
                                className="flex-row items-center rounded-lg border-2 px-4"
                                style={{
                                    backgroundColor: theme.input,
                                    borderColor: theme.border,
                                }}
                            >
                                <Mail size={18} color={theme.mutedForeground} />
                                <TextInput
                                    className="flex-1 py-3 px-3 text-base"
                                    style={styles.input}
                                    placeholder="your@email.com"
                                    placeholderTextColor={theme.mutedForeground}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View className="mb-6">
                            <Text style={styles.inputLabel}>
                                Password
                            </Text>
                            <View
                                className="flex-row items-center rounded-lg border-2 px-4"
                                style={{
                                    backgroundColor: theme.input,
                                    borderColor: theme.border,
                                }}
                            >
                                <Lock size={18} color={theme.mutedForeground} />
                                <TextInput
                                    className="flex-1 py-3 px-3 text-base"
                                    style={styles.input}
                                    placeholder="Enter password"
                                    placeholderTextColor={theme.mutedForeground}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword
                                        ? <Eye size={18} color={theme.mutedForeground} />
                                        : <EyeOff size={18} color={theme.mutedForeground} />
                                    }
                                </Pressable>
                            </View>
                        </View>

                        {/* Login Button */}
                        <Pressable
                            onPress={handleLogin}
                            disabled={loading}
                            className={`flex-row items-center justify-center py-4 rounded-lg ${loading ? 'opacity-50' : ''}`}
                            style={{ backgroundColor: theme.primary }}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.primaryForeground} />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Sign In
                                </Text>
                            )}
                        </Pressable>
                    </View>

                    {/* Register Link */}
                    <View className="items-center">
                        <Text style={styles.linkSubtext}>
                            Don't have an account?{' '}
                        </Text>
                        <Pressable
                            onPress={() => router.push('/(auth)/register')}
                            disabled={loading}
                            className="mt-1"
                        >
                            <Text style={styles.linkText}>
                                Create one
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </RetroGrid>
    );
}

const styles = StyleSheet.create({
    appTitle: {
        fontSize: 30,
        fontFamily: fonts.bold,
        color: theme.primary,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    appSubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    cardTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: theme.foreground,
    },
    cardSubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: theme.mutedForeground,
        marginBottom: 8,
    },
    input: {
        color: theme.foreground,
        fontFamily: fonts.regular,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    linkSubtext: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    linkText: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: theme.primary,
    },
});
