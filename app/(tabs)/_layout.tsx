import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Home, Users, GraduationCap, TrendingUp, Lightbulb } from 'lucide-react-native';
import { useSharedValue } from 'react-native-reanimated';
import { ScrollHideContext } from '../../hooks/useScrollHideAnimation';
import { AnimatedTabBar } from '../../components/navigation/AnimatedTabBar';
import { useAuthStore } from '../../stores/authStore';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? '#F59E0B' : '#6E6E73';
  // Custom colors for typed tabs
  const coachColor = focused ? '#10b981' : '#6E6E73';
  const advisorColor = focused ? '#8b5cf6' : '#6E6E73';
  const size = 24;

  const icons: Record<string, React.ReactNode> = {
    index: <Home size={size} color={color} />,
    personas: <Users size={size} color={color} />,
    coaches: <GraduationCap size={size} color={coachColor} />,
    advisors: <Lightbulb size={size} color={advisorColor} />,
    growth: <TrendingUp size={size} color={color} />,
  };

  return (
    <View className="items-center">
      {icons[name]}
    </View>
  );
}

export default function TabsLayout() {
  const session = useAuthStore((s) => s.session);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const tabBarProgress = useSharedValue(0);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F12', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ScrollHideContext.Provider value={tabBarProgress}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1A1A1F',
            borderTopColor: '#252529',
            borderTopWidth: 1,
            height: 85,
            paddingTop: 10,
            paddingBottom: 25,
          },
          tabBarActiveTintColor: '#F59E0B',
          tabBarInactiveTintColor: '#6E6E73',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          sceneStyle: { backgroundColor: '#0F0F12' },
        }}
        tabBar={(props) => <AnimatedTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="personas"
          options={{
            title: 'Challengers',
            tabBarIcon: ({ focused }) => <TabIcon name="personas" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="coaches"
          options={{
            title: 'Coaches',
            tabBarIcon: ({ focused }) => <TabIcon name="coaches" focused={focused} />,
            tabBarActiveTintColor: '#10b981',
          }}
        />
        <Tabs.Screen
          name="advisors"
          options={{
            title: 'Advisors',
            tabBarIcon: ({ focused }) => <TabIcon name="advisors" focused={focused} />,
            tabBarActiveTintColor: '#8b5cf6',
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            title: 'Growth',
            tabBarIcon: ({ focused }) => <TabIcon name="growth" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </ScrollHideContext.Provider>
  );
}
