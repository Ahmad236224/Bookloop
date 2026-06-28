import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, addDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
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

const BuyerExchangeScreen = () => {
    const router = useRouter();
    const [exchangeBooks, setExchangeBooks] = useState<ExchangeBook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial sample data to populate Firebase - moved inside useEffect
        const sampleExchangeBooks: Omit<ExchangeBook, 'id'>[] = [
            {
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                condition: 'Good',
                price: 0,
                isFree: true,
                ownerId: 'sample1',
                ownerName: 'John Doe',
                ownerEmail: 'john@example.com',
                description: 'Classic American novel. Minor wear on cover.',
                createdAt: serverTimestamp(),
                status: 'available'
            },
            {
                title: '1984',
                author: 'George Orwell',
                condition: 'Like New',
                price: 150,
                isFree: false,
                ownerId: 'sample2',
                ownerName: 'Jane Smith',
                ownerEmail: 'jane@example.com',
                description: 'Excellent condition, barely read.',
                createdAt: serverTimestamp(),
                status: 'available'
            },
            {
                title: 'To Kill a Mockingbird',
                author: 'Harper Lee',
                condition: 'Very Good',
                price: 0,
                isFree: true,
                ownerId: 'sample3',
                ownerName: 'Mike Johnson',
                ownerEmail: 'mike@example.com',
                description: 'Beautiful copy, perfect for collectors.',
                createdAt: serverTimestamp(),
                status: 'available'
            }
        ];
        // Add sample data if collection is empty
        const initSampleData = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'exchangeBooks'));
                if (snapshot.empty) {
                    for (const book of sampleExchangeBooks) {
                        await addDoc(collection(db, 'exchangeBooks'), book);
                    }
                }
            } catch (error) {
                console.error('Error adding sample data:', error);
            }
        };
        initSampleData();

        // Real-time listener for exchange books
        const q = query(collection(db, 'exchangeBooks'), where('status', '==', 'available'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const books: ExchangeBook[] = [];
            snapshot.forEach((doc) => {
                books.push({ id: doc.id, ...doc.data() } as ExchangeBook);
            });
            setExchangeBooks(books);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const renderExchangeBook = ({ item }: { item: ExchangeBook }) => {
        return (
            <TouchableOpacity 
                style={styles.exchangeBookCard}
                onPress={() => router.push({
                    pathname: '/(buyer)/screens/exchange-book-details',
                    params: { bookId: item.id }
                })}
                activeOpacity={0.8}
            >
                <View style={styles.bookImageContainer}>
                    {item.imageBase64 ? (
                        <Image
                            source={item.imageBase64}
                            style={styles.bookImage}
                            contentFit="cover"
                        />
                    ) : item.imageUrl ? (
                        <Image
                            source={item.imageUrl}
                            style={styles.bookImage}
                            contentFit="cover"
                        />
                    ) : (
                        <MaterialCommunityIcons name="book-open-variant" size={50} color={PRIMARY_COLOR} />
                    )}
                </View>
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                    <View style={styles.priceContainer}>
                        {item.isFree ? (
                            <Text style={styles.freeText}>FREE</Text>
                        ) : (
                            <Text style={styles.priceText}>PKR {item.price}</Text>
                        )}
                    </View>
                    <View style={styles.conditionContainer}>
                        <Text style={styles.conditionText}>{item.condition}</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9E9E9E" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => router.push('/(buyer)/')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book Exchange</Text>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity 
                            style={styles.requestsButton}
                            onPress={() => router.push('/(buyer)/screens/exchange-requests')}
                        >
                            <RNImage
                                source={require('../../assets/images/icons/notification.png')}
                                style={styles.headerIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.addButton}
                            onPress={() => router.push('/(buyer)/screens/create-exchange-listing')}
                        >
                            <RNImage
                                source={require('../../assets/images/icons/add-book.png')}
                                style={styles.headerIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Loading exchange books...</Text>
                </View>
            ) : (
                <FlatList
                    data={exchangeBooks}
                    renderItem={renderExchangeBook}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    safeArea: {
        backgroundColor: 'transparent',
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
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    headerIcon: {
        width: 22,
        height: 22,
    },
    requestsButton: {
        padding: 5,
    },
    addButton: {
        padding: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 80,
    },
    exchangeBookCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    bookImageContainer: {
        width: 80,
        height: 100,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    bookImage: {
        width: '100%',
        height: '100%',
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    bookAuthor: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 6,
    },
    priceContainer: {
        marginBottom: 4,
    },
    freeText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: '#27AE60',
    },
    priceText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_COLOR,
    },
    conditionContainer: {
        alignSelf: 'flex-start',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    conditionText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: '#2E7D32',
    },
});

export default BuyerExchangeScreen;
