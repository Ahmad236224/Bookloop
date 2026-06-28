import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Formik } from 'formik';
import * as Yup from 'yup';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const PRIMARY_GREEN = '#00695C';
const MINT_BTN = '#26A69A';
const TEXT_COLOR = '#FFFFFF';
const INPUT_BORDER = '#E0E0E0';
const INPUT_LABEL = '#F48FB1';

const LoginValidationSchema = Yup.object().shape({
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
});

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

const LoginScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialRole = (params.role as 'buyer' | 'seller') || 'buyer';
    const [role, setRole] = useState<'buyer' | 'seller'>(initialRole);

    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const [emailFocused, setEmailFocused] = useState(false);
    const [passFocused, setPassFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    const loginScale = useSharedValue(1);

    const handleLogin = async (values: { email: string; password: string }) => {
        if (loading) return;

        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            if (role === 'buyer') {
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (!userDoc.exists()) {
                    throw new Error('User data not found. Please contact support.');
                }

                const userData = userDoc.data();
                if (userData.role !== 'buyer') {
                    throw new Error('This account is not registered as a buyer.');
                }

                router.replace('/(buyer)');
            } else {
                const sellerDoc = await getDoc(doc(db, 'sellers', user.uid));

                if (!sellerDoc.exists()) {
                    const requestQuery = query(
                        collection(db, 'seller_requests'),
                        where('email', '==', values.email)
                    );
                    const requestSnapshot = await getDocs(requestQuery);

                    if (!requestSnapshot.empty) {
                        const requestData = requestSnapshot.docs[0].data();
                        if (requestData.status === 'pending') {
                            throw new Error('Your seller request is still pending approval. Please wait for admin approval.');
                        } else if (requestData.status === 'rejected') {
                            throw new Error('Your seller request has been rejected. Please contact support.');
                        }
                    }
                    throw new Error('Seller account not found. Please submit a seller request first.');
                }

                const sellerData = sellerDoc.data();
                if (sellerData.status !== 'active') {
                    throw new Error('Your seller account is not active. Please contact support.');
                }

                router.replace('/(seller)');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            let errorMessage = 'Invalid email or password.';

            const errorCode = error.code || (error.message && error.message.includes('auth/')
                ? error.message.match(/auth\/[a-z-]+/)?.[0]
                : null);

            if (error.message && !errorCode) {
                errorMessage = error.message;
            }
            else if (errorCode === 'auth/invalid-credential' || errorCode?.includes('invalid-credential')) {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            } else if (errorCode === 'auth/user-not-found') {
                errorMessage = 'No account found with this email. Please sign up first.';
            } else if (errorCode === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (errorCode === 'auth/invalid-email') {
                errorMessage = 'Invalid email address. Please enter a valid email.';
            } else if (errorCode === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled. Please contact support.';
            } else if (errorCode === 'auth/too-many-requests') {
                errorMessage = 'Too many failed login attempts. Please try again later.';
            } else if (errorCode === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (errorCode === 'auth/operation-not-allowed') {
                errorMessage = 'This sign-in method is not enabled. Please contact support.';
            } else if (errorCode === 'auth/requires-recent-login') {
                errorMessage = 'Please log out and log in again to complete this action.';
            } else if (errorCode === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please use a different email or try logging in.';
            } else if (error.message) {
                if (error.message.includes('auth/invalid-credential') || error.message.includes('invalid-credential')) {
                    errorMessage = 'Invalid email or password. Please check your credentials and try again.';
                } else if (error.message.includes('auth/user-not-found')) {
                    errorMessage = 'No account found with this email. Please sign up first.';
                } else if (error.message.includes('auth/wrong-password')) {
                    errorMessage = 'Incorrect password. Please try again.';
                } else {
                    errorMessage = error.message;
                }
            }

            Alert.alert('Login Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = () => {
        if (role === 'buyer') {
            router.push('/(auth)/signup');
        } else {
            router.push('/(auth)/request');
        }
    };

    const loginBtnStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: withSpring(loginScale.value) }],
        };
    });

    const renderInput = (
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        isFocused: boolean,
        setFocused: (focused: boolean) => void,
        secureTextEntry: boolean = false,
        togglePassword?: () => void,
        error?: string,
        touched?: boolean
    ) => (
        <View style={styles.inputWrapper}>
            <View style={[
                styles.inputContainer,
                isFocused && styles.inputFocused,
                touched && error && styles.inputError
            ]}>
                <Text style={[
                    styles.inputLabel,
                    isFocused && styles.inputLabelFocused,
                    touched && error && styles.inputLabelError
                ]}>{label}</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        secureTextEntry={secureTextEntry}
                        autoCapitalize="none"
                        placeholder={`Enter ${label.toLowerCase()}`}
                    />
                    {togglePassword && (
                        <TouchableOpacity onPress={togglePassword}>
                            <MaterialCommunityIcons
                                name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={touched && error ? '#F44336' : '#757575'}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {touched && error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
        </View>
    );

    return (
        <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginValidationSchema}
            onSubmit={handleLogin}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isValid }) => (
                <LinearGradient
                    colors={['#00695C', '#004D40']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.container}
                >
                    <StatusBar style="light" />
                    <Animated.View entering={FadeInUp.duration(800)} style={styles.topSection}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>Login</Text>
                            <Text style={styles.headerSubtitle}>Login to account to feel the whole{'\n'}experience of BookLoop</Text>
                        </View>
                    </Animated.View>

                    <View style={styles.bottomSection}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                        >
                            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                                <View style={styles.formContainer}>
                                    {renderInput(
                                        'Email',
                                        values.email,
                                        handleChange('email'),
                                        emailFocused,
                                        setEmailFocused,
                                        false,
                                        undefined,
                                        errors.email,
                                        touched.email
                                    )}

                                    {renderInput(
                                        'Password',
                                        values.password,
                                        handleChange('password'),
                                        passFocused,
                                        setPassFocused,
                                        !showPassword,
                                        () => setShowPassword(!showPassword),
                                        errors.password,
                                        touched.password
                                    )}

                                    <View style={styles.optionsRow}>
                                        <View style={styles.rememberMeContainer}>
                                            <CustomToggle
                                                value={rememberMe}
                                                onValueChange={setRememberMe}
                                            />
                                            <Text style={styles.rememberMeText}>Remember me</Text>
                                        </View>
                                        <TouchableOpacity>
                                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Animated.View entering={FadeInDown.delay(300).duration(800)}>
                                        <AnimatedTouchableOpacity
                                            style={[styles.loginButton, loginBtnStyle, !isValid && styles.loginButtonDisabled]}
                                            onPress={() => handleSubmit()}
                                            disabled={!isValid || loading}
                                            onPressIn={() => isValid && !loading && (loginScale.value = 0.96)}
                                            onPressOut={() => isValid && !loading && (loginScale.value = 1)}
                                            activeOpacity={0.9}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFFFFF" size="small" />
                                            ) : (
                                                <Text style={styles.loginButtonText}>LOG IN</Text>
                                            )}
                                        </AnimatedTouchableOpacity>
                                    </Animated.View>

                                    <View style={styles.socialSection}>
                                        <Text style={styles.socialText}>Or sign in with</Text>
                                        <View style={styles.socialIcons}>
                                            <TouchableOpacity style={styles.socialIcon}>
                                                <MaterialCommunityIcons name="facebook" size={30} color="#3b5998" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.socialIcon}>
                                                <MaterialCommunityIcons name="fingerprint" size={30} color={PRIMARY_GREEN} />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.socialIcon}>
                                                <MaterialCommunityIcons name="google" size={30} color="#DB4437" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.footer}>
                                        <Text style={styles.footerText}>Not a member? </Text>
                                        <TouchableOpacity onPress={handleSignUp}>
                                            <Text style={styles.signUpText}>SIGN UP</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.termsContainer}>
                                        <Text style={styles.termsText}>
                                            By signing in, you confirm that you are agree to our <Text style={styles.boldText}>Terms and Conditions</Text>, and have read and understood of <Text style={styles.boldText}>Privacy Policy</Text>
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </LinearGradient>
            )}
        </Formik>
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
    },
    topSection: {
        height: '30%',
        paddingHorizontal: 24,
        paddingTop: 50,
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 24,
        zIndex: 10,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Poppins_700Bold',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: '#E0F2F1',
        textAlign: 'center',
        lineHeight: 20,
    },
    bottomSection: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        overflow: 'hidden',
    },
    scrollContent: {
        paddingTop: 40,
        paddingBottom: 40,
    },
    formContainer: {
        width: '100%',
    },
    inputWrapper: {
        marginBottom: 16,
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: INPUT_BORDER,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        height: 60,
        justifyContent: 'center',
    },
    inputFocused: {
        borderColor: PRIMARY_GREEN,
    },
    inputError: {
        borderColor: '#F44336',
    },
    inputLabel: {
        position: 'absolute',
        top: -10,
        left: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
        fontSize: 12,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
        zIndex: 1,
    },
    inputLabelFocused: {
        color: PRIMARY_GREEN,
    },
    inputLabelError: {
        color: '#F44336',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: '#333333',
        height: '100%',
        paddingVertical: 0,
    },
    errorText: {
        fontSize: 12,
        color: '#F44336',
        fontFamily: 'Poppins_400Regular',
        marginTop: 4,
        marginLeft: 4,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 8,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
        marginLeft: 8,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: PRIMARY_GREEN,
        fontFamily: 'Poppins_600SemiBold',
    },
    loginButton: {
        backgroundColor: MINT_BTN,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        boxShadow: '0px 4px 8px rgba(38, 166, 154, 0.3)',
        elevation: 4,
    },
    loginButtonDisabled: {
        backgroundColor: '#A5D6A7',
        boxShadow: 'none',
        elevation: 0,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 1,
    },
    socialSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    socialText: {
        fontSize: 14,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
        marginBottom: 20,
    },
    socialIcons: {
        flexDirection: 'row',
        gap: 30,
    },
    socialIcon: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    footerText: {
        fontSize: 14,
        color: '#333333',
        fontFamily: 'Poppins_600SemiBold',
    },
    signUpText: {
        fontSize: 14,
        color: PRIMARY_GREEN,
        fontFamily: 'Poppins_700Bold',
        marginLeft: 5,
    },
    termsContainer: {
        alignItems: 'center',
    },
    termsText: {
        fontSize: 10,
        color: '#9E9E9E',
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        lineHeight: 16,
    },
    boldText: {
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default LoginScreen;
