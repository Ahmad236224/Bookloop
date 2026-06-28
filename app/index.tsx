import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY_GREEN = '#00695C';
const LIGHT_TEAL = '#B2DFDB';

const Index = () => {
    const router = useRouter();

    const handleSelectRole = (role: 'buyer' | 'seller') => {
        router.push({ pathname: '/(auth)/login', params: { role } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.content}>
                <Animated.View entering={FadeInUp.duration(1000)} style={styles.header}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="account-group-outline" size={50} color={PRIMARY_GREEN} />
                    </View>
                    <Text style={styles.title}>Choose Account Type</Text>
                    <Text style={styles.subtitle}>Select how you want to use BookLoop</Text>
                </Animated.View>

                <View style={styles.cardsContainer}>
                    <Animated.View entering={FadeInDown.delay(200).duration(800)} style={{ width: '100%' }}>
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.9}
                            onPress={() => handleSelectRole('buyer')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                                <MaterialCommunityIcons name="account-outline" size={32} color={PRIMARY_GREEN} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>Buyer</Text>
                                <Text style={styles.cardDescription}>
                                    Browse, search, and buy books from our extensive collection.
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={PRIMARY_GREEN} />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).duration(800)} style={{ width: '100%' }}>
                        <TouchableOpacity
                            style={styles.card}
                            activeOpacity={0.9}
                            onPress={() => handleSelectRole('seller')}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                                <MaterialCommunityIcons name="storefront-outline" size={32} color={PRIMARY_GREEN} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>Seller</Text>
                                <Text style={styles.cardDescription}>
                                    List your books for sale and manage your inventory easily.
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={PRIMARY_GREEN} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_GREEN,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 50,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 25,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: LIGHT_TEAL,
        textAlign: 'center',
    },
    cardsContainer: {
        width: '100%',
        gap: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: PRIMARY_GREEN,
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        color: '#757575',
        lineHeight: 18,
    },
});

export default Index;
