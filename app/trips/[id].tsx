import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function TripDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    // In a real app, fetch trip data based on id
    const tripData = {
        id,
        name: 'Trip Details',
        description: 'This is a dynamic route example using Expo Router',
        date: '2024-03-15',
        location: 'Tokyo, Japan',
        participants: ['Alice', 'Bob', 'Charlie'],
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{tripData.name}</Text>
                <Text style={styles.subtitle}>Trip ID: {id}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.text}>{tripData.description}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <Text style={styles.text}>📅 Date: {tripData.date}</Text>
                <Text style={styles.text}>📍 Location: {tripData.location}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Participants</Text>
                {tripData.participants.map((participant, index) => (
                    <Text key={index} style={styles.text}>
                        👤 {participant}
                    </Text>
                ))}
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    💡 This demonstrates Expo Router's dynamic routing with [id].tsx
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#007AFF',
        padding: 20,
        paddingTop: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 12,
        marginHorizontal: 12,
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    text: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    infoBox: {
        backgroundColor: '#e3f2fd',
        padding: 16,
        margin: 12,
        borderRadius: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#1976d2',
    },
});
