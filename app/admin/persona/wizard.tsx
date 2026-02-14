/**
 * Persona Creation Wizard
 *
 * Step-by-step guided flow for creating new personas.
 * Starts with AI avatar generation, then configures all persona fields.
 */

import { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWizardStore } from '../../../stores/wizardStore';
import { useAdminPersonaStore } from '../../../stores/adminPersonaStore';
import { WizardStep } from '../../../types/wizard';

import { WizardProgressBar } from '../../../components/admin/wizard/WizardProgressBar';
import { WizardNavButtons } from '../../../components/admin/wizard/WizardNavButtons';
import { WizardStepAvatar } from '../../../components/admin/wizard/WizardStepAvatar';
import { WizardStepDetails } from '../../../components/admin/wizard/WizardStepDetails';
import { WizardStepPersonality } from '../../../components/admin/wizard/WizardStepPersonality';
import { WizardStepTraitDefaults } from '../../../components/admin/wizard/WizardStepTraitDefaults';
import { WizardStepVoice } from '../../../components/admin/wizard/WizardStepVoice';
import { WizardStepModel } from '../../../components/admin/wizard/WizardStepModel';
import { WizardStepPrompt } from '../../../components/admin/wizard/WizardStepPrompt';
import { WizardStepReview } from '../../../components/admin/wizard/WizardStepReview';

function StepContent({ step }: { step: WizardStep }) {
  switch (step) {
    case 0: return <WizardStepAvatar />;
    case 1: return <WizardStepDetails />;
    case 2: return <WizardStepPersonality />;
    case 3: return <WizardStepTraitDefaults />;
    case 4: return <WizardStepVoice />;
    case 5: return <WizardStepModel />;
    case 6: return <WizardStepPrompt />;
    case 7: return <WizardStepReview />;
    default: return null;
  }
}

// Steps that can be skipped
const SKIPPABLE_STEPS = new Set<WizardStep>([0, 3, 4]);

export default function PersonaWizardScreen() {
  const {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    formData,
    savePersona,
    reset,
  } = useWizardStore();

  const { isSaving } = useAdminPersonaStore();

  // Reset wizard on mount
  useEffect(() => {
    reset();
  }, [reset]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    const { error } = await savePersona();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      reset();
      router.replace('/admin/personas');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <WizardProgressBar currentStep={currentStep} onStepPress={goToStep} />

      <View style={{ flex: 1 }}>
        <StepContent step={currentStep} />
      </View>

      <WizardNavButtons
        currentStep={currentStep}
        totalSteps={8}
        onBack={prevStep}
        onNext={nextStep}
        onSave={handleSave}
        isSaving={isSaving}
        canSkip={SKIPPABLE_STEPS.has(currentStep)}
      />
    </SafeAreaView>
  );
}
