import { View, Text, Pressable, ScrollView } from 'react-native';
import { TraitCategory, TraitOption, TraitSelection } from '../../types/coaching';

interface TraitPickerProps {
  categories: TraitCategory[];
  options: Record<string, TraitOption[]>;
  selections: TraitSelection;
  onSelect: (categorySlug: string, optionId: string, promptModifier: string) => void;
  accentColor?: string;
}

export function TraitPicker({
  categories,
  options,
  selections,
  onSelect,
  accentColor = '#10b981',
}: TraitPickerProps) {
  if (categories.length === 0) return null;

  return (
    <View style={{ marginBottom: 16, gap: 12 }}>
      {categories.map((category) => {
        const categoryOptions = options[category.slug] || [];
        if (categoryOptions.length === 0) return null;

        const selectedOptionId = selections[category.slug]?.optionId;

        return (
          <View key={category.id}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 6,
                paddingLeft: 2,
              }}
            >
              {category.name}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {categoryOptions.map((option) => {
                const isSelected = selectedOptionId === option.id
                  || (!selectedOptionId && option.isDefault);

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onSelect(category.slug, option.id, option.promptModifier)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: isSelected
                        ? `${accentColor}30`
                        : 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor: isSelected
                        ? accentColor
                        : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? accentColor : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {option.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}
