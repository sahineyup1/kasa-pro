# Veritabani Karari - Beklemede

## Tarih: 2024-12-11

## Mevcut Durum

### Firebase Kullanimi

**Realtime Database (erp/ prefix):**
- products
- partners (customers/suppliers)
- employees
- vehicles, vehicle_fuel, vehicle_maintenance
- salary_payments
- krediler
- company/branches (treasury, kasa, banka)

**Firestore (erp_ prefix):**
- expenses
- purchases
- sale_invoices
- purchase_invoices
- users
- transactions
- bankAccounts
- cashRegisters
- credits
- creditPayments

### Hosting Kaynaklari (cPanel)
- RAM: 4 GB
- CPU: 100% limit (shared)
- Disk: Sinirsiz
- Database: Sinirsiz
- MySQL mevcut

---

## Secenekler

### Secenek A: Firebase'de Kal
**Avantajlar:**
- Google AI/Gemini entegrasyonu kolay
- Real-time sync native
- Mevcut kod calisiyor
- Desktop kasiyer ile senkron

**Dezavantajlar:**
- Buyuk olcekte pahali
- SQL sorgu yok (raporlama zor)
- Vendor lock-in

### Secenek B: MySQL'e Gec
**Avantajlar:**
- Ucuz (cPanel'de mevcut)
- SQL ile guclu raporlama
- Tam kontrol
- Mali musavir export kolay

**Dezavantajlar:**
- Real-time icin ekstra is (polling/websocket)
- AI entegrasyonu manuel
- Migration gerektiriyor

### Secenek C: Hibrit (Onerilen)
**Firebase:**
- Auth
- Real-time islemler
- AI entegrasyonu
- Guncel veriler

**MySQL:**
- Raporlar
- Arsiv
- Audit log
- Mali musavir export

### Secenek D: Supabase
- PostgreSQL + Real-time
- Firebase benzeri ozellikler
- Fiyat avantajli
- AI manuel entegrasyon

---

## Gelecek AI Planlari (Karar icin onemli)

- [ ] Fatura OCR (kagit fatura okuma)
- [ ] XML Parse + Analiz (e-fatura)
- [ ] Musteri Analizi (satin alma tahmin)
- [ ] Chatbot
- [ ] Stok Tahmini
- [ ] Diger: _______________

---

## Karar

**Secilen:** ________________

**Tarih:** ________________

**Notlar:**



---

## Sonraki Adimlar

Karar verildikten sonra:

1. [ ] Veritabani semasini olustur
2. [ ] API routes yaz
3. [ ] Migration scripti hazirla
4. [ ] Frontend'i guncelle
5. [ ] Python kasiyer modulunu guncelle
6. [ ] Test et
