import { View, Image, Pressable, ActivityIndicator, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { DraftImage } from '../../../types/wizard';

interface AvatarGridProps {
  drafts: DraftImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isGenerating: boolean;
}

export function AvatarGrid({ drafts, selectedId, onSelect, isGenerating }: AvatarGridProps) {
  if (isGenerating) {
    return (
      <View
        style={{
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 12 }}>
          Generating 4 drafts...
        </Text>
      </View>
    );
  }

  if (drafts.length === 0) {
    return (
      <View
        style={{
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          borderStyle: 'dashed',
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          Configure options and generate drafts
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {drafts.map((draft) => {
        const isSelected = draft.id === selectedId;
        return (
          <Pressable
            key={draft.id}
            onPress={() => onSelect(draft.id)}
            style={{
              width: '48.5%',
              aspectRatio: 1,
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: isSelected ? '#F59E0B' : 'rgba(255,255,255,0.1)',
            }}
          >
            <Image
              source={{ uri: draft.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            {isSelected && (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} color="#000" />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
