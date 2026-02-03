import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      // Note: You'd typically send credential.identityToken to Supabase
      // For now, using OAuth flow
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
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-6 justify-center min-h-full"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <Text className="text-5xl mb-4">🧠</Text>
          <Text className="text-text-primary text-3xl font-bold">Dialectica</Text>
          <Text className="text-text-secondary text-center mt-2">
            Sharpen your mind through Socratic dialogue
          </Text>
        </View>

        <View className="space-y-4 mb-6">
          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        {error && (
          <View className="bg-error/20 rounded-lg p-3 mb-4">
            <Text className="text-error text-center">{error}</Text>
          </View>
        )}

        <Button
          onPress={handleEmailLogin}
          loading={isLoading}
          fullWidth
          size="lg"
        >
          Sign In
        </Button>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-bg-tertiary" />
          <Text className="text-text-muted mx-4">or</Text>
          <View className="flex-1 h-px bg-bg-tertiary" />
        </View>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={{ width: '100%', height: 50 }}
            onPress={handleAppleLogin}
          />
        )}

        <View className="flex-row justify-center mt-8">
          <Text className="text-text-muted">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-accent-primary font-semibold">Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
