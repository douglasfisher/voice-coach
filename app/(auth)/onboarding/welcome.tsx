import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Target, User, MessageCircle, BarChart3, LucideIcon } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="flex-1 p-6 justify-center">
        <View className="items-center mb-12">
          <Target size={64} color="#F59E0B" />
          <Text className="text-text-primary text-3xl font-bold text-center mt-6">
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
              Icon={User}
              title="Choose a Challenger"
              description="Pick from diverse AI personas, each with unique perspectives"
            />
            <FeatureItem
              Icon={MessageCircle}
              title="Engage in Dialogue"
              description="Discuss ideas through Socratic questioning"
            />
            <FeatureItem
              Icon={BarChart3}
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
  Icon,
  title,
  description,
}: {
  Icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row mb-3 items-start">
      <View className="mr-4 mt-1">
        <Icon size={24} color="#F59E0B" />
      </View>
      <View className="flex-1">
        <Text className="text-text-primary font-medium">{title}</Text>
        <Text className="text-text-muted text-sm mt-1">{description}</Text>
      </View>
    </View>
  );
}
