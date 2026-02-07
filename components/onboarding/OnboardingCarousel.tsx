import { useCallback, useState } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaginationDots } from './PaginationDots';
import { SlideHero } from './slides/SlideHero';
import { SlideDomains } from './slides/SlideDomains';
import { SlideConversation } from './slides/SlideConversation';
import { SlideGrowth } from './slides/SlideGrowth';
import { SlideReady } from './slides/SlideReady';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_COUNT = 5;

const SLIDES = [0, 1, 2, 3, 4];

function SlideRenderer({
  index,
  activeIndex,
}: {
  index: number;
  activeIndex: number;
}) {
  const isActive = index === activeIndex;

  switch (index) {
    case 0:
      return <SlideHero isActive={isActive} />;
    case 1:
      return <SlideDomains isActive={isActive} />;
    case 2:
      return <SlideConversation isActive={isActive} />;
    case 3:
      return <SlideGrowth isActive={isActive} />;
    case 4:
      return <SlideReady isActive={isActive} />;
    default:
      return null;
  }
}

export function OnboardingCarousel() {
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    [],
  );

  const handleSkip = async () => {
    await AsyncStorage.setItem('@dialectica/hasSeenOnboarding', 'true');
    router.push('/(auth)/onboarding/pick-personas');
  };

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <SlideRenderer index={item} activeIndex={activeIndex} />
    ),
    [activeIndex],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F12' }}>
      <Animated.FlatList<number>
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => String(item)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {/* Skip button - visible on slides 0-3 */}
      {activeIndex < 4 && (
        <SafeAreaView
          edges={['top']}
          style={{ position: 'absolute', top: 0, right: 0 }}
        >
          <Pressable
            onPress={handleSkip}
            style={{ paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Animated.Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 15,
                fontWeight: '500',
              }}
            >
              Skip
            </Animated.Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Pagination dots */}
      <SafeAreaView edges={['bottom']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <PaginationDots
          count={SLIDE_COUNT}
          scrollX={scrollX}
          screenWidth={SCREEN_WIDTH}
        />
      </SafeAreaView>
    </View>
  );
}
