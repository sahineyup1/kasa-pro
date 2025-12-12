import { getFirestoreData, subscribeToFirestore } from './firebase';

export interface ERPUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: string;
  branchId?: string;
  branchName?: string;
  status?: string;
  permissions?: string[];
  createdAt?: string;
  lastLogin?: string;
}

// Hardcoded kullanici listesi (KULLANICI_LISTESI_GUNCEL.md'den)
const SYSTEM_USERS: ERPUser[] = [
  // ADMIN
  { id: 'u1', username: 'muhammed.aliisik', password: 'Atlas2025!', fullName: 'Muhammed Ali Isik', role: 'admin', branchId: 'all', branchName: 'Tum Subeler', status: 'active' },
  { id: 'u2', username: 'erol.bakirkaya', password: 'Atlas2025!', fullName: 'Erol Bakirkaya', role: 'admin', branchId: 'all', branchName: 'Tum Subeler', status: 'active' },
  { id: 'u3', username: 'mehmet.yazici', password: 'Atlas2025!', fullName: 'Mehmet Yazici', role: 'admin', branchId: 'all', branchName: 'Tum Subeler', status: 'active' },
  { id: 'u4', username: 'eyup.sahin', password: 'Atlas2025!', fullName: 'Eyup Sahin', role: 'admin', branchId: 'all', branchName: 'Tum Subeler', status: 'active' },

  // DEPO MUDURU
  { id: 'u5', username: 'mustafa.senturk', password: 'Atlas2025!', fullName: 'Mustafa Senturk', role: 'depo_muduru', branchId: 'merkez', branchName: 'Merkez Depo', status: 'active' },
  { id: 'u6', username: 'halit.isik', password: 'Atlas2025!', fullName: 'Halit Isik', role: 'depo_muduru', branchId: 'merkez', branchName: 'Merkez Depo', status: 'active' },

  // FINANS - SINIRLI ERISIM
  { id: 'u7', username: 'senaide.ismailovski', password: 'Atlas2025!', fullName: 'Senaide Ismailovski', role: 'senaide', branchId: 'merkez', branchName: 'Merkez Depo', status: 'active' },

  // SOFOR
  { id: 'u8', username: 'mert.demir', password: 'Atlas2025!', fullName: 'Mert Demir', role: 'sofor', branchId: 'mesnica', branchName: 'Mesnica Kasap', status: 'active' },

  // KASIYERLER
  { id: 'u9', username: 'banu.senturk', password: 'Kasiyer2025!', fullName: 'Banu Senturk', role: 'kasiyer', branchId: 'balkan', branchName: 'Balkan Market', status: 'active' },
  { id: 'u10', username: 'nazan.bakirkaya', password: 'Kasiyer2025!', fullName: 'Nazan Bakirkaya', role: 'kasiyer', branchId: 'balkan', branchName: 'Balkan Market', status: 'active' },
  { id: 'u11', username: 'sema.yazici', password: 'Kasiyer2025!', fullName: 'Sema Yazici', role: 'kasiyer', branchId: 'balkan', branchName: 'Balkan Market', status: 'active' },
  { id: 'u12', username: 'meryem.isik', password: 'Kasiyer2025!', fullName: 'Meryem Isik', role: 'kasiyer', branchId: 'balkan', branchName: 'Balkan Market', status: 'active' },
  { id: 'u13', username: 'yasemin.ince', password: 'Kasiyer2025!', fullName: 'Yasemin Ince', role: 'kasiyer', branchId: 'desetka', branchName: 'Desetka Market', status: 'active' },
  { id: 'u14', username: 'ismail.aga', password: 'Kasiyer2025!', fullName: 'Ismail Aga', role: 'kasiyer', branchId: 'mesnica', branchName: 'Mesnica Kasap', status: 'active' },

  // KASAPLAR
  { id: 'u15', username: 'burak.uzun', password: 'Kasap2025!', fullName: 'Burak Uzun', role: 'kasap', branchId: 'balkan', branchName: 'Balkan Market', status: 'active' },
  { id: 'u16', username: 'adem.ayhan', password: 'Kasap2025!', fullName: 'Adem Ayhan', role: 'kasap', branchId: 'mesnica', branchName: 'Mesnica Kasap', status: 'active' },
  { id: 'u17', username: 'sevket.sucuk', password: 'Kasap2025!', fullName: 'Sevket Sucuk', role: 'kasap', branchId: 'mesnica', branchName: 'Mesnica Kasap', status: 'active' },
];

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

    // 1. ONCE SISTEM KULLANICILARINI KONTROL ET (KULLANICI_LISTESI_GUNCEL.md)
    const systemUser = SYSTEM_USERS.find(u =>
      u.username.toLowerCase() === username.toLowerCase()
    );

    if (systemUser) {
      console.log('System user found:', systemUser.username);
      // Sifre kontrolu
      if (systemUser.password === password) {
        console.log('Password match for system user');
        return {
          success: true,
          user: {
            ...systemUser,
            password: '', // Guvenlik icin sifre dondurme
          }
        };
      } else {
        console.log('Password mismatch for system user');
        return { success: false, error: 'Yanlis sifre' };
      }
    }

    // 2. Firestore'dan users koleksiyonunu kontrol et
    console.log('Checking Firestore users...');
    const users = await getFirestoreData('users') as ERPUser[];

    if (users && users.length > 0) {
      const user = users.find(u =>
        u.username?.toLowerCase() === username.toLowerCase() ||
        (u as any).email?.toLowerCase() === username.toLowerCase()
      );

      if (user) {
        // Kullanici aktif mi?
        if (user.status && user.status !== 'active' && user.status !== 'aktif') {
          return { success: false, error: 'Bu hesap devre disi birakilmis' };
        }

        // Password kontrolu
        const storedPassword = user.password || (user as any).sifre;
        if (storedPassword === password || verifyPassword(password, storedPassword)) {
          return {
            success: true,
            user: { ...user, password: '' }
          };
        } else {
          return { success: false, error: 'Yanlis sifre' };
        }
      }
    }

    // 3. Employees koleksiyonunu kontrol et
    console.log('Checking Firestore employees...');
    const employees = await getFirestoreData('employees') as any[];

    if (employees && employees.length > 0) {
      const employee = employees.find(emp => {
        const empUsername = emp.username || emp.email || emp.personal?.email;
        return empUsername?.toLowerCase() === username.toLowerCase();
      });

      if (employee) {
        const storedPassword = employee.password || employee.sifre;
        if (storedPassword && (storedPassword === password || verifyPassword(password, storedPassword))) {
          return {
            success: true,
            user: {
              id: employee.id,
              username: username,
              password: '',
              fullName: `${employee.firstName || employee.personal?.firstName || ''} ${employee.lastName || employee.personal?.lastName || ''}`.trim() || username,
              role: employee.role || employee.employment?.role || 'user',
              branchId: employee.branchId || employee.employment?.branchId,
              branchName: employee.branch || employee.employment?.branch,
              status: employee.status || employee.employment?.status || 'active',
            }
          };
        }
      }
    }

    // Kullanici bulunamadi
    return { success: false, error: 'Kullanici bulunamadi veya sifre yanlis' };

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
