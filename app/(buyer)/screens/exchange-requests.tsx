import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getAuth } from 'firebase/auth';

const PRIMARY_COLOR = '#000000';

interface ExchangeRequest {
    id: string;
    bookId: string;
    bookTitle: string;
    requesterId: string;
    requesterName: string;
    requesterEmail: string;
    ownerId: string;
    ownerName: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

const ExchangeRequestsScreen = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [requests, setRequests] = useState<ExchangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'exchangeRequests'),
            activeTab === 'incoming'
                ? where('ownerId', '==', currentUser.uid)
                : where('requesterId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs: ExchangeRequest[] = [];
            snapshot.forEach((doc) => {
                reqs.push({ id: doc.id, ...doc.data() } as ExchangeRequest);
            });
            setRequests(reqs);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser, activeTab]);

    const handleAcceptRequest = async (requestId: string) => {
        try {
            const requestRef = doc(db, 'exchangeRequests', requestId);
            await updateDoc(requestRef, { status: 'accepted' });
            
            // Also update the book status
            const requestDoc = await getDoc(requestRef);
            if (requestDoc.exists()) {
                const bookId = requestDoc.data().bookId;
                const bookRef = doc(db, 'exchangeBooks', bookId);
                await updateDoc(bookRef, { status: 'exchanged' });
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const requestRef = doc(db, 'exchangeRequests', requestId);
            await updateDoc(requestRef, { status: 'rejected' });
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const renderRequestItem = ({ item }: { item: ExchangeRequest }) => {
        const isIncoming = activeTab === 'incoming';
        return (
            <View style={styles.requestCard}>
                <View style={styles.requestHeader}>
                    <View style={styles.userInfo}>
                        <View style={styles.userAvatar}>
                            <MaterialCommunityIcons name="account" size={20} color="#FFFFFF" />
                        </View>
                        <View>
                            <Text style={styles.userName}>
                                {isIncoming ? item.requesterName : item.ownerName}
                            </Text>
                            <Text style={styles.userEmail}>
                                {isIncoming ? item.requesterEmail : item.ownerEmail}
                            </Text>
                        </View>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        item.status === 'pending' && styles.statusPending,
                        item.status === 'accepted' && styles.statusAccepted,
                        item.status === 'rejected' && styles.statusRejected,
                    ]}>
                        <Text style={[
                            styles.statusText,
                            item.status === 'pending' && styles.statusPendingText,
                            item.status === 'accepted' && styles.statusAcceptedText,
                            item.status === 'rejected' && styles.statusRejectedText,
                        ]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{item.bookTitle}</Text>
                </View>

                {isIncoming && item.status === 'pending' && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleRejectRequest(item.id)}
                        >
                            <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleAcceptRequest(item.id)}
                        >
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.push('/(buyer)/exchange')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Exchange Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
                    onPress={() => setActiveTab('incoming')}
                >
                    <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
                        Incoming
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
                    onPress={() => setActiveTab('outgoing')}
                >
                    <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
                        Outgoing
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="inbox" size={64} color="#9E9E9E" />
                            <Text style={styles.emptyText}>No {activeTab} requests</Text>
                        </View>
                    }
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
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 15,
        gap: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
    },
    activeTab: {
        backgroundColor: PRIMARY_COLOR,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#757575',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 80,
    },
    requestCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: PRIMARY_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
    },
    userEmail: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusPending: {
        backgroundColor: '#FFF3E0',
    },
    statusAccepted: {
        backgroundColor: '#E8F5E9',
    },
    statusRejected: {
        backgroundColor: '#FFEBEE',
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Poppins_700Bold',
    },
    statusPendingText: {
        color: '#E65100',
    },
    statusAcceptedText: {
        color: '#2E7D32',
    },
    statusRejectedText: {
        color: '#C62828',
    },
    bookInfo: {
        marginBottom: 12,
    },
    bookTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: PRIMARY_COLOR,
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    rejectButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    rejectButtonText: {
        color: '#757575',
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#9E9E9E',
    },
});

export default ExchangeRequestsScreen;
