import React from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text, StyleSheet } from 'react-native';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
    </View>
  );
}

// Custom Toast Configuration with Retro Styling
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#6B8E4E',
        borderLeftWidth: 6,
        backgroundColor: '#FAF8F3',
        borderWidth: 2,
        borderColor: '#6B8E4E',
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: '#3D3530',
      }}
      text2Style={{
        fontSize: 14,
        color: '#7A6F65',
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#A85442',
        borderLeftWidth: 6,
        backgroundColor: '#FAF8F3',
        borderWidth: 2,
        borderColor: '#A85442',
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: '#3D3530',
      }}
      text2Style={{
        fontSize: 14,
        color: '#7A6F65',
      }}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{
        borderLeftColor: '#5B7F8A',
        borderLeftWidth: 6,
        backgroundColor: '#FAF8F3',
        borderWidth: 2,
        borderColor: '#5B7F8A',
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '700',
        color: '#3D3530',
      }}
      text2Style={{
        fontSize: 14,
        color: '#7A6F65',
      }}
    />
  ),
};

export default function RootLayout() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FAF8F3',
          },
          headerTintColor: '#7A5C47',
          headerTitleStyle: {
            fontWeight: 'bold',
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
      {/* Toast component */}
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
    backgroundColor: '#F5F1E8',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A85442',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7A6F65',
    textAlign: 'center',
  },
});
