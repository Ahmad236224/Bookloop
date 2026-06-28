import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const CustomToggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => {
    const translateX = useSharedValue(value ? 26 : 0);

    React.useEffect(() => {
        translateX.value = value ? 26 : 0;
    }, [value]);

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: withSpring(translateX.value) }],
    }));

    return (
        <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.8}>
            <View style={[
                styles.toggleContainer,
                { backgroundColor: value ? '#00695C' : '#E5E7EB' }
            ]}>
                <Animated.View style={[styles.toggleThumb, thumbStyle]} />
            </View>
        </TouchableOpacity>
    );
};

const SettingsScreen = () => {
    const router = useRouter();
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.navigate('/(buyer)/profile')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 24 }} />
            </View>
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={styles.label}>Push Notifications</Text>
                    <CustomToggle value={pushNotifications} onValueChange={setPushNotifications} />
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Email Notifications</Text>
                    <CustomToggle value={emailNotifications} onValueChange={setEmailNotifications} />
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    toggleContainer: {
        width: 52,
        height: 28,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 2,
        position: 'relative',
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        left: 2,
    },
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
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#1A1A1A' },
    content: { padding: 20 },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
    },
    label: { fontSize: 16, fontFamily: 'Poppins_400Regular', color: '#333' }
});

export default SettingsScreen;
