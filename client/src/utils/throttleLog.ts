// Throttled logging utility to prevent log spam
const logThrottle: Record<string, number> = {};

export function throttleLog(
  key: string, 
  message: string, 
  throttleTime = 1000
) {
  const now = Date.now();
  if (!logThrottle[key] || now - logThrottle[key] > throttleTime) {
    console.log(message);
    logThrottle[key] = now;
  }
}
