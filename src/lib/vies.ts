/**
 * VIES VAT Validation Service
 * PHP proxy üzerinden EU VIES API'ye bağlanır
 */

// PHP proxy URL - cPanel'de barındırılıyor
const VIES_PROXY_URL = 'https://erp.atlasgroup.si/vies-proxy.php';

interface ValidationResult {
  valid: boolean;
  countryCode?: string;
  vatNumber?: string;
  companyName?: string;
  companyAddress?: string;
  error?: string;
}

/**
 * VAT numarasını VIES API üzerinden doğrular (PHP proxy ile)
 */
export async function validateVATNumber(vatNumber: string): Promise<ValidationResult> {
  try {
    // VAT numarasını temizle
    const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase();

    // Ülke kodu ve numara ayır
    const countryCode = cleanVat.substring(0, 2);
    const number = cleanVat.substring(2);

    // Format kontrolü
    if (!/^[A-Z]{2}[0-9A-Z]{6,12}$/.test(cleanVat)) {
      return {
        valid: false,
        error: 'Gecersiz VAT numarasi formati. Ornek: SI12345678',
      };
    }

    // PHP proxy üzerinden VIES API çağrısı
    const response = await fetch(
      `${VIES_PROXY_URL}?country=${countryCode}&vat=${number}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`VIES API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      valid: data.isValid === true,
      countryCode: data.countryCode || countryCode,
      vatNumber: data.vatNumber || number,
      companyName: data.name && data.name !== '---' ? data.name : '',
      companyAddress: data.address && data.address !== '---' ? data.address : '',
      error: data.isValid ? undefined : 'Gecersiz VAT numarasi',
    };

  } catch (error) {
    return {
      valid: false,
      error: (error as Error).message || 'Dogrulama hatasi',
    };
  }
}
