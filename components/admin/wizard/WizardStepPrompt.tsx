import { useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { Sparkles, ChevronDown, ChevronRight, RotateCcw, Layers } from 'lucide-react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { TraitTokenBadges, TRAIT_TOKENS } from '../shared/TraitTokenBadges';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';
import { PROMPT_SECTION_KEYS, PROMPT_SECTION_LABELS, PromptSectionKey } from '../../../types/wizard';

const MIN_INPUT_HEIGHT = 60;

function PromptSectionCard({ sectionKey }: { sectionKey: PromptSectionKey }) {
  const {
    promptSections,
    setPromptSection,
    generatePromptSection,
    isGeneratingSection,
  } = useWizardStore();
  const [expanded, setExpanded] = useState(true);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const value = promptSections[sectionKey] || '';
  const isGenerating = isGeneratingSection === sectionKey;
  const isTraitTokens = sectionKey === 'trait_tokens';
  const hasContent = value.trim().length > 0;

  const handleContentSizeChange = useCallback((e: { nativeEvent: { contentSize: { height: number } } }) => {
    const newHeight = Math.max(MIN_INPUT_HEIGHT, e.nativeEvent.contentSize.height + 16);
    setInputHeight(newHeight);
  }, []);

  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: hasContent
          ? 'rgba(74, 222, 128, 0.15)'
          : 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {expanded ? (
            <ChevronDown size={16} color="rgba(255,255,255,0.5)" />
          ) : (
            <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
          )}
          <Text
            style={{
              color: hasContent ? '#4ade80' : 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontWeight: '600',
              marginLeft: 8,
            }}
          >
            {PROMPT_SECTION_LABELS[sectionKey]}
          </Text>
          {hasContent && (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#4ade80',
                marginLeft: 8,
              }}
            />
          )}
        </View>

        {/* Action button */}
        <Pressable
          onPress={() => generatePromptSection(sectionKey)}
          disabled={isGenerating || isGeneratingSection !== null}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: isTraitTokens
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(168, 85, 247, 0.1)',
            opacity: isGenerating ? 0.5 : 1,
          }}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={isTraitTokens ? '#F59E0B' : '#a855f7'} />
          ) : isTraitTokens ? (
            <RotateCcw size={12} color="#F59E0B" />
          ) : (
            <Sparkles size={12} color="#a855f7" />
          )}
          <Text
            style={{
              color: isTraitTokens ? '#F59E0B' : '#a855f7',
              fontSize: 11,
              fontWeight: '600',
              marginLeft: 4,
            }}
          >
            {isGenerating
              ? 'Writing...'
              : isTraitTokens
                ? 'Reset Tokens'
                : 'AI Write'}
          </Text>
        </Pressable>
      </Pressable>

      {/* Content */}
      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <TextInput
            value={value}
            onChangeText={(text) => setPromptSection(sectionKey, text)}
            onContentSizeChange={handleContentSizeChange}
            placeholder={`Enter ${PROMPT_SECTION_LABELS[sectionKey].toLowerCase()}...`}
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline
            scrollEnabled={false}
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: 12,
              color: '#fff',
              fontSize: 13,
              height: inputHeight,
              textAlignVertical: 'top',
              lineHeight: 20,
            }}
          />
        </View>
      )}
    </View>
  );
}

// Sections that appear before the trait token badges
const NON_TOKEN_SECTIONS = PROMPT_SECTION_KEYS.filter((k) => k !== 'trait_tokens');

