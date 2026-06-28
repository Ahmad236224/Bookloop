import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Formik } from 'formik';
import * as Yup from 'yup';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const PRIMARY_GREEN = '#00695C';
const MINT_BTN = '#26A69A';
const INPUT_BORDER = '#E0E0E0';

const SignupValidationSchema = Yup.object().shape({
    username: Yup.string()
        .trim()
        .min(2, 'Username must be at least 2 characters')
        .required('Username is required'),
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    agree: Yup.boolean()
        .oneOf([true], 'You must agree to the Privacy and Policy'),
});

const SignupScreen = () => {
    const router = useRouter();

    const [showPassword, setShowPassword] = useState(false);
    const [userFocused, setUserFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passFocused, setPassFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    const signupScale = useSharedValue(1);

    const handleSignup = async (values: { username: string; email: string; password: string }) => {
        if (loading) return;

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                id: user.uid,
                username: values.username.trim(),
                email: values.email,
                role: 'buyer',
                createdAt: new Date(),
            });

            router.replace('/(buyer)');
        } catch (error: any) {
            console.error('Signup error:', error);
            let errorMessage = 'Could not create account. Please try again.';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please use a different email or try logging in.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use a stronger password (at least 6 characters).';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address. Please enter a valid email.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many signup attempts. Please try again later.';
            } else if (error.code === 'auth/missing-email') {
                errorMessage = 'Email is required. Please enter your email address.';
            } else if (error.code === 'auth/missing-password') {
                errorMessage = 'Password is required. Please enter a password.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid credentials. Please check your email and password.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Signup Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        router.push({ pathname: '/(auth)/login', params: { role: 'buyer' } });
    };

    const signupBtnStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: withSpring(signupScale.value) }],
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
            initialValues={{ username: '', email: '', password: '', agree: false }}
            validationSchema={SignupValidationSchema}
            onSubmit={handleSignup}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isValid, setFieldValue }) => (
                <LinearGradient
                    colors={['#00695C', '#004D40']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.container}
                >
                    <StatusBar style="light" />
                    <Animated.View entering={FadeInUp.duration(800)} style={styles.topSection}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>Sign Up</Text>
                            <Text style={styles.headerSubtitle}>Create your account to unlock full potential</Text>
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
                                        'Username',
                                        values.username,
                                        handleChange('username'),
                                        userFocused,
                                        setUserFocused,
                                        false,
                                        undefined,
                                        errors.username,
                                        touched.username
                                    )}

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
                                        <TouchableOpacity
                                            style={styles.rememberMeContainer}
                                            onPress={() => setFieldValue('agree', !values.agree)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.checkbox,
                                                values.agree && styles.checkboxActive,
                                                touched.agree && errors.agree && styles.checkboxError
                                            ]}>
                                                {values.agree && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                                            </View>
                                            <Text style={styles.rememberMeText}>
                                                I Agree with <Text style={styles.boldText}>Privacy</Text> and <Text style={styles.boldText}>Policy</Text>
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {touched.agree && errors.agree && (
                                        <Text style={styles.errorText}>{errors.agree}</Text>
                                    )}

                                    <Animated.View entering={FadeInDown.delay(300).duration(800)}>
                                        <AnimatedTouchableOpacity
                                            style={[styles.loginButton, signupBtnStyle, !isValid && styles.loginButtonDisabled]}
                                            onPress={() => handleSubmit()}
                                            disabled={!isValid || loading}
                                            onPressIn={() => isValid && !loading && (signupScale.value = 0.96)}
                                            onPressOut={() => isValid && !loading && (signupScale.value = 1)}
                                            activeOpacity={0.9}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFFFFF" size="small" />
                                            ) : (
                                                <Text style={styles.loginButtonText}>SIGN UP</Text>
                                            )}
                                        </AnimatedTouchableOpacity>
                                    </Animated.View>

                                    <View style={styles.socialSection}>
                                        <Text style={styles.socialText}>Or join with</Text>
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
                                        <Text style={styles.footerText}>Already have an account? </Text>
                                        <TouchableOpacity onPress={handleLogin}>
                                            <Text style={styles.signUpText}>SIGN IN</Text>
                                        </TouchableOpacity>
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
    container: {
        flex: 1,
    },
    topSection: {
        height: '25%',
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
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#757575',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    checkboxActive: {
        borderColor: PRIMARY_GREEN,
        backgroundColor: PRIMARY_GREEN,
    },
    checkboxError: {
        borderColor: '#F44336',
    },
    rememberMeText: {
        fontSize: 12,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
        flex: 1,
    },
    loginButton: {
        backgroundColor: MINT_BTN,
        borderRadius: 14,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        marginTop: 10,
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
    boldText: {
        fontFamily: 'Poppins_600SemiBold',
        color: PRIMARY_GREEN,
    },
});

export default SignupScreen;
