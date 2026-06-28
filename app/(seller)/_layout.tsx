import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export default function SellerLayout() {
    const insets = useSafeAreaInsets();
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, 'sellers', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserAvatar(data.avatarBase64 || null);
            }
        });

        return unsubscribe;
    }, []);

    const TabIcon = ({ focused, source, activeName, inactiveName }: { focused: boolean, source?: any, activeName?: any, inactiveName?: any }) => (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            {source ? (
                <Image
                    source={source}
                    style={{ width: 18, height: 18, tintColor: '#000000' }}
                    resizeMode="contain"
                />
            ) : (
                <Ionicons
                    name={focused ? activeName : inactiveName}
                    size={18}
                    color="#000000"
                />
            )}
        </View>
    );

    const ProfileTabIcon = ({ focused }: { focused: boolean }) => (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            {userAvatar ? (
                <Image
                    source={{ uri: userAvatar }}
                    style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: 14,
                        borderWidth: focused ? 2 : 0,
                        borderColor: '#00695C'
                    }}
                    resizeMode="cover"
                />
            ) : (
                <Image
                    source={require('../../assets/images/icons/profile.png')}
                    style={{ width: 18, height: 18, tintColor: '#000000' }}
                    resizeMode="contain"
                />
            )}
        </View>
    );

    return (
        <Tabs
            screenOptions={{
                tabBarShowLabel: false,
                headerShown: false,
                unmountOnBlur: true,
                tabBarActiveTintColor: '#000000',
                tabBarInactiveTintColor: '#000000',
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    height: 55 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 8,
                    backgroundColor: '#FFFFFF',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingHorizontal: 20,
                },
                tabBarItemStyle: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginHorizontal: -5,
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={require('../../assets/images/icons/home.png')} />,
                }}
            />
            <Tabs.Screen
                name="add-book"
                options={{
                    title: 'Add Book',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={require('../../assets/images/icons/add-book.png')} />,
                }}
            />
            <Tabs.Screen
                name="my-books"
                options={{
                    title: 'My Books',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={require('../../assets/images/icons/my-book.png')} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={require('../../assets/images/icons/order.png')} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="screens"
                options={{
                    href: null,
                    headerShown: false,
                    tabBarStyle: { display: 'none' },
                }}
            />
        </Tabs>
    );
}
