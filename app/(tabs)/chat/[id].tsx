import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Image,
  ImageSourcePropType,
  Alert,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MessageSquare,
  X,
  Sparkles,
  Zap,
  Brain,
  Heart,
  Scale,
  Eye,
  RotateCcw,
  LogOut,
} from 'lucide-react-native';
import { useConversation } from '../../../hooks/useConversation';
import { useTTS } from '../../../hooks/useTTS';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useTraits } from '../../../hooks/useTraits';
import { useAuthStore } from '../../../stores/authStore';
import { useChatStore } from '../../../stores/chatStore';
import { useShallow } from 'zustand/react/shallow';
import {
  PersonaHeader,
  MessageBubble,
  TypingIndicator,
  ChatInput,
  ChatHeroEmptyState,
  EndChatModal,
  SessionTimer,
  ResetConfirmationModal,
  CollapsibleSceneHeader,
} from '../../../components/chat';
import { useAppSetting } from '../../../hooks/useAppSetting';
import { HeaderFade } from '../../../components/ui/HeaderFade';
import { ChallengeStyle } from '../../../types/persona';

// Challenge style themes
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['transparent', 'rgba(16, 52, 96, 0.3)', 'rgba(16, 52, 96, 0.6)'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['transparent', 'rgba(74, 25, 66, 0.3)', 'rgba(74, 25, 66, 0.6)'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['transparent', 'rgba(30, 58, 95, 0.3)', 'rgba(30, 58, 95, 0.6)'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['transparent', 'rgba(61, 53, 32, 0.3)', 'rgba(61, 53, 32, 0.6)'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['transparent', 'rgba(13, 68, 68, 0.3)', 'rgba(13, 68, 68, 0.6)'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['transparent', 'rgba(76, 29, 76, 0.3)', 'rgba(76, 29, 76, 0.6)'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

function FocusMessageWrapper({ isVisible, children }: { isVisible: boolean; children: React.ReactNode }) {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 250 });
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle} entering={FadeInUp.duration(300).easing(Easing.out(Easing.cubic))}>
      {children}
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);
  const preferences = useAuthStore((s) => s.preferences);
  const profile = useAuthStore((s) => s.profile);
  const insets = useSafeAreaInsets();

  const {
    conversation,
    messages,
    persona,
    isLoading,
    isSending,
    error,
    send,
    end,
  } = useConversation(id);

  const { play, stop, isPlaying, generateAndPlay, isLoading: _ttsLoading } = useTTS();

  // Voice input
  const voiceInputEnabled = preferences?.voice_input_enabled ?? false;
  const {
    state: voiceState,
    transcript: voiceTranscript,
    interimTranscript,
    audioLevel,
    handlers: voiceHandlers,
    hasPermission: hasVoicePermission,
  } = useVoiceInput(voiceInputEnabled);

  const _isRecording = voiceState === 'recording';

  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const {
    fetchMessages: _fetchMessages,
    clearMessages,
    startChat,
    generatePreview,
    regenerateQuestion,
    regenerateScenario,
    startChatWithPreview,
    clearPreview,
    generateReport,
    previewQuestion,
    previewScenario,
    questionRefreshCount,
    scenarioRefreshCount,
    isGeneratingPreview,
    isGeneratingReport,
    globalInteractionMode,
    selectedTraits,
    setTrait,
  } = useChatStore(useShallow((s) => ({
    fetchMessages: s.fetchMessages,
    clearMessages: s.clearMessages,
    startChat: s.startChat,
    generatePreview: s.generatePreview,
    regenerateQuestion: s.regenerateQuestion,
    regenerateScenario: s.regenerateScenario,
    startChatWithPreview: s.startChatWithPreview,
    clearPreview: s.clearPreview,
    generateReport: s.generateReport,
    previewQuestion: s.previewQuestion,
    previewScenario: s.previewScenario,
    questionRefreshCount: s.questionRefreshCount,
    scenarioRefreshCount: s.scenarioRefreshCount,
    isGeneratingPreview: s.isGeneratingPreview,
    isGeneratingReport: s.isGeneratingReport,
    globalInteractionMode: s.globalInteractionMode,
    selectedTraits: s.selectedTraits,
    setTrait: s.setTrait,
  })));
  const chatStarted = messages.length > 0;

  // Focus mode setting
  const { value: focusModeEnabled } = useAppSetting('focus_mode_chat');
  const isFocusMode = focusModeEnabled === true;

  // Trait system
  const personaType = persona?.personaType as 'coach' | 'challenger' | undefined;
  const { categories: traitCategories, options: traitOptions } = useTraits(personaType, true);

  const theme = persona ? STYLE_THEMES[persona.challengeStyle] : null;

  // Navigate back to the source tab based on persona type
  const goBackToSource = useCallback(() => {
    if (persona?.personaType === 'coach') {
      router.navigate('/(tabs)/coaches');
    } else {
      router.navigate('/(tabs)/personas');
    }
  }, [persona?.personaType]);

  // Immersive mode: show full-bleed persona image with messages overlaid
  const immersiveModeEnabled = preferences?.immersive_chat_enabled ?? true;
  const showImmersiveLayout = immersiveModeEnabled && chatStarted && !!persona;

  // Get persona image source for immersive mode
  const personaImageSource = persona
    ? typeof persona.avatarUrl === 'string'
      ? { uri: persona.avatarUrl }
      : persona.avatarUrl
    : null;

  const handleSend = async (content: string) => {
    const result = await send(content);

    // Auto-play TTS for assistant response if enabled
    if (result?.response && preferences?.tts_enabled && persona?.voiceConfig) {
      generateAndPlay(result.response, persona.voiceConfig);
    }
  };

  const handlePlayAudio = useCallback(async (audioUrl: string | null, content: string) => {
    if (isPlaying) {
      await stop();
      return;
    }

    if (audioUrl) {
      await play(audioUrl);
    } else if (persona?.voiceConfig) {
      await generateAndPlay(content, persona.voiceConfig);
    }
  }, [isPlaying, stop, play, generateAndPlay, persona?.voiceConfig]);

  const handleEndConversation = () => {
    setShowEndModal(true);
  };

  const handleViewReport = async () => {
    if (!conversation) return;

    const report = await generateReport(conversation.id);
    if (report) {
      router.replace(`/(tabs)/chat/report/${conversation.id}`);
    } else {
      const errorMsg = useChatStore.getState().error || 'An unexpected error occurred.';
      Alert.alert(
        'Report Generation Failed',
        errorMsg,
        [
          { text: 'Try Again', onPress: () => handleViewReport() },
          {
            text: 'Skip Report',
            style: 'cancel',
            onPress: async () => {
              await end();
              goBackToSource();
            },
          },
        ],
      );
    }
  };

  const handleChooseNewChallenger = async () => {
    await end();
    setShowEndModal(false);
    goBackToSource();
  };

  const handleStartChat = async () => {
    if (!conversation) {
      console.error('No conversation found');
      return;
    }

    setIsStartingChat(true);
    try {
      // If we have preview content (question for practice, scenario for Q&A), save and start
      if (previewQuestion || previewScenario) {
        await startChatWithPreview();
      } else {
        // Fallback to original behavior
        await startChat();
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleRefreshQuestion = async () => {
    await regenerateQuestion();
  };

  const handleRefreshScenario = async () => {
    await regenerateScenario();
  };

  const handleResetPress = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    if (!conversation) return;
    setIsClearing(true);
    try {
      await clearMessages(conversation.id);
      setShowResetModal(false);
      // Reset session start time so it restarts when new messages come
      setSessionStartTime(null);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Generate preview when conversation loads and chat hasn't started
  // For Q&A mode, generate scenario; for Practice mode, generate question
  const isQAMode = globalInteractionMode === 'question';
  const isCoach = persona?.personaType === 'coach';
  const hasPreview = isQAMode && isCoach ? !!previewScenario : !!previewQuestion;

  useEffect(() => {
    if (conversation && !chatStarted && !hasPreview && !isGeneratingPreview) {
      generatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, chatStarted, hasPreview]);

  // Clear preview when leaving the screen
  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  // Track session start time when first message appears
  useEffect(() => {
    if (messages.length > 0 && !sessionStartTime) {
      // Use the timestamp of the first message as the session start time
      const firstMessage = messages[0];
      if (firstMessage?.created_at) {
        setSessionStartTime(new Date(firstMessage.created_at));
      } else {
        setSessionStartTime(new Date());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, sessionStartTime]);

  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const userExchangeCount = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages]
  );

  const renderMessage = useCallback(({ item, index }: { item: typeof messages[number]; index: number }) => {
    // In focus mode, only show the last 2 messages (index 0 and 1 in inverted list)
    const isVisible = !isFocusMode || index <= 1;

    const bubble = (
      <MessageBubble
        content={item.content}
        role={item.role as 'user' | 'assistant'}
        persona={item.role === 'assistant' ? persona : undefined}
        audioUrl={item.audio_url}
        onPlayAudio={
          item.role === 'assistant' && preferences?.tts_enabled
            ? () => handlePlayAudio(item.audio_url, item.content)
            : undefined
        }
        isPlaying={isPlaying}
        timestamp={item.created_at}
        responseTimeMs={item.response_time_ms}
        immersiveMode={showImmersiveLayout}
        metadata={item.metadata}
        isAdmin={!!profile?.is_admin}
      />
    );

    if (isFocusMode) {
      return (
        <FocusMessageWrapper isVisible={isVisible}>
          {bubble}
        </FocusMessageWrapper>
      );
    }

    return bubble;
  }, [persona, preferences?.tts_enabled, handlePlayAudio, isPlaying, showImmersiveLayout, profile?.is_admin, isFocusMode]);

  const listFooter = useMemo(() => (
    isSending ? <TypingIndicator persona={persona} /> : null
  ), [isSending, persona]);

  if (isLoading && !conversation) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation || !persona) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <X size={40} color="#ef4444" />
          </View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8 }}>
            Conversation not found
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24 }}>
            This conversation may have been deleted or doesn't exist.
          </Text>
          <Pressable
            onPress={() => router.navigate('/(tabs)/personas')}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: '#F59E0B',
            }}
          >
            <Text style={{ color: '#0f0f12', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#0a0a0f' }}
      edges={chatStarted && !showImmersiveLayout ? ['top'] : []}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Immersive mode background - full bleed persona image */}
        {showImmersiveLayout && personaImageSource && (
          <>
            <Image
              source={personaImageSource as ImageSourcePropType}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.25, 0.5, 1]}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
              }}
            />
          </>
        )}

        {/* Simplified Header - just back button and persona name */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 16,
            paddingTop: (chatStarted && !showImmersiveLayout) ? 0 : insets.top,
            borderBottomWidth: (chatStarted && !showImmersiveLayout) ? 1 : 0,
            borderBottomColor: 'rgba(255,255,255,0.08)',
            backgroundColor: (chatStarted && !showImmersiveLayout) ? 'rgba(10, 10, 15, 0.95)' : 'transparent',
            ...((chatStarted && !showImmersiveLayout) ? {} : {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }),
          }}
        >
          <Pressable
            onPress={goBackToSource}
            style={{
              padding: 16,
              paddingRight: 8,
            }}
          >
            <ChevronLeft size={24} color={theme?.accent || '#F59E0B'} />
          </Pressable>
          {chatStarted && !showImmersiveLayout && (
            <View style={{ flex: 1 }}>
              <PersonaHeader persona={persona} compact />
            </View>
          )}
          {chatStarted && showImmersiveLayout && (
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {persona.name}
              </Text>
            </View>
          )}
          {!chatStarted && <View style={{ flex: 1 }} />}
        </View>

        {/* Fade gradient — fixed below status bar for immersive mode */}
        {showImmersiveLayout && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9 }} pointerEvents="none">
            <HeaderFade />
          </View>
        )}

        {/* Messages or Full-screen Hero */}
        {chatStarted ? (
          <>
            {/* Focus mode: scene header + exchange counter above the list */}
            {isFocusMode && messages.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: showImmersiveLayout ? insets.top + 60 : 16 }}>
                <CollapsibleSceneHeader
                  message={messages[0]}
                  persona={persona}
                  immersiveMode={showImmersiveLayout}
                  isQAMode={isQAMode}
                />
                {userExchangeCount > 0 && (
                  <View
                    style={{
                      alignSelf: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: showImmersiveLayout
                        ? 'rgba(0,0,0,0.4)'
                        : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 11,
                        fontWeight: '600',
                        letterSpacing: 0.5,
                      }}
                    >
                      Exchange {userExchangeCount}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <FlatList
              ref={flatListRef}
              data={invertedMessages}
              inverted
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 16,
                paddingTop: 8,
                paddingBottom: isFocusMode
                  ? 16
                  : (showImmersiveLayout ? insets.top + 60 : 16),
              }}
              showsVerticalScrollIndicator={false}
              style={showImmersiveLayout ? { backgroundColor: 'transparent' } : undefined}
              windowSize={11}
              maxToRenderPerBatch={10}
              initialNumToRender={15}
              renderItem={renderMessage}
              ListHeaderComponent={listFooter}
            />
          </>
        ) : (
          <ChatHeroEmptyState
            persona={persona}
            questionMessage={previewQuestion}
            scenarioMessage={previewScenario}
            refreshCount={questionRefreshCount}
            scenarioRefreshCount={scenarioRefreshCount}
            maxRefreshes={3}
            isLoading={isGeneratingPreview}
            isRefreshing={isGeneratingPreview && hasPreview}
            onRefreshQuestion={handleRefreshQuestion}
            onRefreshScenario={handleRefreshScenario}
            onStartChat={handleStartChat}
            isStarting={isStartingChat}
            traitCategories={traitCategories}
            traitOptions={traitOptions}
            selectedTraits={selectedTraits}
            onTraitSelect={setTrait}
          />
        )}

        {/* Error Display */}
        {error && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)',
            }}
          >
            <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        {/* Input and Bottom Controls - only show after chat has started */}
        {conversation.status === 'active' && chatStarted ? (
          <View style={showImmersiveLayout ? { backgroundColor: 'transparent' } : undefined}>
            {/* Floating Bottom Controls for Text Mode */}
            {!voiceInputEnabled && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 8,
                  backgroundColor: showImmersiveLayout ? 'rgba(0, 0, 0, 0.6)' : 'rgba(10, 10, 15, 0.95)',
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Left: Reset & End buttons */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={handleResetPress}
                    style={{
                      padding: 10,
                      borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <RotateCcw size={18} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                  <Pressable
                    onPress={handleEndConversation}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                      gap: 6,
                    }}
                  >
                    <LogOut size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' }}>
                      End
                    </Text>
                  </Pressable>
                </View>

                {/* Right: Timer */}
                {sessionStartTime && (
                  <SessionTimer
                    startTime={sessionStartTime}
                    accentColor={theme?.accent}
                    isImmersive={showImmersiveLayout}
                  />
                )}
              </View>
            )}

            {/* Chat Input */}
            <ChatInput
              onSend={handleSend}
              disabled={isSending}
              accentColor={theme?.accent}
              voiceInputEnabled={voiceInputEnabled}
              voiceState={voiceState}
              transcript={voiceTranscript}
              interimTranscript={interimTranscript}
              audioLevel={audioLevel}
              hasVoicePermission={hasVoicePermission}
              onVoicePressIn={voiceHandlers.onPressIn}
              onVoicePressOut={voiceHandlers.onPressOut}
              onVoiceCancel={voiceHandlers.onCancel}
              immersiveMode={showImmersiveLayout}
              // Pass control props for voice mode
              showControls={voiceInputEnabled}
              onResetPress={handleResetPress}
              onEndPress={handleEndConversation}
              sessionStartTime={sessionStartTime}
              themeAccent={theme?.accent}
            />
          </View>
        ) : conversation.status !== 'active' ? (
          <View
            style={{
              padding: 16,
              paddingBottom: 24,
              backgroundColor: showImmersiveLayout ? 'rgba(0, 0, 0, 0.6)' : 'rgba(10, 10, 15, 0.95)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
              This conversation has ended
            </Text>
            <Pressable
              onPress={goBackToSource}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme?.accent || '#F59E0B',
              }}
            >
              <MessageSquare size={18} color="#0f0f12" />
              <Text style={{ color: '#0f0f12', fontWeight: '600', marginLeft: 8 }}>
                Start a new conversation
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Reset Confirmation Modal */}
        <ResetConfirmationModal
          visible={showResetModal}
          onCancel={() => setShowResetModal(false)}
          onReset={handleConfirmReset}
          isResetting={isClearing}
        />

        {/* End Chat Modal */}
        <EndChatModal
          visible={showEndModal}
          onContinue={() => setShowEndModal(false)}
          onViewReport={handleViewReport}
          onChooseNewChallenger={handleChooseNewChallenger}
          isGenerating={isGeneratingReport}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
