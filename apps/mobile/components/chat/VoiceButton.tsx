import { Pressable, Text, View, ActivityIndicator } from 'react-native';

interface VoiceButtonProps {
  onPress: () => void;
  isPlaying: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: { container: 'w-8 h-8', icon: 'text-sm' },
  md: { container: 'w-10 h-10', icon: 'text-base' },
  lg: { container: 'w-14 h-14', icon: 'text-xl' },
};

export function VoiceButton({
  onPress,
  isPlaying,
  isLoading = false,
  disabled = false,
  size = 'md',
}: VoiceButtonProps) {
  const styles = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      className={`
        ${styles.container}
        rounded-full items-center justify-center
        ${isPlaying ? 'bg-accent-primary' : 'bg-bg-tertiary'}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isPlaying ? '#0F0F12' : '#F59E0B'}
        />
      ) : (
        <Text className={`${styles.icon} ${isPlaying ? 'text-bg-primary' : 'text-accent-primary'}`}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      )}
    </Pressable>
  );
}

interface VoiceControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoiceControls({
  isPlaying,
  isLoading,
  onPlay,
  onStop,
  disabled,
}: VoiceControlsProps) {
  return (
    <View className="flex-row items-center gap-2">
      <VoiceButton
        onPress={isPlaying ? onStop : onPlay}
        isPlaying={isPlaying}
        isLoading={isLoading}
        disabled={disabled}
      />
      {isPlaying && (
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-accent-primary animate-pulse mr-2" />
          <Text className="text-text-muted text-sm">Playing...</Text>
        </View>
      )}
    </View>
  );
}
