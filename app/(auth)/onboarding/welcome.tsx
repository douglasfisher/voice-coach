import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="flex-1 p-6 justify-center">
        <View className="items-center mb-12">
          <Text className="text-6xl mb-6">🎯</Text>
          <Text className="text-text-primary text-3xl font-bold text-center">
            Welcome to Dialectica
          </Text>
          <Text className="text-text-secondary text-center text-lg mt-4 leading-7">
            A space to challenge your thinking, discover blind spots, and grow
            into a sharper, more balanced thinker.
          </Text>
        </View>

        <View className="bg-bg-secondary rounded-2xl p-6 mb-8">
          <Text className="text-text-primary font-semibold text-lg mb-4">
            How it works
          </Text>

          <View className="space-y-4">
            <FeatureItem
              emoji="👤"
              title="Choose a Challenger"
              description="Pick from diverse AI personas, each with unique perspectives"
            />
            <FeatureItem
              emoji="💬"
              title="Engage in Dialogue"
              description="Discuss ideas through Socratic questioning"
            />
            <FeatureItem
              emoji="📊"
              title="Track Growth"
              description="See your thinking patterns improve over time"
            />
          </View>
        </View>

        <Button
          onPress={() => router.push('/(auth)/onboarding/pick-personas')}
          size="lg"
          fullWidth
        >
          Get Started
        </Button>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row mb-3">
      <Text className="text-2xl mr-4">{emoji}</Text>
      <View className="flex-1">
        <Text className="text-text-primary font-medium">{title}</Text>
        <Text className="text-text-muted text-sm mt-1">{description}</Text>
      </View>
    </View>
  );
}
