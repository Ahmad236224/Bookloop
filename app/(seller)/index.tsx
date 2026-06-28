import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LineChart } from 'react-native-chart-kit';

const PRIMARY_COLOR = '#006666';
const LIGHT_TEAL = '#E6F7F7';
const WHITE = '#FFFFFF';
const GRAY = '#757575';
const DARK = '#1A1A1A';

const { width: screenWidth } = Dimensions.get('window');

interface Order {
    id: string;
    total: number;
    status: string;
    createdAt: any;
    items: any[];
    buyerName?: string;
}

const SellerDashboardScreen = () => {
    const router = useRouter();
    const [booksCount, setBooksCount] = useState(0);
    const [soldBooksCount, setSoldBooksCount] = useState(0);
    const [ordersCount, setOrdersCount] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [weeklyEarnings, setWeeklyEarnings] = useState([1200, 1800, 1500, 2100, 1900, 2500, 2200]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    useFocusEffect(
        useCallback(() => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            const booksQ = query(collection(db, 'books'), where('sellerId', '==', user.uid));
            const unsubscribeBooks = onSnapshot(booksQ, (snapshot) => {
                setBooksCount(snapshot.size);
            });

            const ordersQ = query(collection(db, 'orders'), where('sellerIds', 'array-contains', user.uid));
            const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
                const orders: Order[] = [];
                let earnings = 0;
                let soldCount = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    orders.push({
                        id: doc.id,
                        total: data.total || data.totalAmount || 0,
                        status: data.status || 'pending',
                        createdAt: data.createdAt,
                        items: data.items || [],
                        buyerName: data.buyerName || data.buyer?.name || 'Unknown'
                    });

                    if (data.status !== 'cancelled') {
                        (data.items || []).forEach((item: any) => {
                            if (item.sellerId === user.uid) {
                                soldCount += item.quantity || 1;
                                earnings += (item.price * (item.quantity || 1)) * 0.5;
                            }
                        });
                    }
                });

                setSoldBooksCount(soldCount);
                setTotalEarnings(earnings);

                setOrdersCount(snapshot.size);

                orders.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                setRecentOrders(orders.slice(0, 5));
                setLoading(false);
            }, (error) => {
                console.error("Error fetching orders:", error);
                setLoading(false);
            });

            const notifsQ = query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false));
            const unsubscribeNotifs = onSnapshot(notifsQ, (snapshot) => {
                setUnreadNotifCount(snapshot.size);
            });

            return () => {
                unsubscribeBooks();
                unsubscribeOrders();
                unsubscribeNotifs();
            };
        }, [])
    );

    const chartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                data: weeklyEarnings,
                color: (opacity = 1) => `rgba(0, 102, 102, ${opacity})`,
                strokeWidth: 3,
            }
        ]
    };

    const chartConfig = {
        backgroundColor: WHITE,
        backgroundGradientFrom: WHITE,
        backgroundGradientTo: WHITE,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 102, 102, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: PRIMARY_COLOR,
        },
        propsForBackgroundLines: {
            strokeDasharray: '4',
            stroke: '#E0E0E0',
        }
    };

    const headerTranslateY = useMemo(() =>
        scrollY.interpolate({
            inputRange: [0, 100],
            outputRange: [0, -80],
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }),
        [scrollY]
    );

    const headerOpacity = useMemo(() =>
        scrollY.interpolate({
            inputRange: [0, 100],
            outputRange: [1, 0],
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }),
        [scrollY]
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Transparent Animated Header */}
            <Animated.View
                style={[
                    styles.headerWrapper,
                    {
                        transform: [{ translateY: headerTranslateY }],
                        opacity: headerOpacity,
                    }
                ]}
            >
                <SafeAreaView edges={['top']} style={styles.safeArea}>
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/images/icons/logo.png')}
                            style={{ width: 100, height: 30, resizeMode: 'contain', marginLeft: -8 }}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                style={styles.profileButton}
                                onPress={() => {
                                    router.push('/(seller)/screens/notifications');
                                }}
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
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Loading dashboard...</Text>
                </View>
            ) : (
                <Animated.ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                >
                    {/* Top Row: Add Button & Stats */}
                    <View style={styles.topRow}>
                        <TouchableOpacity style={styles.addCard} onPress={() => router.push('/(seller)/add-book')}>
                            <View style={styles.addIconContainer}>
                                <Ionicons name="add" size={32} color={WHITE} />
                            </View>
                            <Text style={styles.addText}>Add a new book</Text>
                        </TouchableOpacity>
                        <View style={styles.runningCard}>
                            <Text style={styles.runningNumber}>{ordersCount}</Text>
                            <Text style={styles.runningLabel}>Running Orders</Text>
                            <Ionicons name="checkmark-circle-outline" size={28} color={PRIMARY_COLOR} style={styles.runningIcon} />
                        </View>
                    </View>

                    {/* Total Earnings Card */}
                    <View style={styles.earningsCard}>
                        <View style={styles.earningsHeader}>
                            <Text style={styles.earningsLabel}>Total earnings</Text>
                            <TouchableOpacity>
                                <MaterialCommunityIcons name="swap-horizontal" size={20} color={GRAY} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.earningsAmount}>PKR {totalEarnings.toLocaleString()}</Text>
                    </View>

                    {/* Graph Card */}
                    <View style={styles.graphCard}>
                        <View style={styles.graphHeader}>
                            <Text style={styles.graphTitle}>Total Revenue</Text>
                            <View style={styles.periodSelector}>
                                <Text style={styles.periodText}>This week</Text>
                                <Ionicons name="chevron-down" size={16} color={GRAY} />
                            </View>
                        </View>
                        <View style={styles.chartWrapper}>
                            <LineChart
                                data={chartData}
                                width={screenWidth - 60}
                                height={200}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                            />
                            {/* Tooltip */}
                            <View style={styles.tooltip}>
                                <Text style={styles.tooltipText}>PKR {weeklyEarnings[5]}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Books Stats Row */}
                    <View style={styles.booksRow}>
                        {/* Listed Books */}
                        <View style={styles.bookStatCard}>
                            <View style={[styles.bookIconContainer, { backgroundColor: LIGHT_TEAL }]}>
                                <MaterialCommunityIcons name="book-multiple" size={28} color={PRIMARY_COLOR} />
                            </View>
                            <Text style={styles.bookStatNumber}>{booksCount}</Text>
                            <Text style={styles.bookStatLabel}>Books Listed</Text>
                        </View>

                        {/* Sold Books */}
                        <View style={styles.bookStatCard}>
                            <View style={[styles.bookIconContainer, { backgroundColor: '#FFF3E0' }]}>
                                <MaterialCommunityIcons name="book-check" size={28} color="#E65100" />
                            </View>
                            <Text style={styles.bookStatNumber}>{soldBooksCount}</Text>
                            <Text style={styles.bookStatLabel}>Books Sold</Text>
                        </View>
                    </View>

                    {/* Requests Section */}
                    <TouchableOpacity style={styles.requestsSection} onPress={() => router.push('/(seller)/orders')}>
                        <Text style={styles.requestsTitle}>Requests</Text>
                        <View style={styles.seeAllRow}>
                            <Text style={styles.seeAllText}>See all</Text>
                            <Ionicons name="chevron-forward" size={16} color={GRAY} />
                        </View>
                    </TouchableOpacity>
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
    headerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'transparent',
        paddingBottom: 10,
    },
    safeArea: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingTop: 10,
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: PRIMARY_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: GRAY,
    },
    userName: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: DARK,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
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
        color: GRAY,
    },
    scrollContent: {
        paddingTop: 100,
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    topRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    addCard: {
        flex: 1,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 16,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    addIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: WHITE,
        textAlign: 'center',
    },
    runningCard: {
        flex: 1,
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
    },
    runningNumber: {
        fontSize: 36,
        fontFamily: 'Poppins_700Bold',
        color: DARK,
        marginBottom: 4,
    },
    runningLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: GRAY,
    },
    runningIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    earningsCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    earningsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    earningsLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: GRAY,
    },
    earningsAmount: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
        color: DARK,
    },
    graphCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    graphHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    graphTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: DARK,
    },
    periodSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    periodText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: GRAY,
    },
    chartWrapper: {
        position: 'relative',
    },
    chart: {
        borderRadius: 16,
        paddingRight: 10,
    },
    tooltip: {
        position: 'absolute',
        top: 60,
        right: 50,
        backgroundColor: PRIMARY_COLOR,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tooltipText: {
        color: WHITE,
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
    },
    booksRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15,
    },
    bookStatCard: {
        flex: 1,
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        alignItems: 'center',
    },
    bookIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    bookStatNumber: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        color: DARK,
        marginBottom: 4,
    },
    bookStatLabel: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        color: GRAY,
    },
    requestsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    requestsTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: DARK,
    },
    seeAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: GRAY,
    },
});

export default SellerDashboardScreen;
