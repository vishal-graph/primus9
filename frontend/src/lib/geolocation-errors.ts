/**
 * User-facing copy for GeolocationPositionError codes.
 */
export function geolocationErrorMessage(code: number, fallback: string): string {
  switch (code) {
    case 1:
      return 'Location access was denied. Enable location for this site in browser settings, then tap Try again.';
    case 2:
      return 'Your position could not be determined. Move to an area with better signal and try again.';
    case 3:
      return 'Location request timed out. Try again in a moment.';
    default:
      return fallback || 'Unable to read your location.';
  }
}
