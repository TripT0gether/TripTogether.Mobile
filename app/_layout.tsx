import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import {
  useFonts,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

// Theme colors
const colors = {
  background: '#F9F6F0',
  primary: '#A0462D',
  secondary: '#7B9B7D',
  foreground: '#2B1810',
  mutedForeground: '#6B5D52',
  card: '#FFFCF7',
};

// Error fallback component
function ErrorFallback({ error }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
    </View>
  );
}

// Custom Toast Configuration
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#5A8F5E',
        borderLeftWidth: 6,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: '#5A8F5E',
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: colors.foreground,
      }}
      text2Style={{
        fontSize: 14,
        color: colors.mutedForeground,
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#C84B3E',
        borderLeftWidth: 6,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: '#C84B3E',
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: colors.foreground,
      }}
      text2Style={{
        fontSize: 14,
        color: colors.mutedForeground,
      }}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: '#5B7F8A',
        borderLeftWidth: 6,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: '#5B7F8A',
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: colors.foreground,
      }}
      text2Style={{
        fontSize: 14,
        color: colors.mutedForeground,
      }}
    />
  ),
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide splash screen once fonts are loaded (or if there's an error)
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show loading screen while fonts are loading
  if (!fontsLoaded && !fontError) {
    return null; // Splash screen will be visible
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontFamily: fontsLoaded ? 'IBMPlexMono_700Bold' : undefined,
            fontWeight: '700',
          },
          headerShadowVisible: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{
            title: 'Sign In',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{
            title: 'Create Account',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="(auth)/verify-otp"
          options={{
            title: 'Verify Email',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
      <Toast config={toastConfig} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C84B3E',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
