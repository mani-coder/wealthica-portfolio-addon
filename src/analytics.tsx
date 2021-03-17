export function trackEvent(action: string, data?: any) {
  if (window.analytics && process.env.NODE_ENV === 'production') {
    window.analytics.track(action, data || {});
  } else {
    console.debug('[analytics] track event', { action, data });
  }
}
