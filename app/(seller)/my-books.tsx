import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const PRIMARY_GREEN = '#00695C';
const TEAL = '#00695C';

interface Book {
    id: string;
    sellerId: string;
    title: string;
    author: string;
    description?: string;
    price?: number;
    originalPrice?: number;
    sellerPrice?: number;
    buyerPrice?: number;
    imageUrl: string | null;
    imageBase64: string | null;
    stock: number;
    condition: string;
    category: string;
    isbn?: string | null;
    status: string;
    createdAt: any;
    updatedAt: any;
}

const SellerMyBooksScreen = () => {
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
            Alert.alert('Authentication Error', 'You must be logged in to view your books.');
            router.replace('/(auth)/login');
            return;
        }

        const sellerId = currentUser.uid;

        // Query books collection for current seller's books
        const booksQuery = query(
            collection(db, 'books'),
            where('sellerId', '==', sellerId)
        );

        const unsubscribe = onSnapshot(booksQuery, (querySnapshot) => {
            let booksData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Book[];

            // Sort by createdAt descending (newest first) - client-side sorting
            booksData.sort((a, b) => {
                // Handle both Timestamp objects and Date objects
                const getTime = (date: any) => {
                    if (!date) return 0;
                    if (date.toDate) return date.toDate().getTime();
                    if (date instanceof Date) return date.getTime();
                    return new Date(date).getTime();
                };
                return getTime(b.createdAt) - getTime(a.createdAt); // Descending order
            });

            setBooks(booksData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching books:', error);
            Alert.alert('Error', 'Failed to load books. Please try again.');
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const fetchBooks = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 500);
    };

    const executeDelete = async (bookId: string) => {
        try {
            await deleteDoc(doc(db, 'books', bookId));
            // onSnapshot will handle local state update automatically, but we can do it immediately too
            setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
            if (Platform.OS === 'web') {
                window.alert('Book deleted successfully.');
            } else {
                Alert.alert('Success', 'Book deleted successfully.');
            }
        } catch (error: any) {
            console.error('Error deleting book:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to delete book. Please try again.');
            } else {
                Alert.alert('Error', 'Failed to delete book. Please try again.');
            }
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this book?')) {
                executeDelete(bookId);
            }
        } else {
            Alert.alert(
                'Delete Book',
                'Are you sure you want to delete this book?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => executeDelete(bookId)
                    }
                ]
            );
        }
    };

    const handleViewBook = (book: Book) => {
        const msg = `Author: ${book.author}\n\nDescription: ${book.description || 'No description available'}\n\nPayout: PKR ${book.sellerPrice ? book.sellerPrice.toFixed(2) : book.price?.toFixed(2)}\nOriginal Price: PKR ${book.originalPrice ? book.originalPrice.toFixed(2) : book.price?.toFixed(2)}\nCondition: ${book.condition}\nCategory: ${book.category}\nStock: ${book.stock}\n${book.isbn ? `ISBN: ${book.isbn}` : ''}`;
        
        if (Platform.OS === 'web') {
            window.alert(`${book.title}\n\n${msg}`);
        } else {
            Alert.alert(book.title, msg, [{ text: 'OK' }]);
        }
    };

    const renderBookItem = ({ item }: { item: Book }) => {
        // Get image source - prefer imageUrl, fallback to imageBase64
        const imageSource = item.imageUrl || item.imageBase64;

        return (
            <View style={styles.bookCard}>
                <TouchableOpacity 
                    style={styles.bookCardContent}
                    onPress={() => handleViewBook(item)}
                    activeOpacity={0.7}
                >
                    {imageSource ? (
                        <Image source={{ uri: imageSource }} style={styles.bookImage} />
                    ) : (
                        <View style={[styles.bookImage, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
                            <MaterialCommunityIcons name="book-open-variant" size={40} color={TEAL} />
                        </View>
                    )}
                    <View style={styles.bookInfo}>
                        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.bookAuthor}>{item.author}</Text>
                        <View style={styles.bookDetails}>
                            <Text style={styles.bookPrice}>PKR {item.sellerPrice ? item.sellerPrice.toFixed(2) : item.price?.toFixed(2)}</Text>
                            <Text style={styles.bookStock}>Stock: {item.stock}</Text>
                        </View>
                        <View style={styles.bookMeta}>
                            <Text style={styles.bookCondition}>{item.condition}</Text>
                            <Text style={styles.bookCategory}>{item.category}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <View style={styles.bookActions}>
                    <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => handleViewBook(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="eye" size={16} color={PRIMARY_GREEN} />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                            router.push({
                                pathname: '/(seller)/add-book',
                                params: { bookId: item.id, edit: 'true' }
                            });
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pencil" size={16} color={PRIMARY_GREEN} />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteBook(item.id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF5350" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    {/* Empty for alignment (this is a tab screen) */}
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Books</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        router.push('/(seller)/add-book');
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={22} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={TEAL} />
                    <Text style={styles.loadingText}>Loading books...</Text>
                </View>
            ) : books.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="book-open-variant-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyText}>No books listed</Text>
                    <Text style={styles.emptySubtext}>Add your first book to get started</Text>
                    <TouchableOpacity
                        style={styles.addFirstButton}
                        onPress={() => {
                            router.push('/(seller)/add-book');
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.addFirstButtonText}>Add Book</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={books}
                    renderItem={renderBookItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={fetchBooks}
                />
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
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    bookCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 15,
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        elevation: 2, // For Android
        overflow: 'hidden',
    },
    bookCardContent: {
        flexDirection: 'row',
        padding: 15,
    },
    bookImage: {
        width: 80,
        height: 120,
        borderRadius: 8,
        marginRight: 15,
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    bookAuthor: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 8,
    },
    bookDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    bookPrice: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    bookStock: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    bookMeta: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    bookCondition: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    bookCategory: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    bookActions: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 15,
        paddingBottom: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    viewButtonText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: PRIMARY_GREEN,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2F1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    editButtonText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: PRIMARY_GREEN,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    deleteButtonText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: '#EF5350',
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
        color: '#757575',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        color: '#757575',
        marginTop: 15,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
        marginTop: 5,
        marginBottom: 20,
    },
    addFirstButton: {
        backgroundColor: PRIMARY_GREEN,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    addFirstButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default SellerMyBooksScreen;
