import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_GREEN = '#000000';

const EXPLORE_CATEGORIES = [
    { id: '1', name: 'Fiction', color: '#E3F2FD' },
    { id: '2', name: 'Non-Fiction', color: '#F3E5F5' },
    { id: '3', name: 'Science', color: '#E8F5E9' },
    { id: '4', name: 'History', color: '#FFF3E0' },
    { id: '5', name: 'Romance', color: '#FFEBEE' },
    { id: '6', name: 'Thriller', color: '#ECEFF1' },
    { id: '7', name: 'Fantasy', color: '#F1F8E9' },
    { id: '8', name: 'Biography', color: '#FFE0B2' },
];

interface Book {
    id: string;
    title: string;
    author: string;
    price: number;
    imageUrl: string;
    category: string;
    stock: number;
}

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const BuyerSearchScreen = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [allBooks, setAllBooks] = useState<Book[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                // Fetch all active books initially (or limits if too many)
                // For client-side text search effectively, fetching all/many active books is often easiest for MVP
                const booksRef = collection(db, 'books');
                const q = query(booksRef, where('status', '==', 'active'));
                const querySnapshot = await getDocs(q);

                const fetchedBooks: Book[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedBooks.push({
                        id: doc.id,
                        title: data.title,
                        author: data.author,
                        price: data.price,
                        imageUrl: data.imageUrl,
                        category: data.category,
                        stock: data.stock,
                    });
                });

                setAllBooks(fetchedBooks);
                setFilteredBooks(fetchedBooks);
            } catch (error) {
                console.error("Error fetching books for search:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    useEffect(() => {
        // Client-side filtering
        let filtered = allBooks;

        if (selectedCategory) {
            filtered = filtered.filter(book => book.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase();
            filtered = filtered.filter(book =>
                book.title.toLowerCase().includes(queryLower) ||
                book.author.toLowerCase().includes(queryLower) ||
                book.category.toLowerCase().includes(queryLower)
            );
        }

        setFilteredBooks(filtered);
    }, [searchQuery, selectedCategory, allBooks]);

    const renderCategory = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.categoryCard,
                { backgroundColor: item.color },
                selectedCategory === item.name && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
        >
            <Text style={styles.categoryName}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderBook = ({ item }: { item: Book }) => (
        <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push({
                pathname: '/(buyer)/screens/book-details',
                params: { bookId: item.id }
            })}
        >
            {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.bookImage} />
            ) : (
                <View style={[styles.bookImage, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="book" size={30} color={PRIMARY_GREEN} />
                </View>
            )}
            <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
            <Text style={styles.bookPrice}>${item.price.toFixed(2)}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.push('/(buyer)/')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Explore</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchBarContainer}>
                <Ionicons name="search-outline" size={20} color="#9E9E9E" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search books, authors, genres..."
                    placeholderTextColor="#9E9E9E"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#9E9E9E" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Browse by Genre</Text>
                <FlatList
                    data={EXPLORE_CATEGORIES}
                    renderItem={renderCategory}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 10 }}
                />

                {(searchQuery || selectedCategory) && (
                    <>
                        <Text style={styles.sectionTitle}>
                            {searchQuery ? `Search Results (${filteredBooks.length})` : 'Filtered Books'}
                        </Text>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                            </View>
                        ) : filteredBooks.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No books found</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredBooks}
                                renderItem={renderBook}
                                keyExtractor={item => item.id}
                                numColumns={2}
                                columnWrapperStyle={styles.row}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        )}
                    </>
                )}
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
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#333',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 15,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    categoryCard: {
        width: '48%',
        height: 100,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    categoryName: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#333',
    },
    selectedCategory: {
        borderWidth: 2,
        borderColor: PRIMARY_GREEN,
    },
    bookCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    bookImage: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        marginBottom: 8,
    },
    bookTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    bookAuthor: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 4,
    },
    bookPrice: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
});

export default BuyerSearchScreen;
