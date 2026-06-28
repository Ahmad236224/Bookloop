import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HelpSupportScreen = () => {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.navigate('/(seller)/profile')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 24 }} />
            </View>
            <View style={styles.content}>
                <Text style={styles.text}>Contact us at support@bookcycle.com</Text>
                <Text style={styles.subtext}>Version 1.0.0</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#1A1A1A' },
    content: { flex: 1, padding: 20, alignItems: 'center', paddingTop: 50 },
    text: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#333' },
    subtext: { marginTop: 10, fontSize: 14, fontFamily: 'Poppins_400Regular', color: '#757575' }
});

export default HelpSupportScreen;
