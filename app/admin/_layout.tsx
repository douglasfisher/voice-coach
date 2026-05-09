/**
 * Admin Panel Layout
 *
 * Stack navigation with a slide-in side panel for admin navigation.
 * Replaces the previous bottom tab bar for better visibility of all 8 admin pages.
 */

import { useState, useCallback } from 'react';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';
import { Stack, Redirect, router, usePathname } from 'expo-router';
import {
  ChevronLeft,
  Menu,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { AdminSidePanel } from '../../components/admin/AdminSidePanel';

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{
        justifyContent: 'center',
        paddingLeft: 8,
        paddingRight: 12,
      }}
    >
      <ChevronLeft size={24} color="#F59E0B" />
    </Pressable>
  );
}

function BackToPersonasButton() {
  return (
    <Pressable
      onPress={() => router.replace('/admin/personas')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16,
      }}
    >
      <ChevronLeft size={24} color="#F59E0B" />
    </Pressable>
  );
}

function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{
        marginRight: 4,
        marginLeft: 2,
        marginTop: -4,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Menu size={22} color="#F59E0B" />
    </Pressable>
  );
}

export default function AdminLayout() {
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [panelOpen, setPanelOpen] = useState(false);
  const pathname = usePathname();

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!profile?.is_admin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#1A1A1F',
          },
          headerTintColor: '#F59E0B',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeftContainerStyle: {
            justifyContent: 'center',
          },
          headerRightContainerStyle: {
            justifyContent: 'center',
          },
          headerLeft: () => <BackButton />,
          headerRight: () => <MenuButton onPress={openPanel} />,
          contentStyle: {
            backgroundColor: '#0a0a0f',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerTitle: 'Admin Dashboard' }}
        />
        <Stack.Screen
          name="personas"
          options={{ headerTitle: 'Manage Personas' }}
        />
        <Stack.Screen
          name="traits"
          options={{ headerTitle: 'Trait Manager' }}
        />
        <Stack.Screen
          name="users"
          options={{ headerTitle: 'User Management' }}
        />
        <Stack.Screen
          name="usage"
          options={{ headerTitle: 'AI Usage & Costs' }}
        />
        <Stack.Screen
          name="costs"
          options={{ headerTitle: 'AI Cost Center' }}
        />
        <Stack.Screen
          name="pricing"
          options={{ headerTitle: 'Model Pricing' }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerTitle: 'App Settings' }}
        />
        <Stack.Screen
          name="avatars"
          options={{ headerTitle: 'Avatar Studio' }}
        />
        <Stack.Screen
          name="persona/[id]"
          options={{
            headerTitle: 'Edit Persona',
            headerLeft: () => <BackToPersonasButton />,
          }}
        />
        <Stack.Screen
          name="persona/wizard"
          options={{
            headerTitle: 'Create Persona',
            headerLeft: () => <BackToPersonasButton />,
          }}
        />
      </Stack>

      <AdminSidePanel
        visible={panelOpen}
        onClose={closePanel}
        currentPath={pathname}
      />
    </View>
  );
}
