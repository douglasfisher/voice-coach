import { View, Text, ScrollView, Image } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';

const IMAGE_ASPECT_RATIO = 896 / 1152;

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ReviewField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flexShrink: 0 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>
        {value || 'Not set'}
      </Text>
    </View>
  );
}

export function WizardStepReview() {
  const { formData, avatar } = useWizardStore();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar preview — portrait ratio */}
      {(avatar.hiResUrl || formData.avatar_url) && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image
            source={{ uri: avatar.hiResUrl || formData.avatar_url }}
            style={{
              width: '60%',
              aspectRatio: IMAGE_ASPECT_RATIO,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: 'rgba(245, 158, 11, 0.3)',
            }}
            resizeMode="cover"
          />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12 }}>
            {formData.name || 'Unnamed'}
          </Text>
          {formData.tagline ? (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>
              {formData.tagline}
            </Text>
          ) : null}
        </View>
      )}

      <ReviewCard title="BASIC INFO">
        <ReviewField label="Name" value={formData.name} />
        <ReviewField label="Tagline" value={formData.tagline} />
        <ReviewField label="Type" value={formData.persona_type} />
        <ReviewField label="Challenge Style" value={formData.challenge_style} />
        <ReviewField label="Cultural Background" value={formData.cultural_background} />
      </ReviewCard>

      <ReviewCard title="PERSONALITY">
        <ReviewField label="Warmth" value={formData.warmth} />
        <ReviewField label="Directness" value={formData.directness} />
        <ReviewField label="Patience" value={formData.patience} />
        <ReviewField label="Humor" value={formData.humor} />
        <ReviewField label="Formality" value={formData.formality} />
      </ReviewCard>

      <ReviewCard title="VOICE">
        <ReviewField label="Provider" value={formData.voice_provider} />
        <ReviewField label="Voice ID" value={formData.voice_id || 'Not configured'} />
        <ReviewField label="Speed" value={formData.voice_speed} />
        <ReviewField label="Stability" value={formData.voice_stability} />
      </ReviewCard>

      <ReviewCard title="AI MODEL">
        <ReviewField label="Primary Model" value={formData.ai_config?.model} />
        <ReviewField label="Fallback Model" value={formData.ai_config?.fallback_model} />
        <ReviewField label="Temperature" value={formData.ai_config?.temperature?.toFixed(2)} />
      </ReviewCard>

      <ReviewCard title="SYSTEM PROMPT">
        <Text
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            lineHeight: 18,
          }}
          numberOfLines={8}
        >
          {formData.system_prompt || 'No system prompt configured'}
        </Text>
      </ReviewCard>

      <ReviewCard title="OPTIONS">
        <ReviewField label="Active" value={formData.is_active ? 'Yes' : 'No'} />
        <ReviewField label="Premium" value={formData.is_premium ? 'Yes' : 'No'} />
        <ReviewField label="Mood Shift" value={formData.emotional_progression_enabled ? 'Yes' : 'No'} />
      </ReviewCard>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
