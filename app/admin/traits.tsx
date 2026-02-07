import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useAdminTraitStore } from '../../stores/adminTraitStore';

export default function AdminTraitsScreen() {
  const { categories, isLoading, error, fetchCategories, toggleUserVisible } =
    useAdminTraitStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  if (isLoading && categories.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}
        edges={['bottom']}
      >
        <ActivityIndicator size="large" color="#F59E0B" />
      </SafeAreaView>
    );
  }

  const visibleCount = categories.filter((c) => c.userVisible).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.2)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
            {visibleCount} of {categories.length} traits visible to users
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Hidden traits use persona defaults in prompt generation. Toggle visibility to control which traits users can customize before a chat.
          </Text>
        </View>

        {/* Error display */}
        {error && (
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Categories */}
        {categories.map((cat) => {
          const isExpanded = expandedId === cat.id;
          return (
            <View
              key={cat.id}
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: cat.userVisible
                  ? 'rgba(74, 222, 128, 0.2)'
                  : 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              {/* Category Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                }}
              >
                {/* Expand toggle */}
                <Pressable
                  onPress={() => setExpandedId(isExpanded ? null : cat.id)}
                  style={{ marginRight: 10 }}
                >
                  {isExpanded ? (
                    <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
                  ) : (
                    <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
                  )}
                </Pressable>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {cat.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {cat.optionCount} options
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>|</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      {cat.appliesTo.join(', ')}
                    </Text>
                  </View>
                </View>

                {/* Visibility indicator */}
                <View style={{ marginRight: 12 }}>
                  {cat.userVisible ? (
                    <Eye size={16} color="#4ade80" />
                  ) : (
                    <EyeOff size={16} color="rgba(255,255,255,0.3)" />
                  )}
                </View>

                {/* Toggle */}
                <Switch
                  value={cat.userVisible}
                  onValueChange={(val) => toggleUserVisible(cat.id, val)}
                  trackColor={{
                    false: 'rgba(255,255,255,0.1)',
                    true: 'rgba(74, 222, 128, 0.5)',
                  }}
                  thumbColor={cat.userVisible ? '#4ade80' : 'rgba(255,255,255,0.5)'}
                />
              </View>

              {/* Expanded Options */}
              {isExpanded && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.06)',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  {cat.description && (
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 12,
                        marginBottom: 10,
                        fontStyle: 'italic',
                      }}
                    >
                      {cat.description}
                    </Text>
                  )}
                  {cat.options.map((opt, idx) => (
                    <View
                      key={opt.id}
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: idx < cat.options.length - 1 ? 1 : 0,
                        borderBottomColor: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' }}>
                        {opt.name}
                      </Text>
                      {opt.promptModifier ? (
                        <Text
                          style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}
                          numberOfLines={2}
                        >
                          {opt.promptModifier}
                        </Text>
                      ) : (
                        <Text
                          style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}
                        >
                          No modifier (default/neutral)
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