export function WizardStepPrompt() {
  const {
    formData,
    updateFormField,
    promptSections,
    compilePrompt,
    isGeneratingPrompt,
    isGeneratingSection,
  } = useWizardStore();
  const [compiledHeight, setCompiledHeight] = useState(200);

  const hasAnySections = PROMPT_SECTION_KEYS.some(
    (key) => (promptSections[key] || '').trim().length > 0
  );

  const handleCompile = () => {
    compilePrompt();
  };

  // Generate all sections at once
  const handleGenerateAll = async () => {
    const { generatePromptSection } = useWizardStore.getState();
    for (const key of PROMPT_SECTION_KEYS) {
      await generatePromptSection(key);
    }
    // Auto-compile after generating all
    useWizardStore.getState().compilePrompt();
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <AvatarPreviewHeader />

      {/* Generate All button */}
      <Pressable
        onPress={handleGenerateAll}
        disabled={isGeneratingPrompt || isGeneratingSection !== null}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(168, 85, 247, 0.3)',
          marginBottom: 16,
          opacity: isGeneratingSection !== null ? 0.5 : 1,
        }}
      >
        {isGeneratingSection !== null ? (
          <ActivityIndicator size="small" color="#a855f7" />
        ) : (
          <Sparkles size={16} color="#a855f7" />
        )}
        <Text style={{ color: '#a855f7', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
          {isGeneratingSection !== null ? 'AI Writing...' : 'AI Generate All Sections'}
        </Text>
      </Pressable>

      {/* Non-token section cards (identity, character_traits, roleplay_behavior, coaching_approach) */}
      {NON_TOKEN_SECTIONS.map((key) => (
        <PromptSectionCard key={key} sectionKey={key} />
      ))}

      {/* Trait token badges */}
      <Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 1,
          marginBottom: 8,
          marginTop: 4,
        }}
      >
        TRAIT TOKENS
      </Text>

      <TraitTokenBadges
        systemPrompt={
          // Show badge status based on trait_tokens section content
          promptSections.trait_tokens || ''
        }
      />

      {/* Trait tokens section card — after the badges */}
      <PromptSectionCard sectionKey="trait_tokens" />

      {/* Compile button */}
      <Pressable
        onPress={handleCompile}
        disabled={!hasAnySections}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: hasAnySections
            ? 'rgba(74, 222, 128, 0.1)'
            : 'rgba(255,255,255,0.03)',
          borderWidth: 1,
          borderColor: hasAnySections
            ? 'rgba(74, 222, 128, 0.3)'
            : 'rgba(255,255,255,0.08)',
          marginTop: 4,
          marginBottom: 12,
          opacity: hasAnySections ? 1 : 0.4,
        }}
      >
        <Layers size={16} color={hasAnySections ? '#4ade80' : 'rgba(255,255,255,0.4)'} />
        <Text
          style={{
            color: hasAnySections ? '#4ade80' : 'rgba(255,255,255,0.4)',
            fontSize: 13,
            fontWeight: '600',
            marginLeft: 6,
          }}
        >
          Compile Final Prompt
        </Text>
      </Pressable>

      {/* Compiled prompt preview */}
      {formData.system_prompt.trim().length > 0 && (
        <>
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            COMPILED PROMPT
          </Text>

          <TraitTokenBadges
            systemPrompt={formData.system_prompt}
            onInsertMissing={() => {
              const missing = TRAIT_TOKENS.filter(
                (t) => !formData.system_prompt.includes(`{{${t}}}`)
              );
              if (missing.length === 0) return;
              const tokensBlock = missing.map((t) => `{{${t}}}`).join('\n');
              updateFormField(
                'system_prompt',
                formData.system_prompt.trimEnd() + '\n\n' + tokensBlock
              );
            }}
          />

          <TextInput
            value={formData.system_prompt}
            onChangeText={(text) => updateFormField('system_prompt', text)}
            onContentSizeChange={(e) => {
              setCompiledHeight(Math.max(200, e.nativeEvent.contentSize.height + 16));
            }}
            placeholder="Compiled system prompt will appear here..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline
            scrollEnabled={false}
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 14,
              color: '#fff',
              fontSize: 13,
              height: compiledHeight,
              textAlignVertical: 'top',
              lineHeight: 20,
              marginBottom: 16,
            }}
          />
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
