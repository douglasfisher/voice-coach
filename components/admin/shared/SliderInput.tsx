import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

interface SliderInputProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function SliderInput({ label, value, onValueChange, min = 0, max = 100 }: SliderInputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
          {label}
        </Text>
        <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '600' }}>
          {Math.round(value)}
        </Text>
      </View>
      <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={min}
        maximumValue={max}
        step={1}
        minimumTrackTintColor="#F59E0B"
        maximumTrackTintColor="rgba(255,255,255,0.1)"
        thumbTintColor="#F59E0B"
      />
    </View>
  );
}
