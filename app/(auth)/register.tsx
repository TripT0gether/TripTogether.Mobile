import React, { useState, useRef } from 'react';
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
import { Mail, User, Lock, Eye, EyeOff, ArrowLeft, Check, X } from 'lucide-react-native';

// Step configuration
const STEPS = [
    { icon: Mail, title: "What's your email?", subtitle: 'We\'ll send you a verification code' },
    { icon: User, title: 'Create your profile', subtitle: 'Pick a username and tell us about you' },
    { icon: Lock, title: 'Secure your account', subtitle: 'Create a strong password' },
];

export default function RegisterScreen() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        gender: true,
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const updateFormData = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const animateTransition = (callback: () => void) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        setTimeout(callback, 150);
    };

    const handleNext = () => {
        if (step === 0) {
            if (!formData.email) {
                showErrorToast('Missing Email', 'Please enter your email');
                return;
            }
            if (!validateEmail(formData.email)) {
                showErrorToast('Invalid Email', 'Please enter a valid email address');
                return;
            }
        }

        if (step === 1) {
            if (!formData.username) {
                showErrorToast('Missing Username', 'Please choose a username');
                return;
            }
            if (formData.username.length < 3) {
                showErrorToast('Username Too Short', 'At least 3 characters needed');
                return;
            }
        }

        animateTransition(() => setStep(step + 1));
    };

    const handleBack = () => {
        if (step > 0) {
            animateTransition(() => setStep(step - 1));
        } else {
            router.back();
        }
    };

    const handleRegister = async () => {
        if (!formData.password) {
            showErrorToast('Missing Password', 'Please create a password');
            return;
        }
        if (formData.password.length < 6) {
            showErrorToast('Weak Password', 'At least 6 characters needed');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            showErrorToast('Password Mismatch', 'Passwords do not match');
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

            showSuccessToast('Account Created!', 'Check your email for verification');
            router.push({
                pathname: '/(auth)/verify-otp',
                params: { email: formData.email },
            });
        } catch (err: any) {
            showErrorToast('Registration Failed', err.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    // Progress dots
    const ProgressDots = () => (
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
    );

    // Step 1: Email
    const EmailStep = () => (
        <View className="flex-1">
            <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                <Mail size={20} color="#7A6F65" />
                <TextInput
                    className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                    placeholder="your@email.com"
                    placeholderTextColor="#7A6F65"
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                />
            </View>
        </View>
    );

    // Step 2: Profile
    const ProfileStep = () => (
        <View className="flex-1 gap-4">
            <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                <User size={20} color="#7A6F65" />
                <TextInput
                    className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                    placeholder="Choose a username"
                    placeholderTextColor="#7A6F65"
                    value={formData.username}
                    onChangeText={(text) => updateFormData('username', text)}
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
                        className={`flex-1 py-4 rounded-xl border-2 ${formData.gender
                                ? 'border-[#7A5C47] bg-[#7A5C47]/10'
                                : 'border-[#D4CCC0] bg-[#FAF8F3]'
                            } items-center`}
                        onPress={() => updateFormData('gender', true)}
                    >
                        <User size={32} color={formData.gender ? '#7A5C47' : '#7A6F65'} />
                        <Text className={`text-base font-semibold mt-1 ${formData.gender ? 'text-[#7A5C47]' : 'text-[#7A6F65]'
                            }`}>
                            Male
                        </Text>
                    </Pressable>
                    <Pressable
                        className={`flex-1 py-4 rounded-xl border-2 ${!formData.gender
                                ? 'border-[#7A5C47] bg-[#7A5C47]/10'
                                : 'border-[#D4CCC0] bg-[#FAF8F3]'
                            } items-center`}
                        onPress={() => updateFormData('gender', false)}
                    >
                        <User size={32} color={!formData.gender ? '#7A5C47' : '#7A6F65'} />
                        <Text className={`text-base font-semibold mt-1 ${!formData.gender ? 'text-[#7A5C47]' : 'text-[#7A6F65]'
                            }`}>
                            Female
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );

    // Step 3: Password
    const PasswordStep = () => (
        <View className="flex-1 gap-4">
            <View>
                <View className="flex-row items-center bg-[#EDE9DF] border-2 border-[#D4CCC0] rounded-xl px-4">
                    <Lock size={20} color="#7A6F65" />
                    <TextInput
                        className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                        placeholder="Create password"
                        placeholderTextColor="#7A6F65"
                        value={formData.password}
                        onChangeText={(text) => updateFormData('password', text)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
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
                    className="flex-1 py-4 px-3 text-lg text-[#3D3530]"
                    placeholder="Confirm password"
                    placeholderTextColor="#7A6F65"
                    value={formData.confirmPassword}
                    onChangeText={(text) => updateFormData('confirmPassword', text)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            {formData.password && formData.confirmPassword && (
                <View className="flex-row items-center gap-2 mt-1">
                    {formData.password === formData.confirmPassword
                        ? <Check size={18} color="#6B8E4E" />
                        : <X size={18} color="#A85442" />
                    }
                    <Text className={`text-sm ${formData.password === formData.confirmPassword
                            ? 'text-[#6B8E4E]'
                            : 'text-[#A85442]'
                        }`}>
                        {formData.password === formData.confirmPassword
                            ? 'Passwords match!'
                            : 'Passwords don\'t match'}
                    </Text>
                </View>
            )}
        </View>
    );

    const renderStep = () => {
        switch (step) {
            case 0: return <EmailStep />;
            case 1: return <ProfileStep />;
            case 2: return <PasswordStep />;
            default: return null;
        }
    };

    const StepIcon = STEPS[step].icon;

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

                {/* Progress */}
                <ProgressDots />

                {/* Step Content */}
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
                        {renderStep()}
                    </View>

                    {/* Action Button */}
                    <Pressable
                        className={`bg-[#7A5C47] rounded-xl py-4 items-center ${loading ? 'opacity-50' : ''}`}
                        onPress={step < 2 ? handleNext : handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAF8F3" />
                        ) : (
                            <Text className="text-lg font-bold text-[#FAF8F3]">
                                {step < 2 ? 'Continue' : 'Create Account'}
                            </Text>
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
