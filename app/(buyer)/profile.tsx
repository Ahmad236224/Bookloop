import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const PRIMARY_GREEN = '#000000';

const MENU_ITEMS = [
    { id: '1', title: 'My Orders', icon: 'receipt-outline', route: '/(buyer)/screens/my-orders' },
    { id: '2', title: 'Edit Profile', icon: 'person-outline', route: '/(buyer)/screens/edit-profile' },
    { id: '3', title: 'Shipping Address', icon: 'location-outline', route: '/(buyer)/screens/shipping-address' },
    { id: '4', title: 'Payment Methods', icon: 'card-outline', route: '/(buyer)/screens/payment-methods' },
    { id: '5', title: 'Settings', icon: 'settings-outline', route: '/(buyer)/screens/settings' },
    { id: '6', title: 'Help & Support', icon: 'help-circle-outline', route: '/(buyer)/screens/help-support' },
];

const BuyerProfileScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [ordersCount, setOrdersCount] = useState(0);
    const [reviewsCount, setReviewsCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/(auth)/login');
            return;
        }

        // Real-time listener for user data
        const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            }
        });

        // Real-time listener for orders
        const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
            setOrdersCount(snapshot.size);
        });

        // Real-time listener for reviews
        const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
        const reviewsUnsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
            setReviewsCount(snapshot.size);
        });

        // Real-time listener for wishlist
        const wishlistQuery = query(collection(db, 'wishlists'), where('userId', '==', user.uid));
        const wishlistUnsubscribe = onSnapshot(wishlistQuery, (snapshot) => {
            setWishlistCount(snapshot.size);
        });

        setLoading(false);

        return () => {
            userUnsubscribe();
            ordersUnsubscribe();
            reviewsUnsubscribe();
            wishlistUnsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.replace('/(auth)/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <SafeAreaView edges={['top']} style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Profile Avatar & Info */}
                    <View style={styles.profileSection}>
                        {userData?.avatarBase64 ? (
                            <Image source={{ uri: userData.avatarBase64 }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="person" size={50} color="#00695C" />
                            </View>
                        )}
                        <Text style={styles.userName}>{userData?.name || 'User'}</Text>
                        <Text style={styles.userEmail}>{userData?.email || ''}</Text>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{ordersCount}</Text>
                            <Text style={styles.statLabel}>Orders</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{reviewsCount}</Text>
                            <Text style={styles.statLabel}>Reviews</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{wishlistCount}</Text>
                            <Text style={styles.statLabel}>Wishlist</Text>
                        </View>
                    </View>

                    {/* Menu Items */}
                    <View style={styles.menuContainer}>
                        {MENU_ITEMS.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.menuItem}
                                onPress={() => router.push(item.route as any)}
                            >
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name={item.icon as any} size={22} color={PRIMARY_GREEN} />
                                </View>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#CCC" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#FF5252" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
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
    profileSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
    },
    userName: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    userEmail: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginTop: 5,
    },
    content: {
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#EEE',
    },
    menuContainer: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        paddingVertical: 10,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E0F2F1',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    menuTitle: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Poppins_400Regular',
        color: '#333',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFEBEE',
        paddingVertical: 15,
        borderRadius: 12,
    },
    logoutText: {
        color: '#FF5252',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default BuyerProfileScreen;
