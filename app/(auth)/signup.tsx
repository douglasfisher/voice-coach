import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

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

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-6 justify-center min-h-full"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <Text className="text-5xl mb-4">🧠</Text>
          <Text className="text-text-primary text-3xl font-bold">Join Dialectica</Text>
          <Text className="text-text-secondary text-center mt-2">
            Begin your journey to clearer thinking
          </Text>
        </View>

        <View className="space-y-4 mb-6">
          <Input
            label="Name (optional)"
            placeholder="What should we call you?"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />

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
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            placeholder="Enter password again"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
          />
        </View>

        {error && (
          <View className="bg-error/20 rounded-lg p-3 mb-4">
            <Text className="text-error text-center">{error}</Text>
          </View>
        )}

        <Button
          onPress={handleSignup}
          loading={isLoading}
          fullWidth
          size="lg"
        >
          Create Account
        </Button>

        <View className="flex-row justify-center mt-8">
          <Text className="text-text-muted">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-accent-primary font-semibold">Sign In</Text>
            </Pressable>
          </Link>
        </View>

        <Text className="text-text-muted text-xs text-center mt-6">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
