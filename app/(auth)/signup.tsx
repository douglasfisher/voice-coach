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
import {
  Brain,
  Mail,
  Lock,
  User,
  AlertCircle,
  Sparkles,
  Check,
  ChevronLeft,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const { signUpWithEmail, isLoading } = useAuthStore();

  const handleSignup = async () => {
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const { error } = await signUpWithEmail(
      email.trim(),
      password,
      displayName.trim() || undefined
    );

    if (error) {
      setError(error.message);
    } else {
      router.replace('/(auth)/onboarding/welcome');
    }
  };

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(192, 132, 252, 0.08)', 'transparent', 'rgba(245, 158, 11, 0.05)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
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
          {/* Back Button */}
          <Link href="/(auth)/login" asChild>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
              }}
            >
              <ChevronLeft size={24} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '600', marginLeft: 4 }}>
                Back
              </Text>
            </Pressable>
          </Link>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 24,
              paddingTop: 0,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(192, 132, 252, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  shadowColor: '#c084fc',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 25,
                }}
              >
                <Brain size={42} color="#c084fc" />
              </View>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 32,
                  fontWeight: '800',
                  letterSpacing: -1,
                }}
              >
                Join Dialectica
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 16,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Begin your journey to clearer thinking
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: 16, marginBottom: 20 }}>
              {/* Name Input */}
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
                  Name <Text style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</Text>
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
                  <User size={20} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="What should we call you?"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="words"
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
                    placeholder="At least 8 characters"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    autoComplete="new-password"
                    style={{
                      flex: 1,
                      color: '#fff',
                      fontSize: 16,
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                    }}
                  />
                </View>

                {/* Password strength */}
                {password.length > 0 && (
                  <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
                    <PasswordCheck label="8+ chars" met={hasMinLength} />
                    <PasswordCheck label="Uppercase" met={hasUppercase} />
                    <PasswordCheck label="Number" met={hasNumber} />
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
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
                  Confirm Password
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor:
                      confirmPassword.length > 0 && password === confirmPassword
                        ? 'rgba(74, 222, 128, 0.5)'
                        : 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 16,
                  }}
                >
                  <Lock size={20} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Enter password again"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    autoComplete="new-password"
                    style={{
                      flex: 1,
                      color: '#fff',
                      fontSize: 16,
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                    }}
                  />
                  {confirmPassword.length > 0 && password === confirmPassword && (
                    <Check size={20} color="#4ade80" />
                  )}
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

            {/* Create Account Button */}
            <Pressable onPress={handleSignup} disabled={isLoading}>
              <LinearGradient
                colors={['#c084fc', '#9333ea']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: '#c084fc',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Sparkles size={20} color="#fff" />
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 17,
                        fontWeight: '700',
                        marginLeft: 8,
                      }}
                    >
                      Create Account
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Sign In Link */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 28,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={{ color: '#c084fc', fontSize: 15, fontWeight: '700' }}>
                    Sign In
                  </Text>
                </Pressable>
              </Link>
            </View>

            {/* Terms */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: 12,
                textAlign: 'center',
                marginTop: 24,
                lineHeight: 18,
                paddingHorizontal: 20,
              }}
            >
              By creating an account, you agree to our{' '}
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Terms of Service</Text> and{' '}
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Privacy Policy</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: met ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 4,
        }}
      >
        {met && <Check size={10} color="#4ade80" />}
      </View>
      <Text
        style={{
          color: met ? '#4ade80' : 'rgba(255,255,255,0.4)',
          fontSize: 11,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
