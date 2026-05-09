import { LinearGradient } from 'expo-linear-gradient';

export function HeaderFade() {
  return (
    <LinearGradient
      colors={['rgba(10,10,15,0.9)', 'transparent']}
      style={{ height: 80 }}
      pointerEvents="none"
    />
  );
}
