import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen } from '../../../components/onboarding/SplashScreen';

export default function SplashRoute() {
  useEffect(() => {
    AsyncStorage.setItem('@dialectica/hasSeenSplash', 'true');
  }, []);

  return <SplashScreen />;
}
