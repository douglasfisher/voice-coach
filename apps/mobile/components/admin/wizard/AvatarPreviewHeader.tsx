import { View, Image, Text } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';

const IMAGE_ASPECT_RATIO = 896 / 1152;

export function AvatarPreviewHeader() {
  const { avatar, formData } = useWizardStore();
  const imageUrl = avatar.hiResUrl || formData.avatar_url;

  if (!imageUrl) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: 10,
        marginBottom: 16,
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: 56,
          aspectRatio: IMAGE_ASPECT_RATIO,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(245, 158, 11, 0.3)',
        }}
        resizeMode="cover"
      />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
          {formData.name || 'Unnamed Persona'}
        </Text>
        {formData.tagline ? (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
            {formData.tagline}
          </Text>
        ) : null}
        {formData.cultural_background ? (
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
            {formData.cultural_background}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
