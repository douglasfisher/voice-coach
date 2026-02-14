/**
 * Admin Personas Screen
 *
 * List and manage all personas with quick actions.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { useAdminPersonaStore } from '../../stores/adminPersonaStore';
import { AdminPersonaView } from '../../types/admin';
import { resolvePersonaAvatarWithUrl } from '../../lib/personaImages';

interface PersonaListItemProps {
  persona: AdminPersonaView;
  onToggleActive: (id: string) => void;
  onToggleMoodShift: (id: string) => void;
  onEdit: (id: string) => void;
  isSaving: boolean;
}

function PersonaListItem({ persona, onToggleActive, onToggleMoodShift, onEdit, isSaving }: PersonaListItemProps) {
  const avatarSource = resolvePersonaAvatarWithUrl(persona.name, persona.avatar_url, persona.avatar_thumbnail_url);

  return (
    <Pressable
      onPress={() => onEdit(persona.id)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: persona.is_active ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Avatar */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
              borderWidth: 2,
              borderColor: persona.is_active ? '#4ade80' : 'rgba(255,255,255,0.2)',
              overflow: 'hidden',
            }}
          >
            {avatarSource ? (
              <Image
                source={avatarSource}
                style={{ width: 52, height: 52, borderRadius: 26 }}
              />
            ) : (
              <User size={24} color="#F59E0B" />
            )}
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {persona.name}
              </Text>
              {persona.is_premium && (
                <View
                  style={{
                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '600' }}>
                    PREMIUM
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
              numberOfLines={1}
            >
              {persona.tagline}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {persona.challenge_style}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                #{persona.sort_order}
              </Text>
            </View>
          </View>

          {/* Toggles */}
          <View style={{ alignItems: 'center', marginLeft: 12, gap: 8 }}>
            <View style={{ alignItems: 'center' }}>
              <Switch
                value={persona.is_active}
                onValueChange={() => onToggleActive(persona.id)}
                disabled={isSaving}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(74, 222, 128, 0.5)' }}
                thumbColor={persona.is_active ? '#4ade80' : 'rgba(255,255,255,0.5)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
                Active
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Switch
                value={persona.emotional_progression_enabled ?? false}
                onValueChange={() => onToggleMoodShift(persona.id)}
                disabled={isSaving}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168, 85, 247, 0.5)' }}
                thumbColor={persona.emotional_progression_enabled ? '#a855f7' : 'rgba(255,255,255,0.5)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
                Mood
              </Text>
            </View>
          </View>

          {/* Edit Icon */}
          <ChevronRight size={20} color="rgba(255,255,255,0.3)" style={{ marginLeft: 8 }} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminPersonasScreen() {
  const { personas, isLoading, isSaving, fetchPersonas, toggleActive, toggleEmotionalProgression } = useAdminPersonaStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPersonas();
    setRefreshing(false);
  };

  const handleToggleActive = async (id: string) => {
    await toggleActive(id);
  };

  const handleToggleMoodShift = async (id: string) => {
    await toggleEmotionalProgression(id);
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/persona/${id}`);
  };

  const handleCreateNew = () => {
    router.push('/admin/persona/wizard');
  };

  const activePersonas = personas.filter((p) => p.is_active);
  const inactivePersonas = personas.filter((p) => !p.is_active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Create Button */}
        <Pressable
          onPress={handleCreateNew}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 16,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            marginBottom: 24,
          }}
        >
          <Plus size={20} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
            Create New Persona
          </Text>
        </Pressable>

        {isLoading && personas.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : (
          <>
            {/* Active Personas */}
            {activePersonas.length > 0 && (
              <>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                    marginLeft: 4,
                  }}
                >
                  ACTIVE PERSONAS ({activePersonas.length})
                </Text>

                {activePersonas.map((persona) => (
                  <PersonaListItem
                    key={persona.id}
                    persona={persona}
                    onToggleActive={handleToggleActive}
                    onToggleMoodShift={handleToggleMoodShift}
                    onEdit={handleEdit}
                    isSaving={isSaving}
                  />
                ))}
              </>
            )}

            {/* Inactive Personas */}
            {inactivePersonas.length > 0 && (
              <>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                    marginLeft: 4,
                    marginTop: activePersonas.length > 0 ? 16 : 0,
                  }}
                >
                  INACTIVE PERSONAS ({inactivePersonas.length})
                </Text>

                {inactivePersonas.map((persona) => (
                  <PersonaListItem
                    key={persona.id}
                    persona={persona}
                    onToggleActive={handleToggleActive}
                    onToggleMoodShift={handleToggleMoodShift}
                    onEdit={handleEdit}
                    isSaving={isSaving}
                  />
                ))}
              </>
            )}

            {personas.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                  No personas found
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
