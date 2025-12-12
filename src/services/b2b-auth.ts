/**
 * B2B Müşteri Portal Auth Servisi
 * Kendi kontrol ettiğimiz kullanıcı adı/şifre sistemi
 */

import { getData, pushData, updateData } from './firebase';
import bcrypt from 'bcryptjs';

// =================== TYPES ===================

export interface B2BAccount {
  id: string;
  username: string;
  passwordHash: string;
  partnerId: string;        // /erp/partners ile bağlantı
  partnerName: string;
  isActive: boolean;
  permissions: B2BPermissions;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
  loginCount: number;
}

export interface B2BPermissions {
  canOrder: boolean;        // Sipariş verebilir
  canViewPrices: boolean;   // Fiyatları görebilir
  canViewBalance: boolean;  // Bakiye görebilir
  canViewHistory: boolean;  // Geçmiş siparişleri görebilir
}

export interface B2BSession {
  accountId: string;
  partnerId: string;
  partnerName: string;
  username: string;
  permissions: B2BPermissions;
  loginAt: string;
  expiresAt: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  session?: B2BSession;
}

// =================== CONSTANTS ===================

const SESSION_DURATION_HOURS = 24;
const SESSION_KEY = 'b2b_session';
const PARTNERS_PATH = 'partners';

// Güvenli localStorage erişimi
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage erişimi engellendi
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage erişimi engellendi
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage erişimi engellendi
    }
  }
};

// =================== HELPER FUNCTIONS ===================

// Simple hash for client-side (real hash on creation)
const simpleHash = async (password: string): Promise<string> => {
  // bcryptjs ile hash
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Verify password
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Generate session token
const generateSessionToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// =================== AUTH FUNCTIONS ===================

/**
 * Kullanıcı girişi - Partners içindeki b2bLogin bilgisini kullanır
 */
export const login = async (username: string, password: string): Promise<LoginResult> => {
  try {
    // Tüm partnerleri al
    const partnersData = await getData(PARTNERS_PATH);

    if (!partnersData) {
      return { success: false, message: 'Kullanici bulunamadi' };
    }

    // Username ile partner bul (b2bLogin.username)
    let foundPartner: any = null;
    let partnerId: string = '';

    for (const [id, partner] of Object.entries(partnersData as Record<string, any>)) {
      const b2bLogin = partner.b2bLogin;
      if (b2bLogin && b2bLogin.username?.toLowerCase() === username.toLowerCase()) {
        foundPartner = partner;
        partnerId = id;
        break;
      }
    }

    if (!foundPartner || !foundPartner.b2bLogin) {
      return { success: false, message: 'Kullanici bulunamadi' };
    }

    const b2bLogin = foundPartner.b2bLogin;

    // Hesap aktif mi?
    if (!b2bLogin.isActive) {
      return { success: false, message: 'Hesap devre disi' };
    }

    // Şifre kontrolü
    const isValid = await verifyPassword(password, b2bLogin.passwordHash);
    if (!isValid) {
      return { success: false, message: 'Yanlis sifre' };
    }

    // Partner adını al
    const partnerName = foundPartner.basic?.name || foundPartner.name || 'Partner';

    // Session oluştur
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    const session: B2BSession = {
      accountId: partnerId,
      partnerId: partnerId,
      partnerName: partnerName,
      username: b2bLogin.username,
      permissions: b2bLogin.permissions || {
        canOrder: true,
        canViewPrices: true,
        canViewBalance: true,
        canViewHistory: true,
      },
      loginAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Son giriş güncelle
    await updateData(`${PARTNERS_PATH}/${partnerId}/b2bLogin`, {
      lastLogin: now.toISOString(),
      loginCount: (b2bLogin.loginCount || 0) + 1,
    });

    // Session'ı localStorage'a kaydet
    safeStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { success: true, message: 'Giris basarili', session };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Giris hatasi: ' + (error as Error).message };
  }
};

/**
 * Çıkış yap
 */
export const logout = (): void => {
  safeStorage.removeItem(SESSION_KEY);
};

/**
 * Mevcut session'ı al
 */
export const getSession = (): B2BSession | null => {
  const sessionStr = safeStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr) as B2BSession;

    // Session süresi dolmuş mu?
    if (new Date(session.expiresAt) < new Date()) {
      logout();
      return null;
    }

    return session;
  } catch (error) {
    console.warn('Session parse hatası:', error);
    return null;
  }
};

