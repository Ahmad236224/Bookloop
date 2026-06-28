import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, onSnapshot, query, orderBy, limit, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase';

const PRIMARY_GREEN = '#000000';

interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: any;
    read: boolean;
    type?: string;
    orderId?: string;
}

const NotificationsScreen = () => {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        // For now, let's assume a 'notifications' subcollection exists, or we show empty.
        // If we want seeded data, we'd need to add it. 
        // Showing empty state or mock if collection is empty could be better for UX testing.
        const notifRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifRef, orderBy('createdAt', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Notification[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                items.push({
                    id: doc.id,
                    title: data.title,
                    message: data.message,
                    createdAt: data.createdAt,
                    read: data.read || false
                });
            });
            setNotifications(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getNotificationIcon = (type?: string) => {
        switch (type) {
            case 'order_placed':
                return 'checkmark-circle-outline';
            case 'order_approved':
                return 'checkmark-done-circle-outline';
            case 'order_shipped':
                return 'cube-outline';
            case 'order_delivered':
                return 'home-outline';
            case 'new_order':
                return 'cart-outline';
            default:
                return 'notifications-outline';
        }
    };

    const markAsRead = async (notification: Notification) => {
        if (notification.read) return;
        const user = auth.currentUser;
        if (!user) return;
        
        const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        await updateDoc(notifRef, { read: true });
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[styles.card, !item.read && styles.unreadCard]}
            onPress={() => markAsRead(item)}
        >
            <View style={styles.iconContainer}>
                <Ionicons name={getNotificationIcon(item.type) as any} size={24} color={PRIMARY_GREEN} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Just now'}
                </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(buyer)/')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                    <Text style={styles.emptySubtext}>We&apos;ll let you know when something important happens.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
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
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'flex-start',
    },
    unreadCard: {
        backgroundColor: '#E0F2F1', // Light green tint
    },
    iconContainer: {
        marginRight: 15,
        marginTop: 2,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        color: '#616161',
        marginBottom: 5,
        lineHeight: 18,
    },
    date: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: PRIMARY_GREEN,
        marginTop: 6,
        marginLeft: 5,
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
        padding: 40,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 18,
        fontFamily: 'Poppins_600SemiBold',
        color: '#424242',
    },
    emptySubtext: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
        textAlign: 'center',
    },
});

export default NotificationsScreen;
