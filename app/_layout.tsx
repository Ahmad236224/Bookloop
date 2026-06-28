import {
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    useFonts,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Platform, Dimensions } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
    initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

function VideoSplashScreen({ onFinish }: { onFinish: () => void }) {
    const video = useRef(null);
    const { width, height } = Dimensions.get('screen'); // use 'screen' not 'window' to include status bar area
    return (
        <View style={styles.splashContainer}>
            <Video
                ref={video}
                style={{ width, height }}
                source={require('../assets/images/icons/Bookloop.mp4')}
                resizeMode={ResizeMode.COVER}
                shouldPlay={true}
                isMuted={true}
                isLooping={false}
                onPlaybackStatusUpdate={(status: any) => {
                    if (status.error) {
                        console.log("Video load error, skipping splash:", status.error);
                        onFinish();
                    }
                    if (status.isLoaded && status.didJustFinish) {
                        onFinish();
                    }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
});

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [isVideoSplashFinished, setIsVideoSplashFinished] = useState(false);
    const [loaded] = useFonts({
        Poppins_400Regular,
        Poppins_600SemiBold,
        Poppins_700Bold,
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    if (!isVideoSplashFinished) {
        return <VideoSplashScreen onFinish={() => setIsVideoSplashFinished(true)} />;
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
                    <Stack.Screen name="(seller)" options={{ headerShown: false }} />
                </Stack>
                <StatusBar style="auto" />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
