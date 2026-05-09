import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react-native';

interface WizardNavButtonsProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  canSkip?: boolean;
  isEditing?: boolean;
}

export function WizardNavButtons({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  onSave,
  isSaving,
  canSkip,
  isEditing,
}: WizardNavButtonsProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#0a0a0f',
      }}
    >
      {/* Back */}
      <Pressable
        onPress={onBack}
        disabled={isFirst}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 10,
          backgroundColor: isFirst ? 'transparent' : 'rgba(255,255,255,0.05)',
          opacity: isFirst ? 0.3 : 1,
        }}
      >
        <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 4 }}>Back</Text>
      </Pressable>

      {/* Skip (optional) */}
      {canSkip && !isLast && (
        <Pressable
          onPress={onSkip || onNext}
          style={{ paddingVertical: 10, paddingHorizontal: 12 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Skip</Text>
        </Pressable>
      )}

      {/* Next / Save */}
      {isLast ? (
        <Pressable
          onPress={onSave}
          disabled={isSaving}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 10,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <>
              <Save size={16} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>
                {isEditing ? 'Update Persona' : 'Create Persona'}
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onNext}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 10,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
          }}
        >
          <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600', marginRight: 4 }}>
            Next
          </Text>
          <ChevronRight size={18} color="#F59E0B" />
        </Pressable>
      )}
    </View>
  );
}
