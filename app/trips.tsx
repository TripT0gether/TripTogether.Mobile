import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
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
            style={styles.tripCard}
            onPress={() => router.push(`/trips/${item.id}`)}
        >
            <Text style={styles.tripName}>{item.name}</Text>
            <Text style={styles.tripDate}>{item.date}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={trips}
                renderItem={renderTrip}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    list: {
        padding: 16,
    },
    tripCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tripName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    tripDate: {
        fontSize: 14,
        color: '#666',
    },
});
