import { getFirestoreData, subscribeToFirestore } from './firebase';

export interface ERPUser {
  id: string;
  username: string;
  password: string; // Hashed password
  fullName: string;
  role: string;
  branchId?: string;
  branchName?: string;
  status?: string;
  permissions?: string[];
  createdAt?: string;
  lastLogin?: string;
}

// Basit hash fonksiyonu (production'da bcrypt kullan)
export function hashPassword(password: string): string {
  // SHA-256 benzeri basit hash
  let hash = 0;
  const salt = 'kasa_pro_2024_salt';
  const saltedPassword = salt + password + salt;

  for (let i = 0; i < saltedPassword.length; i++) {
    const char = saltedPassword.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer'a donustur
  }

  // Base64 benzeri encoding
  return 'h$' + Math.abs(hash).toString(36) + '_' + password.length;
}

// Password verification
export function verifyPassword(inputPassword: string, storedHash: string): boolean {
  const inputHash = hashPassword(inputPassword);
  return inputHash === storedHash;
}

// Kullanici dogrulama
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: ERPUser; error?: string }> {
  try {
    console.log('Authenticating user:', username);

    // 1. Firestore'dan users koleksiyonunu cek
    const users = await getFirestoreData('users') as ERPUser[];

    console.log('Found users:', users?.length || 0);

    if (!users || users.length === 0) {
      // Eger users koleksiyonu bos ise, employees koleksiyonunu dene
      console.log('Trying employees collection...');
      const employees = await getFirestoreData('employees') as any[];

      if (!employees || employees.length === 0) {
        return {
          success: false,
          error: 'Kullanici veritabani bos. Lutfen yonetici ile iletisime gecin.'
        };
      }

      // Employees icerisinde login bilgisi ara
      const employee = employees.find(emp => {
        const empUsername = emp.username || emp.email || emp.personal?.email;
        return empUsername?.toLowerCase() === username.toLowerCase();
      });

      if (!employee) {
        return { success: false, error: 'Kullanici bulunamadi' };
      }

      // Password kontrolu (employees'da password yoksa basit kontrol)
      const storedPassword = employee.password || employee.sifre;
      if (!storedPassword) {
        return { success: false, error: 'Bu kullanicinin sifresi tanimlanmamis' };
      }

      // Duz metin veya hash kontrolu
      const isValidPassword = storedPassword === password ||
                             verifyPassword(password, storedPassword);

      if (!isValidPassword) {
        return { success: false, error: 'Yanlis sifre' };
      }

      return {
        success: true,
        user: {
          id: employee.id,
          username: username,
          password: '', // Guvenllik icin sifre dondurme
          fullName: `${employee.firstName || employee.personal?.firstName || ''} ${employee.lastName || employee.personal?.lastName || ''}`.trim() || username,
          role: employee.role || employee.employment?.role || 'user',
          branchId: employee.branchId || employee.employment?.branchId,
          branchName: employee.branch || employee.employment?.branch,
          status: employee.status || employee.employment?.status || 'active',
        }
      };
    }

    // Users koleksiyonundan kullanici bul
    const user = users.find(u =>
      u.username?.toLowerCase() === username.toLowerCase() ||
      (u as any).email?.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return { success: false, error: 'Kullanici bulunamadi' };
    }

    // Kullanici aktif mi?
    if (user.status && user.status !== 'active' && user.status !== 'aktif') {
      return { success: false, error: 'Bu hesap devre disi birakilmis' };
    }

    // Password kontrolu
    const storedPassword = user.password || (user as any).sifre;
    if (!storedPassword) {
      return { success: false, error: 'Bu kullanicinin sifresi tanimlanmamis' };
    }

    // Duz metin veya hash kontrolu
    const isValidPassword = storedPassword === password ||
                           verifyPassword(password, storedPassword);

    if (!isValidPassword) {
      return { success: false, error: 'Yanlis sifre' };
    }

    return {
      success: true,
      user: {
        ...user,
        password: '', // Guvenlik icin sifre dondurme
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Dogrulama sirasinda bir hata olustu: ' + (error as Error).message
    };
  }
}

// Varsayilan admin kullanici olustur (ilk kurulum icin)
export function getDefaultAdminCredentials(): { username: string; password: string } {
  return {
    username: 'admin',
    password: 'atlas2024' // Bu sifre Firebase'e kaydedilmeli
  };
}
