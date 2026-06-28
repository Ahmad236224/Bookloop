import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Formik } from 'formik';
import * as Yup from 'yup';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const PRIMARY_GREEN = '#00695C';
const MINT_BTN = '#26A69A';
const INPUT_BORDER = '#E0E0E0';

type ShopType = 'Shop Owner' | 'Local Vendor' | 'Student' | 'Individual';

const RequestValidationSchema = Yup.object().shape({
    fullName: Yup.string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .required('Full name is required'),
    shopName: Yup.string()
        .trim()
        .min(2, 'Shop name must be at least 2 characters')
        .required('Shop/business name is required'),
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    phone: Yup.string()
        .trim()
        .min(8, 'Phone number should be at least 8 digits')
        .required('Phone number is required'),
    cnic: Yup.string()
        .trim()
        .min(5, 'CNIC/ID should be at least 5 characters')
        .required('CNIC/ID number is required'),
    address: Yup.string()
        .trim()
        .min(5, 'Address should be at least 5 characters')
        .required('Shop address is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    shopType: Yup.string()
        .oneOf(['Shop Owner', 'Local Vendor', 'Student', 'Individual'], 'Please select your shop type')
        .required('Please select your shop type'),
    agree: Yup.boolean()
        .oneOf([true], 'You must confirm your details are accurate and agree to the terms'),
});

const RequestScreen: React.FC = () => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const signupScale = useSharedValue(1);
    const shopTypes: ShopType[] = ['Shop Owner', 'Local Vendor', 'Student', 'Individual'];

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        setLoading(true);

        try {
            const existingRequestQuery = query(
                collection(db, 'seller_requests'),
                where('email', '==', values.email)
            );
            const existingRequestSnapshot = await getDocs(existingRequestQuery);

            if (!existingRequestSnapshot.empty) {
                const existingRequest = existingRequestSnapshot.docs[0].data();
                if (existingRequest.status === 'pending') {
                    Alert.alert(
                        'Request Already Exists',
                        'You already have a pending seller request. Please wait for admin approval.',
                        [
                            {
                                text: 'OK',
                                onPress: () => router.replace({ pathname: '/(auth)/login', params: { role: 'seller' } })
                            }
                        ]
                    );
                    return;
                } else if (existingRequest.status === 'approved') {
                    Alert.alert(
                        'Already Approved',
                        'Your seller request has already been approved. Please login to continue.',
                        [
                            {
                                text: 'OK',
                                onPress: () => router.replace({ pathname: '/(auth)/login', params: { role: 'seller' } })
                            }
                        ]
                    );
                    return;
                }
            }

            await addDoc(collection(db, 'seller_requests'), {
                fullName: values.fullName.trim(),
                shopName: values.shopName.trim(),
                email: values.email,
                phone: values.phone.trim(),
                cnic: values.cnic.trim(),
                address: values.address.trim(),
                password: values.password,
                shopType: values.shopType,
                status: 'pending',
                createdAt: new Date(),
            });

            Alert.alert(
                'Request Submitted',
                'Your application to become a seller has been received. We will review your details and contact you shortly.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.replace({ pathname: '/(auth)/login', params: { role: 'seller' } });
                        }
                    }
                ]
            );

            setTimeout(() => {
                router.replace({ pathname: '/(auth)/login', params: { role: 'seller' } });
            }, 1500);
        } catch (error: any) {
            console.error('Request submission error:', error);
            let errorMessage = 'An error occurred. Please try again.';

            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please contact support.';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Service is temporarily unavailable. Please check your internet connection and try again.';
            } else if (error.code === 'deadline-exceeded') {
                errorMessage = 'Request timed out. Please check your internet connection and try again.';
            } else if (error.code === 'failed-precondition') {
                errorMessage = 'Request failed due to a precondition. Please try again.';
            } else if (error.code === 'network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.code === 'unauthenticated') {
                errorMessage = 'Authentication required. Please try again.';
            } else if (error.code === 'already-exists') {
                errorMessage = 'A request with this information already exists.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Submission Failed', errorMessage);
        } finally {
            setLoading(false);
            setSubmitting(false);
        }
    };

    const handleLogin = () => {
        router.push({ pathname: '/(auth)/login', params: { role: 'seller' } });
    };

    const signupBtnStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(signupScale.value) }],
    }));

    const renderInput = (
        label: string,
        value: string,
        onChangeText: (text: string) => void,
        onBlur: () => void,
        fieldKey: string,
        error?: string,
        touched?: boolean,
        keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default',
        secureTextEntry: boolean = false
    ) => (
        <View style={styles.inputWrapper}>
            <View style={[
                styles.inputContainer,
                focusedField === fieldKey && styles.inputFocused,
                touched && error && styles.inputError
            ]}>
                <Text style={[
                    styles.inputLabel,
                    focusedField === fieldKey && styles.inputLabelFocused,
                    touched && error && styles.inputLabelError
                ]}>
                    {label}
                </Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => setFocusedField(fieldKey)}
                        onBlur={() => { setFocusedField(null); onBlur(); }}
                        keyboardType={keyboardType}
                        secureTextEntry={secureTextEntry}
                        autoCapitalize={fieldKey === 'email' ? 'none' : 'sentences'}
                        autoCorrect={false}
                        placeholder={`Enter ${label.toLowerCase()}`}
                    />
                    {fieldKey === 'password' && (
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <MaterialCommunityIcons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
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
            initialValues={{
                fullName: '',
                shopName: '',
                email: '',
                phone: '',
                cnic: '',
                address: '',
                password: '',
                shopType: '',
                agree: false,
            }}
            validationSchema={RequestValidationSchema}
            onSubmit={handleSubmit}
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
                            <Text style={styles.headerTitle}>Seller Request</Text>
                            <Text style={styles.headerSubtitle}>Submit your details to start selling</Text>
                        </View>
                    </Animated.View>

                    <View style={styles.bottomSection}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                        >
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.formContainer}>
                                    {renderInput(
                                        'Full Name',
                                        values.fullName,
                                        handleChange('fullName'),
                                        handleBlur('fullName'),
                                        'fullName',
                                        errors.fullName,
                                        touched.fullName
                                    )}

                                    <View style={styles.shopTypeContainer}>
                                        <Text style={styles.sectionLabel}>I am a:</Text>
                                        <View style={styles.shopTypeOptions}>
                                            {shopTypes.map((type) => (
                                                <TouchableOpacity
                                                    key={type}
                                                    style={[
                                                        styles.shopTypeChip,
                                                        values.shopType === type && styles.shopTypeChipActive,
                                                        touched.shopType && errors.shopType && styles.shopTypeChipError
                                                    ]}
                                                    onPress={() => setFieldValue('shopType', type)}
                                                >
                                                    <Text style={[
                                                        styles.shopTypeText,
                                                        values.shopType === type && styles.shopTypeTextActive
                                                    ]}>
                                                        {type}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        {touched.shopType && errors.shopType && (
                                            <Text style={styles.errorText}>{errors.shopType}</Text>
                                        )}
                                    </View>

                                    {renderInput(
                                        'Shop / Business Name',
                                        values.shopName,
                                        handleChange('shopName'),
                                        handleBlur('shopName'),
                                        'shopName',
                                        errors.shopName,
                                        touched.shopName
                                    )}

                                    {renderInput(
                                        'Email Address',
                                        values.email,
                                        handleChange('email'),
                                        handleBlur('email'),
                                        'email',
                                        errors.email,
                                        touched.email,
                                        'email-address'
                                    )}

                                    {renderInput(
                                        'Phone Number',
                                        values.phone,
                                        handleChange('phone'),
                                        handleBlur('phone'),
                                        'phone',
                                        errors.phone,
                                        touched.phone,
                                        'phone-pad'
                                    )}

                                    {renderInput(
                                        'CNIC / ID Number',
                                        values.cnic,
                                        handleChange('cnic'),
                                        handleBlur('cnic'),
                                        'cnic',
                                        errors.cnic,
                                        touched.cnic,
                                        'numeric'
                                    )}

                                    {renderInput(
                                        'Shop Address',
                                        values.address,
                                        handleChange('address'),
                                        handleBlur('address'),
                                        'address',
                                        errors.address,
                                        touched.address
                                    )}

                                    {renderInput(
                                        'Create Password',
                                        values.password,
                                        handleChange('password'),
                                        handleBlur('password'),
                                        'password',
                                        errors.password,
                                        touched.password,
                                        'default',
                                        !showPassword
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
                                                I confirm details are accurate and agree to <Text style={styles.boldText}>Terms</Text>
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {touched.agree && errors.agree && (
                                        <Text style={styles.errorText}>{errors.agree}</Text>
                                    )}

                                    <Animated.View entering={FadeInDown.delay(600).duration(800)}>
                                        <AnimatedTouchableOpacity
                                            style={[
                                                styles.loginButton,
                                                signupBtnStyle,
                                                !isValid && styles.loginButtonDisabled
                                            ]}
                                            onPress={() => handleSubmit()}
                                            disabled={loading || !isValid}
                                            onPressIn={() => !loading && isValid && (signupScale.value = 0.96)}
                                            onPressOut={() => !loading && (signupScale.value = 1)}
                                            activeOpacity={0.9}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#FFFFFF" size="small" />
                                            ) : (
                                                <Text style={styles.loginButtonText}>SUBMIT REQUEST</Text>
                                            )}
                                        </AnimatedTouchableOpacity>
                                    </Animated.View>

                                    <View style={styles.footer}>
                                        <Text style={styles.footerText}>Already a seller? </Text>
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
        backgroundColor: '#CCCCCC',
        boxShadow: 'none',
        elevation: 0,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: 1,
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
    shopTypeContainer: {
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: '#333',
        marginBottom: 10,
        marginLeft: 4,
    },
    shopTypeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    shopTypeChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    shopTypeChipActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    shopTypeChipError: {
        borderColor: '#F44336',
    },
    shopTypeText: {
        fontSize: 13,
        color: '#757575',
        fontFamily: 'Poppins_400Regular',
    },
    shopTypeTextActive: {
        color: '#FFFFFF',
        fontFamily: 'Poppins_600SemiBold',
    },
});

export default RequestScreen;
