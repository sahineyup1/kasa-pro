'use client';

import { useState, useEffect } from 'react';
import { getSession } from '@/services/b2b-auth';
import { getData } from '@/services/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Shield, Scale, HelpCircle, Building2, Mail, Phone } from 'lucide-react';
import { B2BLanguage } from '@/services/b2b-translations';
import Link from 'next/link';

// Atlas Software Company Info
const COMPANY_INFO = {
  name: 'Atlas Software d.o.o.',
  address: 'Hrvaska Ul. 10',
  city: '1000 Ljubljana',
  country: 'Slovenia',
  email: 'info@atlas-software.si',
  phone: '+386 1 234 5678',
  vatNumber: 'SI12345678',
  registrationNumber: '1234567890',
};

// 4-Language Legal Content
const LEGAL_CONTENT: Record<string, Record<B2BLanguage, { title: string; content: string }>> = {
  terms: {
    sl: {
      title: 'Pogoji uporabe',
      content: `
# Pogoji uporabe B2B portala

Zadnja posodobitev: ${new Date().toLocaleDateString('sl-SI')}

## 1. Splosne dolocbe

Ti pogoji uporabe urejajo uporabo B2B portala, ki ga upravlja ${COMPANY_INFO.name} (v nadaljevanju "ponudnik storitev").

Z dostopom do portala in njegovo uporabo se strinjate s temi pogoji. Ce se s pogoji ne strinjate, portala ne smete uporabljati.

## 2. Registracija in racun

- Za uporabo portala potrebujete veljaven poslovni racun
- Odgovorni ste za zaupnost svojih prijavnih podatkov
- Odgovorni ste za vse dejavnosti pod vasim racunom
- Ponudnik storitev si pridrzuje pravico do preklica dostopa

## 3. Narocila in cene

- Vse cene so informativne in se lahko spremenijo brez predhodnega obvestila
- Narocila so veljavna sele po potrditvi s strani ponudnika storitev
- Placilni pogoji so doloceni v pogodbi z vsakim partnerjem
- DDV se obracuna v skladu z veljavno zakonodajo

## 4. Dostava

- Dobavni roki so okvirni in ne zavezujoci
- Ponudnik storitev ne odgovarja za zamude zaradi visje sile
- Stroski dostave se dolocijo glede na pogodbo

## 5. Reklamacije

- Reklamacije je treba sporociti v 24 urah po prejemu blaga
- Poskodovano blago je treba fotografirati in dokumentirati
- Vracila se obravnavajo posamicno

## 6. Varstvo podatkov

Vasi podatki se obdelujejo v skladu z naso politiko zasebnosti in veljavno zakonodajo GDPR.

## 7. Odgovornost

Ponudnik storitev ne odgovarja za:
- Posredno skodo ali izgubljeni dobicek
- Napake v podatkih, ki jih vnesete vi
- Prekinitve storitve zaradi vzdrzevanja ali visje sile

## 8. Spremembe pogojev

Ponudnik storitev si pridrzuje pravico do spremembe teh pogojev. O spremembah boste obvesceni preko portala.

## 9. Veljavno pravo

Za te pogoje velja slovensko pravo. Za spore je pristojno sodisce v Ljubljani.

## 10. Kontakt

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
Email: ${COMPANY_INFO.email}
Tel: ${COMPANY_INFO.phone}
      `,
    },
    de: {
      title: 'Nutzungsbedingungen',
      content: `
# Nutzungsbedingungen des B2B-Portals

Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE')}

## 1. Allgemeine Bestimmungen

Diese Nutzungsbedingungen regeln die Nutzung des B2B-Portals, das von ${COMPANY_INFO.name} (im Folgenden "Dienstanbieter") betrieben wird.

Durch den Zugriff auf das Portal und dessen Nutzung stimmen Sie diesen Bedingungen zu. Wenn Sie den Bedingungen nicht zustimmen, durfen Sie das Portal nicht nutzen.

## 2. Registrierung und Konto

- Fur die Nutzung des Portals benotigen Sie ein gultiges Geschaftskonto
- Sie sind fur die Vertraulichkeit Ihrer Anmeldedaten verantwortlich
- Sie sind fur alle Aktivitaten unter Ihrem Konto verantwortlich
- Der Dienstanbieter behalt sich das Recht vor, den Zugang zu widerrufen

## 3. Bestellungen und Preise

- Alle Preise sind unverbindlich und konnen ohne vorherige Ankundigung geandert werden
- Bestellungen sind erst nach Bestatigung durch den Dienstanbieter gultig
- Zahlungsbedingungen werden im Vertrag mit jedem Partner festgelegt
- Die Mehrwertsteuer wird gemas geltendem Recht berechnet

## 4. Lieferung

- Lieferzeiten sind ungefahr und nicht verbindlich
- Der Dienstanbieter haftet nicht fur Verzogerungen aufgrund hoherer Gewalt
- Versandkosten werden vertraglich festgelegt

## 5. Reklamationen

- Reklamationen mussen innerhalb von 24 Stunden nach Wareneingang gemeldet werden
- Beschadigte Ware muss fotografiert und dokumentiert werden
- Rucksendungen werden einzeln bearbeitet

## 6. Datenschutz

Ihre Daten werden gemas unserer Datenschutzrichtlinie und der geltenden DSGVO verarbeitet.

## 7. Haftung

Der Dienstanbieter haftet nicht fur:
- Indirekte Schaden oder entgangenen Gewinn
- Fehler in den von Ihnen eingegebenen Daten
- Serviceunterbrechungen aufgrund von Wartung oder hoherer Gewalt

## 8. Anderungen der Bedingungen

Der Dienstanbieter behalt sich das Recht vor, diese Bedingungen zu andern. Uber Anderungen werden Sie uber das Portal informiert.

## 9. Anwendbares Recht

Fur diese Bedingungen gilt slowenisches Recht. Gerichtsstand ist Ljubljana.

## 10. Kontakt

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
E-Mail: ${COMPANY_INFO.email}
Tel: ${COMPANY_INFO.phone}
      `,
    },
    en: {
      title: 'Terms of Use',
      content: `
# B2B Portal Terms of Use

Last updated: ${new Date().toLocaleDateString('en-US')}

## 1. General Provisions

These terms of use govern the use of the B2B portal operated by ${COMPANY_INFO.name} (hereinafter "Service Provider").

By accessing and using the portal, you agree to these terms. If you do not agree to the terms, you may not use the portal.

## 2. Registration and Account

- You need a valid business account to use the portal
- You are responsible for the confidentiality of your login credentials
- You are responsible for all activities under your account
- The Service Provider reserves the right to revoke access

## 3. Orders and Prices

- All prices are indicative and may change without prior notice
- Orders are valid only after confirmation by the Service Provider
- Payment terms are determined in the contract with each partner
- VAT is charged in accordance with applicable law

## 4. Delivery

- Delivery times are approximate and non-binding
- The Service Provider is not liable for delays due to force majeure
- Shipping costs are determined by contract

## 5. Complaints

- Complaints must be reported within 24 hours of receiving goods
- Damaged goods must be photographed and documented
- Returns are handled on a case-by-case basis

## 6. Data Protection

Your data is processed in accordance with our privacy policy and applicable GDPR regulations.

## 7. Liability

The Service Provider is not liable for:
- Indirect damages or lost profits
- Errors in data entered by you
- Service interruptions due to maintenance or force majeure

## 8. Changes to Terms

The Service Provider reserves the right to change these terms. You will be notified of changes through the portal.

## 9. Applicable Law

These terms are governed by Slovenian law. The court of jurisdiction is Ljubljana.

## 10. Contact

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
Email: ${COMPANY_INFO.email}
Tel: ${COMPANY_INFO.phone}
      `,
    },
    tr: {
      title: 'Kullanim Sartlari',
      content: `
# B2B Portal Kullanim Sartlari

Son guncelleme: ${new Date().toLocaleDateString('tr-TR')}

## 1. Genel Hukumler

Bu kullanim sartlari, ${COMPANY_INFO.name} (bundan sonra "Hizmet Saglayici") tarafindan isletilen B2B portalinin kullanimini duzenler.

Portala eriserek ve kullanarak bu sartlari kabul etmis olursunuz. Sartlari kabul etmiyorsaniz portali kullanamazsiniz.

## 2. Kayit ve Hesap

- Portali kullanmak icin gecerli bir is hesabina ihtiyaciniz vardir
- Giris bilgilerinizin gizliliginden siz sorumlusunuz
- Hesabiniz altindaki tum faaliyetlerden siz sorumlusunuz
- Hizmet Saglayici erisimi iptal etme hakkini sakli tutar

## 3. Siparisler ve Fiyatlar

- Tum fiyatlar bilgilendirme amaclidir ve onceden haber verilmeksizin degisebilir
- Siparisler yalnizca Hizmet Saglayici tarafindan onaylandiktan sonra gecerlidir
- Odeme kosullari her ortakla yapilan sozlesmede belirlenir
- KDV, yururlukteki mevzuata uygun olarak hesaplanir

## 4. Teslimat

- Teslimat sureleri tahminidir ve baglayici degildir
- Hizmet Saglayici, mucbir sebeplerden kaynaklanan gecikmelerden sorumlu degildir
- Kargo ucretleri sozlesmeye gore belirlenir

## 5. Sikayetler

- Sikayetler, mal teslim alindiktan sonra 24 saat icinde bildirilmelidir
- Hasarli mallar fotograflanmali ve belgelenmelidir
- Iadeler bireysel olarak degerlendirilir

## 6. Veri Koruma

Verileriniz, gizlilik politikamiza ve yururlukteki KVKK/GDPR duzenlemelerine uygun olarak islenir.

## 7. Sorumluluk

Hizmet Saglayici asagidakilerden sorumlu degildir:
- Dolayli zararlar veya kar kaybi
- Sizin tarafinizdan girilen verilerdeki hatalar
- Bakim veya mucbir sebeplerden kaynaklanan hizmet kesintileri

## 8. Sartlardaki Degisiklikler

Hizmet Saglayici bu sartlari degistirme hakkini sakli tutar. Degisiklikler portal uzerinden bildirilecektir.

## 9. Uygulanacak Hukuk

Bu sartlar Slovenya hukukuna tabidir. Yetkili mahkeme Ljubljana'dir.

## 10. Iletisim

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
E-posta: ${COMPANY_INFO.email}
Tel: ${COMPANY_INFO.phone}
      `,
    },
  },
  privacy: {
    sl: {
      title: 'Politika zasebnosti',
      content: `
# Politika zasebnosti

Zadnja posodobitev: ${new Date().toLocaleDateString('sl-SI')}

## 1. Upravljavec podatkov

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
Email: ${COMPANY_INFO.email}

## 2. Katere podatke zbiramo

Zbiramo naslednje podatke:
- **Podatki o podjetju**: Ime, naslov, davcna stevilka, kontaktni podatki
- **Podatki o uporabniku**: Uporabnisko ime, geslo (sifrirano)
- **Podatki o narocilih**: Zgodovina narocil, nakupne preference
- **Tehnicni podatki**: IP naslov, brskalnik, cas dostopa

## 3. Namen obdelave

Vase podatke uporabljamo za:
- Izvajanje pogodbe in obdelavo narocil
- Komunikacijo v zvezi z narocili
- Izboljsanje nasih storitev
- Izpolnjevanje zakonskih obveznosti

## 4. Pravna podlaga

Podatke obdelujemo na podlagi:
- Izvajanja pogodbe (clen 6(1)(b) GDPR)
- Zakonske obveznosti (clen 6(1)(c) GDPR)
- Zakonitih interesov (clen 6(1)(f) GDPR)

## 5. Hramba podatkov

Podatke hranimo:
- Podatki o narocilih: 10 let (zakonska obveznost)
- Podatki o racunu: Do izbrisa racuna + 1 leto
- Tehnicni dnevniki: 90 dni

## 6. Vase pravice

Imate pravico do:
- Dostopa do svojih podatkov
- Popravka netocnih podatkov
- Izbrisa podatkov (ob upostevanju zakonskih obveznosti)
- Omejitve obdelave
- Prenosljivosti podatkov
- Ugovora obdelavi

## 7. Varnost podatkov

Uporabljamo ustrezne tehnicne in organizacijske ukrepe za zascito vasih podatkov:
- Sifriranje podatkov
- Omejen dostop
- Redne varnostne kopije
- Varnostni protokoli

## 8. Kontakt

Za vprasanja glede zasebnosti nas kontaktirajte:
${COMPANY_INFO.email}

## 9. Pritozba

Imate pravico vloziti pritozbo pri Informacijskem pooblascencu RS.
      `,
    },
    de: {
      title: 'Datenschutzrichtlinie',
      content: `
# Datenschutzrichtlinie

Letzte Aktualisierung: ${new Date().toLocaleDateString('de-DE')}

## 1. Verantwortlicher

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
E-Mail: ${COMPANY_INFO.email}

## 2. Welche Daten wir sammeln

Wir sammeln folgende Daten:
- **Unternehmensdaten**: Name, Adresse, Steuernummer, Kontaktdaten
- **Benutzerdaten**: Benutzername, Passwort (verschlusselt)
- **Bestelldaten**: Bestellverlauf, Kaufpraferenzen
- **Technische Daten**: IP-Adresse, Browser, Zugriffszeit

## 3. Zweck der Verarbeitung

Wir verwenden Ihre Daten fur:
- Vertragserfullung und Bestellabwicklung
- Kommunikation bezuglich Bestellungen
- Verbesserung unserer Dienstleistungen
- Erfullung gesetzlicher Pflichten

## 4. Rechtsgrundlage

Wir verarbeiten Daten auf Grundlage von:
- Vertragserfullung (Art. 6(1)(b) DSGVO)
- Gesetzliche Pflicht (Art. 6(1)(c) DSGVO)
- Berechtigtes Interesse (Art. 6(1)(f) DSGVO)

## 5. Datenspeicherung

Wir speichern Daten:
- Bestelldaten: 10 Jahre (gesetzliche Pflicht)
- Kontodaten: Bis zur Kontoloschung + 1 Jahr
- Technische Protokolle: 90 Tage

## 6. Ihre Rechte

Sie haben das Recht auf:
- Zugang zu Ihren Daten
- Berichtigung unrichtiger Daten
- Loschung von Daten (unter Berucksichtigung gesetzlicher Pflichten)
- Einschrankung der Verarbeitung
- Datenubertragbarkeit
- Widerspruch gegen die Verarbeitung

## 7. Datensicherheit

Wir verwenden angemessene technische und organisatorische Masnahmen zum Schutz Ihrer Daten:
- Datenverschlusselung
- Eingeschrankter Zugang
- Regelmasige Backups
- Sicherheitsprotokolle

## 8. Kontakt

Bei Fragen zum Datenschutz kontaktieren Sie uns:
${COMPANY_INFO.email}

## 9. Beschwerde

Sie haben das Recht, eine Beschwerde bei der zustandigen Aufsichtsbehorde einzureichen.
      `,
    },
    en: {
      title: 'Privacy Policy',
      content: `
# Privacy Policy

Last updated: ${new Date().toLocaleDateString('en-US')}

## 1. Data Controller

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
Email: ${COMPANY_INFO.email}

## 2. Data We Collect

We collect the following data:
- **Company data**: Name, address, tax number, contact details
- **User data**: Username, password (encrypted)
- **Order data**: Order history, purchase preferences
- **Technical data**: IP address, browser, access time

## 3. Purpose of Processing

We use your data to:
- Fulfill contracts and process orders
- Communicate regarding orders
- Improve our services
- Comply with legal obligations

## 4. Legal Basis

We process data based on:
- Contract performance (Art. 6(1)(b) GDPR)
- Legal obligation (Art. 6(1)(c) GDPR)
- Legitimate interests (Art. 6(1)(f) GDPR)

## 5. Data Retention

We retain data:
- Order data: 10 years (legal requirement)
- Account data: Until account deletion + 1 year
- Technical logs: 90 days

## 6. Your Rights

You have the right to:
- Access your data
- Rectify inaccurate data
- Delete data (subject to legal obligations)
- Restrict processing
- Data portability
- Object to processing

## 7. Data Security

We use appropriate technical and organizational measures to protect your data:
- Data encryption
- Restricted access
- Regular backups
- Security protocols

## 8. Contact

For privacy inquiries, contact us:
${COMPANY_INFO.email}

## 9. Complaint

You have the right to lodge a complaint with the relevant supervisory authority.
      `,
    },
    tr: {
      title: 'Gizlilik Politikasi',
      content: `
# Gizlilik Politikasi

Son guncelleme: ${new Date().toLocaleDateString('tr-TR')}

## 1. Veri Sorumlusu

${COMPANY_INFO.name}
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}
E-posta: ${COMPANY_INFO.email}

## 2. Topladigimiz Veriler

Asagidaki verileri topluyoruz:
- **Sirket verileri**: Ad, adres, vergi numarasi, iletisim bilgileri
- **Kullanici verileri**: Kullanici adi, sifre (sifreli)
- **Siparis verileri**: Siparis gecmisi, satin alma tercihleri
- **Teknik veriler**: IP adresi, tarayici, erisim zamani

## 3. Isleme Amaci

Verilerinizi su amaclarla kullaniyoruz:
- Sozlesmeleri yerine getirmek ve siparisleri islemek
- Siparislerle ilgili iletisim
- Hizmetlerimizi iyilestirmek
- Yasal yukumlulukleri yerine getirmek

## 4. Hukuki Dayanak

Verileri su temellerde isliyoruz:
- Sozlesmenin ifasi (KVKK/GDPR Madde 6(1)(b))
- Yasal zorunluluk (KVKK/GDPR Madde 6(1)(c))
- Mesru menfaat (KVKK/GDPR Madde 6(1)(f))

## 5. Veri Saklama

Verileri su surelerde sakliyoruz:
- Siparis verileri: 10 yil (yasal zorunluluk)
- Hesap verileri: Hesap silinene kadar + 1 yil
- Teknik kayitlar: 90 gun

## 6. Haklariniz

Su haklara sahipsiniz:
- Verilerinize erisim
- Yanlis verilerin duzeltilmesi
- Verilerin silinmesi (yasal yukumluluklere tabi)
- Islemenin kisitlanmasi
- Veri tasinabilirligi
- Islemeye itiraz

## 7. Veri Guvenligi

Verilerinizi korumak icin uygun teknik ve organizasyonel onlemler kullaniyoruz:
- Veri sifreleme
- Kisitli erisim
- Duzenli yedeklemeler
- Guvenlik protokolleri

## 8. Iletisim

Gizlilik sorulariniz icin bize ulasin:
${COMPANY_INFO.email}

## 9. Sikayet

Ilgili denetim makamina sikayet hakkiniz vardir.
      `,
    },
  },
  help: {
    sl: {
      title: 'Pomoc in podpora',
      content: `
# Pomoc in podpora

## Kako oddati narocilo

1. Prebrskajte izdelke v katalogu
2. Dodajte izdelke v kosarico
3. Preglejte kosarico in kolicine
4. Potrdite narocilo

## Pogosta vprasanja

### Kako spremenim kolicino v kosarici?
Uporabite gumba + in - ob vsakem izdelku ali rocno vnesite zeleno kolicino.

### Kdaj bo moje narocilo dostavljeno?
Narocila, oddana do 14:00, so obicajno dostavljena naslednji delovni dan.

### Kako preverim stanje narocila?
V meniju izberite "Narocila" za pregled vseh vasih narocil in njihovega statusa.

### Kako prijavim tezavo z narocilom?
Kontaktirajte nas po e-posti ali telefonu v 24 urah po prejemu blaga.

## Kontakt

**${COMPANY_INFO.name}**
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}

**E-posta:** ${COMPANY_INFO.email}
**Telefon:** ${COMPANY_INFO.phone}

**Delovni cas podpore:**
Ponedeljek - Petek: 8:00 - 16:00
      `,
    },
    de: {
      title: 'Hilfe und Support',
      content: `
# Hilfe und Support

## Wie man eine Bestellung aufgibt

1. Durchsuchen Sie Produkte im Katalog
2. Fugen Sie Produkte zum Warenkorb hinzu
3. Uberprufen Sie Warenkorb und Mengen
4. Bestatigen Sie die Bestellung

## Haufig gestellte Fragen

### Wie andere ich die Menge im Warenkorb?
Verwenden Sie die + und - Tasten bei jedem Produkt oder geben Sie die gewunschte Menge manuell ein.

### Wann wird meine Bestellung geliefert?
Bestellungen, die bis 14:00 Uhr aufgegeben werden, werden normalerweise am nachsten Werktag geliefert.

### Wie uberprufe ich den Bestellstatus?
Wahlen Sie "Bestellungen" im Menu, um alle Ihre Bestellungen und deren Status anzuzeigen.

### Wie melde ich ein Problem mit einer Bestellung?
Kontaktieren Sie uns per E-Mail oder Telefon innerhalb von 24 Stunden nach Wareneingang.

## Kontakt

**${COMPANY_INFO.name}**
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}

**E-Mail:** ${COMPANY_INFO.email}
**Telefon:** ${COMPANY_INFO.phone}

**Support-Offnungszeiten:**
Montag - Freitag: 8:00 - 16:00
      `,
    },
    en: {
      title: 'Help and Support',
      content: `
# Help and Support

## How to Place an Order

1. Browse products in the catalog
2. Add products to cart
3. Review cart and quantities
4. Confirm the order

## Frequently Asked Questions

### How do I change the quantity in the cart?
Use the + and - buttons next to each product or manually enter the desired quantity.

### When will my order be delivered?
Orders placed before 2:00 PM are usually delivered the next business day.

### How do I check order status?
Select "Orders" from the menu to view all your orders and their status.

### How do I report a problem with an order?
Contact us by email or phone within 24 hours of receiving the goods.

## Contact

**${COMPANY_INFO.name}**
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}

**Email:** ${COMPANY_INFO.email}
**Phone:** ${COMPANY_INFO.phone}

**Support Hours:**
Monday - Friday: 8:00 AM - 4:00 PM
      `,
    },
    tr: {
      title: 'Yardim ve Destek',
      content: `
# Yardim ve Destek

## Siparis Nasil Verilir

1. Katalogda urunlere gozatin
2. Urunleri sepete ekleyin
3. Sepeti ve miktarlari kontrol edin
4. Siparisi onaylayin

## Sikca Sorulan Sorular

### Sepetteki miktari nasil degistiririm?
Her urunun yanindaki + ve - butonlarini kullanin veya istediginiz miktari manuel olarak girin.

### Siparisim ne zaman teslim edilir?
Saat 14:00'e kadar verilen siparisler genellikle bir sonraki is gunu teslim edilir.

### Siparis durumunu nasil kontrol ederim?
Tum siparislerinizi ve durumlarini gormek icin menuden "Siparisler"i secin.

### Bir siparisle ilgili sorunu nasil bildiririm?
Mallari aldiktan sonra 24 saat icinde e-posta veya telefonla bize ulasin.

## Iletisim

**${COMPANY_INFO.name}**
${COMPANY_INFO.address}
${COMPANY_INFO.city}, ${COMPANY_INFO.country}

**E-posta:** ${COMPANY_INFO.email}
**Telefon:** ${COMPANY_INFO.phone}

**Destek Saatleri:**
Pazartesi - Cuma: 8:00 - 16:00
      `,
    },
  },
};

