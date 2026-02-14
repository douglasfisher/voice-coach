import { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { Wand2, ZoomIn, Library } from 'lucide-react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { AvatarGrid } from './AvatarGrid';
import { AvatarLibraryModal } from './AvatarLibraryModal';
import {
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  LIGHTING_OPTIONS,
  CLOTHING_OPTIONS,
  EXPRESSION_OPTIONS,
  ACCESSORY_OPTIONS,
  POSE_OPTIONS,
  CAMERA_OPTIONS,
} from '../../../types/wizard';

function OptionChips({
  label,
  options,
  selected,
  onSelect,
  multi: _multi = false,
}: {
  label: string;
  options: string[];
  selected: string | string[];
  onSelect: (val: string) => void;
  multi?: boolean;
}) {
  const selectedArray = Array.isArray(selected) ? selected : [selected];

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const isSelected = selectedArray.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#F59E0B' : 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontWeight: isSelected ? '600' : '400',
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function WizardStepAvatar() {
  const {
    avatar,
    updateAvatarParams,
    setEditablePrompt,
    generateDrafts,
    selectDraft,
    upscaleSelected,
    selectFromLibrary,
  } = useWizardStore();

  const [libraryVisible, setLibraryVisible] = useState(false);

  const handleAccessoryToggle = (acc: string) => {
    const current = avatar.params.accessories;
    if (acc === 'none') {
      updateAvatarParams({ accessories: ['none'] });
    } else {
      const withoutNone = current.filter((a) => a !== 'none');
      const newList = withoutNone.includes(acc)
        ? withoutNone.filter((a) => a !== acc)
        : [...withoutNone, acc];
      updateAvatarParams({ accessories: newList.length === 0 ? ['none'] : newList });
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hi-res preview */}
      {avatar.hiResUrl && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image
            source={{ uri: avatar.hiResUrl }}
            style={{
              width: 200,
              height: 200,
              borderRadius: 100,
              borderWidth: 3,
              borderColor: '#F59E0B',
            }}
          />
          <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 8 }}>
            Hi-res avatar ready
          </Text>
        </View>
      )}

      {/* Option selectors */}
      <OptionChips
        label="Gender"
        options={GENDER_OPTIONS}
        selected={avatar.params.gender}
        onSelect={(val) => updateAvatarParams({ gender: val })}
      />

      <OptionChips
        label="Ethnicity"
        options={ETHNICITY_OPTIONS}
        selected={avatar.params.ethnicity}
        onSelect={(val) => updateAvatarParams({ ethnicity: val })}
      />

      <OptionChips
        label="Expression"
        options={EXPRESSION_OPTIONS}
        selected={avatar.params.expression}
        onSelect={(val) => updateAvatarParams({ expression: val })}
      />

      <OptionChips
        label="Clothing"
        options={CLOTHING_OPTIONS}
        selected={avatar.params.clothing}
        onSelect={(val) => updateAvatarParams({ clothing: val })}
      />

      <OptionChips
        label="Lighting"
        options={LIGHTING_OPTIONS}
        selected={avatar.params.lighting}
        onSelect={(val) => updateAvatarParams({ lighting: val })}
      />

      <OptionChips
        label="Accessories"
        options={ACCESSORY_OPTIONS}
        selected={avatar.params.accessories}
        onSelect={handleAccessoryToggle}
        multi
      />

      <OptionChips
        label="Pose"
        options={POSE_OPTIONS}
        selected={avatar.params.pose}
        onSelect={(val) => updateAvatarParams({ pose: val })}
      />

      <OptionChips
        label="Camera / Lens"
        options={CAMERA_OPTIONS}
        selected={avatar.params.camera}
        onSelect={(val) => updateAvatarParams({ camera: val })}
      />

      {/* Editable prompt */}
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8, marginTop: 4 }}>
        Prompt (auto-built, editable)
      </Text>
      <TextInput
        value={avatar.editablePrompt}
        onChangeText={setEditablePrompt}
        multiline
        numberOfLines={4}
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 14,
          color: '#fff',
          fontSize: 13,
          minHeight: 80,
          textAlignVertical: 'top',
          marginBottom: 16,
        }}
        placeholderTextColor="rgba(255,255,255,0.3)"
      />

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Pressable
          onPress={generateDrafts}
          disabled={avatar.isGenerating}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            opacity: avatar.isGenerating ? 0.5 : 1,
          }}
        >
          <Wand2 size={16} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
            {avatar.drafts.length > 0 ? 'Regenerate' : 'Generate 4 Drafts'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setLibraryVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Library size={16} color="rgba(255,255,255,0.6)" />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginLeft: 6 }}>
            Library
          </Text>
        </Pressable>
      </View>

      {/* Draft grid */}
      <AvatarGrid
        drafts={avatar.drafts}
        selectedId={avatar.selectedDraftId}
        onSelect={selectDraft}
        isGenerating={avatar.isGenerating}
      />

      {/* Upscale button */}
      {avatar.selectedDraftId && !avatar.hiResUrl && (
        <Pressable
          onPress={upscaleSelected}
          disabled={avatar.isUpscaling}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(74, 222, 128, 0.3)',
            marginTop: 12,
            opacity: avatar.isUpscaling ? 0.5 : 1,
          }}
        >
          {avatar.isUpscaling ? (
            <>
              <ActivityIndicator size="small" color="#4ade80" />
              <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
                Upscaling...
              </Text>
            </>
          ) : (
            <>
              <ZoomIn size={18} color="#4ade80" />
              <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
                Upscale Selected to Hi-Res
              </Text>
            </>
          )}
        </Pressable>
      )}

      <View style={{ height: 40 }} />

      <AvatarLibraryModal
        visible={libraryVisible}
        onClose={() => setLibraryVisible(false)}
        onSelect={selectFromLibrary}
      />
    </ScrollView>
  );
}
