import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GraduationCap } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { usePersonas } from '../../hooks/usePersonas';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useScrollHideAnimation } from '../../hooks/useScrollHideAnimation';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { ModeToggle } from '../../components/chat/ModeToggle';
import { PersonaDisplay } from '../../types/persona';
import { supabase } from '../../lib/supabase';

// Height of header content (title + subtitle + filter pills) without safe area
const HEADER_CONTENT_HEIGHT = 135;

interface CoachingDomain {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tagline: string | null;
}

export default function CoachesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;

  const { personas, isLoading: personasLoading, refresh } = usePersonas();
  const { user } = useAuthStore();
  const { createConversation, globalInteractionMode, setGlobalInteractionMode } = useChatStore();
  const { scrollHandler, headerAnimatedStyle } = useScrollHideAnimation(headerHeight);

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeDomain, setActiveDomain] = useState<string | 'all'>('all');
  const [domains, setDomains] = useState<CoachingDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);

  // Fetch coaching domains
  useEffect(() => {
    async function fetchDomains() {
      setDomainsLoading(true);
      try {
        const { data, error } = await supabase
          .from('coaching_domains')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setDomains(data || []);
      } catch (error) {
        console.error('Failed to fetch coaching domains:', error);
      } finally {
        setDomainsLoading(false);
      }
    }
    fetchDomains();
  }, []);

  // Filter to only show coaches
  const coaches = personas.filter(p => p.personaType === 'coach');

  const filteredCoaches = activeDomain === 'all'
    ? coaches
    : coaches.filter(p => p.domainId === activeDomain);

  const featuredCoach = filteredCoaches[0];
  const otherCoaches = filteredCoaches.slice(1);

  // Get domain info for display
  const getDomainName = (domainId: string | 'all'): string => {
    if (domainId === 'all') return 'All Coaches';
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || 'Coaches';
  };

  const getDomainColor = (domainId: string): string => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.color || '#F59E0B';
  };

  const handleChallenge = async (persona: PersonaDisplay) => {
    if (!user?.id) {
      console.error('Cannot start chat: User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      const conversationId = await createConversation(user.id, persona.id);

      if (conversationId) {
        setSelectedPersona(null);
        router.push(`/(tabs)/chat/${conversationId}`);
      } else {
        console.error('Failed to create conversation - no ID returned');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = personasLoading || domainsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F12' }}>
      {/* Floating header — slides fully off screen including safe area */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: '#0F0F12',
            paddingTop: insets.top,
          },
          headerAnimatedStyle,
        ]}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GraduationCap size={24} color="#10b981" />
                <Text className="text-text-primary text-2xl font-bold ml-2">
                  Coaches
                </Text>
              </View>
              <Text className="text-text-secondary mt-1">
                {globalInteractionMode === 'question'
                  ? 'You ask the questions!'
                  : 'Practice real-world conversations'}
              </Text>
            </View>
            <ModeToggle
              mode={globalInteractionMode}
              onModeChange={setGlobalInteractionMode}
              accentColor="#10b981"
            />
          </View>
        </View>

        {/* Domain Filter Pills */}
        <View style={{ paddingVertical: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {/* All filter */}
            <Pressable
              onPress={() => setActiveDomain('all')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeDomain === 'all' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: activeDomain === 'all' ? '#10b981' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: activeDomain === 'all' ? '#10b981' : '#9A9A9E'
                }}
              >
                All
              </Text>
            </Pressable>

            {/* Domain filters */}
            {domains.map((domain) => {
              const isActive = activeDomain === domain.id;
              return (
                <Pressable
                  key={domain.id}
                  onPress={() => setActiveDomain(domain.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? `${domain.color}20` : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: isActive ? domain.color : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: isActive ? domain.color : '#9A9A9E'
                    }}
                  >
                    {domain.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingHorizontal: 16,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Featured Coach */}
          {featuredCoach && (
            <PersonaCard
              persona={featuredCoach}
              onPress={() => setSelectedPersona(featuredCoach)}
              variant="featured"
            />
          )}

          {/* Section Header */}
          {otherCoaches.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: '#9A9A9E', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                {getDomainName(activeDomain)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 }} />
                <Text style={{ color: '#6E6E73', fontSize: 12 }}>
                  {otherCoaches.length + 1} available
                </Text>
              </View>
            </View>
          )}

          {/* Grid of Coaches */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
            {otherCoaches.map((coach) => (
              <View key={coach.id} style={{ width: '50%', padding: 4 }}>
                <PersonaCard
                  persona={coach}
                  onPress={() => setSelectedPersona(coach)}
                />
              </View>
            ))}
          </View>

          {filteredCoaches.length === 0 && (
            <View className="py-20 items-center">
              <Text className="text-text-muted">No coaches available in this category</Text>
            </View>
          )}
        </Animated.ScrollView>
      )}

      <PersonaModal
        persona={selectedPersona}
        visible={selectedPersona !== null}
        onClose={() => setSelectedPersona(null)}
        onChallenge={handleChallenge}
      />

      {isCreating && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={{ borderRadius: 16, padding: 24, alignItems: 'center' }}
          >
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-text-primary mt-4">
              Starting session...
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}
