/**
 * Admin Side Panel
 *
 * Slide-in navigation panel for admin pages. Replaces the bottom tab bar
 * with a grouped, full-label navigation menu accessed via header menu button.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import {
  X,
  LayoutDashboard,
  Users,
  Sliders,
  UserCog,
  BarChart3,
  DollarSign,
  Coins,
  Settings,
  ArrowLeft,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(300, SCREEN_WIDTH * 0.75);

interface NavItem {
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', subtitle: 'Stats & overview', icon: LayoutDashboard, route: '/admin' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Personas', subtitle: 'Manage personas', icon: Users, route: '/admin/personas' },
      { label: 'Traits', subtitle: 'Trait categories', icon: Sliders, route: '/admin/traits' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Users', subtitle: 'User management', icon: UserCog, route: '/admin/users' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Usage', subtitle: 'AI usage stats', icon: BarChart3, route: '/admin/usage' },
      { label: 'Costs', subtitle: 'Cost tracking', icon: DollarSign, route: '/admin/costs' },
      { label: 'Pricing', subtitle: 'Model pricing', icon: Coins, route: '/admin/pricing' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', subtitle: 'App config', icon: Settings, route: '/admin/settings' },
    ],
  },
];

interface AdminSidePanelProps {
  visible: boolean;
  onClose: () => void;
  currentPath: string;
}

export function AdminSidePanel({ visible, onClose, currentPath }: AdminSidePanelProps) {
  const handleNavigate = useCallback(
    (route: string) => {
      onClose();
      router.push(route as Href);
    },
    [onClose],
  );

  const isActive = (route: string) => {
    if (route === '/admin') {
      return currentPath === '/admin' || currentPath === '/admin/index';
    }
    return currentPath === route || currentPath.startsWith(route + '/');
  };

  if (!visible) return null;

  let itemIndex = 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        entering={SlideInRight.duration(250)}
        exiting={SlideOutRight.duration(250)}
        style={styles.panel}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <X size={22} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Nav Groups */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {NAV_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
              {group.items.map((item) => {
                const active = isActive(item.route);
                const delay = itemIndex * 30;
                itemIndex++;
                const Icon = item.icon;
                return (
                  <Animated.View
                    key={item.route}
                    entering={FadeIn.delay(100 + delay).duration(200)}
                  >
                    <Pressable
                      onPress={() => handleNavigate(item.route)}
                      style={[styles.navItem, active && styles.navItemActive]}
                    >
                      <View style={[styles.activeBorder, active && styles.activeBorderVisible]} />
                      <Icon size={20} color={active ? '#F59E0B' : '#6E6E73'} />
                      <View style={styles.navTextWrap}>
                        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                          {item.label}
                        </Text>
                        <Text style={styles.navSubtitle}>{item.subtitle}</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              onClose();
              router.replace('/(tabs)');
            }}
            style={styles.backToApp}
          >
            <ArrowLeft size={18} color="#F59E0B" />
            <Text style={styles.backToAppText}>Back to App</Text>
          </Pressable>
          <Text style={styles.versionText}>Admin v1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#1A1A1F',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252529',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  group: {
    marginBottom: 8,
  },
  groupTitle: {
    color: '#6E6E73',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingLeft: 17,
  },
  navItemActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  activeBorder: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 14,
    backgroundColor: 'transparent',
  },
  activeBorderVisible: {
    backgroundColor: '#F59E0B',
  },
  navTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  navLabel: {
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navSubtitle: {
    color: '#6E6E73',
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#252529',
  },
  backToApp: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backToAppText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  versionText: {
    color: '#4B5563',
    fontSize: 11,
    marginTop: 8,
  },
});
