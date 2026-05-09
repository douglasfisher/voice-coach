import { View, Text, Image, ImageSourcePropType } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type AvatarSource = string | ImageSourcePropType | null;

interface AvatarProps {
  source?: AvatarSource;
  fallback?: string;
  size?: AvatarSize;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6 rounded-full', text: 'text-xs' },
  sm: { container: 'w-8 h-8 rounded-full', text: 'text-sm' },
  md: { container: 'w-12 h-12 rounded-xl', text: 'text-lg' },
  lg: { container: 'w-16 h-16 rounded-xl', text: 'text-xl' },
  xl: { container: 'w-24 h-24 rounded-2xl', text: 'text-3xl' },
};

export function Avatar({ source, fallback, size = 'md' }: AvatarProps) {
  const styles = sizeStyles[size];

  if (source) {
    // Handle both local images (require) and remote URLs (string)
    const imageSource = typeof source === 'string' ? { uri: source } : source;

    return (
      <Image
        source={imageSource}
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
