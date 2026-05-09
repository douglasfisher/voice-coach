import { View, Text, Pressable } from 'react-native';

interface OptionChipsProps {
  label: string;
  options: string[];
  selected: string | string[];
  onSelect: (val: string) => void;
}

export function OptionChips({ label, options, selected, onSelect }: OptionChipsProps) {
  const selectedArray = Array.isArray(selected) ? selected : [selected];

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const isSelected = selectedArray.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: isSelected ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#F59E0B' : 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontWeight: isSelected ? '600' : '400',
                }}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
