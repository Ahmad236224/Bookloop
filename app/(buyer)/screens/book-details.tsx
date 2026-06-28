import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PRIMARY_GREEN = '#000000';
const MINT_BTN = '#333333';

import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

interface Book {
    id: string;
    title: string;
    author: string;
    description: string;
    price?: number;
    originalPrice?: number;
    sellerPrice?: number;
    buyerPrice?: number;
    condition: string;
    category: string;
    imageUrl: string | null;
    imageBase64?: string | null;
    sellerName?: string;
    sellerId: string;
    stock: number;
    averageRating?: number;
    ratingCount?: number;
}

const BookDetailsScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { bookId } = params;

    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInCart, setIsInCart] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [userRating, setUserRating] = useState<number>(0);
    const [updatingRating, setUpdatingRating] = useState(false);

    useEffect(() => {
        const fetchBookAndStatus = async () => {
            if (!bookId || typeof bookId !== 'string') {
                setError('Invalid book ID');
                setLoading(false);
                return;
            }

            try {
                // Fetch Book with real-time updates
                const docRef = doc(db, 'books', bookId);
                const unsubBook = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const bookData = {
                            id: docSnap.id,
                            title: data.title,
                            author: data.author,
                            description: data.description,
                            price: data.price,
                            originalPrice: data.originalPrice,
                            sellerPrice: data.sellerPrice,
                            buyerPrice: data.buyerPrice,
                            condition: data.condition,
                            category: data.category,
                            imageUrl: data.imageUrl,
                            imageBase64: data.imageBase64,
                            sellerId: data.sellerId,
                            sellerName: 'Seller',
                            stock: data.stock,
                            averageRating: data.averageRating || 0,
                            ratingCount: data.ratingCount || 0,
                        };
                        setBook(bookData);
                    } else {
                        setError('Book not found');
                    }
                    setLoading(false);
                });

                // Check Cart & Wishlist Status (Real-time)
                const user = auth.currentUser;
                if (user) {
                    // Cart Listener
                    const cartRef = doc(db, 'users', user.uid, 'cart', bookId);
                    const unsubCart = onSnapshot(cartRef, (doc) => {
                        setIsInCart(doc.exists());
                    });

                    // Wishlist Listener
                    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', bookId);
                    const unsubWishlist = onSnapshot(wishlistRef, (doc) => {
                        setIsWishlisted(doc.exists());
                    });

                    // User Rating Listener
                    const ratingRef = doc(db, 'reviews', `${user.uid}_${bookId}`);
                    const unsubRating = onSnapshot(ratingRef, (doc) => {
                        if (doc.exists()) {
                            setUserRating(doc.data().rating || 0);
                        }
                    });

                    // Cleanup listeners when component unmounts or bookId changes
                    return () => {
                        unsubBook();
                        unsubCart();
                        unsubWishlist();
                        unsubRating();
                    };
                } else {
                    return () => {
                        unsubBook();
                    };
                }
            } catch (err: any) {
                console.error(err);
                setError('Failed to load book details');
                setLoading(false);
            }
        };

        const cleanup = fetchBookAndStatus();
        return () => {
            // cleanup is a promise that might return a function, but useEffect expects a synchronous return. 
            // We need to handle the unsubscribe more carefully.
        };
    }, [bookId]);

    const handleRating = async (rating: number) => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/(auth)/login');
            return;
        }
        if (!book) return;

        setUpdatingRating(true);
        try {
            const ratingDocId = `${user.uid}_${book.id}`;
            const ratingRef = doc(db, 'reviews', ratingDocId);
            
            // Check if user already rated
            const ratingSnap = await getDoc(ratingRef);
            const oldRating = ratingSnap.exists() ? ratingSnap.data().rating : 0;

            // Save new rating
            await setDoc(ratingRef, {
                userId: user.uid,
                bookId: book.id,
                rating: rating,
                updatedAt: new Date(),
            }, { merge: true });

            // Update book's average rating
            const bookRef = doc(db, 'books', book.id);
            const bookSnap = await getDoc(bookRef);
            if (bookSnap.exists()) {
                const bookData = bookSnap.data();
                let newCount = bookData.ratingCount || 0;
                let newSum = (bookData.averageRating || 0) * newCount;
                
                if (ratingSnap.exists()) {
                    // User is updating rating - subtract old rating
                    newSum = newSum - oldRating + rating;
                } else {
                    // New rating
                    newCount++;
                    newSum = newSum + rating;
                }
                
                const newAverage = newSum / newCount;
                
                await setDoc(bookRef, {
                    averageRating: newAverage,
                    ratingCount: newCount,
                    updatedAt: new Date(),
                }, { merge: true });
            }

            setUserRating(rating);
        } catch (error) {
            console.error("Error updating rating:", error);
        } finally {
            setUpdatingRating(false);
        }
    };

    const handleToggleWishlist = async () => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/(auth)/login');
            return;
        }
        if (!book) return;

        try {
            const wishlistRef = doc(db, 'users', user.uid, 'wishlist', book.id);
            if (isWishlisted) {
                await deleteDoc(wishlistRef);
                setIsWishlisted(false);
            } else {
                await setDoc(wishlistRef, {
                    bookId: book.id,
                    title: book.title,
                    author: book.author,
                    price: book.buyerPrice || book.price || 0,
                    imageUrl: book.imageUrl || '',
                    imageBase64: book.imageBase64 || null,
                    averageRating: book.averageRating || 0,
                    ratingCount: book.ratingCount || 0,
                    addedAt: new Date()
                });
                setIsWishlisted(true);
            }
        } catch (error) {
            console.error("Error toggling wishlist:", error);
        }
    };

    const handleAddToCart = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login to add into cart');
            router.replace('/(auth)/login');
            return;
        }

        if (isInCart) {
            router.push('/(buyer)/cart');
            return;
        }

        if (!book) return;

        setAddingToCart(true);
        try {
            const cartItem = {
                bookId: book.id,
                title: book.title,
                author: book.author,
                price: book.buyerPrice || book.price || 0,
                imageUrl: book.imageUrl || '',
                imageBase64: book.imageBase64 || null,
                quantity: 1,
                sellerId: book.sellerId,
                addedAt: new Date()
            };

            await setDoc(doc(db, 'users', user.uid, 'cart', book.id), cartItem);
            setIsInCart(true);
        } catch (error) {
            console.error("Error adding to cart: ", error);
            alert("Failed to add to cart");
        } finally {
            setAddingToCart(false);
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                    key={star}
                    onPress={() => handleRating(star)}
                    disabled={updatingRating}
                    >
                        <Ionicons
                            name={star <= userRating ? 'star' : 'star-outline'}
                            size={24}
                            color={star <= userRating ? '#FFC107' : '#E0E0E0'}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                <Text style={styles.loadingText}>Loading book details...</Text>
            </View>
        );
    }

    if (error || !book) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Ionicons name="alert-circle-outline" size={64} color="#EF5350" />
                <Text style={styles.errorText}>{error || 'Book not found'}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backToHomeButton}>
                    <Text style={styles.backToHomeText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const imageSource = book?.imageBase64
        ? { uri: book.imageBase64 }
        : (book?.imageUrl ? { uri: book.imageUrl } : null);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Image Background */}
            <ImageBackground
                source={imageSource as any} // Cast to any if type complaints, or handle default placeholder
                style={styles.headerImage}
                resizeMode="cover"
            >
                <View style={styles.headerOverlay}>
                    <TouchableOpacity onPress={() => router.push('/(buyer)/')} style={styles.backButton}>
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </ImageBackground>

            {/* Content Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Title & Header Info */}
                    <View style={styles.titleSection}>
                        <View style={styles.titleRow}>
                            <Text style={styles.bookTitle}>{book.title}</Text>
                            <View style={styles.actionsRow}>
                                <TouchableOpacity style={styles.iconButton}>
                                    <Ionicons name="share-social-outline" size={24} color="#757575" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconButton} onPress={handleToggleWishlist}>
                                    <Ionicons
                                        name={isWishlisted ? "heart" : "heart-outline"}
                                        size={24}
                                        color={isWishlisted ? "#FF5252" : "#757575"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.bookAuthor}>{book.author}</Text>

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Price</Text>
                                {book.buyerPrice ? (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={styles.infoValue}>PKR {book.buyerPrice.toFixed(2)}</Text>
                                        {book.originalPrice && (
                                            <Text style={{fontSize: 12, color: '#9E9E9E', textDecorationLine: 'line-through'}}>
                                                PKR {book.originalPrice.toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={styles.infoValue}>PKR {book.price?.toFixed(2)}</Text>
                                )}
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Condition</Text>
                                <Text style={styles.infoValue}>{book.condition}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Stock</Text>
                                <Text style={styles.infoValue}>{book.stock}</Text>
                            </View>
                        </View>

                        {/* Rating Section */}
                        <View style={styles.ratingSection}>
                            <Text style={styles.sectionTitle}>Rate this Book</Text>
                            <View style={styles.ratingRow}>
                                {renderStars()}
                                <Text style={styles.ratingText}>
                                    {book.averageRating?.toFixed(1)} ({book.ratingCount} {book.ratingCount === 1 ? 'rating' : 'ratings'})
                                </Text>
                            </View>
                        </View>

                        <View style={styles.sellerInfo}>
                            <Ionicons name="person-circle-outline" size={20} color={PRIMARY_GREEN} />
                            <Text style={styles.sellerText}>Sold by: {book.sellerName}</Text>
                        </View>
                    </View>

                    {/* Category Badge */}
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{book.category}</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>{book.description}</Text>
                    </View>

                    {/* Add to Cart Button */}
                    <TouchableOpacity
                        style={[
                            styles.readButton,
                            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
                            isInCart && styles.readButtonDisabled // Optional style change
                        ]}
                        onPress={handleAddToCart}
                        disabled={addingToCart}
                        activeOpacity={0.8}
                    >
                        {addingToCart ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons
                                    name={isInCart ? "checkmark-circle" : "cart-outline"}
                                    size={24}
                                    color="#FFFFFF"
                                    style={{ marginRight: 10 }}
                                />
                                <Text style={styles.readButtonText}>
                                    {isInCart ? "Added to Cart" : `Add to Cart - PKR ${(book.buyerPrice || book.price || 0).toFixed(2)}`}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Behind header
    },
    headerImage: {
        height: 300,
        width: '100%',
        justifyContent: 'flex-start',
    },
    headerOverlay: {
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginTop: -40, // Overlap image
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    scrollContent: {
        paddingTop: 30,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    titleSection: {
        marginBottom: 25,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    bookTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        flex: 1,
        marginRight: 10,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 5,
    },
    iconButton: {
        padding: 4,
    },
    bookAuthor: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    infoItem: {
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: PRIMARY_GREEN,
    },
    ratingSection: {
        marginVertical: 15,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stars: {
        flexDirection: 'row',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    sellerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 8,
    },
    sellerText: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        color: '#333',
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    categoryText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: '#FFFFFF',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    errorText: {
        marginTop: 15,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#333',
        textAlign: 'center',
    },
    backToHomeButton: {
        marginTop: 20,
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    backToHomeText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#FFFFFF',
    },
    actionTabs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    actionTab: {
        alignItems: 'center',
        gap: 8,
    },
    activeActionTab: {
        // Active state styling if needed
    },
    actionTabText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    activeActionTabText: {
        color: PRIMARY_GREEN,
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#EEEEEE',
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        lineHeight: 22,
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: PRIMARY_GREEN,
    },
    readButton: {
        backgroundColor: '#26A69A', // Vibrant Teal (MINT_BTN) from Login
        borderRadius: 14,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        boxShadow: '0px 4px 8px rgba(38, 166, 154, 0.3)', // Matching Login shadow
        elevation: 4,
    },
    readButtonDisabled: {
        backgroundColor: '#333333', // Lighter teal for disabled/added state
        opacity: 0.9,
    },
    readButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Poppins_700Bold', // Matched Login
        letterSpacing: 1, // Matched Login
    },
    relatedList: {
        // marginHorizontal: -24, // Optional if full bleed
        // paddingHorizontal: 24,
    },
    relatedBookCard: {
        marginRight: 15,
        borderRadius: 10,
        overflow: 'hidden',
    },
    relatedBookImage: {
        width: 100,
        height: 150,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
    },
});

export default BookDetailsScreen;
