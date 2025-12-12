/**
 * Safe localStorage wrapper
 * Storage erişim hatalarını yakalar ve sessizce devam eder
 */

class SafeStorage {
  private isAvailable: boolean | null = null;

  private checkAvailability(): boolean {
    if (this.isAvailable !== null) return this.isAvailable;

    if (typeof window === 'undefined') {
      this.isAvailable = false;
      return false;
    }

    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      this.isAvailable = true;
      return true;
    } catch (e) {
      this.isAvailable = false;
      return false;
    }
  }

  getItem(key: string): string | null {
    if (!this.checkAvailability()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.checkAvailability()) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or access denied - silently fail
    }
  }

  removeItem(key: string): void {
    if (!this.checkAvailability()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Access denied - silently fail
    }
  }

  clear(): void {
    if (!this.checkAvailability()) return;
    try {
      localStorage.clear();
    } catch {
      // Access denied - silently fail
    }
  }
}

export const safeStorage = new SafeStorage();
