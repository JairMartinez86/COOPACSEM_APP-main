import { Injectable } from '@angular/core';

export interface RequestLocationCache {
  city?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  display?: string;
  updatedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class RequestLocationService {
  private readonly storageKey = 'request_location_cache_v1';
  private readonly cacheTtlMs = 15 * 60 * 1000;

  async ensureFreshLocation(force = false): Promise<RequestLocationCache | null> {
    if (!this.isBrowser()) {
      return null;
    }

    const cached = this.getCachedLocation();
    if (!force && this.isCacheValid(cached)) {
      return cached;
    }

    const coords = await this.tryGetCurrentPosition();
    if (!coords) {
      return cached;
    }

    const latitude = coords.latitude.toFixed(6);
    const longitude = coords.longitude.toFixed(6);

    const reverse = await this.tryReverseGeocode(coords.latitude, coords.longitude);

    const payload: RequestLocationCache = {
      city: reverse?.city || undefined,
      country: reverse?.country || undefined,
      latitude,
      longitude,
      display: this.buildDisplay(reverse?.city || '', reverse?.country || '', latitude, longitude),
      updatedAtUtc: new Date().toISOString()
    };

    this.saveCachedLocation(payload);
    return payload;
  }

  getHeadersSnapshot(): Record<string, string> {
    const cached = this.getCachedLocation();
    if (!cached) {
      return {};
    }

    const headers: Record<string, string> = {};

    if (cached.city) headers['X-City'] = cached.city;
    if (cached.country) headers['X-Country'] = cached.country;
    if (cached.latitude) headers['X-Latitude'] = cached.latitude;
    if (cached.longitude) headers['X-Longitude'] = cached.longitude;
    if (cached.display) headers['X-Geo-Location'] = cached.display;

    return headers;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined';
  }

  private getCachedLocation(): RequestLocationCache | null {
    if (!this.isBrowser()) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as RequestLocationCache;
    } catch {
      return null;
    }
  }

  private saveCachedLocation(value: RequestLocationCache): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(value));
    } catch {
      // ignore storage issues
    }
  }

  private isCacheValid(value: RequestLocationCache | null): boolean {
    if (!value?.updatedAtUtc) {
      return false;
    }

    const updatedAt = new Date(value.updatedAtUtc).getTime();
    if (Number.isNaN(updatedAt)) {
      return false;
    }

    return (Date.now() - updatedAt) <= this.cacheTtlMs;
  }

  private tryGetCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    if (!this.isBrowser() || !('geolocation' in navigator)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300000
        }
      );
    });
  }

  private async tryReverseGeocode(latitude: number, longitude: number): Promise<{ city: string; country: string } | null> {
    if (!this.isBrowser()) {
      return null;
    }

    try {
      const lang = localStorage.getItem('lang') || 'es';
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      url.searchParams.set('accept-language', lang);
      url.searchParams.set('zoom', '10');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const address = data?.address || {};

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        address.state ||
        '';

      const country = address.country || '';

      if (!city && !country) {
        return null;
      }

      return { city, country };
    } catch {
      return null;
    }
  }

  private buildDisplay(city: string, country: string, latitude: string, longitude: string): string {
    if (city && country) {
      return `${city}, ${country}`;
    }

    if (country) {
      return country;
    }

    if (city) {
      return city;
    }

    return `Lat ${latitude}, Lng ${longitude}`;
  }
}
