import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export const ProfileScreen: React.FC = () => {
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      <View style={styles.container} className="flex-1 px-4 py-6">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Profile Screen
        </Text>
        <Text className="text-gray-600">
          This is a placeholder profile screen. Customize it according to your needs.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
