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
  ArrowLeft,
  Menu,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { AdminSidePanel } from '../../components/admin/AdminSidePanel';

function BackToAppButton() {
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        paddingHorizontal: 16,
      }}
    >
      <ArrowLeft size={20} color="#F59E0B" />
      <Text style={{ color: '#F59E0B', fontSize: 15, marginLeft: 6 }}>App</Text>
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
      <ArrowLeft size={20} color="#F59E0B" />
      <Text style={{ color: '#F59E0B', fontSize: 15, marginLeft: 6 }}>Personas</Text>
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
          headerLeft: () => <BackToAppButton />,
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
