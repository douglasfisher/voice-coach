import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import {
  ChevronDown,
  Wand2,
  ZoomIn,
  Library,
  Shuffle,
  X,
  Check,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { AvatarGrid } from '../wizard/AvatarGrid';
import { AvatarLibraryModal } from '../wizard/AvatarLibraryModal';
import { OptionChips } from './OptionChips';
import {
  AvatarParams,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  LIGHTING_OPTIONS,
  CLOTHING_OPTIONS,
  EXPRESSION_OPTIONS,
  ACCESSORY_OPTIONS,
  POSE_OPTIONS,
  CAMERA_OPTIONS,
  APPEARANCE_OPTIONS,
} from '../../../types/wizard';
import { supabase } from '../../../lib/supabase';

const IMAGE_ASPECT_RATIO = 896 / 1152;

interface AvatarGeneratorSectionProps {
  personaId?: string;
  onAvatarApproved: (avatarUrl: string, thumbnailUrl: string) => void;
}

export function AvatarGeneratorSection({ personaId, onAvatarApproved }: AvatarGeneratorSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [paramsLoaded, setParamsLoaded] = useState<'loading' | 'from_library' | 'defaults'>('loading');

  const {
    avatar,
    updateAvatarParams,
    setEditablePrompt,
    randomizeAvatarParams,
    generateDrafts,
    selectDraft,
    upscaleSelected,
    saveDraftsToLibrary,
    selectFromLibrary,
    resetAvatar,
  } = useWizardStore();

  // On mount: reset avatar state and load original params from avatar_library if available
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!personaId) {
      resetAvatar();
      setParamsLoaded('defaults');
      return;
    }

    // Fetch the original generation params for this persona's avatar
    (async () => {
      const { data } = await supabase
        .from('avatar_library')
        .select('params')
        .eq('used_by_persona_id', personaId)
        .eq('is_hi_res', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const savedParams = data?.params as AvatarParams | null;
      if (savedParams?.gender && savedParams?.ethnicity) {
        resetAvatar(savedParams);
        setParamsLoaded('from_library');
      } else {
        resetAvatar();
        setParamsLoaded('defaults');
      }
    })();
  }, [personaId, resetAvatar]);

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

  const handleRejectHiRes = () => {
    useWizardStore.setState((state) => ({
      avatar: { ...state.avatar, hiResUrl: null, hiResStoragePath: null },
    }));
  };

  const handleApprove = async () => {
    if (!avatar.hiResUrl) return;
    const thumbnailUrl = avatar.drafts.find((d) => d.id === avatar.selectedDraftId)?.url || avatar.hiResUrl;
    onAvatarApproved(avatar.hiResUrl, thumbnailUrl);
    if (avatar.drafts.length > 0) {
      await saveDraftsToLibrary(personaId);
    }
    setExpanded(false);
  };

  const handleLibrarySelect = (publicUrl: string, storagePath: string) => {
    selectFromLibrary(publicUrl, storagePath);
    onAvatarApproved(publicUrl, publicUrl);
    setExpanded(false);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 14,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
        }}
      >
        <Sparkles size={16} color="rgba(245, 158, 11, 0.7)" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginLeft: 8, flex: 1 }}>
          Generate New Avatar
        </Text>
        <ChevronDown
          size={16}
          color="rgba(255,255,255,0.4)"
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 12 }}>
          {/* Params source indicator */}
          {paramsLoaded === 'loading' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                Loading original avatar settings...
              </Text>
            </View>
          ) : paramsLoaded === 'from_library' ? (
            <Text style={{ color: 'rgba(74, 222, 128, 0.7)', fontSize: 12, marginBottom: 12 }}>
              Loaded original generation settings ({avatar.params.gender}, {avatar.params.ethnicity})
            </Text>
          ) : personaId ? (
            <Text style={{ color: 'rgba(245, 158, 11, 0.6)', fontSize: 12, marginBottom: 12 }}>
              No saved settings found — using defaults. Adjust gender &amp; ethnicity before generating.
            </Text>
          ) : null}

          {/* Hi-res result at top if approved */}
          {avatar.hiResUrl && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: '#4ade80',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                HI-RES RESULT
              </Text>
              <Image
                source={{ uri: avatar.hiResUrl }}
                style={{
                  width: '100%',
                  aspectRatio: IMAGE_ASPECT_RATIO,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#4ade80',
                }}
                resizeMode="cover"
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(74, 222, 128, 0.08)',
                  borderRadius: 8,
                  padding: 10,
                  marginTop: 10,
                  gap: 8,
                }}
              >
                <CheckCircle size={14} color="#4ade80" />
                <Text style={{ color: 'rgba(74, 222, 128, 0.8)', fontSize: 12 }}>
                  Hi-res image stored in Supabase Storage
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={handleRejectHiRes}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <X size={14} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                    Reject
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleApprove}
                  style={{
                    flex: 2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: 'rgba(74, 222, 128, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(74, 222, 128, 0.4)',
                  }}
                >
                  <Check size={14} color="#4ade80" />
                  <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                    Approve & Apply
                  </Text>
                </Pressable>
              </View>
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
            label="Appearance"
            options={APPEARANCE_OPTIONS}
            selected={avatar.params.appearance}
            onSelect={(val) => updateAvatarParams({ appearance: val })}
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

          {/* Action buttons row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={randomizeAvatarParams}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(168, 85, 247, 0.3)',
              }}
            >
              <Shuffle size={16} color="#a855f7" />
            </Pressable>

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
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Library size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Draft grid */}
          <AvatarGrid
            drafts={avatar.drafts}
            selectedId={avatar.selectedDraftId}
            onSelect={selectDraft}
            isGenerating={avatar.isGenerating}
          />

          {/* Storage confirmation for drafts */}
          {avatar.drafts.length > 0 && !avatar.isGenerating && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(74, 222, 128, 0.08)',
                borderRadius: 8,
                padding: 10,
                marginTop: 8,
                gap: 8,
              }}
            >
              <CheckCircle size={14} color="#4ade80" />
              <Text style={{ color: 'rgba(74, 222, 128, 0.8)', fontSize: 12 }}>
                {avatar.drafts.length} drafts stored in Supabase Storage
              </Text>
            </View>
          )}

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
                    Upscaling to hi-res...
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

          <AvatarLibraryModal
            visible={libraryVisible}
            onClose={() => setLibraryVisible(false)}
            onSelect={handleLibrarySelect}
          />
        </View>
      )}
    </View>
  );
}
