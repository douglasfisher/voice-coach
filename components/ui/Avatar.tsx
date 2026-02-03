import { View, Text, Image } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  fallback?: string;
  size?: AvatarSize;
  emoji?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; emoji: string }> = {
  xs: { container: 'w-6 h-6 rounded-full', text: 'text-xs', emoji: 'text-sm' },
  sm: { container: 'w-8 h-8 rounded-full', text: 'text-sm', emoji: 'text-lg' },
  md: { container: 'w-12 h-12 rounded-xl', text: 'text-lg', emoji: 'text-2xl' },
  lg: { container: 'w-16 h-16 rounded-xl', text: 'text-xl', emoji: 'text-3xl' },
  xl: { container: 'w-24 h-24 rounded-2xl', text: 'text-3xl', emoji: 'text-5xl' },
};

export function Avatar({ source, fallback, size = 'md', emoji }: AvatarProps) {
  const styles = sizeStyles[size];

  if (emoji) {
    return (
      <View className={`${styles.container} bg-bg-tertiary items-center justify-center`}>
        <Text className={styles.emoji}>{emoji}</Text>
      </View>
    );
  }

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        className={styles.container}
        resizeMode="cover"
      />
    );
  }

  const initial = fallback?.charAt(0).toUpperCase() ?? '?';

  return (
    <View className={`${styles.container} bg-accent-muted items-center justify-center`}>
      <Text className={`${styles.text} text-accent-primary font-bold`}>{initial}</Text>
    </View>
  );
}
