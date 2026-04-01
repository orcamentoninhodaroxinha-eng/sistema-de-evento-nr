import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function useDeviceDetection() {
  const { user } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    if (!user) return;

    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'web';
    
    const info = {
      userId: user.id,
      userEmail: user.email,
      deviceType,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timestamp: new Date().toISOString(),
      isMobile
    };

    setDeviceInfo(info);

    // Armazenar última conexão
    if (user.email === 'ninho@example.com' || user.email?.includes('ninho')) {
      localStorage.setItem('ninho_last_connection', JSON.stringify(info));
      console.log(`[Ninho Connected] Device: ${deviceType}, User: ${user.email}`);
    }
  }, [user]);

  return deviceInfo;
}