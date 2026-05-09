import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useChatStore } from '../../stores/chatStore';

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  freemium: 'Freemium',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
  team: 'Team',
};

/**
 * Listens for `quotaError` transitions on the chat store and surfaces a
 * native alert when the chat fn returned 429. Renders nothing. Mount
 * once inside the authenticated tabs layout so the prompt fires no
 * matter which screen triggered the request.
 *
 * Uses `Alert.alert` rather than a styled modal because:
 *   - it's a one-button informational interrupt, not a flow
 *   - native dialogs are immediately familiar to users
 *   - no extra UI state to manage during the chat path
 */
export function QuotaErrorListener() {
  const quotaError = useChatStore((s) => s.quotaError);
  const clearQuotaError = useChatStore((s) => s.clearQuotaError);
  // Only fire the alert on the rising edge (null -> set). Without this,
  // re-renders during the alert's open lifetime would re-trigger it.
  const lastShownTier = useRef<string | null>(null);

  useEffect(() => {
    if (!quotaError) {
      lastShownTier.current = null;
      return;
    }
    const key = `${quotaError.tier}:${quotaError.used}`;
    if (lastShownTier.current === key) return;
    lastShownTier.current = key;

    const tierLabel = TIER_LABELS[quotaError.tier] ?? quotaError.tier;
    const usedPct = quotaError.limit
      ? Math.min(100, Math.round((quotaError.used / quotaError.limit) * 100))
      : 0;

    Alert.alert(
      'Daily limit reached',
      `You've used ${quotaError.used.toLocaleString()} of ${quotaError.limit.toLocaleString()} tokens today on the ${tierLabel} plan (${usedPct}%). Your limit resets 24 hours after your earliest call. Upgrade for a higher limit.`,
      [{ text: 'OK', onPress: clearQuotaError }],
      { cancelable: true, onDismiss: clearQuotaError },
    );
  }, [quotaError, clearQuotaError]);

  return null;
}
