import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const PRIMARY_GREEN = '#00695C';
const WALLET_PROVIDERS = ['Easypaisa', 'JazzCash', 'Meezan Bank', 'HBL', 'Nayapay', 'Sadapay'];

const PaymentMethodsScreen = () => {
    const router = useRouter();
    const [provider, setProvider] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, 'sellers', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProvider(data.walletProvider || '');
                setAccountName(data.walletAccountName || '');
                setAccountNumber(data.walletAccountNumber || '');
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const handleSave = async () => {
        if (!provider || !accountName || !accountNumber) {
            Alert.alert('Error', 'Please fill in all wallet details');
            return;
        }

        setSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            await setDoc(doc(db, 'sellers', user.uid), {
                walletProvider: provider.trim(),
                walletAccountName: accountName.trim(),
                walletAccountNumber: accountNumber.trim(),
                updatedAt: new Date()
            }, { merge: true });
            Alert.alert('Success', 'Wallet configuration saved successfully', [
                { text: 'OK', onPress: () => router.navigate('/(seller)/profile') }
            ]);
        } catch (error) {
            console.error("Error updating wallet:", error);
            Alert.alert('Error', 'Failed to save wallet configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.navigate('/(seller)/profile')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wallet</Text>
                <View style={{ width: 24 }} />
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.sectionDescription}>
                        Configure your digital wallet or bank account to receive payouts.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Provider (Bank/Easypaisa)</Text>
                        <View style={styles.chipsContainer}>
                            {WALLET_PROVIDERS.map(p => (
                                <TouchableOpacity 
                                    key={p} 
                                    style={[styles.chip, provider === p && styles.chipActive]}
                                    onPress={() => setProvider(p)}
                                >
                                    <Text style={[styles.chipText, provider === p && styles.chipTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account Title / Name</Text>
                        <TextInput
                            style={styles.input}
                            value={accountName}
                            onChangeText={setAccountName}
                            placeholder="e.g. John Doe"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Account / IBAN Number</Text>
                        <TextInput
                            style={styles.input}
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                            placeholder="e.g. 03001234567 or PK..."
                            keyboardType="default"
                        />
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Configuration</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
        borderBottomWidth: 1, borderBottomColor: '#EEE'
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#1A1A1A' },
    content: { padding: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    sectionDescription: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: '#757575', marginBottom: 25 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#333', marginBottom: 8 },
    input: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0',
        borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12,
        fontSize: 16, fontFamily: 'Poppins_400Regular', color: '#1A1A1A'
    },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEEEEE'
    },
    chipActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
    chipText: { fontSize: 13, color: '#757575', fontFamily: 'Poppins_400Regular' },
    chipTextActive: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' },
    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE' },
    saveButton: {
        backgroundColor: PRIMARY_GREEN, borderRadius: 12, paddingVertical: 15,
        alignItems: 'center', justifyContent: 'center'
    },
    saveButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins_600SemiBold' }
});

export default PaymentMethodsScreen;
