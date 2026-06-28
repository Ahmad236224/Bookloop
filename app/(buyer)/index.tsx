import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, FlatList, Image, Animated, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where, limit, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const PRIMARY_GREEN = '#000000';
const { width: screenWidth } = Dimensions.get('window');

interface Shop {
    id: string;
    name: string;
    category: string;
    distance: string;
    rating: number;
    reviews: number;
    imageUrl: string;
    tags: string[];
}

interface Offer {
    id: string;
    title: string;
    discount: string;
    validUntil: string;
    imageUrl: string;
    shopName: string;
}

interface BookMarket {
    id: string;
    name: string;
    location: string;
    date: string;
    time: string;
    attendees: number;
    imageUrl: string;
}

const NEARBY_SHOPS: Shop[] = [
    {
        id: '1',
        name: 'City Bookstore',
        category: 'New & Used Books',
        distance: '0.5 km',
        rating: 4.8,
        reviews: 127,
        imageUrl: 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=300&fit=crop',
        tags: ['Fiction', 'Textbooks', 'Rare']
    },
    {
        id: '2',
        name: 'Vintage Pages',
        category: 'Collectible Books',
        distance: '1.2 km',
        rating: 4.9,
        reviews: 89,
        imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop',
        tags: ['Vintage', 'First Editions']
    },
    {
        id: '3',
        name: 'The Book Nook',
        category: 'Independent Seller',
        distance: '1.8 km',
        rating: 4.6,
        reviews: 65,
        imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
        tags: ['Local Authors', 'Signed']
    }
];

const SPECIAL_OFFERS: Offer[] = [
    {
        id: '1',
        title: 'Summer Sale',
        discount: '50% OFF',
        validUntil: 'Until Aug 31',
        imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=300&fit=crop',
        shopName: 'City Bookstore'
    },
    {
        id: '2',
        title: 'Buy 2 Get 1 Free',
        discount: 'Special Deal',
        validUntil: 'This Week',
        imageUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=300&fit=crop',
        shopName: 'Vintage Pages'
    }
];

const BOOK_MARKETS: BookMarket[] = [
    {
        id: '1',
        name: 'Weekend Book Fair',
        location: 'Downtown Plaza',
        date: 'Sat, Aug 24',
        time: '10:00 AM - 6:00 PM',
        imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=300&fit=crop',
        attendees: 234
    }
];

interface Ad {
    id: string;
    title: string;
    imageBase64: string;
}

interface Book {
    id: string;
    title: string;
    author: string;
    price?: number;
    originalPrice?: number;
    sellerPrice?: number;
    buyerPrice?: number;
    imageUrl: string | null;
    imageBase64?: string | null;
    category: string;
    stock: number;
    sellerId: string;
    description?: string;
    condition?: string;
    averageRating?: number;
    ratingCount?: number;
}

