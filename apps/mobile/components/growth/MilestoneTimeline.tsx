import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flag, Check, Circle } from 'lucide-react-native';
import type { Milestone } from '../../types/gamification';

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Flag size={20} color="#60a5fa" />
          </View>
          <View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Milestones
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              Your journey progress
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View>
          {milestones.map((milestone, index) => {
            const isLast = index === milestones.length - 1;
            const progress = milestone.target > 0
              ? Math.min(1, milestone.current / milestone.target)
              : 0;

            return (
              <View
                key={milestone.id}
                style={{
                  flexDirection: 'row',
                  marginBottom: isLast ? 0 : 20,
                }}
              >
                {/* Timeline dot and line */}
                <View style={{ alignItems: 'center', width: 24 }}>
                  {/* Dot */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: milestone.completed
                        ? '#4ade80'
                        : 'rgba(255,255,255,0.1)',
                      borderWidth: 2,
                      borderColor: milestone.completed
                        ? '#4ade80'
                        : 'rgba(255,255,255,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {milestone.completed ? (
                      <Check size={14} color="#0a0a0f" />
                    ) : (
                      <Circle size={8} color="rgba(255,255,255,0.4)" />
                    )}
                  </View>

                  {/* Line */}
                  {!isLast && (
                    <View
                      style={{
                        flex: 1,
                        width: 2,
                        backgroundColor: milestone.completed
                          ? '#4ade80'
                          : 'rgba(255,255,255,0.1)',
                        marginVertical: 4,
                      }}
                    />
                  )}
                </View>

                {/* Content */}
                <View style={{ flex: 1, marginLeft: 12, paddingBottom: isLast ? 0 : 4 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        color: milestone.completed ? '#4ade80' : '#fff',
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      {milestone.name}
                    </Text>
                    <Text
                      style={{
                        color: milestone.completed
                          ? '#4ade80'
                          : 'rgba(255,255,255,0.5)',
                        fontSize: 13,
                        fontWeight: '500',
                      }}
                    >
                      {milestone.current}/{milestone.target} {milestone.unit}
                    </Text>
                  </View>

                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    {milestone.description}
                  </Text>

                  {/* Progress bar (for incomplete milestones) */}
                  {!milestone.completed && (
                    <View
                      style={{
                        height: 6,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        marginTop: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          height: '100%',
                          width: `${progress * 100}%`,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  )}

                  {/* Completed date */}
                  {milestone.completed && milestone.completedAt && (
                    <Text
                      style={{
                        color: 'rgba(74, 222, 128, 0.7)',
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      Completed{' '}
                      {new Date(milestone.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}
