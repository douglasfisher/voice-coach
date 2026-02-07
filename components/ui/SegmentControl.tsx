import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import { useState, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

interface SegmentControlProps<T extends string> {
  tabs: { key: T; label: string }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export function SegmentControl<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: SegmentControlProps<T>) {
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [tabPositions, setTabPositions] = useState<number[]>([]);
  const containerRef = useRef<View>(null);

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Update indicator position when active tab changes
  if (tabPositions.length > 0 && tabWidths.length > 0 && activeIndex >= 0) {
    indicatorLeft.value = withSpring(tabPositions[activeIndex] ?? 0, {
      damping: 20,
      stiffness: 200,
    });
    indicatorWidth.value = withSpring(tabWidths[activeIndex] ?? 0, {
      damping: 20,
      stiffness: 200,
    });
  }

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    width: indicatorWidth.value,
  }));

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    setTabWidths((prev) => {
      const newWidths = [...prev];
      newWidths[index] = width;
      return newWidths;
    });
    setTabPositions((prev) => {
      const newPositions = [...prev];
      newPositions[index] = x;
      return newPositions;
    });
  };

  return (
    <View
      ref={containerRef}
      style={{
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
        position: 'relative',
      }}
    >
      {/* Animated indicator */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 4,
            height: '100%',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
          },
          animatedIndicatorStyle,
        ]}
      />

      {/* Tabs */}
      {tabs.map((tab, index) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onLayout={(e) => handleTabLayout(index, e)}
            onPress={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#F59E0B' : 'rgba(255,255,255,0.5)',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
