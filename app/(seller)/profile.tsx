import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const PRIMARY_GREEN = '#00695C';

const MENU_ITEMS = [
    { id: '1', title: 'Edit Profile', icon: 'person-outline', route: '/(seller)/screens/edit-profile' },
    { id: '2', title: 'Store Settings', icon: 'settings-outline', route: '/(seller)/screens/store-settings' },
    { id: '3', title: 'Wallet', icon: 'wallet-outline', route: '/(seller)/screens/payment-methods' },
    { id: '4', title: 'Help & Support', icon: 'help-circle-outline', route: '/(seller)/screens/help-support' },
];

const SellerProfileScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [booksCount, setBooksCount] = useState(0);
    const [ordersCount, setOrdersCount] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let userUnsubscribe: (() => void) | undefined;
        let booksUnsubscribe: (() => void) | undefined;
        let ordersUnsubscribe: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Real-time listener for user data
            userUnsubscribe = onSnapshot(doc(db, 'sellers', user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    setUserData(null);
                }
            });

            // Real-time listener for books
            const booksQuery = query(collection(db, 'books'), where('sellerId', '==', user.uid));
            booksUnsubscribe = onSnapshot(booksQuery, (snapshot) => {
                setBooksCount(snapshot.size);
            });

            // Real-time listener for orders and earnings
            const ordersQuery = query(collection(db, 'orders'), where('sellerIds', 'array-contains', user.uid));
            ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
                setOrdersCount(snapshot.size);
                let earnings = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.status !== 'cancelled') {
                        earnings += data.total || 0;
                    }
                });
                setTotalEarnings(earnings);
            });

            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (userUnsubscribe) userUnsubscribe();
            if (booksUnsubscribe) booksUnsubscribe();
            if (ordersUnsubscribe) ordersUnsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.replace('/(auth)/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <SafeAreaView edges={['top']} style={styles.customHeader}>
                <TouchableOpacity style={styles.backButton}>
                    {/* Empty for alignment (this is a tab screen) */}
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
                        <Text style={styles.userName}>{userData?.name || 'Seller'}</Text>
                        <Text style={styles.userEmail}>{userData?.email || ''}</Text>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{booksCount}</Text>
                            <Text style={styles.statLabel}>Books</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{ordersCount}</Text>
                            <Text style={styles.statLabel}>Orders</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>${totalEarnings.toFixed(0)}</Text>
                            <Text style={styles.statLabel}>Earnings</Text>
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

export default SellerProfileScreen;