// Parse markdown to simple HTML
function parseMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-3 text-gray-900">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-gray-900">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>');
}

interface LegalContentProps {
  type: 'terms' | 'privacy' | 'help';
}

export function LegalContent({ type }: LegalContentProps) {
  const [lang, setLang] = useState<B2BLanguage>('sl');

  useEffect(() => {
    const session = getSession();
    if (session?.partnerId) {
      getData(`partners/${session.partnerId}`).then((data) => {
        if (data?.b2bLogin?.language) {
          setLang(data.b2bLogin.language);
        }
      });
    }
  }, []);

  const content = LEGAL_CONTENT[type];
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500">Page not found</p>
        <Link href="/b2b/products">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>
    );
  }

  const localizedContent = content[lang] || content.en;
  const icon = type === 'terms' ? Scale : type === 'privacy' ? Shield : HelpCircle;
  const Icon = icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/b2b/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{localizedContent.title}</h1>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(localizedContent.content) }}
          />
        </CardContent>
      </Card>

      {/* Company Footer */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{COMPANY_INFO.name}</p>
                <p className="text-sm text-gray-500">{COMPANY_INFO.address}, {COMPANY_INFO.city}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
                <Mail className="w-4 h-4" />
                {COMPANY_INFO.email}
              </a>
              <a href={`tel:${COMPANY_INFO.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
                <Phone className="w-4 h-4" />
                {COMPANY_INFO.phone}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
