import { View, Text, Pressable } from 'react-native';
import { WizardStep, WIZARD_STEP_LABELS } from '../../../types/wizard';

interface WizardProgressBarProps {
  currentStep: WizardStep;
  onStepPress: (step: WizardStep) => void;
}

export function WizardProgressBar({ currentStep, onStepPress }: WizardProgressBarProps) {
  const steps = [0, 1, 2, 3, 4, 5, 6, 7] as WizardStep[];

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {/* Progress dots */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {steps.map((step) => {
          const isActive = step === currentStep;
          const isComplete = step < currentStep;
          return (
            <Pressable key={step} onPress={() => onStepPress(step)}>
              <View
                style={{
                  width: isActive ? 28 : 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isActive
                    ? '#F59E0B'
                    : isComplete
                      ? 'rgba(245, 158, 11, 0.5)'
                      : 'rgba(255,255,255,0.15)',
                }}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Step label */}
      <Text
        style={{
          color: '#F59E0B',
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
          marginTop: 8,
          letterSpacing: 1,
        }}
      >
        STEP {currentStep + 1}: {WIZARD_STEP_LABELS[currentStep].toUpperCase()}
      </Text>
    </View>
  );
}
