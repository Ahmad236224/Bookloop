import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';
import { Formik } from 'formik';
import * as Yup from 'yup';

const PRIMARY_GREEN = '#00695C';

const validationSchema = Yup.object().shape({
    name: Yup.string()
        .matches(/^[a-zA-Z\s]+$/, 'Name must contain only English letters')
        .max(12, 'Name cannot exceed 12 characters')
        .required('Name is required'),
    phone: Yup.string()
        .matches(/^\d{11}$/, 'Phone number must be exactly 11 digits')
        .required('Phone number is required')
});

const EditSellerProfileScreen = () => {
    const router = useRouter();
    const [initialValues, setInitialValues] = useState({ name: '', phone: '' });
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, 'sellers', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setInitialValues({
                    name: data.name || '',
                    phone: data.phone || ''
                });
                setAvatarBase64(data.avatarBase64 || null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
            Alert.alert('Permission Required', 'You need to grant camera roll permissions to upload an avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setAvatarBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSave = async (values: { name: string, phone: string }) => {
        setSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            await setDoc(doc(db, 'sellers', user.uid), {
                name: values.name.trim(),
                phone: values.phone.trim(),
                avatarBase64: avatarBase64,
                updatedAt: new Date()
            }, { merge: true });
            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => router.navigate('/(seller)/profile') }
            ]);
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert('Error', 'Failed to update profile');
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
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <Formik
                initialValues={initialValues}
                enableReinitialize
                validationSchema={validationSchema}
                onSubmit={handleSave}
            >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView contentContainerStyle={styles.content}>
                            <View style={styles.avatarSection}>
                                <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                                    {avatarBase64 ? (
                                        <Image source={{ uri: avatarBase64 }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatar, { backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="person" size={50} color="#00695C" />
                                        </View>
                                    )}
                                    <View style={styles.editIcon}>
                                        <Ionicons name="camera" size={20} color="#FFF" />
                                    </View>
                                </TouchableOpacity>
                                <Text style={styles.changePhotoText}>Tap to change photo</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={[styles.input, touched.name && errors.name && styles.inputError]}
                                    value={values.name}
                                    onChangeText={handleChange('name')}
                                    onBlur={handleBlur('name')}
                                    placeholder="Enter your full name"
                                    maxLength={12}
                                />
                                {touched.name && errors.name && (
                                    <Text style={styles.errorText}>{errors.name}</Text>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput
                                    style={[styles.input, touched.phone && errors.phone && styles.inputError]}
                                    value={values.phone}
                                    onChangeText={handleChange('phone')}
                                    onBlur={handleBlur('phone')}
                                    placeholder="Enter your 11-digit phone number"
                                    keyboardType="phone-pad"
                                    maxLength={11}
                                />
                                {touched.phone && errors.phone && (
                                    <Text style={styles.errorText}>{errors.phone}</Text>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={() => handleSubmit()}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                )}
            </Formik>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editIcon: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#00695C',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    changePhotoText: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#333',
        marginBottom: 8,
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
    inputError: {
        borderColor: '#FF5252',
    },
    errorText: {
        color: '#FF5252',
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        marginTop: 4,
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    saveButton: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
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

export default EditSellerProfileScreen;
