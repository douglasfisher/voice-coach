import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target,
  Users,
  MessageCircle,
  TrendingUp,
  ChevronRight,
  Sparkles,
  LucideIcon,
} from 'lucide-react-native';

export default function WelcomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.1)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          {/* Hero Section */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 30,
              }}
            >
              <Target size={52} color="#F59E0B" />
            </View>

            <Text
              style={{
                color: '#fff',
                fontSize: 32,
                fontWeight: '800',
                textAlign: 'center',
                letterSpacing: -0.5,
              }}
            >
              Welcome to Dialectica
            </Text>

            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 17,
                textAlign: 'center',
                marginTop: 12,
                lineHeight: 26,
                paddingHorizontal: 10,
              }}
            >
              A space to challenge your thinking, discover blind spots, and grow into a sharper thinker.
            </Text>
          </View>

          {/* How It Works */}
          <View
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              marginBottom: 32,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 20,
                }}
              >
                How it works
              </Text>

              <FeatureItem
                Icon={Users}
                color="#c084fc"
                title="Choose a Challenger"
                description="Pick from diverse AI personas with unique perspectives"
              />

              <FeatureItem
                Icon={MessageCircle}
                color="#60a5fa"
                title="Engage in Dialogue"
                description="Discuss ideas through Socratic questioning"
              />

              <FeatureItem
                Icon={TrendingUp}
                color="#4ade80"
                title="Track Growth"
                description="See your thinking patterns improve over time"
                isLast
              />
            </LinearGradient>
          </View>

          {/* Get Started Button */}
          <Pressable onPress={() => router.push('/(auth)/onboarding/pick-personas')}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                borderRadius: 16,
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <Sparkles size={20} color="#0f0f12" />
              <Text
                style={{
                  color: '#0f0f12',
                  fontSize: 17,
                  fontWeight: '700',
                  marginLeft: 8,
                }}
              >
                Get Started
              </Text>
              <ChevronRight size={20} color="#0f0f12" style={{ marginLeft: 4 }} />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeatureItem({
  Icon,
  color,
  title,
  description,
  isLast = false,
}: {
  Icon: LucideIcon;
  color: string;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: isLast ? 0 : 20,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: `${color}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Icon size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}
