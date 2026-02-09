import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

type FeedbackCategory = 'bug' | 'suggestion' | 'other';

interface FeedbackState {
  screenshotUri: string | null;
  isOverlayVisible: boolean;
  isModalVisible: boolean;
  category: FeedbackCategory;
  message: string;
  currentRoute: string | null;
  isSubmitting: boolean;
  submitSuccess: boolean;

  onScreenshotDetected: (uri: string, route: string) => void;
  dismissOverlay: () => void;
  openModal: () => void;
  openModalManual: () => void;
  closeModal: () => void;
  setCategory: (category: FeedbackCategory) => void;
  setMessage: (message: string) => void;
  submitFeedback: (userId: string) => Promise<boolean>;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  screenshotUri: null,
  isOverlayVisible: false,
  isModalVisible: false,
  category: 'bug',
  message: '',
  currentRoute: null,
  isSubmitting: false,
  submitSuccess: false,

  onScreenshotDetected: (uri, route) => {
    set({
      screenshotUri: uri,
      currentRoute: route,
      isOverlayVisible: true,
    });
  },

  dismissOverlay: () => {
    set({ isOverlayVisible: false });
  },

  openModal: () => {
    set({ isOverlayVisible: false, isModalVisible: true });
  },

  openModalManual: () => {
    set({
      screenshotUri: null,
      currentRoute: null,
      isModalVisible: true,
      category: 'suggestion',
      message: '',
      submitSuccess: false,
    });
  },

  closeModal: () => {
    set({
      isModalVisible: false,
      screenshotUri: null,
      currentRoute: null,
      category: 'bug',
      message: '',
      isSubmitting: false,
      submitSuccess: false,
    });
  },

  setCategory: (category) => set({ category }),
  setMessage: (message) => set({ message }),

  submitFeedback: async (userId) => {
    const { screenshotUri, category, message, currentRoute } = get();
    if (!message.trim()) return false;

    set({ isSubmitting: true });

    try {
      let screenshotPath: string | null = null;

      // Upload screenshot if present
      if (screenshotUri) {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const path = `${userId}/${fileId}.png`;
        const response = await fetch(screenshotUri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(path, blob, { contentType: 'image/png' });

        if (uploadError) {
          console.warn('Screenshot upload failed:', uploadError);
        } else {
          screenshotPath = path;
        }
      }

      // Insert feedback row
      const { error } = await supabase.from('user_feedback').insert({
        user_id: userId,
        category,
        message: message.trim(),
        screenshot_path: screenshotPath,
        current_route: currentRoute,
        app_version: Constants.expoConfig?.version ?? null,
        device_model: Device.modelName ?? null,
        os_version: `${Device.osName} ${Device.osVersion}`,
        metadata: {
          deviceBrand: Device.brand,
          isDevice: Device.isDevice,
        },
      });

      if (error) {
        console.error('Feedback submission failed:', error);
        set({ isSubmitting: false });
        return false;
      }

      set({ isSubmitting: false, submitSuccess: true });
      return true;
    } catch (err) {
      console.error('Feedback submission error:', err);
      set({ isSubmitting: false });
      return false;
    }
  },
}));
