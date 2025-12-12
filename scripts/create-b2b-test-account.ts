// Test B2B hesabı oluşturma scripti
// Çalıştırmak için: npx tsx scripts/create-b2b-test-account.ts

import { createB2BAccount } from '../src/services/b2b-auth';

async function createTestAccount() {
  console.log('Test B2B hesabı oluşturuluyor...');

  const result = await createB2BAccount(
    'test',           // username
    'test123',        // password
    'test-partner',   // partnerId
    'Test Firma',     // partnerName
    {
      canOrder: true,
      canViewPrices: true,
      canViewBalance: true,
      canViewHistory: true,
    },
    'system'          // createdBy
  );

  console.log('Sonuç:', result);

  if (result.success) {
    console.log('\n✅ Test hesabı oluşturuldu!');
    console.log('Kullanıcı adı: test');
    console.log('Şifre: test123');
  } else {
    console.log('\n❌ Hata:', result.message);
  }

  process.exit(0);
}

createTestAccount();