const BuyerHomeScreen = () => {
    const router = useRouter();

    const [topReadingBooks, setTopReadingBooks] = useState<Book[]>([]);
    const [topSellingBooks, setTopSellingBooks] = useState<Book[]>([]);
    const [topSellerBooks, setTopSellerBooks] = useState<Book[]>([]);
    const [newBooks, setNewBooks] = useState<Book[]>([]);
    const [usedBooks, setUsedBooks] = useState<Book[]>([]);
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [cartItemCount, setCartItemCount] = useState(0);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerHeight = 80; // Approximate header height
    
    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [0, -headerHeight],
        extrapolate: 'clamp',
    });
    
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, headerHeight / 2],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // Auto-scroll logic for ads
    useEffect(() => {
        if (ads.length > 1) {
            const interval = setInterval(() => {
                setCurrentAdIndex((prevIndex) => {
                    const nextIndex = prevIndex === ads.length - 1 ? 0 : prevIndex + 1;
                    flatListRef.current?.scrollToIndex({
                        index: nextIndex,
                        animated: true,
                    });
                    return nextIndex;
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [ads.length]);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
            setCurrentAdIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    useEffect(() => {
        fetchBooks();

        const q = query(collection(db, 'ads'), where('isActive', '==', true));
        const unsubscribeAds = onSnapshot(q, (snapshot) => {
            const fetchedAds: Ad[] = [];
            snapshot.forEach(doc => {
                fetchedAds.push({ id: doc.id, ...doc.data() } as Ad);
            });
            setAds(fetchedAds);
        }, (error) => {
            console.error("Error fetching ads:", error);
        });

        // Listen to cart changes
        const user = auth.currentUser;
        let unsubscribeCart;
        let unsubscribeNotifs;
        if (user) {
            const cartRef = collection(db, 'users', user.uid, 'cart');
            unsubscribeCart = onSnapshot(cartRef, (snapshot) => {
                setCartItemCount(snapshot.size);
            });
            
            // Listen to unread notifications
            const notifsRef = collection(db, 'users', user.uid, 'notifications');
            const notifsQuery = query(notifsRef, where('read', '==', false));
            unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
                setUnreadNotifCount(snapshot.size);
            });
        }

        return () => {
            unsubscribeAds();
            if (unsubscribeCart) unsubscribeCart();
            if (unsubscribeNotifs) unsubscribeNotifs();
        };
    }, []);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const booksRef = collection(db, 'books');

            // SIMPLIFIED QUERY: Removed orderBy to avoid needing a composite index immediately.
            // Sorting will be done client-side for now.
            const q = query(
                booksRef,
                where('status', 'in', ['active', 'available']),
                limit(50)
            );

            const querySnapshot = await getDocs(q);
            const books: Book[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                books.push({
                    id: doc.id,
                    title: data.title,
                    author: data.author,
                    price: data.price,
                    originalPrice: data.originalPrice,
                    sellerPrice: data.sellerPrice,
                    buyerPrice: data.buyerPrice,
                    imageUrl: data.imageUrl,
                    imageBase64: data.imageBase64,
                    category: data.category,
                    stock: data.stock,
                    sellerId: data.sellerId,
                    description: data.description,
                    condition: data.condition,
                    averageRating: data.averageRating,
                    ratingCount: data.ratingCount,
                });
            });

            console.log(`Fetched ${books.length} books`);

            setTopReadingBooks(books.slice(0, 8));
            setTopSellingBooks(books.slice(books.length > 3 ? 3 : 0, 13).reverse());
            setTopSellerBooks(books.slice(books.length > 1 ? 1 : 0, 11));
            setNewBooks(books.filter(b => b.condition === 'New' || b.condition?.toLowerCase() === 'new'));
            setUsedBooks(books.filter(b => b.condition && b.condition !== 'New' && b.condition?.toLowerCase() !== 'new'));

        } catch (error: any) {
            console.error("Error fetching books:", error);
            alert(`Error fetching books: ${error.message}`); // Simple alert for web/mobile
        } finally {
            setLoading(false);
        }
    };

    const renderBookItem = ({ item }: { item: Book }) => {
        // Determine image source
        let imageSource = null;
        if (item.imageBase64) {
            imageSource = { uri: item.imageBase64 };
        } else if (item.imageUrl) {
            imageSource = { uri: item.imageUrl };
        }

        return (
            <TouchableOpacity
                style={styles.bookCard}
                onPress={() => router.push({
                    pathname: '/(buyer)/screens/book-details',
                    params: {
                        bookId: item.id
                    }
                })}
            >
                <View style={styles.bookImageContainer}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.bookImage} resizeMode="cover" />
                    ) : (
                        <MaterialCommunityIcons name="book-open-variant" size={40} color={PRIMARY_GREEN} />
                    )}
                </View>
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                    {/* Rating Display */}
                    {item.averageRating && item.ratingCount > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MaterialCommunityIcons name="star" size={12} color="#FFC107" />
                            <Text style={{ fontSize: 10, fontFamily: 'Poppins_400Regular', color: '#757575' }}>
                                {item.averageRating.toFixed(1)} ({item.ratingCount})
                            </Text>
                        </View>
                    )}
                    {item.buyerPrice ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={styles.bookPrice}>PKR {item.buyerPrice.toFixed(2)}</Text>
                            {item.originalPrice && (
                                <Text style={[styles.bookPrice, { textDecorationLine: 'line-through', color: '#9E9E9E', fontSize: 10 }]}>
                                    PKR {item.originalPrice.toFixed(2)}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.bookPrice}>PKR {item.price?.toFixed(2)}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderShopCard = ({ item }: { item: Shop }) => (
        <TouchableOpacity style={styles.shopCard} activeOpacity={0.8}>
            <Image source={{ uri: item.imageUrl }} style={styles.shopImage} />
            <View style={styles.shopInfo}>
                <View style={styles.shopHeader}>
                    <Text style={styles.shopName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.distanceBadge}>
                        <Ionicons name="location-outline" size={12} color={PRIMARY_GREEN} />
                        <Text style={styles.distanceText}>{item.distance}</Text>
                    </View>
                </View>
                <Text style={styles.shopCategory} numberOfLines={1}>{item.category}</Text>
                <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                    <Text style={styles.reviewsText}>({item.reviews})</Text>
                </View>
                <View style={styles.tagsContainer}>
                    {item.tags.slice(0, 2).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderOfferCard = ({ item }: { item: Offer }) => (
        <TouchableOpacity style={styles.offerCard} activeOpacity={0.8}>
            <Image source={{ uri: item.imageUrl }} style={styles.offerImage} />
            <View style={styles.offerOverlay}>
                <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{item.discount}</Text>
                </View>
            </View>
            <View style={styles.offerInfo}>
                <Text style={styles.offerTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.offerMeta}>
                    <Text style={styles.shopNameSmall}>{item.shopName}</Text>
                    <Text style={styles.validText}>{item.validUntil}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderMarketCard = ({ item }: { item: BookMarket }) => (
        <TouchableOpacity style={styles.marketCard} activeOpacity={0.8}>
            <Image source={{ uri: item.imageUrl }} style={styles.marketImage} />
            <View style={styles.marketInfo}>
                <Text style={styles.marketName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.marketDetail}>
                    <Ionicons name="location-outline" size={16} color="#757575" />
                    <Text style={styles.marketDetailText}>{item.location}</Text>
                </View>
                <View style={styles.marketDetail}>
                    <Ionicons name="calendar-outline" size={16} color="#757575" />
                    <Text style={styles.marketDetailText}>{item.date}</Text>
                </View>
                <View style={styles.marketDetail}>
                    <Ionicons name="time-outline" size={16} color="#757575" />
                    <Text style={styles.marketDetailText}>{item.time}</Text>
                </View>
                <View style={styles.attendeesContainer}>
                    <MaterialCommunityIcons name="account-group" size={16} color={PRIMARY_GREEN} />
                    <Text style={styles.attendeesText}>{item.attendees} attending</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderBookSection = (title: string, data: Book[]) => {
        if (data.length === 0) return null;
        return (
            <View>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <TouchableOpacity><Text style={styles.seeAll}>Show more &gt;</Text></TouchableOpacity>
                </View>
                <FlatList
                    data={data}
                    renderItem={renderBookItem}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.booksList}
                />
            </View>
        );
    };

    const renderMarketplaceSection = (title: string, subtitle: string) => {
        return (
            <View>
                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                    <View>
                        <Text style={styles.sectionTitle}>{title}</Text>
                        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
                    </View>
                    <TouchableOpacity><Text style={styles.seeAll}>View all</Text></TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Animated Transparent Header */}
            <Animated.View style={[
                styles.headerContainer,
                {
                    transform: [{ translateY: headerTranslateY }],
                    opacity: headerOpacity
                }
            ]}>
                <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                        <Image 
                            source={require('../../assets/images/icons/logo.png')} 
                            style={{ width: 100, height: 30, resizeMode: 'contain', marginLeft: -8 }} 
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                style={styles.profileButton}
                                onPress={() => router.push('/(buyer)/cart')}
                            >
                                <View style={{ position: 'relative' }}>
                                    <Image
                                        source={require('../../assets/images/icons/cart.png')}
                                        style={{ width: 22, height: 22, tintColor: '#1A1A1A' }}
                                        resizeMode="contain"
                                    />
                                    {cartItemCount > 0 && (
                                        <View style={styles.cartBadge}>
                                            <Text style={styles.cartBadgeText}>
                                                {cartItemCount > 99 ? '99+' : cartItemCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.profileButton}
                                onPress={() => router.push('/(buyer)/search')}
                            >
                                <Ionicons name="search-outline" size={22} color="#1A1A1A" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.profileButton}
                                onPress={() => router.push('/(buyer)/screens/notifications')}
                            >
                                <View style={{ position: 'relative' }}>
                                    <Image
                                        source={require('../../assets/images/icons/notification.png')}
                                        style={{ width: 22, height: 22, tintColor: '#1A1A1A' }}
                                        resizeMode="contain"
                                    />
                                    {unreadNotifCount > 0 && (
                                        <View style={styles.cartBadge}>
                                            <Text style={styles.cartBadgeText}>
                                                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Animated.View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    <Text style={styles.loadingText}>Loading books...</Text>
                </View>
            ) : (
                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}>

                    {/* Ad Carousel */}
                    {ads.length > 0 && (
                        <View style={styles.carouselContainer}>
                            <FlatList
                                ref={flatListRef}
                                data={ads}
                                keyExtractor={item => item.id}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                getItemLayout={(data, index) => ({
                                    length: screenWidth,
                                    offset: screenWidth * index,
                                    index,
                                })}
                                onViewableItemsChanged={onViewableItemsChanged}
                                viewabilityConfig={viewabilityConfig}
                                renderItem={({ item }) => (
                                    <View style={styles.carouselItem}>
                                        <Image
                                            source={{ uri: item.imageBase64 }}
                                            style={styles.carouselImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                )}
                            />
                            {/* Pagination Dots */}
                            {ads.length > 1 && (
                                <View style={styles.paginationContainer}>
                                    {ads.map((_, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.dot,
                                                currentAdIndex === index ? styles.activeDot : styles.inactiveDot
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {topReadingBooks.length === 0 && topSellingBooks.length === 0 && newBooks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No books available right now.</Text>
                        </View>
                    ) : (
                        <>
                            {renderBookSection('Top Reading Books', topReadingBooks)}
                    
                    {/* Marketplace Sections */}
                    <View style={{ marginTop: 25 }}>
                        {renderMarketplaceSection('Special Offers', 'Don\'t miss out on amazing deals')}
                        <FlatList
                            data={SPECIAL_OFFERS}
                            renderItem={renderOfferCard}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.offersList}
                            pagingEnabled
                        />
                    </View>
                    
                    <View style={{ marginTop: 25 }}>
                        {renderMarketplaceSection('Shops Nearby', 'Discover local bookstores')}
                        <FlatList
                            data={NEARBY_SHOPS}
                            renderItem={renderShopCard}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.shopsList}
                        />
                    </View>
                    
                    <View style={{ marginTop: 25 }}>
                        {renderMarketplaceSection('Book Markets', 'Upcoming events near you')}
                        <FlatList
                            data={BOOK_MARKETS}
                            renderItem={renderMarketCard}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.marketsList}
                        />
                    </View>
                    
                    {renderBookSection('Top Selling Books', topSellingBooks)}
                    {renderBookSection('New Books', newBooks)}
                    {renderBookSection('Old / Used Books', usedBooks)}
                    {renderBookSection('Top Sellers', topSellerBooks)}
                </>
            )}

                </Animated.ScrollView>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'transparent',
        paddingBottom: 10,
    },
    safeAreaHeader: {
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingTop: 10,
    },
    logoText: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
        letterSpacing: -1,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EEEEEE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cartBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
    },

    scrollContent: {
        paddingTop: 100, // Add padding for the absolute header
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    seeAll: {
        color: PRIMARY_GREEN,
        fontFamily: 'Poppins_400Regular',
        fontSize: 12,
    },
    carouselContainer: {
        height: 200,
        marginBottom: 25,
    },
    carouselItem: {
        width: screenWidth,
        height: 180,
        paddingHorizontal: 20,
    },
    carouselImage: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
        backgroundColor: '#EEEEEE',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: PRIMARY_GREEN,
        width: 16,
    },
    inactiveDot: {
        backgroundColor: '#E0E0E0',
    },
    booksList: {
        paddingLeft: 20,
        paddingRight: 10,
        marginBottom: 25,
    },
    bookCard: {
        width: 120, // Slightly improved width
        marginRight: 15,
    },
    bookImageContainer: {
        width: '100%',
        height: 170,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        marginBottom: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden', // important for image
        alignItems: 'center',
        justifyContent: 'center', // for placeholder icon
    },
    bookInfo: {
        paddingHorizontal: 0,
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
    },
    bookPrice: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
        marginTop: 2,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    bookImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    sectionSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
        marginTop: 2,
    },
    offersList: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    offerCard: {
        width: screenWidth * 0.8,
        marginRight: 15,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    offerImage: {
        width: '100%',
        height: 160,
    },
    offerOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    discountBadge: {
        backgroundColor: PRIMARY_GREEN,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    discountText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    offerInfo: {
        padding: 15,
    },
    offerTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    offerMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shopNameSmall: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: '#757575',
    },
    validText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    shopsList: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    shopCard: {
        width: 220,
        marginRight: 15,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    shopImage: {
        width: '100%',
        height: 140,
    },
    shopInfo: {
        padding: 12,
    },
    shopHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    shopName: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        flex: 1,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    distanceText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: PRIMARY_GREEN,
    },
    shopCategory: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 6,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    ratingText: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    reviewsText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Poppins_500Medium',
        color: '#757575',
    },
    marketsList: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    marketCard: {
        width: 250,
        marginRight: 15,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    marketImage: {
        width: '100%',
        height: 140,
    },
    marketInfo: {
        padding: 12,
    },
    marketName: {
        fontSize: 15,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    marketDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    marketDetailText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    attendeesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    attendeesText: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: PRIMARY_GREEN,
    },
});

export default BuyerHomeScreen;
