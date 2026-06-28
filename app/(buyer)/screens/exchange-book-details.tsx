import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getAuth } from 'firebase/auth';
import { Image } from 'expo-image';

const PRIMARY_COLOR = '#000000';

interface ExchangeBook {
    id: string;
    title: string;
    author: string;
    condition: string;
    price?: number;
    isFree: boolean;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    imageUrl?: string;
    imageBase64?: string;
    description: string;
    createdAt: any;
    status: 'available' | 'pending' | 'exchanged';
}

const ExchangeBookDetailsScreen = () => {
    const router = useRouter();
    const { bookId } = useLocalSearchParams();
    const [book, setBook] = useState<ExchangeBook | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (bookId) {
            const fetchBook = async () => {
                const docRef = doc(db, 'exchangeBooks', bookId as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setBook({ id: docSnap.id, ...docSnap.data() } as ExchangeBook);
                }
                setLoading(false);
            };
            fetchBook();
        }
    }, [bookId]);

    const sendExchangeRequest = async () => {
        if (!currentUser || !book) return;

        try {
            await addDoc(collection(db, 'exchangeRequests'), {
                bookId: book.id,
                bookTitle: book.title,
                requesterId: currentUser.uid,
                requesterName: currentUser.displayName || 'Anonymous',
                requesterEmail: currentUser.email,
                ownerId: book.ownerId,
                ownerName: book.ownerName,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            Alert.alert('Success!', 'Exchange request sent successfully!');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to send exchange request');
            console.error('Error sending request:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
        );
    }

    if (!book) {
        return (
            <View style={styles.container}>
                <Text>Book not found</Text>
            </View>
        );
    }

    const isOwnBook = currentUser?.uid === book.ownerId;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.push('/(buyer)/exchange')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                    {book?.imageBase64 ? (
                        <Image
                            source={book.imageBase64}
                            style={styles.bookImage}
                            contentFit="cover"
                        />
                    ) : book?.imageUrl ? (
                        <Image
                            source={book.imageUrl}
                            style={styles.bookImage}
                            contentFit="cover"
                        />
                    ) : (
                        <MaterialCommunityIcons name="book-open-variant" size={120} color={PRIMARY_COLOR} />
                    )}
                </View>

                <View style={styles.detailsContainer}>
                    <Text style={styles.title}>{book.title}</Text>
                    <Text style={styles.author}>by {book.author}</Text>

                    <View style={styles.priceRow}>
                        {book.isFree ? (
                            <Text style={styles.freePrice}>FREE</Text>
                        ) : (
                            <Text style={styles.price}>PKR {book.price}</Text>
                        )}
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Ionicons name="medal" size={20} color="#757575" />
                            <Text style={styles.infoText}>Condition: {book.condition}</Text>
                        </View>
                    </View>

                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{book.description}</Text>
                    </View>

                    <View style={styles.ownerSection}>
                        <Text style={styles.sectionTitle}>Owner Details</Text>
                        <View style={styles.ownerCard}>
                            <View style={styles.ownerAvatar}>
                                <MaterialCommunityIcons name="account" size={32} color="#FFFFFF" />
                            </View>
                            <View style={styles.ownerInfo}>
                                <Text style={styles.ownerName}>{book.ownerName}</Text>
                                <Text style={styles.ownerEmail}>{book.ownerEmail}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {!isOwnBook && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.requestButton} onPress={sendExchangeRequest}>
                        <Ionicons name="swap-horizontal" size={24} color="#FFFFFF" />
                        <Text style={styles.requestButtonText}>Request Exchange</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    imageContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 40,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    bookImage: {
        width: 200,
        height: 280,
        borderRadius: 12,
    },
    detailsContainer: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 5,
    },
    author: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 20,
    },
    priceRow: {
        marginBottom: 20,
    },
    freePrice: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        color: '#27AE60',
    },
    price: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_COLOR,
    },
    infoSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#1A1A1A',
    },
    descriptionSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        lineHeight: 22,
    },
    ownerSection: {
        marginBottom: 20,
    },
    ownerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
    },
    ownerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: PRIMARY_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    ownerInfo: {
        flex: 1,
    },
    ownerName: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 3,
    },
    ownerEmail: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    bottomSpacer: {
        height: 100,
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
    requestButton: {
        flexDirection: 'row',
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 12,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    requestButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
});

export default ExchangeBookDetailsScreen;
