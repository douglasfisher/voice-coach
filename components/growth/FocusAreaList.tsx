import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, Brain, Eye, Lightbulb, Heart, ChevronRight } from 'lucide-react-native';
import type { FocusArea, GrowthDimension } from '../../types/gamification';
import { DIMENSION_CONFIG } from '../../lib/gamification';

interface FocusAreaListProps {
  focusAreas: FocusArea[];
  onAreaPress?: (area: FocusArea) => void;
}

const DIMENSION_ICONS: Record<GrowthDimension, React.ComponentType<any>> = {
  logical: Brain,
  biasAwareness: Eye,
  perspective: Lightbulb,
  emotional: Heart,
};

export function FocusAreaList({ focusAreas, onAreaPress }: FocusAreaListProps) {
  if (focusAreas.length === 0) {
    return (
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <LinearGradient
          colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20, alignItems: 'center' }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: 'rgba(74, 222, 128, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Target size={28} color="#4ade80" />
          </View>
          <Text style={{ color: '#4ade80', fontSize: 16, fontWeight: '600' }}>
            All areas looking great!
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            Keep up the excellent work
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(248, 113, 113, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Target size={20} color="#f87171" />
          </View>
          <View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Focus Areas
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              Priority improvements
            </Text>
          </View>
        </View>

        {/* Focus areas list */}
        <View style={{ gap: 12 }}>
          {focusAreas.map((area, index) => {
            const config = DIMENSION_CONFIG[area.dimension];
            const Icon = DIMENSION_ICONS[area.dimension];
            const priorityColor =
              area.priority === 'high'
                ? '#f87171'
                : area.priority === 'medium'
                ? '#fbbf24'
                : '#6E6E73';

            return (
              <Pressable
                key={area.dimension}
                onPress={() => onAreaPress?.(area)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: `${config.color}20`,
                }}
              >
                {/* Priority indicator */}
                <View
                  style={{
                    width: 4,
                    height: 32,
                    backgroundColor: priorityColor,
                    borderRadius: 2,
                    marginRight: 12,
                  }}
                />

                {/* Icon */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `${config.color}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Icon size={20} color={config.color} />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {config.label}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ color: config.color, fontSize: 14, fontWeight: '600' }}>
                      {area.score}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                      {' '}/ 100
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 13,
                        marginLeft: 8,
                      }}
                    >
                      +{area.gap} to goal
                    </Text>
                  </View>
                </View>

                {/* Priority badge */}
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: `${priorityColor}15`,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: priorityColor,
                      fontSize: 11,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {area.priority}
                  </Text>
                </View>

                <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}
