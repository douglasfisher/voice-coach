import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Brain, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState(__DEV__ ? 'douglas.fisher@icloud.com' : '');
  const [password, setPassword] = useState(__DEV__ ? 'ruweb9js-s$gfdjd128-qwwimvca9' : '');
  const [error, setError] = useState('');

  const { signInWithEmail, signInWithApple, isLoading } = useAuthStore();

  const handleEmailLogin = async () => {
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    const { error } = await signInWithEmail(email.trim(), password);
    if (error) {
      setError(error.message);
    } else {
      router.replace('/');
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { error } = await signInWithApple();
      if (error) {
        setError(error.message);
      } else {
        router.replace('/');
      }
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple Sign-In failed. Please try again.');
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.08)', 'transparent', 'rgba(192, 132, 252, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60%',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 24,
              paddingTop: 16,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 30,
                }}
              >
                <Brain size={52} color="#F59E0B" />
              </View>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 36,
                  fontWeight: '800',
                  letterSpacing: -1,
                }}
              >
                Dialectica
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 16,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Sharpen your mind through{'\n'}Socratic dialogue
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: 16, marginBottom: 24 }}>
              {/* Email Input */}
              <View>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 14,
                    fontWeight: '600',
                    marginBottom: 8,
                    marginLeft: 4,
                  }}
                >
                  Email
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 16,
                  }}
                >
                  <Mail size={20} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={{
                      flex: 1,
                      color: '#fff',
                      fontSize: 16,
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                    }}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 14,
                    fontWeight: '600',
                    marginBottom: 8,
                    marginLeft: 4,
                  }}
                >
                  Password
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 16,
                  }}
                >
                  <Lock size={20} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    autoComplete="password"
                    style={{
                      flex: 1,
                      color: '#fff',
                      fontSize: 16,
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <AlertCircle size={20} color="#ef4444" />
                <Text style={{ color: '#ef4444', marginLeft: 10, flex: 1, fontSize: 14 }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Sign In Button */}
            <Pressable onPress={handleEmailLogin} disabled={isLoading}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0f0f12" />
                ) : (
                  <>
                    <Sparkles size={20} color="#0f0f12" />
                    <Text
                      style={{
                        color: '#0f0f12',
                        fontSize: 17,
                        fontWeight: '700',
                        marginLeft: 8,
                      }}
                    >
                      Sign In
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={{ height: 16 }} />

            {/* Apple Sign In */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={16}
                style={{ width: '100%', height: 56 }}
                onPress={handleAppleLogin}
              />
            )}

            {/* Sign Up Link */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 32,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                Don't have an account?{' '}
              </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text style={{ color: '#F59E0B', fontSize: 15, fontWeight: '700' }}>
                    Sign Up
                  </Text>
                </Pressable>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
