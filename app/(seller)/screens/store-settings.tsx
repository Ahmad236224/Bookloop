import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const CustomToggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => {
    const translateX = useSharedValue(value ? 26 : 0);

    React.useEffect(() => {
        translateX.value = value ? 26 : 0;
    }, [value]);

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: withSpring(translateX.value) }],
    }));

    return (
        <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.8}>
            <View style={[
                styles.toggleContainer,
                { backgroundColor: value ? '#00695C' : '#E5E7EB' }
            ]}>
                <Animated.View style={[styles.toggleThumb, thumbStyle]} />
            </View>
        </TouchableOpacity>
    );
};

const PRIMARY_GREEN = '#00695C';

const StoreSettingsScreen = () => {
    const router = useRouter();
    const [storeName, setStoreName] = useState('');
    const [storeDescription, setStoreDescription] = useState('');
    const [vacationMode, setVacationMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchStoreData();
    }, []);

    const fetchStoreData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userDoc = await getDoc(doc(db, 'sellers', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setStoreName(data.storeName || '');
                setStoreDescription(data.storeDescription || '');
                setVacationMode(data.vacationMode || false);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching store data:", error);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            await setDoc(doc(db, 'sellers', user.uid), {
                storeName: storeName.trim(),
                storeDescription: storeDescription.trim(),
                vacationMode,
                updatedAt: new Date()
            }, { merge: true });

            Alert.alert("Success", "Store settings updated successfully");
            router.navigate('/(seller)/profile');
        } catch (error) {
            console.error("Error updating store settings:", error);
            Alert.alert("Error", "Failed to update store settings");
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
                <Text style={styles.headerTitle}>Store Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Store Name</Text>
                    <TextInput
                        style={styles.input}
                        value={storeName}
                        onChangeText={setStoreName}
                        placeholder="Enter your store name"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Store Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={storeDescription}
                        onChangeText={setStoreDescription}
                        placeholder="Tell buyers about your store..."
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingTitle}>Vacation Mode</Text>
                        <Text style={styles.settingDescription}>Temporarily pause new orders</Text>
                    </View>
                    <CustomToggle
                        value={vacationMode}
                        onValueChange={setVacationMode}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Settings</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    toggleContainer: {
        width: 52,
        height: 28,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 2,
        position: 'relative',
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        left: 2,
    },
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    content: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#1A1A1A',
    },
    textArea: {
        height: 100,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingVertical: 10,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    settingDescription: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginTop: 2,
    },
    saveButton: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default StoreSettingsScreen;
