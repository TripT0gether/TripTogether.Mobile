import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Example data
const trips = [
    { id: '1', name: 'Tokyo Adventure', date: '2024-03-15' },
    { id: '2', name: 'Paris Getaway', date: '2024-04-20' },
    { id: '3', name: 'New York City', date: '2024-05-10' },
];

export default function TripsScreen() {
    const router = useRouter();

    const renderTrip = ({ item }: { item: typeof trips[0] }) => (
        <TouchableOpacity
            className="bg-white p-4 rounded-lg mb-3 shadow-sm"
            onPress={() => router.push(`/trips/${item.id}`)}
        >
            <Text className="text-lg font-semibold text-gray-800 mb-1">
                {item.name}
            </Text>
            <Text className="text-sm text-gray-600">
                {item.date}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-100">
            <FlatList
                data={trips}
                renderItem={renderTrip}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
            />
        </View>
    );
}

