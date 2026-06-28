import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const PRIMARY_GREEN = '#00695C';
const TEAL = '#00695C';

interface Order {
    id: string;
    userId: string;
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
    createdAt: any;
    items: {
        bookId: string;
        title: string;
        author: string;
        quantity: number;
        price: number;
        imageUrl: string;
    }[];
    buyer?: {
        name: string;
        email: string;
    };
}

const SellerOrdersScreen = () => {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered'>('all');

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('sellerIds', 'array-contains', user.uid)
            // orderBy('createdAt', 'desc') // Removed to avoid index requirement
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders: Order[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedOrders.push({
                    id: doc.id,
                    userId: data.buyerId || data.userId || 'Unknown',
                    total: data.total || data.totalAmount || 0,
                    status: data.status || 'pending',
                    createdAt: data.createdAt,
                    items: data.items || [],
                    buyer: {
                        name: data.buyerName || data.buyer?.name || 'Unknown',
                        email: data.buyerEmail || data.buyer?.email || 'N/A'
                    }
                } as any);
            });

            fetchedOrders.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching seller orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: string, buyerId: string) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { status: newStatus });
            
            // Notify buyer
            if (buyerId && buyerId !== 'Unknown') {
                const buyerNotifRef = doc(collection(db, 'users', buyerId, 'notifications'));
                await setDoc(buyerNotifRef, {
                    title: 'Order Status Updated',
                    message: `Your order #${orderId.slice(0, 8)} is now ${newStatus}.`,
                    type: 'order_status',
                    read: false,
                    orderId: orderId,
                    createdAt: new Date()
                });
            }

            if (Platform.OS === 'web') {
                window.alert(`Order updated to ${newStatus}`);
            } else {
                Alert.alert("Success", `Order updated to ${newStatus}`);
            }
        } catch (error: any) {
            console.error("Error updating status:", error);
            if (Platform.OS === 'web') {
                window.alert(error.message || "Failed to update status");
            } else {
                Alert.alert("Error", error.message || "Failed to update status");
            }
        }
    };

    const handleCancelOrder = (orderId: string, buyerId: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to cancel this order? This action cannot be undone.');
            if (confirmed) {
                updateOrderStatus(orderId, 'cancelled', buyerId);
            }
            return;
        }

        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order? This action cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => updateOrderStatus(orderId, 'cancelled', buyerId)
                }
            ]
        );
    };

    const handleStatusUpdate = (orderId: string, currentStatus: string, buyerId: string) => {
        const statusFlow: { [key: string]: string } = {
            'pending': 'processing',
            'processing': 'shipped',
            'shipped': 'delivered',
            'completed': 'delivered' // Legacy support
        };

        const nextStatus = statusFlow[currentStatus];

        if (nextStatus) {
            if (Platform.OS === 'web') {
                const confirmed = window.confirm(`Mark order as ${nextStatus.toUpperCase()}?`);
                if (confirmed) {
                    updateOrderStatus(orderId, nextStatus, buyerId);
                }
                return;
            }

            Alert.alert(
                'Update Status',
                `Mark order as ${nextStatus.toUpperCase()}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Confirm',
                        onPress: () => updateOrderStatus(orderId, nextStatus, buyerId)
                    }
                ]
            );
        }
    };

    const filteredOrders = filter === 'all'
        ? orders
        : orders.filter(order => order.status === filter);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#FF9800';
            case 'processing': return '#2196F3';
            case 'shipped': return '#9C27B0';
            case 'delivered': return '#4CAF50';
            case 'cancelled': return '#F44336';
            default: return '#757575';
        }
    };

    const renderOrderItem = ({ item }: { item: Order }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                    <Text style={styles.orderDate}>
                            {(() => {
                                if (!item.createdAt) return 'Just now';
                                if (item.createdAt.toDate) {
                                    return item.createdAt.toDate().toLocaleDateString();
                                }
                                if (item.createdAt instanceof Date) {
                                    return item.createdAt.toLocaleDateString();
                                }
                                return new Date(item.createdAt).toLocaleDateString();
                            })()}
                    </Text>
                </View>
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                {/* Cancel Button (Trash Icon) - Only show if not delivered/completed/cancelled */}
                {item.status !== 'delivered' && item.status !== 'completed' && item.status !== 'cancelled' && (
                    <TouchableOpacity
                        onPress={() => handleCancelOrder(item.id, item.userId)}
                        style={{ marginLeft: 10, padding: 4 }}
                    >
                        <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                )}
            </View>

            {/* List items in the order */}
            {item.items && item.items.map((bookItem, index) => (
                <View key={index} style={styles.bookInfo}>
                    {bookItem.imageUrl ? (
                        <Image source={{ uri: bookItem.imageUrl }} style={styles.bookImage} />
                    ) : (
                        <View style={[styles.bookImage, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="book" size={24} color={TEAL} />
                        </View>
                    )}
                    <View style={styles.bookDetails}>
                        <Text style={styles.bookTitle} numberOfLines={1}>{bookItem.title}</Text>
                        <Text style={styles.bookAuthor}>{bookItem.author}</Text>
                        <Text style={styles.orderQuantity}>Qty: {bookItem.quantity} x ${bookItem.price}</Text>
                    </View>
                </View>
            ))}

            <Text style={styles.orderTotal}>Total: ${item.total.toFixed(2)}</Text>

            {item.buyer && (
                <View style={styles.buyerInfo}>
                    <Ionicons name="person-outline" size={16} color="#757575" />
                    <Text style={styles.buyerText}>{item.buyer.name}</Text>
                </View>
            )}

            {item.status !== 'delivered' && item.status !== 'completed' && item.status !== 'cancelled' && (
                <TouchableOpacity
                    style={styles.updateButton}
                    onPress={() => handleStatusUpdate(item.id, item.status, item.userId)}
                >
                    <Text style={styles.updateButtonText}>
                        {item.status === 'pending' ? 'Start Processing' :
                            item.status === 'processing' ? 'Mark as Shipped' :
                                item.status === 'shipped' ? 'Mark as Delivered' : 'Update'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    {/* Empty for alignment (this is a tab screen) */}
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Orders</Text>
                <View style={styles.backButton} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {['all', 'pending', 'processing', 'shipped', 'delivered'].map((status) => (
                    <TouchableOpacity
                        key={status}
                        style={[
                            styles.filterTab,
                            filter === status && styles.filterTabActive
                        ]}
                        onPress={() => setFilter(status as any)}
                    >
                        <Text style={[
                            styles.filterTabText,
                            filter === status && styles.filterTabTextActive
                        ]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={TEAL} />
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyText}>No orders found</Text>
                    <Text style={styles.emptySubtext}>
                        {filter === 'all' ? 'You haven\'t received any orders yet' : `No ${filter} orders`}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
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
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    filterTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8,
    },
    filterTabActive: {
        backgroundColor: PRIMARY_GREEN,
    },
    filterTabText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    filterTabTextActive: {
        color: '#FFF',
        fontFamily: 'Poppins_600SemiBold',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
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
        marginBottom: 15,
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    orderDate: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
    },
    bookInfo: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    bookImage: {
        width: 60,
        height: 90,
        borderRadius: 6,
        marginRight: 12,
    },
    bookDetails: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    bookAuthor: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 4,
    },
    orderQuantity: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    orderTotal: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
        alignSelf: 'flex-start',
    },
    buyerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
        marginBottom: 10,
    },
    buyerText: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginLeft: 6,
    },
    updateButton: {
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    updateButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
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

export default SellerOrdersScreen;
