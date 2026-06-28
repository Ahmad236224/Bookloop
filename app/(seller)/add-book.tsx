import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const PRIMARY_GREEN = '#00695C';
const MINT_BTN = '#00695C';
const INPUT_BORDER = '#E0E0E0';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
const CATEGORIES = ['Fiction', 'Non-Fiction', 'Textbook', 'Reference', 'Children', 'Other'];

const SellerAddBookScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEditMode = params.edit === 'true';
    const bookIdToEdit = params.bookId as string;

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [condition, setCondition] = useState('');
    const [category, setCategory] = useState('');
    const [isbn, setIsbn] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [stock, setStock] = useState('1');

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialFetchLoading, setInitialFetchLoading] = useState(isEditMode);

    useEffect(() => {
        if (isEditMode && bookIdToEdit) {
            const fetchBookDetails = async () => {
                try {
                    const bookDoc = await getDoc(doc(db, 'books', bookIdToEdit));
                    if (bookDoc.exists()) {
                        const data = bookDoc.data();
                        setTitle(data.title || '');
                        setAuthor(data.author || '');
                        setDescription(data.description || '');
                        // If sellerPrice exists, we calculate backwards to the original entered price
                        // We actually store originalPrice now, so use that if available
                        const originalPriceStr = data.originalPrice 
                            ? data.originalPrice.toString() 
                            : (data.price ? data.price.toString() : '');
                        setPrice(originalPriceStr);
                        setCondition(data.condition || '');
                        setCategory(data.category || '');
                        setIsbn(data.isbn || '');
                        setImageUrl(data.imageUrl || '');
                        setImageBase64(data.imageBase64 || null);
                        setStock(data.stock ? data.stock.toString() : '1');
                    } else {
                        Alert.alert('Error', 'Book not found.');
                        router.back();
                    }
                } catch (error) {
                    console.error('Error fetching book:', error);
                    Alert.alert('Error', 'Failed to fetch book details.');
                } finally {
                    setInitialFetchLoading(false);
                }
            };
            fetchBookDetails();
        }
    }, [isEditMode, bookIdToEdit]);

    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
            setImageUrl(''); // Clear URL if image is picked
        }
    };

    const handleSaveBook = async () => {
        // Validation
        if (!title || !author || !description || !price || !condition || !category) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }

        if (!imageBase64 && !imageUrl) {
            Alert.alert('Missing Image', 'Please either pick an image or provide an image URL.');
            return;
        }

        const priceNum = parseFloat(price);
        const stockNum = parseInt(stock);

        if (isNaN(priceNum) || priceNum <= 0) {
            Alert.alert('Invalid Price', 'Please enter a valid price.');
            return;
        }

        if (isNaN(stockNum) || stockNum < 1) {
            Alert.alert('Invalid Stock', 'Please enter a valid stock quantity (at least 1).');
            return;
        }

        setLoading(true);
        try {
            // Get current seller's user ID
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Alert.alert('Authentication Error', 'You must be logged in to add a book. Please log in again.');
                router.replace('/(auth)/login');
                return;
            }

            const sellerId = currentUser.uid;

            // Prepare book data
            const bookData: any = {
                title: title.trim(),
                author: author.trim(),
                description: description.trim(),
                originalPrice: priceNum,
                sellerPrice: priceNum * 0.25,
                buyerPrice: priceNum * 0.50,
                price: priceNum, // Keeping for backward compatibility
                condition: condition,
                category: category,
                isbn: isbn.trim() || null,
                stock: stockNum,
                imageUrl: imageUrl.trim() || null,
                imageBase64: imageBase64 || null, 
                updatedAt: serverTimestamp(),
            };

            if (isEditMode && bookIdToEdit) {
                await updateDoc(doc(db, 'books', bookIdToEdit), bookData);
            } else {
                bookData.sellerId = sellerId;
                bookData.status = 'active';
                bookData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'books'), bookData);
            }

            // Show success alert and redirect to my-books
            Alert.alert(
                'Success',
                isEditMode ? 'Book Successfully updated!' : 'Book Successfully added!',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.replace('/(seller)/my-books');
                        }
                    }
                ]
            );
            
            // Automatically navigate after a short delay
            setTimeout(() => {
                router.replace('/(seller)/my-books');
            }, 1500);
        } catch (error: any) {
            console.error('Error saving book:', error);
            let errorMessage = 'Failed to save book. Please try again.';

            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please contact support.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service is temporarily unavailable. Please check your internet connection and try again.';
            } else if (error.code === 'network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        fieldKey: string,
        keyboardType: any = 'default',
        multiline: boolean = false,
        required: boolean = true
    ) => (
        <View style={styles.inputWrapper}>
            <View
                style={[
                    styles.inputContainer,
                    focusedField === fieldKey && styles.inputFocused,
                    multiline && styles.inputMultiline,
                ]}
            >
                <Text style={[styles.inputLabel, focusedField === fieldKey && styles.inputLabelFocused]}>
                    {label}{required && ' *'}
                </Text>
                <TextInput
                    style={[styles.input, multiline && styles.inputTextArea]}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setFocusedField(fieldKey)}
                    onBlur={() => setFocusedField(null)}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    textAlignVertical={multiline ? 'top' : 'center'}
                />
            </View>
        </View>
    );

    if (initialFetchLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Book</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditMode ? 'Edit Book' : 'Add New Book'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.formContainer}>
                        {renderInput('Book Title', title, setTitle, 'title')}
                        {renderInput('Author', author, setAuthor, 'author')}
                        {renderInput('Description', description, setDescription, 'description', 'default', true)}

                        <View style={styles.rowInputs}>
                            <View style={{ flex: 1 }}>
                                {renderInput('Original Price (PKR)', price, setPrice, 'price', 'decimal-pad')}
                                {price && !isNaN(parseFloat(price)) ? (
                                    <Text style={{fontSize: 11, color: PRIMARY_GREEN, marginLeft: 4, marginTop: -15, marginBottom: 15}}>
                                        Your payout: PKR {(parseFloat(price) * 0.25).toFixed(2)} (25%)
                                    </Text>
                                ) : null}
                            </View>
                            <View style={{ width: 15 }} />
                            <View style={{ flex: 1 }}>
                                {renderInput('Stock', stock, setStock, 'stock', 'number-pad')}
                            </View>
                        </View>

                        {/* Condition Selector */}
                        <View style={styles.selectorContainer}>
                            <Text style={styles.sectionLabel}>Condition *</Text>
                            <View style={styles.chipOptions}>
                                {CONDITIONS.map((cond) => (
                                    <TouchableOpacity
                                        key={cond}
                                        style={[styles.chip, condition === cond && styles.chipActive]}
                                        onPress={() => setCondition(cond)}
                                    >
                                        <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>
                                            {cond}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Category Selector */}
                        <View style={styles.selectorContainer}>
                            <Text style={styles.sectionLabel}>Category *</Text>
                            <View style={styles.chipOptions}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.chip, category === cat && styles.chipActive]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {renderInput('ISBN (Optional)', isbn, setIsbn, 'isbn', 'default', false, false)}

                        {/* Image Upload Section */}
                        <View style={styles.imageSection}>
                            <Text style={styles.sectionLabel}>Book Cover Image *</Text>

                            {imageBase64 || imageUrl ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{ uri: imageBase64 || imageUrl }}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => {
                                            setImageBase64(null);
                                            setImageUrl('');
                                        }}
                                    >
                                        <MaterialCommunityIcons name="close-circle" size={28} color="#EF5350" />
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            <View style={styles.imageButtonsRow}>
                                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                                    <MaterialCommunityIcons name="image-plus" size={24} color={PRIMARY_GREEN} />
                                    <Text style={styles.imageButtonText}>Pick from Device</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.orText}>OR</Text>

                            {renderInput('Image URL', imageUrl, setImageUrl, 'imageUrl', 'default', false, false)}
                        </View>

                        <Animated.View entering={FadeInDown.delay(600).duration(800)}>
                            <TouchableOpacity
                                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                onPress={handleSaveBook}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>{isEditMode ? 'UPDATE BOOK' : 'ADD BOOK'}</Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: INPUT_BORDER,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        minHeight: 60,
        justifyContent: 'center',
    },
    inputMultiline: {
        minHeight: 100,
        paddingVertical: 16,
    },
    inputFocused: {
        borderColor: PRIMARY_GREEN,
    },
    inputLabel: {
        position: 'absolute',
        top: -10,
        left: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        fontSize: 12,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
        zIndex: 1,
    },
    inputLabelFocused: {
        color: PRIMARY_GREEN,
    },
    input: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#333333',
        paddingVertical: 0,
    },
    inputTextArea: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    rowInputs: {
        flexDirection: 'row',
    },
    selectorContainer: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#333',
        marginBottom: 10,
        marginLeft: 4,
    },
    chipOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    chipActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    chipText: {
        fontSize: 13,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
    },
    chipTextActive: {
        color: '#FFFFFF',
        fontFamily: 'Poppins_600SemiBold',
    },
    submitButton: {
        backgroundColor: MINT_BTN,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        boxShadow: '0px 4px 8px rgba(128, 203, 196, 0.3)',
        elevation: 4,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 1,
    },
    imageSection: {
        marginBottom: 20,
    },
    imagePreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 250,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 15,
        backgroundColor: '#F5F5F5',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
        elevation: 3,
    },
    imageButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    imageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F5',
        borderWidth: 1.5,
        borderColor: PRIMARY_GREEN,
        borderStyle: 'dashed',
        borderRadius: 14,
        paddingVertical: 16,
        gap: 8,
    },
    imageButtonText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: PRIMARY_GREEN,
    },
    orText: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
        marginBottom: 15,
    },
});

export default SellerAddBookScreen;
