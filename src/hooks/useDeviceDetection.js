import { useEffect, useState } from 'react';

export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isWeb: true,
    deviceType: 'web'
  });

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'web';

    const info = {
      deviceType,
      isMobile,
      isWeb: !isMobile,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };

    setDeviceInfo(info);
    console.log(`[Ninho Connected] Device: ${deviceType}, Screen: ${window.innerWidth}x${window.innerHeight}`);
  }, []);

  return deviceInfo;
}