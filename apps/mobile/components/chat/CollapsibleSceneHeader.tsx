import { useState } from 'react';
import { View, Text, Pressable, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { ChevronDown, Clapperboard } from 'lucide-react-native';
import { PersonaDisplay } from '../../types/persona';
import { SPRING_GENTLE } from '../../constants/animations';

interface ChatMessage {
  id: string;
  content: string;
  role: string;
  // Match the DB shape (Postgres timestamp columns are nullable). The
  // store passes the row through unchanged, so keep this string|null.
  created_at?: string | null;
}

interface CollapsibleSceneHeaderProps {
  message: ChatMessage;
  persona: PersonaDisplay;
  immersiveMode: boolean;
  isQAMode: boolean;
}

export function CollapsibleSceneHeader({
  message,
  persona,
  immersiveMode,
  isQAMode,
}: CollapsibleSceneHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);
  const expandProgress = useSharedValue(0);

  const isSceneContext = message.content.startsWith('[SCENE CONTEXT]');
  const displayContent = isSceneContext
    ? message.content.replace('[SCENE CONTEXT]\n', '').replace('[SCENE CONTEXT]', '')
    : message.content;

  const truncatedContent =
    displayContent.length > 50
      ? displayContent.substring(0, 50) + '...'
      : displayContent;

  const imageSource = persona
    ? typeof persona.avatarUrl === 'string'
      ? { uri: persona.avatarUrl }
      : persona.avatarUrl
    : null;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    rotation.value = withSpring(next ? 180 : 0, SPRING_GENTLE);
    expandProgress.value = withSpring(next ? 1 : 0, SPRING_GENTLE);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    maxHeight: interpolate(expandProgress.value, [0, 1], [0, 500]),
  }));

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Collapsed bar */}
      <Pressable
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: immersiveMode
            ? 'rgba(0,0,0,0.5)'
            : 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Left icon */}
        {isQAMode || isSceneContext ? (
          <Clapperboard size={16} color="#60a5fa" />
        ) : imageSource ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1.5,
              borderColor: 'rgba(245, 158, 11, 0.5)',
            }}
          >
            <Image
              source={imageSource as ImageSourcePropType}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <Clapperboard size={16} color="#60a5fa" />
        )}

        {/* Center: truncated text */}
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 10,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13,
            fontStyle: isSceneContext ? 'italic' : 'normal',
          }}
        >
          {truncatedContent}
        </Text>

        {/* Right: chevron */}
        <Animated.View style={chevronStyle}>
          <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
        </Animated.View>
      </Pressable>

      {/* Expanded content */}
      <Animated.View style={[{ overflow: 'hidden' }, expandedStyle]}>
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: immersiveMode
              ? 'rgba(0,0,0,0.6)'
              : 'rgba(255,255,255,0.06)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          {/* Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: isQAMode || isSceneContext
                ? 'rgba(96, 165, 250, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isQAMode || isSceneContext
                ? 'rgba(96, 165, 250, 0.4)'
                : 'rgba(245, 158, 11, 0.4)',
              marginBottom: 10,
            }}
          >
            {isQAMode || isSceneContext ? (
              <>
                <Clapperboard size={11} color="#60a5fa" />
                <Text
                  style={{
                    color: '#60a5fa',
                    fontSize: 10,
                    fontWeight: '700',
                    marginLeft: 5,
                    letterSpacing: 0.5,
                  }}
                >
                  THE SCENE
                </Text>
              </>
            ) : (
              <Text
                style={{
                  color: '#f59e0b',
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.5,
                }}
              >
                {persona.name.toUpperCase()}
              </Text>
            )}
          </View>

          {/* Full content */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              lineHeight: 21,
              fontStyle: isSceneContext ? 'italic' : 'normal',
            }}
          >
            {displayContent}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
