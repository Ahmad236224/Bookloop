import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const PRIMARY_GREEN = '#000000';
const TEAL = '#26A69A';

interface CartItem {
    id: string;
    bookId: string;
    title: string;
    author: string;
    price: number;
    imageUrl: string;
    imageBase64?: string | null;
    quantity: number;
    sellerId: string;
    addedAt: any;
}

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    paymentMethod?: {
        type: 'easypaisa' | 'jazzcash';
        phone: string;
    };
}

const CartScreen = () => {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkoutStep, setCheckoutStep] = useState(0); // 0: cart, 1: review, 2: payment, 3: success
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [processingOrder, setProcessingOrder] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            router.replace('/(auth)/login');
            return;
        }

        // Cart listener
        const cartRef = collection(db, 'users', user.uid, 'cart');
        const unsubscribeCart = onSnapshot(cartRef, (snapshot) => {
            const items: CartItem[] = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as CartItem);
            });
            setCartItems(items);
            setLoading(false);
        });

        // User profile listener
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserProfile({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    shippingAddress: data.shippingAddress || '',
                    paymentMethod: data.paymentMethod || undefined
                });
            }
        });

        return () => {
            unsubscribeCart();
            unsubscribeUser();
        };
    }, []);

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const updateQuantity = async (itemId: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        const user = auth.currentUser;
        if (!user) return;

        const itemRef = doc(db, 'users', user.uid, 'cart', itemId);
        await updateDoc(itemRef, { quantity: newQuantity });
    };

    const removeItem = async (itemId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        const itemRef = doc(db, 'users', user.uid, 'cart', itemId);
        await deleteDoc(itemRef);
    };

    const placeOrder = async () => {
        if (!userProfile || cartItems.length === 0) return;
        
        setProcessingOrder(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const orderData: any = {
                userId: user.uid,
                buyerId: user.uid,
                buyerName: userProfile.name,
                buyerEmail: userProfile.email,
                buyer: {
                    name: userProfile.name,
                    email: userProfile.email,
                    phone: userProfile.phone,
                    shippingAddress: userProfile.shippingAddress
                },
                items: cartItems.map(item => ({
                    bookId: item.bookId,
                    title: item.title,
                    author: item.author,
                    price: item.price,
                    quantity: item.quantity,
                    sellerId: item.sellerId
                })),
                sellerIds: [...new Set(cartItems.map(item => item.sellerId))],
                totalAmount: totalPrice,
                total: totalPrice,
                status: 'pending',
                createdAt: new Date()
            };

            if (userProfile.paymentMethod) {
                orderData.buyer.paymentMethod = userProfile.paymentMethod;
            }

            // Add order to orders collection
            const orderRef = doc(collection(db, 'orders'));
            await setDoc(orderRef, { ...orderData, id: orderRef.id });

            // Create notification for buyer
            const buyerNotifRef = doc(collection(db, 'users', user.uid, 'notifications'));
            await setDoc(buyerNotifRef, {
                id: buyerNotifRef.id,
                title: 'Order Placed!',
                message: `Your order #${orderRef.id.slice(0, 8).toUpperCase()} has been placed successfully.`,
                orderId: orderRef.id,
                type: 'order_placed',
                read: false,
                createdAt: new Date()
            });

            // Create notification for seller (for each seller in the order items)
            const sellers = [...new Set(cartItems.map(item => item.sellerId))];
            for (const sellerId of sellers) {
                const sellerNotifRef = doc(collection(db, 'users', sellerId, 'notifications'));
                await setDoc(sellerNotifRef, {
                    id: sellerNotifRef.id,
                    title: 'New Order!',
                    message: `You have a new order #${orderRef.id.slice(0, 8).toUpperCase()}.`,
                    orderId: orderRef.id,
                    type: 'new_order',
                    read: false,
                    createdAt: new Date()
                });
            }

            // Clear cart
            const cartRef = collection(db, 'users', user.uid, 'cart');
            const snapshot = await getDoc(doc(db, 'users', user.uid));
            const cartSnapshot = await getDoc(doc(db, 'users', user.uid));
            // Wait, let's delete all items in cart
            const cartItemsSnapshot = await getDocs(cartRef);
            const deletePromises = cartItemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            setCheckoutStep(3);
        } catch (error) {
            console.error('Error placing order:', error);
            alert('Failed to place order. Please try again.');
        } finally {
            setProcessingOrder(false);
        }
    };

    const renderCartItem = ({ item }: { item: CartItem }) => {
        const imageSource = item.imageBase64 ? { uri: item.imageBase64 } : (item.imageUrl ? { uri: item.imageUrl } : null);

        return (
            <View style={styles.cartItem}>
                <View style={styles.itemImageContainer}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.itemImage} resizeMode="cover" />
                    ) : (
                        <MaterialCommunityIcons name="book-open-variant" size={40} color={PRIMARY_GREEN} />
                    )}
                </View>
                <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.itemAuthor}>{item.author}</Text>
                    <Text style={styles.itemPrice}>PKR {item.price.toFixed(2)}</Text>
                </View>
                <View style={styles.itemActions}>
                    <View style={styles.quantityContainer}>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                            <Ionicons name="remove" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeItem(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderCheckoutSteps = () => {
        switch (checkoutStep) {
            case 0: // Cart
                return (
                    <View style={{ flex: 1 }}>
                        {cartItems.length === 0 ? (
                            <View style={styles.emptyCart}>
                                <MaterialCommunityIcons name="cart-off" size={80} color="#E0E0E0" />
                                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                                <TouchableOpacity
                                    style={styles.shopNowButton}
                                    onPress={() => router.push('/(buyer)/')}
                                >
                                    <Text style={styles.shopNowText}>Shop Now</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <FlatList
                                    data={cartItems}
                                    renderItem={renderCartItem}
                                    keyExtractor={(item) => item.id}
                                    contentContainerStyle={styles.cartList}
                                />
                                <SafeAreaView edges={['bottom']} style={styles.footerContainer}>
                                    <View style={styles.footer}>
                                        <View style={styles.priceRow}>
                                            <Text style={styles.priceLabel}>Total ({totalItems} items):</Text>
                                            <Text style={styles.priceValue}>PKR {totalPrice.toFixed(2)}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.checkoutButton}
                                            onPress={() => setCheckoutStep(1)}
                                        >
                                            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                                        </TouchableOpacity>
                                    </View>
                                </SafeAreaView>
                            </>
                        )}
                    </View>
                );
            case 1: // Review
                return (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.reviewContainer}>
                        <Text style={styles.stepTitle}>Review Your Order</Text>
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Items</Text>
                            {cartItems.map((item) => (
                                <View key={item.id} style={styles.reviewItem}>
                                    <Text style={styles.reviewItemTitle}>{item.title}</Text>
                                    <Text style={styles.reviewItemQty}>x{item.quantity}</Text>
                                    <Text style={styles.reviewItemPrice}>PKR {(item.price * item.quantity).toFixed(2)}</Text>
                                </View>
                            ))}
                            <View style={styles.reviewTotal}>
                                <Text style={styles.reviewTotalLabel}>Total:</Text>
                                <Text style={styles.reviewTotalValue}>PKR {totalPrice.toFixed(2)}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Shipping Address</Text>
                            <Text style={styles.infoText}>{userProfile?.name}</Text>
                            <Text style={styles.infoText}>{userProfile?.shippingAddress || 'No address set'}</Text>
                            <Text style={styles.infoText}>{userProfile?.phone || 'No phone set'}</Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Payment Method</Text>
                            {userProfile?.paymentMethod ? (
                                <View style={styles.paymentMethod}>
                                    <Text style={styles.paymentType}>
                                        {userProfile.paymentMethod.type === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
                                    </Text>
                                    <Text style={styles.paymentPhone}>{userProfile.paymentMethod.phone}</Text>
                                </View>
                            ) : (
                                <Text style={styles.infoText}>No payment method set</Text>
                            )}
                        </View>

                        <View style={styles.reviewButtons}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setCheckoutStep(0)}
                            >
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={() => setCheckoutStep(2)}
                            >
                                <Text style={styles.continueButtonText}>Continue to Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );
            case 2: // Payment
                return (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.paymentContainer}>
                        <Text style={styles.stepTitle}>Confirm Payment</Text>
                        <View style={styles.paymentSummary}>
                            <Text style={styles.paymentAmountLabel}>Total Amount</Text>
                            <Text style={styles.paymentAmountValue}>PKR {totalPrice.toFixed(2)}</Text>
                        </View>

                        {userProfile?.paymentMethod && (
                            <View style={styles.paymentMethodSelected}>
                                <Text style={styles.paymentMethodLabel}>Pay with:</Text>
                                <View style={styles.selectedPayment}>
                                    <Text style={styles.selectedPaymentType}>
                                        {userProfile.paymentMethod.type === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
                                    </Text>
                                    <Text style={styles.selectedPaymentPhone}>{userProfile.paymentMethod.phone}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.paymentButtons}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setCheckoutStep(1)}
                            >
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.placeOrderButton}
                                onPress={placeOrder}
                                disabled={processingOrder}
                            >
                                {processingOrder ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.placeOrderButtonText}>Place Order</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );
            case 3: // Success
                return (
                    <View style={styles.successContainer}>
                        <MaterialCommunityIcons name="check-circle" size={100} color="#10B981" />
                        <Text style={styles.successTitle}>Order Placed!</Text>
                        <Text style={styles.successText}>Your order has been placed successfully.</Text>
                        <TouchableOpacity
                            style={styles.successButton}
                            onPress={() => {
                                setCheckoutStep(0);
                                router.push('/(buyer)/');
                            }}
                        >
                            <Text style={styles.successButtonText}>Continue Shopping</Text>
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView edges={['top']} style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backIcon}
                        onPress={() => {
                            if (checkoutStep > 0) {
                                setCheckoutStep(checkoutStep - 1);
                            } else {
                                router.push('/(buyer)/');
                            }
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {checkoutStep === 0 ? 'Cart' : checkoutStep === 1 ? 'Review' : checkoutStep === 2 ? 'Payment' : 'Success'}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    <Text style={styles.loadingText}>Loading cart...</Text>
                </View>
            ) : (
                renderCheckoutSteps()
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    safeArea: {
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
    },
    backIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
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
    cartList: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    footerContainer: {
        marginHorizontal: 16,
        marginBottom: 32,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    itemImageContainer: {
        width: 80,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    itemTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    itemAuthor: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    itemActions: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        overflow: 'hidden',
    },
    quantityButton: {
        width: 28,
        height: 28,
        backgroundColor: TEAL,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityText: {
        paddingHorizontal: 10,
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    removeButton: {
        padding: 4,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    priceValue: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    checkoutButton: {
        backgroundColor: TEAL,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    emptyCart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyCartText: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginTop: 16,
        marginBottom: 24,
    },
    shopNowButton: {
        backgroundColor: TEAL,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    shopNowText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
    },
    reviewContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    stepTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginBottom: 24,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    reviewItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    reviewItemTitle: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#1A1A1A',
    },
    reviewItemQty: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginHorizontal: 12,
    },
    reviewItemPrice: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    reviewTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        marginTop: 4,
        borderTopWidth: 2,
        borderTopColor: '#F5F5F5',
    },
    reviewTotalLabel: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    reviewTotalValue: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    infoText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        lineHeight: 22,
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    paymentType: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    paymentPhone: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    reviewButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    backButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    continueButton: {
        flex: 2,
        backgroundColor: TEAL,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    paymentContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    paymentSummary: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    paymentAmountLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 4,
    },
    paymentAmountValue: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
    },
    paymentMethodSelected: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    paymentMethodLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        marginBottom: 8,
    },
    selectedPayment: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectedPaymentType: {
        fontSize: 16,
        fontFamily: 'Poppins_600SemiBold',
        color: '#1A1A1A',
    },
    selectedPaymentPhone: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
    },
    paymentButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    placeOrderButton: {
        flex: 2,
        backgroundColor: TEAL,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeOrderButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#1A1A1A',
        marginTop: 24,
        marginBottom: 8,
    },
    successText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        textAlign: 'center',
        marginBottom: 32,
    },
    successButton: {
        backgroundColor: TEAL,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 14,
    },
    successButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
});

export default CartScreen;
