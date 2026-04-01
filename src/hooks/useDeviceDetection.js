import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function useDeviceDetection() {
  const { user } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isWeb: true,
    deviceType: 'web'
  });

  useEffect(() => {
    if (!user) return;

    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'web';
    
    const info = {
      userId: user.id,
      userEmail: user.email,
      deviceType,
      isMobile,
      isWeb: !isMobile,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timestamp: new Date().toISOString()
    };

    setDeviceInfo(info);

    // Armazenar última conexão
    if (user.email === 'ninho@example.com' || user.email?.includes('ninho')) {
      localStorage.setItem('ninho_last_connection', JSON.stringify(info));
      console.log(`[Ninho Connected] Device: ${deviceType}, Screen: ${window.innerWidth}x${window.innerHeight}`);
    }
  }, [user]);

  return deviceInfo;
}