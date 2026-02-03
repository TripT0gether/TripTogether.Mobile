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
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services/authService';
import { showErrorToast, showSuccessToast } from '../../src/utils/toast';
import { Mail, User, Lock, Eye, EyeOff, ArrowLeft, Check, X, ChevronRight } from 'lucide-react-native';

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

    // Refs for inputs
    const emailRef = useRef<TextInput>(null);
    const usernameRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmPasswordRef = useRef<TextInput>(null);

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
        <KeyboardAvoidingView
            className="flex-1 bg-[#F5F1E8]"
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
                    <ArrowLeft size={24} color="#7A5C47" />
                    <Text className="text-[#7A5C47] font-semibold ml-2">Back</Text>
                </Pressable>

                {/* Progress Dots */}
                <View className="flex-row justify-center items-center gap-2 mb-8">
                    {STEPS.map((_, index) => (
                        <View
                            key={index}
                            className={`h-2 rounded-full ${index === step
                                    ? 'bg-[#7A5C47] w-6'
                                    : index < step
                                        ? 'bg-[#7A5C47] w-2'
                                        : 'bg-[#D4CCC0] w-2'
                                }`}
                        />
                    ))}
                </View>

                {/* Step Content - Animated */}
                <Animated.View style={{ opacity: fadeAnim }} className="flex-1">
                    {/* Icon & Title */}
                    <View className="items-center mb-8">
                        <View className="w-20 h-20 rounded-full bg-[#7A5C47]/10 items-center justify-center mb-4">
                            <StepIcon size={40} color="#7A5C47" />
                        </View>
                        <Text className="text-2xl font-bold text-[#3D3530] text-center">
                            {STEPS[step].title}
                        </Text>
                        <Text className="text-sm text-[#7A6F65] text-center mt-1">
                            {STEPS[step].subtitle}
                        </Text>
                    </View>

                    {/* Step Form */}
                    <View className="bg-[#FAF8F3] rounded-2xl border-2 border-[#7A5C47] p-6 mb-6">

                        {/* Step 0: Email */}
                        {step === 0 && (
                            <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                                <Mail size={20} color="#7A6F65" />
                                <TextInput
                                    ref={emailRef}
                                    className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                                    placeholder="your@email.com"
                                    placeholderTextColor="#7A6F65"
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
                                <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                                    <User size={20} color="#7A6F65" />
                                    <TextInput
                                        ref={usernameRef}
                                        className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                                        placeholder="Choose a username"
                                        placeholderTextColor="#7A6F65"
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoFocus
                                    />
                                </View>

                                <View className="mt-2">
                                    <Text className="text-sm font-semibold text-[#7A6F65] mb-3 text-center">
                                        I am a...
                                    </Text>
                                    <View className="flex-row gap-3">
                                        <Pressable
                                            className={`flex-1 py-4 rounded-xl border-2 ${gender
                                                    ? 'border-[#7A5C47] bg-[#7A5C47]/10'
                                                    : 'border-[#D4CCC0] bg-[#FAF8F3]'
                                                } items-center`}
                                            onPress={() => setGender(true)}
                                        >
                                            <User size={32} color={gender ? '#7A5C47' : '#7A6F65'} />
                                            <Text className={`text-base font-semibold mt-1 ${gender ? 'text-[#7A5C47]' : 'text-[#7A6F65]'
                                                }`}>
                                                Male
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            className={`flex-1 py-4 rounded-xl border-2 ${!gender
                                                    ? 'border-[#7A5C47] bg-[#7A5C47]/10'
                                                    : 'border-[#D4CCC0] bg-[#FAF8F3]'
                                                } items-center`}
                                            onPress={() => setGender(false)}
                                        >
                                            <User size={32} color={!gender ? '#7A5C47' : '#7A6F65'} />
                                            <Text className={`text-base font-semibold mt-1 ${!gender ? 'text-[#7A5C47]' : 'text-[#7A6F65]'
                                                }`}>
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
                                    <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                                        <Lock size={20} color="#7A6F65" />
                                        <TextInput
                                            ref={passwordRef}
                                            className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                                            placeholder="Create password"
                                            placeholderTextColor="#7A6F65"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <Pressable onPress={() => setShowPassword(!showPassword)}>
                                            {showPassword
                                                ? <Eye size={20} color="#7A6F65" />
                                                : <EyeOff size={20} color="#7A6F65" />
                                            }
                                        </Pressable>
                                    </View>
                                    <Text className="text-xs text-[#7A6F65] mt-1 ml-1">
                                        At least 6 characters
                                    </Text>
                                </View>

                                <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                                    <Lock size={20} color="#7A6F65" />
                                    <TextInput
                                        ref={confirmPasswordRef}
                                        className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                                        placeholder="Confirm password"
                                        placeholderTextColor="#7A6F65"
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
                                            ? <Check size={18} color="#6B8E4E" />
                                            : <X size={18} color="#A85442" />
                                        }
                                        <Text className={`text-sm ${passwordsMatch ? 'text-[#6B8E4E]' : 'text-[#A85442]'}`}>
                                            {passwordsMatch ? 'Passwords match!' : 'Passwords don\'t match'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Action Button */}
                    <Pressable
                        className={`bg-[#7A5C47] rounded-xl py-4 flex-row items-center justify-center ${loading ? 'opacity-50' : ''}`}
                        onPress={step < 2 ? handleNext : handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAF8F3" />
                        ) : (
                            <>
                                <Text className="text-lg font-bold text-[#FAF8F3]">
                                    {step < 2 ? 'Continue' : 'Create Account'}
                                </Text>
                                {step < 2 && <ChevronRight size={20} color="#FAF8F3" className="ml-1" />}
                            </>
                        )}
                    </Pressable>

                    {/* Login Link */}
                    <Pressable
                        className="items-center mt-6"
                        onPress={() => router.push('/(auth)/login')}
                        disabled={loading}
                    >
                        <Text className="text-sm text-[#7A6F65]">
                            Already have an account?{' '}
                            <Text className="font-bold text-[#7A5C47]">Sign in</Text>
                        </Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
