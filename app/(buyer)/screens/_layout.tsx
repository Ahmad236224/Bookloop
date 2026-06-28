import { Stack } from 'expo-router';

export default function ScreensLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="book-details" />
            <Stack.Screen name="my-orders" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="shipping-address" />
            <Stack.Screen name="payment-methods" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="help-support" />
            <Stack.Screen name="notifications" />
        </Stack>
    );
}
