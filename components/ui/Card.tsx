import { View, Pressable, ViewProps } from 'react-native';
import { ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outline';
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-bg-secondary',
  elevated: 'bg-bg-tertiary',
  outline: 'bg-transparent border border-bg-tertiary',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  variant = 'default',
  onPress,
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const baseStyles = `rounded-2xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${baseStyles} active:opacity-80`}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseStyles} {...props}>
      {children}
    </View>
  );
}
