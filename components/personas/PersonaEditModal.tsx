import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Save } from 'lucide-react-native';
import { useWizardStore } from '../../stores/wizardStore';
import { usePersonaStore } from '../../stores/personaStore';
import { WizardStep, WIZARD_STEP_LABELS } from '../../types/wizard';

import { WizardStepAvatar } from '../admin/wizard/WizardStepAvatar';
import { WizardStepDetails } from '../admin/wizard/WizardStepDetails';
import { WizardStepPersonality } from '../admin/wizard/WizardStepPersonality';
import { WizardStepTraitDefaults } from '../admin/wizard/WizardStepTraitDefaults';
import { WizardStepVoice } from '../admin/wizard/WizardStepVoice';
import { WizardStepModel } from '../admin/wizard/WizardStepModel';
import { WizardStepPrompt } from '../admin/wizard/WizardStepPrompt';

// Tabs 0–6 (skip Review which is step 7)
const EDIT_TABS: { step: WizardStep; label: string }[] = [
  { step: 0, label: WIZARD_STEP_LABELS[0] },
  { step: 1, label: WIZARD_STEP_LABELS[1] },
  { step: 2, label: WIZARD_STEP_LABELS[2] },
  { step: 3, label: WIZARD_STEP_LABELS[3] },
  { step: 4, label: WIZARD_STEP_LABELS[4] },
  { step: 5, label: WIZARD_STEP_LABELS[5] },
  { step: 6, label: WIZARD_STEP_LABELS[6] },
];

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  0: WizardStepAvatar,
  1: WizardStepDetails,
  2: WizardStepPersonality,
  3: WizardStepTraitDefaults,
  4: WizardStepVoice,
  5: WizardStepModel,
  6: WizardStepPrompt,
};

interface PersonaEditModalProps {
  personaId: string;
  personaName: string;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PersonaEditModal({
  personaId,
  personaName,
  visible,
  onClose,
  onSaved,
}: PersonaEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const currentStep = useWizardStore((s) => s.currentStep);
  const isLoadingPersona = useWizardStore((s) => s.isLoadingPersona);
  const goToStep = useWizardStore((s) => s.goToStep);
  const loadPersona = useWizardStore((s) => s.loadPersona);
  const savePersona = useWizardStore((s) => s.savePersona);
  const reset = useWizardStore((s) => s.reset);
  const fetchPersonas = usePersonaStore((s) => s.fetchPersonas);

  useEffect(() => {
    if (visible && personaId) {
      loadPersona(personaId);
    }
    return () => {
      if (!visible) reset();
    };
  }, [visible, personaId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await savePersona();
      if (error) {
        console.error('Save persona error:', error);
        return;
      }
      await fetchPersonas();
      onSaved();
    } catch (err) {
      console.error('Save persona error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const StepComponent = STEP_COMPONENTS[currentStep] || null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={24} color="#fff" />
          </Pressable>

          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '600',
              flex: 1,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            Edit {personaName}
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={isSaving || isLoadingPersona}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isSaving ? 'rgba(16,185,129,0.4)' : '#10b981',
            }}
            hitSlop={8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 }}>
                  Save
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Tab strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 44, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center' }}
        >
          {EDIT_TABS.map((tab) => {
            const isActive = currentStep === tab.step;
            return (
              <Pressable
                key={tab.step}
                onPress={() => goToStep(tab.step)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  marginRight: 4,
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? '#10b981' : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#10b981' : 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    fontWeight: isActive ? '700' : '500',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Content */}
        {isLoadingPersona ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 }}>
              Loading persona...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {StepComponent && <StepComponent />}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
