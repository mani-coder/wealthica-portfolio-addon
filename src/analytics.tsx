export function trackEvent(action: string, data?: any) {
  if (window.analytics) {
    window.analytics.track(action, data || {});
  }
}
