import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const PRIMARY_GREEN = '#000000';

const PaymentMethodsScreen = () => {
    const router = useRouter();
    const [easypaisaNumber, setEasypaisaNumber] = useState('');
    const [jazzcashNumber, setJazzcashNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settingUp, setSettingUp] = useState<'easypaisa' | 'jazzcash' | null>(null);
    const [setupStep, setSetupStep] = useState(1);
    const [tempNumber, setTempNumber] = useState('');
    const [otp, setOtp] = useState('');

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setEasypaisaNumber(data.easypaisaNumber || '');
                setJazzcashNumber(data.jazzcashNumber || '');
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                easypaisaNumber: easypaisaNumber.trim(),
                jazzcashNumber: jazzcashNumber.trim(),
                updatedAt: new Date()
            });
            Alert.alert('Success', 'Payment methods updated successfully');
        } catch (error) {
            console.error("Error updating payment methods:", error);
            Alert.alert('Error', 'Failed to update payment methods');
        } finally {
            setSaving(false);
        }
    };

    const startSetup = (method: 'easypaisa' | 'jazzcash') => {
        setSettingUp(method);
        setSetupStep(1);
        setTempNumber('');
        setOtp('');
    };

    const completeSetup = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            if (settingUp === 'easypaisa') {
                await updateDoc(doc(db, 'users', user.uid), {
                    easypaisaNumber: tempNumber.trim(),
                    updatedAt: new Date()
                });
                setEasypaisaNumber(tempNumber.trim());
            } else {
                await updateDoc(doc(db, 'users', user.uid), {
                    jazzcashNumber: tempNumber.trim(),
                    updatedAt: new Date()
                });
                setJazzcashNumber(tempNumber.trim());
            }
            Alert.alert('Success', `${settingUp === 'easypaisa' ? 'Easypaisa' : 'Jazzcash'} setup complete!`);
            setSettingUp(null);
            setSetupStep(1);
        } catch (error) {
            console.error("Error completing setup:", error);
            Alert.alert('Error', 'Failed to complete setup');
        }
    };

    const cancelSetup = () => {
        setSettingUp(null);
        setSetupStep(1);
        setTempNumber('');
        setOtp('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => settingUp ? cancelSetup() : router.push('/(buyer)/profile')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {settingUp ? `Set Up ${settingUp === 'easypaisa' ? 'Easypaisa' : 'Jazzcash'}` : 'Payment Methods'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : settingUp ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Setup Wizard */}
                        <View style={styles.stepIndicator}>
                            <View style={[styles.stepDot, setupStep >= 1 && styles.activeStepDot]} />
                            <View style={[styles.stepLine, setupStep >= 2 && styles.activeStepLine]} />
                            <View style={[styles.stepDot, setupStep >= 2 && styles.activeStepDot]} />
                        </View>

                        {setupStep === 1 ? (
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Enter Your Number</Text>
                                <Text style={styles.stepDescription}>
                                    Enter your {settingUp === 'easypaisa' ? 'Easypaisa' : 'Jazzcash'} mobile number to get started
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={tempNumber}
                                    onChangeText={setTempNumber}
                                    placeholder="03XX-XXXXXXX"
                                    keyboardType="phone-pad"
                                    autoFocus
                                />
                                <TouchableOpacity
                                    style={[styles.continueButton, !tempNumber && styles.disabledButton]}
                                    onPress={() => setSetupStep(2)}
                                    disabled={!tempNumber}
                                >
                                    <Text style={styles.continueButtonText}>Send OTP</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Verify OTP</Text>
                                <Text style={styles.stepDescription}>
                                    We've sent a dummy OTP to your number (enter any 4-digit number)
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholder="1234"
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    autoFocus
                                />
                                <TouchableOpacity
                                    style={[styles.continueButton, otp.length < 4 && styles.disabledButton]}
                                    onPress={completeSetup}
                                    disabled={otp.length < 4}
                                >
                                    <Text style={styles.continueButtonText}>Verify & Complete</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Payment Methods Cards */}
                        <View style={styles.paymentCard}>
                            <View style={styles.paymentCardHeader}>
                                <Ionicons name="wallet-outline" size={28} color={PRIMARY_GREEN} />
                                <Text style={styles.paymentCardTitle}>Easypaisa</Text>
                            </View>
                            {easypaisaNumber ? (
                                <View style={styles.paymentCardContent}>
                                    <Text style={styles.paymentNumber}>{easypaisaNumber}</Text>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => startSetup('easypaisa')}
                                    >
                                        <Ionicons name="pencil" size={20} color={PRIMARY_GREEN} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addMethodButton}
                                    onPress={() => startSetup('easypaisa')}
                                >
                                    <Text style={styles.addMethodText}>Add Easypaisa Account</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.paymentCard}>
                            <View style={styles.paymentCardHeader}>
                                <Ionicons name="card-outline" size={28} color={PRIMARY_GREEN} />
                                <Text style={styles.paymentCardTitle}>Jazzcash</Text>
                            </View>
                            {jazzcashNumber ? (
                                <View style={styles.paymentCardContent}>
                                    <Text style={styles.paymentNumber}>{jazzcashNumber}</Text>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => startSetup('jazzcash')}
                                    >
                                        <Ionicons name="pencil" size={20} color={PRIMARY_GREEN} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addMethodButton}
                                    onPress={() => startSetup('jazzcash')}
                                >
                                    <Text style={styles.addMethodText}>Add Jazzcash Account</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
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
    content: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#1A1A1A',
    },
    // Payment Cards
    paymentCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    paymentCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 12,
    },
    paymentCardTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    paymentCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    paymentNumber: {
        fontSize: 16,
        fontFamily: 'Poppins_500Medium',
        color: '#333',
    },
    editButton: {
        padding: 8,
    },
    addMethodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    addMethodText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
        color: '#666',
    },
    // Setup Wizard
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 40,
    },
    stepDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
    },
    activeStepDot: {
        backgroundColor: PRIMARY_GREEN,
    },
    stepLine: {
        width: 80,
        height: 3,
        backgroundColor: '#E0E0E0',
    },
    activeStepLine: {
        backgroundColor: PRIMARY_GREEN,
    },
    stepContent: {
        gap: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    stepDescription: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#666',
        marginBottom: 10,
    },
    continueButton: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
    },
    disabledButton: {
        backgroundColor: '#E0E0E0',
    },
    continueButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default PaymentMethodsScreen;
