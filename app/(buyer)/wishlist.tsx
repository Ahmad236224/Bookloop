import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_GREEN = '#000000';

interface WishlistItem {
    id: string; // The doc id is the bookId
    bookId: string;
    title: string;
    author: string;
    price: number;
    imageUrl: string;
    imageBase64?: string | null;
    book?: any;
    averageRating?: number;
    ratingCount?: number;
}

const BuyerWishlistScreen = () => {
    const router = useRouter();
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [cartItemIds, setCartItemIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch Wishlist
        const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
        const unsubscribeWishlist = onSnapshot(wishlistRef, (snapshot) => {
            const items: WishlistItem[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                items.push({
                    id: doc.id,
                    bookId: data.bookId,
                    title: data.title,
                    author: data.author,
                    price: data.price,
                    imageUrl: data.imageUrl,
                    imageBase64: data.imageBase64,
                    averageRating: data.averageRating,
                    ratingCount: data.ratingCount
                });
            });
            setWishlistItems(items);
            setLoading(false); // Set loading false after wishlist loads
        }, (error) => {
            console.error("Error fetching wishlist:", error);
            setLoading(false);
        });

        // Fetch Cart to update button status
        const cartRef = collection(db, 'users', user.uid, 'cart');
        const unsubscribeCart = onSnapshot(cartRef, (snapshot) => {
            const ids = new Set<string>();
            snapshot.forEach((doc) => {
                // Assuming doc.id is the bookId in my cart logic, 
                // OR checking data.bookId. 
                // In book-details, I used: setDoc(doc(..., book.id), ...) so doc.id IS bookId.
                ids.add(doc.id);
            });
            setCartItemIds(ids);
        });

        return () => {
            unsubscribeWishlist();
            unsubscribeCart();
        };
    }, []);

    const removeFromWishlist = async (itemId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'users', user.uid, 'wishlist', itemId));
        } catch (error) {
            console.error("Error removing from wishlist:", error);
        }
    };

    const addToCart = async (item: WishlistItem) => {
        const user = auth.currentUser;
        if (!user) return;

        // If already added, maybe navigate to cart?
        if (cartItemIds.has(item.bookId)) {
            router.push('/(buyer)/cart');
            return;
        }

        try {
            const cartItem = {
                bookId: item.bookId,
                title: item.title,
                author: item.author,
                price: item.price,
                imageUrl: item.imageUrl || '',
                imageBase64: item.imageBase64 || null,
                quantity: 1,
                addedAt: new Date()
            };

            await setDoc(doc(db, 'users', user.uid, 'cart', item.bookId), cartItem);
            // Alert is optional now since UI updates, but good for feedback
            // Alert.alert('Success', 'Item added to cart'); 
        } catch (error) {
            console.error("Error adding to cart:", error);
            Alert.alert('Error', 'Failed to add to cart');
        }
    };

    const renderBookItem = ({ item }: { item: WishlistItem }) => {
        const imageSource = item.imageBase64
            ? { uri: item.imageBase64 }
            : (item.imageUrl ? { uri: item.imageUrl } : null);

        const isAdded = cartItemIds.has(item.bookId);

        return (
            <TouchableOpacity
                style={styles.bookCard}
                onPress={() => router.push({
                    pathname: '/(buyer)/screens/book-details',
                    params: { bookId: item.bookId }
                })}
                activeOpacity={0.8}
            >
                <View style={styles.imageContainer}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.bookImage} />
                    ) : (
                        <View style={[styles.bookImage, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="book" size={28} color={PRIMARY_GREEN} />
                        </View>
                    )}
                </View>
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                    {item.averageRating && item.ratingCount > 0 && (
                        <View style={styles.ratingContainer}>
                            <MaterialCommunityIcons name="star" size={12} color="#FFC107" />
                            <Text style={styles.ratingText}>
                                {item.averageRating.toFixed(1)} ({item.ratingCount})
                            </Text>
                        </View>
                    )}
                    <Text style={styles.bookPrice}>${item.price.toFixed(2)}</Text>
                </View>
                <View style={styles.rightActions}>
                    <TouchableOpacity
                        style={[styles.cartIconButton, isAdded && styles.cartButtonDisabled]}
                        onPress={!isAdded ? () => addToCart(item) : undefined}
                        disabled={isAdded}
                    >
                        <Image
                            source={require('../../assets/images/icons/cart.png')}
                            style={{
                                width: 20,
                                height: 20,
                                tintColor: isAdded ? PRIMARY_GREEN : '#757575',
                                opacity: isAdded ? 0.5 : 1
                            }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeFromWishlist(item.id)}
                    >
                        <Ionicons name="heart" size={20} color="#EF5350" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.push('/(buyer)/')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wishlist</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    <Text style={styles.loadingText}>Loading wishlist...</Text>
                </View>
            ) : wishlistItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="heart-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyText}>Your wishlist is empty</Text>
                    <Text style={styles.emptySubtext}>Add books you love to your wishlist</Text>
                </View>
            ) : (
                <FlatList
                    data={wishlistItems}
                    renderItem={renderBookItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
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
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    bookCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center',
    },
    imageContainer: {
        marginRight: 10,
    },
    bookImage: {
        width: 70,
        height: 100,
        borderRadius: 6,
        backgroundColor: '#EEE',
    },
    bookInfo: {
        flex: 1,
        marginRight: 8,
    },
    bookTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    bookAuthor: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    bookPrice: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    rightActions: {
        flexDirection: 'column',
        gap: 10,
    },
    cartIconButton: {
        padding: 3,
    },
    cartButtonDisabled: {
        opacity: 0.5,
    },
    removeButton: {
        padding: 3,
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
    },
});

export default BuyerWishlistScreen;
