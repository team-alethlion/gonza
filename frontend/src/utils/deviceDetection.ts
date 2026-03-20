// Function to detect iOS devices
export const isIOS = (): boolean => {
  const ua = navigator.userAgent || "";
  // If it's Android, it's NOT iOS
  if (/android/i.test(ua)) return false;

  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Function to detect Android devices
export const isAndroid = (): boolean => {
  const ua = navigator.userAgent || "";
  return /android/i.test(ua);
};
