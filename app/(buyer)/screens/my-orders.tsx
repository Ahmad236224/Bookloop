import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const PRIMARY_GREEN = '#000000';

interface OrderItem {
    bookId: string;
    title: string;
    author: string;
    price: number;
    quantity: number;
    imageUrl: string;
}

interface Order {
    id: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: any;
}

const MyOrdersScreen = () => {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const ordersRef = collection(db, 'orders'); // Query top-level orders
        const q = query(
            ordersRef,
            where('userId', '==', user.uid)
            // orderBy('createdAt', 'desc') // Removed to avoid index requirement
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders: Order[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedOrders.push({
                    id: doc.id,
                    items: data.items || [],
                    total: data.total || data.totalAmount || 0,
                    status: data.status || 'pending',
                    createdAt: data.createdAt
                });
            });

            // Client-side sort
            fetchedOrders.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderOrderItem = ({ item }: { item: Order }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.orderDate}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
            </Text>

            <View style={styles.itemsList}>
                {item.items.map((orderItem, index) => (
                    <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemTitle}>{orderItem.quantity}x {orderItem.title}</Text>
                        <Text style={styles.itemPrice}>${(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.orderFooter}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${item.total.toFixed(2)}</Text>
            </View>
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered': return '#4CAF50';  // Green
            case 'shipped': return '#9C27B0';    // Purple
            case 'processing': return '#2196F3'; // Blue
            case 'pending': return '#FF9800';    // Orange
            case 'cancelled': return '#F44336';  // Red
            default: return '#757575';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.navigate('/(buyer)/profile')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Orders</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyText}>No orders yet</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    listContent: {
        padding: 20,
    },
    orderCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    orderId: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    orderStatus: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
    },
    orderDate: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 15,
    },
    itemsList: {
        marginBottom: 10,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    itemTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#333',
        flex: 1,
    },
    itemPrice: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 10,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    totalValue: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#757575',
    },
});

export default MyOrdersScreen;
