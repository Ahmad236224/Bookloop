import { Stack } from 'expo-router';

export default function SellerScreensLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="store-settings" />
            <Stack.Screen name="payment-methods" />
            <Stack.Screen name="help-support" />
        </Stack>
    );
}