/**
 * Session geçerli mi?
 */
export const isAuthenticated = (): boolean => {
  return getSession() !== null;
};

/**
 * Yetki kontrolü
 */
export const hasPermission = (permission: keyof B2BPermissions): boolean => {
  const session = getSession();
  if (!session) return false;
  return session.permissions[permission] === true;
};

// =================== ADMIN FUNCTIONS (Hesap Yönetimi) ===================
// Not: B2B login bilgileri artık partners/{id}/b2bLogin altında tutuluyor

/**
 * Partner'a B2B hesabı oluştur/güncelle (Admin panelden çağrılır)
 * Bilgiler partners/{partnerId}/b2bLogin altına kaydedilir
 */
export const createB2BAccount = async (
  username: string,
  password: string,
  partnerId: string,
  partnerName: string,
  permissions: B2BPermissions,
  createdBy: string
): Promise<{ success: boolean; message: string; accountId?: string }> => {
  try {
    // Username benzersiz mi kontrol et
    const partnersData = await getData(PARTNERS_PATH);
    if (partnersData) {
      for (const [id, partner] of Object.entries(partnersData as Record<string, any>)) {
        if (id !== partnerId && partner.b2bLogin?.username?.toLowerCase() === username.toLowerCase()) {
          return { success: false, message: 'Bu kullanici adi zaten kullaniliyor' };
        }
      }
    }

    // Şifreyi hashle
    const passwordHash = await simpleHash(password);

    // B2B login bilgilerini partner'a ekle
    const b2bLogin = {
      username: username.toLowerCase(),
      passwordHash,
      isActive: true,
      permissions,
      createdAt: new Date().toISOString(),
      createdBy,
      loginCount: 0,
    };

    await updateData(`${PARTNERS_PATH}/${partnerId}/b2bLogin`, b2bLogin);

    return { success: true, message: 'Hesap olusturuldu', accountId: partnerId };
  } catch (error) {
    console.error('Create account error:', error);
    return { success: false, message: 'Hesap olusturma hatasi: ' + (error as Error).message };
  }
};

/**
 * B2B hesabını güncelle
 */
export const updateB2BAccount = async (
  partnerId: string,
  updates: Partial<Pick<B2BAccount, 'isActive' | 'permissions'>>
): Promise<boolean> => {
  try {
    await updateData(`${PARTNERS_PATH}/${partnerId}/b2bLogin`, updates);
    return true;
  } catch (error) {
    console.error('Update account error:', error);
    return false;
  }
};

/**
 * B2B hesap şifresini değiştir
 */
export const changePassword = async (partnerId: string, newPassword: string): Promise<boolean> => {
  try {
    const passwordHash = await simpleHash(newPassword);
    await updateData(`${PARTNERS_PATH}/${partnerId}/b2bLogin`, { passwordHash });
    return true;
  } catch (error) {
    console.error('Change password error:', error);
    return false;
  }
};

/**
 * Partner'a ait B2B hesabını getir
 */
export const getAccountByPartnerId = async (partnerId: string): Promise<B2BAccount | null> => {
  try {
    const partnerData = await getData(`${PARTNERS_PATH}/${partnerId}`);
    if (!partnerData || !partnerData.b2bLogin) return null;

    return {
      id: partnerId,
      partnerId: partnerId,
      partnerName: partnerData.basic?.name || '',
      ...partnerData.b2bLogin,
    } as B2BAccount;
  } catch (error) {
    console.error('Get account error:', error);
    return null;
  }
};

/**
 * Tüm B2B hesaplarını getir (Admin için)
 */
export const getAllAccounts = async (): Promise<B2BAccount[]> => {
  try {
    const partnersData = await getData(PARTNERS_PATH);
    if (!partnersData) return [];

    const accounts: B2BAccount[] = [];
    for (const [id, partner] of Object.entries(partnersData as Record<string, any>)) {
      if (partner.b2bLogin) {
        accounts.push({
          id,
          partnerId: id,
          partnerName: partner.basic?.name || '',
          ...partner.b2bLogin,
        } as B2BAccount);
      }
    }
    return accounts;
  } catch (error) {
    console.error('Get all accounts error:', error);
    return [];
  }
};
