import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';

const PRIMARY_COLOR = '#000000';

const CreateExchangeListingScreen = () => {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [condition, setCondition] = useState('');
    const [isFree, setIsFree] = useState(true);
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const conditions = ['Like New', 'Very Good', 'Good', 'Acceptable'];

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            if (asset.base64) {
                const base64Image = `data:image/jpeg;base64,${asset.base64}`;
                setImageUri(base64Image);
            } else {
                setImageUri(asset.uri);
            }
        }
    };

    const handleCreateListing = async () => {
        if (!title || !author || !condition || !description) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        if (!isFree && !price) {
            Alert.alert('Error', 'Please enter a price or mark as free');
            return;
        }

        if (!currentUser) {
            Alert.alert('Error', 'Please login first');
            return;
        }

        setLoading(true);
        try {
            // Check if imageUri is base64 or not
            let imageBase64 = null;
            let imageUrl = null;
            
            if (imageUri) {
                if (imageUri.startsWith('data:')) {
                    imageBase64 = imageUri;
                } else {
                    imageUrl = imageUri;
                }
            }

            await addDoc(collection(db, 'exchangeBooks'), {
                title,
                author,
                condition,
                isFree,
                price: isFree ? 0 : parseFloat(price),
                ownerId: currentUser.uid,
                ownerName: currentUser.displayName || 'Anonymous',
                ownerEmail: currentUser.email || '',
                description,
                imageUrl,
                imageBase64,
                status: 'available',
                createdAt: serverTimestamp(),
            });
            Alert.alert('Success!', 'Your book has been listed for exchange!');
            router.push('/(buyer)/exchange');
        } catch (error) {
            Alert.alert('Error', 'Failed to create listing');
            console.error('Error creating listing:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.push('/(buyer)/exchange')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>List Book for Exchange</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Book Photo</Text>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {imageUri ? (
                                <Image
                                    source={imageUri}
                                    style={styles.previewImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.placeholderContainer}>
                                    <Ionicons name="camera" size={40} color="#9E9E9E" />
                                    <Text style={styles.placeholderText}>Tap to add photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Book Title *</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Enter book title"
                            placeholderTextColor="#9E9E9E"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Author *</Text>
                        <TextInput
                            style={styles.input}
                            value={author}
                            onChangeText={setAuthor}
                            placeholder="Enter author name"
                            placeholderTextColor="#9E9E9E"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Condition *</Text>
                        <View style={styles.conditionContainer}>
                            {conditions.map((cond) => (
                                <TouchableOpacity
                                    key={cond}
                                    style={[
                                        styles.conditionButton,
                                        condition === cond && styles.conditionButtonActive
                                    ]}
                                    onPress={() => setCondition(cond)}
                                >
                                    <Text
                                        style={[
                                            styles.conditionButtonText,
                                            condition === cond && styles.conditionButtonTextActive
                                        ]}
                                    >
                                        {cond}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Price</Text>
                        <View style={styles.priceContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.priceButton,
                                    isFree && styles.priceButtonActive
                                ]}
                                onPress={() => setIsFree(true)}
                            >
                                <Text
                                    style={[
                                        styles.priceButtonText,
                                        isFree && styles.priceButtonTextActive
                                    ]}
                                >
                                    Free
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.priceButton,
                                    !isFree && styles.priceButtonActive
                                ]}
                                onPress={() => setIsFree(false)}
                            >
                                <Text
                                    style={[
                                        styles.priceButtonText,
                                        !isFree && styles.priceButtonTextActive
                                    ]}
                                >
                                    Price
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {!isFree && (
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={setPrice}
                                placeholder="Enter price in PKR"
                                placeholderTextColor="#9E9E9E"
                                keyboardType="numeric"
                            />
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Describe the book condition, edition, etc."
                            placeholderTextColor="#9E9E9E"
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.createButton, loading && styles.createButtonDisabled]}
                    onPress={handleCreateListing}
                    disabled={loading}
                >
                    {loading ? (
                        <Text style={styles.createButtonText}>Creating...</Text>
                    ) : (
                        <Text style={styles.createButtonText}>List Book</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#000',
    },
    content: {
        flex: 1,
    },
    form: {
        padding: 20,
        paddingBottom: 100,
    },
    imagePicker: {
        width: '100%',
        height: 200,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        overflow: 'hidden',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    placeholderText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    inputGroup: {
        marginBottom: 25,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    conditionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    conditionButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    conditionButtonActive: {
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
    },
    conditionButtonText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: '#757575',
    },
    conditionButtonTextActive: {
        color: '#FFFFFF',
    },
    priceContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    priceButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    priceButtonActive: {
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
    },
    priceButtonText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#757575',
    },
    priceButtonTextActive: {
        color: '#FFFFFF',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    createButton: {
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
});

export default CreateExchangeListingScreen;
