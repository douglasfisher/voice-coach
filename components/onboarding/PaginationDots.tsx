import { View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 24;
const DOT_SPACING = 8;
const ACTIVE_COLOR = '#F59E0B';
const INACTIVE_COLOR = 'rgba(255,255,255,0.2)';

interface PaginationDotsProps {
  count: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
}

function Dot({
  index,
  scrollX,
  screenWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];

    const width = interpolate(
      scrollX.value,
      input,
      [DOT_SIZE, DOT_ACTIVE_WIDTH, DOT_SIZE],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      input,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP,
    );

    return { width, opacity };
  });

  const colorStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * screenWidth,
      index * screenWidth,
      (index + 1) * screenWidth,
    ];

    const isActive = interpolate(
      scrollX.value,
      input,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: isActive > 0.5 ? ACTIVE_COLOR : INACTIVE_COLOR,
    };
  });

  return (
    <Animated.View
      style={[
        {
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          marginHorizontal: DOT_SPACING / 2,
        },
        animatedStyle,
        colorStyle,
      ]}
    />
  );
}

export function PaginationDots({
  count,
  scrollX,
  screenWidth,
}: PaginationDotsProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} screenWidth={screenWidth} />
      ))}
    </View>
  );
}
