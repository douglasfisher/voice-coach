import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { usePersonaStore } from '../../stores/personaStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';

export default function HomeScreen() {
  const { profile, user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const { getPersonaById } = usePersonaStore();

  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id);
    }
  }, [user?.id, fetchConversations]);

  const activeConversations = conversations.filter((c) => c.status === 'active');
  const recentConversations = conversations.slice(0, 5);

  const greeting = getGreeting();
  const displayName = profile?.display_name ?? 'Thinker';

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-text-muted text-lg">{greeting}</Text>
          <Text className="text-text-primary text-2xl font-bold">
            {displayName}
          </Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-4 mb-6">
          <Card variant="elevated" padding="md" className="flex-1">
            <Text className="text-text-muted text-sm">Streak</Text>
            <Text className="text-accent-primary text-2xl font-bold">
              {profile?.streak_days ?? 0} 🔥
            </Text>
          </Card>
          <Card variant="elevated" padding="md" className="flex-1">
            <Text className="text-text-muted text-sm">Sessions</Text>
            <Text className="text-text-primary text-2xl font-bold">
              {profile?.total_sessions ?? 0}
            </Text>
          </Card>
          <Card variant="elevated" padding="md" className="flex-1">
            <Text className="text-text-muted text-sm">Level</Text>
            <Text className="text-text-primary text-2xl font-bold">
              {profile?.current_level ?? 1}
            </Text>
          </Card>
        </View>

        {/* Daily Challenge */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <View className="flex-row justify-between items-start mb-3">
            <Text className="text-text-primary font-semibold text-lg">
              Today's Challenge
            </Text>
            <Text className="text-2xl">🎯</Text>
          </View>
          <Text className="text-text-secondary mb-4">
            "Is it ever right to lie to protect someone's feelings?"
          </Text>
          <Button
            onPress={() => router.push('/(tabs)/personas')}
            size="md"
          >
            Take Challenge
          </Button>
        </Card>

        {/* Active Conversation */}
        {activeConversations.length > 0 && (
          <View className="mb-6">
            <Text className="text-text-primary font-semibold text-lg mb-3">
              Continue Conversation
            </Text>
            {activeConversations.slice(0, 1).map((conv) => {
              const persona = getPersonaById(conv.persona_id);
              return (
                <Card
                  key={conv.id}
                  variant="default"
                  padding="md"
                  onPress={() => router.push(`/(tabs)/chat/${conv.id}`)}
                >
                  <View className="flex-row items-center">
                    <Avatar
                      source={persona?.avatarUrl}
                      fallback={persona?.name}
                      size="md"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-text-primary font-medium">
                        {persona?.name ?? 'Unknown'}
                      </Text>
                      <Text className="text-text-muted text-sm">
                        {conv.topic ?? 'Active conversation'}
                      </Text>
                    </View>
                    <Text className="text-accent-primary text-2xl">→</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Recent Conversations */}
        {recentConversations.length > 0 && (
          <View>
            <Text className="text-text-primary font-semibold text-lg mb-3">
              Recent Sessions
            </Text>
            {recentConversations.map((conv) => {
              const persona = getPersonaById(conv.persona_id);
              return (
                <Card
                  key={conv.id}
                  variant="default"
                  padding="sm"
                  className="mb-2"
                  onPress={() => router.push(`/(tabs)/chat/${conv.id}`)}
                >
                  <View className="flex-row items-center">
                    <Avatar
                      source={persona?.avatarUrl}
                      fallback={persona?.name}
                      size="sm"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-text-primary text-sm">
                        {persona?.name}
                      </Text>
                      <Text className="text-text-muted text-xs">
                        {formatDate(conv.created_at)}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        conv.status === 'active'
                          ? 'bg-success/20'
                          : 'bg-bg-tertiary'
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          conv.status === 'active'
                            ? 'text-success'
                            : 'text-text-muted'
                        }`}
                      >
                        {conv.status}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {recentConversations.length === 0 && (
          <Card variant="elevated" padding="lg" className="items-center">
            <Text className="text-4xl mb-4">💭</Text>
            <Text className="text-text-primary font-semibold text-center">
              No conversations yet
            </Text>
            <Text className="text-text-muted text-center mt-2 mb-4">
              Start a conversation with one of our AI personas to begin sharpening
              your thinking
            </Text>
            <Button onPress={() => router.push('/(tabs)/personas')}>
              Meet the Personas
            </Button>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}
