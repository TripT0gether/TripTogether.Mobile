import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { useApi } from '../hooks/useApi';
import { apiService } from '../services/api';

export const HomeScreen: React.FC = () => {
  const router = useRouter();
  
  // Example API call - replace with your actual endpoint
  // Commented out to avoid errors until API is configured
  // const { data, loading, error, refetch } = useApi(
  //   () => apiService.get('/example'), // Replace with your actual endpoint
  //   []
  // );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      <ScrollView 
        contentContainerStyle={styles.container}
        className="flex-1 px-4 py-6"
      >
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to TripTogether
          </Text>
          <Text className="text-gray-600 text-center">
            Your mobile app is ready to connect to the .NET API
          </Text>
        </View>

        <View className="w-full space-y-4">
          <Button
            title="Go to Profile"
            onPress={() => router.push('/profile')}
            variant="primary"
          />
          
          <Button
            title="Test API Connection"
            onPress={() => {
              // Example API call - uncomment and configure when ready
              // refetch();
              console.log('API test - configure your endpoint first');
            }}
            variant="outline"
          />
        </View>

        <View className="mt-8 p-4 bg-blue-50 rounded-lg">
          <Text className="text-blue-900 font-semibold mb-2">
            Setup Instructions:
          </Text>
          <Text className="text-blue-800 text-sm">
            1. Update API_BASE_URL in src/services/api.ts{'\n'}
            2. Configure your .NET API endpoints{'\n'}
            3. Add your screens and components{'\n'}
            4. Customize the styling with Tailwind classes
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
});
