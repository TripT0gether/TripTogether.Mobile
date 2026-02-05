import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Animated,
    StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services/authService';
import { showErrorToast, showSuccessToast } from '../../src/utils/toast';
import { Mail, User, Lock, Eye, EyeOff, ArrowLeft, Check, X, ChevronRight } from 'lucide-react-native';
import RetroGrid from '../../src/components/RetroGrid';
import { theme, shadows, fonts } from '../../src/constants/theme';

// Step configuration
const STEPS = [
    { icon: Mail, title: "What's your email?", subtitle: 'We\'ll send you a verification code' },
    { icon: User, title: 'Create your profile', subtitle: 'Pick a username and tell us about you' },
    { icon: Lock, title: 'Secure your account', subtitle: 'Create a strong password' },
];

export default function RegisterScreen() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [gender, setGender] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const animateTransition = useCallback((callback: () => void) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
        }).start(() => {
            callback();
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            }).start();
        });
    }, [fadeAnim]);

    const handleNext = useCallback(() => {
        if (step === 0) {
            if (!email) {
                showErrorToast('Missing Email', 'Please enter your email');
                return;
            }
            if (!validateEmail(email)) {
                showErrorToast('Invalid Email', 'Please enter a valid email address');
                return;
            }
        }

        if (step === 1) {
            if (!username) {
                showErrorToast('Missing Username', 'Please choose a username');
                return;
            }
            if (username.length < 3) {
                showErrorToast('Username Too Short', 'At least 3 characters needed');
                return;
            }
        }

        animateTransition(() => setStep(s => s + 1));
    }, [step, email, username, animateTransition]);

    const handleBack = useCallback(() => {
        if (step > 0) {
            animateTransition(() => setStep(s => s - 1));
        } else {
            router.back();
        }
    }, [step, animateTransition, router]);

    const handleRegister = async () => {
        if (!password) {
            showErrorToast('Missing Password', 'Please create a password');
            return;
        }
        if (password.length < 6) {
            showErrorToast('Weak Password', 'At least 6 characters needed');
            return;
        }
        if (password !== confirmPassword) {
            showErrorToast('Password Mismatch', 'Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await authService.register({
                email,
                username,
                password,
                gender,
            });

            showSuccessToast('Account Created!', 'Check your email for verification');
            router.push({
                pathname: '/(auth)/verify-otp',
                params: { email },
            });
        } catch (err: any) {
            showErrorToast('Registration Failed', err.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    const StepIcon = STEPS[step].icon;
    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordsDontMatch = password && confirmPassword && password !== confirmPassword;

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
                        onPress={handleBack}
                        className="flex-row items-center mb-4"
                    >
                        <ArrowLeft size={24} color={theme.primary} />
                        <Text style={styles.backText}>
                            Back
                        </Text>
                    </Pressable>

                    {/* Progress Dots */}
                    <View className="flex-row justify-center items-center gap-2 mb-8">
                        {STEPS.map((_, index) => (
                            <View
                                key={index}
                                className="h-2 rounded-full"
                                style={{
                                    width: index === step ? 24 : 8,
                                    backgroundColor: index <= step ? theme.primary : theme.border,
                                }}
                            />
                        ))}
                    </View>

                    {/* Step Content */}
                    <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
                        {/* Icon & Title */}
                        <View className="items-center mb-8">
                            <View
                                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                                style={{ backgroundColor: `${theme.primary}15` }}
                            >
                                <StepIcon size={40} color={theme.primary} />
                            </View>
                            <Text style={styles.stepTitle}>
                                {STEPS[step].title}
                            </Text>
                            <Text style={styles.stepSubtitle}>
                                {STEPS[step].subtitle}
                            </Text>
                        </View>

                        {/* Step Form */}
                        <View
                            className="rounded-xl border-2 p-6 mb-6"
                            style={{
                                backgroundColor: theme.card,
                                borderColor: theme.primary,
                                ...shadows.retro,
                            }}
                        >
                            {/* Step 0: Email */}
                            {step === 0 && (
                                <View
                                    className="flex-row items-center rounded-lg border-2 px-4"
                                    style={{
                                        backgroundColor: theme.input,
                                        borderColor: theme.border,
                                    }}
                                >
                                    <Mail size={20} color={theme.mutedForeground} />
                                    <TextInput
                                        className="flex-1 py-4 px-3 text-lg"
                                        style={styles.input}
                                        placeholder="your@email.com"
                                        placeholderTextColor={theme.mutedForeground}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoFocus
                                    />
                                </View>
                            )}

                            {/* Step 1: Profile */}
                            {step === 1 && (
                                <View className="gap-4">
                                    <View
                                        className="flex-row items-center rounded-lg border-2 px-4"
                                        style={{
                                            backgroundColor: theme.input,
                                            borderColor: theme.border,
                                        }}
                                    >
                                        <User size={20} color={theme.mutedForeground} />
                                        <TextInput
                                            className="flex-1 py-4 px-3 text-lg"
                                            style={styles.input}
                                            placeholder="Choose a username"
                                            placeholderTextColor={theme.mutedForeground}
                                            value={username}
                                            onChangeText={setUsername}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            autoFocus
                                        />
                                    </View>

                                    <View className="mt-2">
                                        <Text style={styles.genderLabel}>
                                            I am a...
                                        </Text>
                                        <View className="flex-row gap-3">
                                            <Pressable
                                                className="flex-1 py-4 rounded-xl border-2 items-center"
                                                style={{
                                                    borderColor: gender ? theme.primary : theme.border,
                                                    backgroundColor: gender ? `${theme.primary}15` : theme.card,
                                                }}
                                                onPress={() => setGender(true)}
                                            >
                                                <User size={32} color={gender ? theme.primary : theme.mutedForeground} />
                                                <Text style={[styles.genderText, gender && styles.genderTextActive]}>
                                                    Male
                                                </Text>
                                            </Pressable>
                                            <Pressable
                                                className="flex-1 py-4 rounded-xl border-2 items-center"
                                                style={{
                                                    borderColor: !gender ? theme.primary : theme.border,
                                                    backgroundColor: !gender ? `${theme.primary}15` : theme.card,
                                                }}
                                                onPress={() => setGender(false)}
                                            >
                                                <User size={32} color={!gender ? theme.primary : theme.mutedForeground} />
                                                <Text style={[styles.genderText, !gender && styles.genderTextActive]}>
                                                    Female
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Step 2: Password */}
                            {step === 2 && (
                                <View className="gap-4">
                                    <View>
                                        <View
                                            className="flex-row items-center rounded-lg border-2 px-4"
                                            style={{
                                                backgroundColor: theme.input,
                                                borderColor: theme.border,
                                            }}
                                        >
                                            <Lock size={20} color={theme.mutedForeground} />
                                            <TextInput
                                                className="flex-1 py-4 px-3 text-lg"
                                                style={styles.input}
                                                placeholder="Create password"
                                                placeholderTextColor={theme.mutedForeground}
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry={!showPassword}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <Pressable onPress={() => setShowPassword(!showPassword)}>
                                                {showPassword
                                                    ? <Eye size={20} color={theme.mutedForeground} />
                                                    : <EyeOff size={20} color={theme.mutedForeground} />
                                                }
                                            </Pressable>
                                        </View>
                                        <Text style={styles.helperText}>
                                            At least 6 characters
                                        </Text>
                                    </View>

                                    <View
                                        className="flex-row items-center rounded-lg border-2 px-4"
                                        style={{
                                            backgroundColor: theme.input,
                                            borderColor: theme.border,
                                        }}
                                    >
                                        <Lock size={20} color={theme.mutedForeground} />
                                        <TextInput
                                            className="flex-1 py-4 px-3 text-lg"
                                            style={styles.input}
                                            placeholder="Confirm password"
                                            placeholderTextColor={theme.mutedForeground}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>

                                    {/* Password match indicator */}
                                    {(passwordsMatch || passwordsDontMatch) && (
                                        <View className="flex-row items-center gap-2">
                                            {passwordsMatch
                                                ? <Check size={18} color={theme.accent} />
                                                : <X size={18} color={theme.destructive} />
                                            }
                                            <Text style={[styles.matchText, passwordsMatch && styles.matchTextSuccess, passwordsDontMatch && styles.matchTextError]}>
                                                {passwordsMatch ? 'Passwords match!' : 'Passwords don\'t match'}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Action Button */}
                        <Pressable
                            className={`flex-row items-center justify-center py-4 rounded-lg ${loading ? 'opacity-50' : ''}`}
                            style={{ backgroundColor: theme.primary }}
                            onPress={step < 2 ? handleNext : handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.primaryForeground} />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>
                                        {step < 2 ? 'Continue' : 'Create Account'}
                                    </Text>
                                    {step < 2 && <ChevronRight size={20} color={theme.primaryForeground} style={{ marginLeft: 4 }} />}
                                </>
                            )}
                        </Pressable>

                        {/* Login Link */}
                        <Pressable
                            className="items-center mt-6"
                            onPress={() => router.push('/(auth)/login')}
                            disabled={loading}
                        >
                            <Text style={styles.linkText}>
                                Already have an account?{' '}
                                <Text style={styles.linkTextBold}>
                                    Sign in
                                </Text>
                            </Text>
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </RetroGrid>
    );
}

const styles = StyleSheet.create({
    backText: {
        fontFamily: fonts.semiBold,
        marginLeft: 8,
        color: theme.primary,
        fontSize: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontFamily: fonts.bold,
        textAlign: 'center',
        color: theme.foreground,
    },
    stepSubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        textAlign: 'center',
        marginTop: 4,
        color: theme.mutedForeground,
    },
    input: {
        color: theme.foreground,
        fontFamily: fonts.regular,
    },
    genderLabel: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        marginBottom: 12,
        textAlign: 'center',
        color: theme.mutedForeground,
    },
    genderText: {
        fontSize: 16,
        fontFamily: fonts.semiBold,
        marginTop: 4,
        color: theme.mutedForeground,
    },
    genderTextActive: {
        color: theme.primary,
    },
    helperText: {
        fontSize: 12,
        fontFamily: fonts.regular,
        marginTop: 4,
        marginLeft: 4,
        color: theme.mutedForeground,
    },
    matchText: {
        fontSize: 14,
        fontFamily: fonts.regular,
    },
    matchTextSuccess: {
        color: theme.accent,
    },
    matchTextError: {
        color: theme.destructive,
    },
    buttonText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: theme.primaryForeground,
    },
    linkText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: theme.mutedForeground,
    },
    linkTextBold: {
        fontFamily: fonts.bold,
        color: theme.primary,
    },
});
