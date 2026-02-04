/**
 * Admin Panel Layout
 *
 * Tab navigation for admin panel with 5 sections:
 * Dashboard, Personas, Users, Usage, Settings
 */

import { Tabs, Redirect, router } from 'expo-router';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';
import {
  LayoutDashboard,
  Users,
  UserCog,
  BarChart3,
  Settings,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

function BackToAppButton() {
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 8,
      }}
    >
      <ArrowLeft size={20} color="#F59E0B" />
      <Text style={{ color: '#F59E0B', fontSize: 15, marginLeft: 6 }}>App</Text>
    </Pressable>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? '#F59E0B' : '#6E6E73';
  const size = 22;

  const icons: Record<string, React.ReactNode> = {
    index: <LayoutDashboard size={size} color={color} />,
    personas: <Users size={size} color={color} />,
    users: <UserCog size={size} color={color} />,
    usage: <BarChart3 size={size} color={color} />,
    settings: <Settings size={size} color={color} />,
  };

  return (
    <View style={{ alignItems: 'center' }}>
      {icons[name]}
    </View>
  );
}

export default function AdminLayout() {
  const { profile, isLoading } = useAuthStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  // Redirect non-admins
  if (!profile?.is_admin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1A1A1F',
          borderBottomWidth: 1,
          borderBottomColor: '#252529',
        },
        headerTintColor: '#F59E0B',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerLeft: () => <BackToAppButton />,
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
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'Admin Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="personas"
        options={{
          title: 'Personas',
          headerTitle: 'Manage Personas',
          tabBarIcon: ({ focused }) => <TabIcon name="personas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          headerTitle: 'User Management',
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="usage"
        options={{
          title: 'Usage',
          headerTitle: 'AI Usage & Costs',
          tabBarIcon: ({ focused }) => <TabIcon name="usage" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'App Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="persona/[id]"
        options={{
          href: null,
          headerTitle: 'Edit Persona',
        }}
      />
    </Tabs>
  );
}
