import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../../../stores/authStore';

type Gender = 'male' | 'female';
type Interest = 'men' | 'women';

function PillButton({
  label,
  selected,
  onPress,
  color = '#f472b6',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: 'center',
          backgroundColor: selected ? `${color}20` : 'rgba(255,255,255,0.05)',
          borderWidth: 2,
          borderColor: selected ? color : 'rgba(255,255,255,0.1)',
        }}
      >
        <Text
          style={{
            color: selected ? color : 'rgba(255,255,255,0.5)',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DatingPreferencesScreen() {
  const { updatePreferences } = useAuthStore();
  const [userGender, setUserGender] = useState<Gender | null>(null);
  const [interestedIn, setInterestedIn] = useState<Interest | null>(null);

  const handleContinue = async () => {
    if (userGender || interestedIn) {
      await updatePreferences({
        user_gender: userGender,
        interested_in: interestedIn,
      });
    }
    router.push('/(auth)/onboarding/preferences');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <LinearGradient
        colors={['rgba(244, 114, 182, 0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
        }}
      />

      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        {/* Header */}
        <View style={{ padding: 20 }}>
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <ChevronLeft size={20} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginLeft: 4 }}>
              Back
            </Text>
          </Pressable>

          {/* Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(244, 114, 182, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Heart size={24} color="#f472b6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                About You
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 15,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Help us personalize your dating scenarios. This is optional — you can skip or update later in settings.
          </Text>
        </View>

        {/* Cards */}
        <View style={{ flex: 1, padding: 20, gap: 24 }}>
          {/* I am */}
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 14,
                }}
              >
                I AM
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PillButton
                  label="Male"
                  selected={userGender === 'male'}
                  onPress={() => setUserGender(userGender === 'male' ? null : 'male')}
                />
                <PillButton
                  label="Female"
                  selected={userGender === 'female'}
                  onPress={() => setUserGender(userGender === 'female' ? null : 'female')}
                />
              </View>
            </LinearGradient>
          </View>

          {/* Interested in */}
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 14,
                }}
              >
                I'M INTERESTED IN
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PillButton
                  label="Men"
                  selected={interestedIn === 'men'}
                  onPress={() => setInterestedIn(interestedIn === 'men' ? null : 'men')}
                  color="#c084fc"
                />
                <PillButton
                  label="Women"
                  selected={interestedIn === 'women'}
                  onPress={() => setInterestedIn(interestedIn === 'women' ? null : 'women')}
                  color="#c084fc"
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Bottom CTA */}
        <View
          style={{
            padding: 20,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
          }}
        >
          <Pressable onPress={handleContinue}>
            <LinearGradient
              colors={['#f472b6', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                borderRadius: 16,
                shadowColor: '#f472b6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <Sparkles size={20} color="#fff" />
              <Text
                style={{
                  color: '#fff',
                  fontSize: 17,
                  fontWeight: '700',
                  marginLeft: 8,
                }}
              >
                Continue
              </Text>
              <ChevronRight size={20} color="#fff" style={{ marginLeft: 4 }} />
            </LinearGradient>
          </Pressable>

          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {userGender || interestedIn
              ? 'Your scenarios will be personalized'
              : 'Skip for now — you can set this later in settings'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
