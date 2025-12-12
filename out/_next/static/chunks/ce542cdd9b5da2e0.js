(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,i,a)=>{"use strict";Object.defineProperty(a,"__esModule",{value:!0}),Object.defineProperty(a,"warnOnce",{enumerable:!0,get:function(){return r}});let r=e=>{}},78583,e=>{"use strict";let i=(0,e.i(75254).default)("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);e.s(["FileText",()=>i],78583)},98919,e=>{"use strict";let i=(0,e.i(75254).default)("shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);e.s(["Shield",()=>i],98919)},74875,e=>{"use strict";let i=(0,e.i(75254).default)("circle-question-mark",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);e.s(["HelpCircle",()=>i],74875)},7486,e=>{"use strict";let i=(0,e.i(75254).default)("building-2",[["path",{d:"M10 12h4",key:"a56b0p"}],["path",{d:"M10 8h4",key:"1sr2af"}],["path",{d:"M14 21v-3a2 2 0 0 0-4 0v3",key:"1rgiei"}],["path",{d:"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",key:"secmi2"}],["path",{d:"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16",key:"16ra0t"}]]);e.s(["Building2",()=>i],7486)},19455,20783,91918,25913,e=>{"use strict";var i=e.i(43476),a=e.i(71645);function r(e,i){if("function"==typeof e)return e(i);null!=e&&(e.current=i)}function t(...e){return i=>{let a=!1,t=e.map(e=>{let t=r(e,i);return a||"function"!=typeof t||(a=!0),t});if(a)return()=>{for(let i=0;i<t.length;i++){let a=t[i];"function"==typeof a?a():r(e[i],null)}}}}function n(...e){return a.useCallback(t(...e),e)}e.s(["composeRefs",()=>t,"useComposedRefs",()=>n],20783);var l=Symbol.for("react.lazy"),o=a[" use ".trim().toString()];function s(e){var i;return null!=e&&"object"==typeof e&&"$$typeof"in e&&e.$$typeof===l&&"_payload"in e&&"object"==typeof(i=e._payload)&&null!==i&&"then"in i}function d(e){var r;let n,l=(r=e,(n=a.forwardRef((e,i)=>{let{children:r,...n}=e;if(s(r)&&"function"==typeof o&&(r=o(r._payload)),a.isValidElement(r)){var l;let e,o,s=(l=r,(o=(e=Object.getOwnPropertyDescriptor(l.props,"ref")?.get)&&"isReactWarning"in e&&e.isReactWarning)?l.ref:(o=(e=Object.getOwnPropertyDescriptor(l,"ref")?.get)&&"isReactWarning"in e&&e.isReactWarning)?l.props.ref:l.props.ref||l.ref),d=function(e,i){let a={...i};for(let r in i){let t=e[r],n=i[r];/^on[A-Z]/.test(r)?t&&n?a[r]=(...e)=>{let i=n(...e);return t(...e),i}:t&&(a[r]=t):"style"===r?a[r]={...t,...n}:"className"===r&&(a[r]=[t,n].filter(Boolean).join(" "))}return{...e,...a}}(n,r.props);return r.type!==a.Fragment&&(d.ref=i?t(i,s):s),a.cloneElement(r,d)}return a.Children.count(r)>1?a.Children.only(null):null})).displayName=`${r}.SlotClone`,n),d=a.forwardRef((e,r)=>{let{children:t,...n}=e;s(t)&&"function"==typeof o&&(t=o(t._payload));let d=a.Children.toArray(t),u=d.find(g);if(u){let e=u.props.children,t=d.map(i=>i!==u?i:a.Children.count(e)>1?a.Children.only(null):a.isValidElement(e)?e.props.children:null);return(0,i.jsx)(l,{...n,ref:r,children:a.isValidElement(e)?a.cloneElement(e,void 0,t):null})}return(0,i.jsx)(l,{...n,ref:r,children:t})});return d.displayName=`${e}.Slot`,d}var u=d("Slot"),c=Symbol("radix.slottable");function g(e){return a.isValidElement(e)&&"function"==typeof e.type&&"__radixId"in e.type&&e.type.__radixId===c}e.s(["Slot",()=>u,"createSlot",()=>d],91918);var m=e.i(7670);let p=e=>"boolean"==typeof e?`${e}`:0===e?"0":e,h=m.clsx,v=(e,i)=>a=>{var r;if((null==i?void 0:i.variants)==null)return h(e,null==a?void 0:a.class,null==a?void 0:a.className);let{variants:t,defaultVariants:n}=i,l=Object.keys(t).map(e=>{let i=null==a?void 0:a[e],r=null==n?void 0:n[e];if(null===i)return null;let l=p(i)||p(r);return t[e][l]}),o=a&&Object.entries(a).reduce((e,i)=>{let[a,r]=i;return void 0===r||(e[a]=r),e},{});return h(e,l,null==i||null==(r=i.compoundVariants)?void 0:r.reduce((e,i)=>{let{class:a,className:r,...t}=i;return Object.entries(t).every(e=>{let[i,a]=e;return Array.isArray(a)?a.includes({...n,...o}[i]):({...n,...o})[i]===a})?[...e,a,r]:e},[]),null==a?void 0:a.class,null==a?void 0:a.className)};e.s(["cva",0,v],25913);var k=e.i(75157);let b=v("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",{variants:{variant:{default:"bg-primary text-primary-foreground hover:bg-primary/90",destructive:"bg-destructive text-white hover:bg-destructive/90",outline:"border border-input bg-background hover:bg-accent hover:text-accent-foreground",secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground",link:"text-primary underline-offset-4 hover:underline"},size:{default:"h-9 px-4 py-2",sm:"h-8 rounded-md px-3 text-xs",lg:"h-10 rounded-md px-6",icon:"h-9 w-9"}},defaultVariants:{variant:"default",size:"default"}}),f=a.forwardRef(({className:e,variant:a,size:r,asChild:t=!1,...n},l)=>(0,i.jsx)(t?u:"button",{className:(0,k.cn)(b({variant:a,size:r,className:e})),ref:l,...n}));f.displayName="Button",e.s(["Button",()=>f],19455)},15288,e=>{"use strict";var i=e.i(43476),a=e.i(71645),r=e.i(75157);let t=a.forwardRef(({className:e,...a},t)=>(0,i.jsx)("div",{ref:t,className:(0,r.cn)("rounded-xl border bg-card text-card-foreground shadow-sm",e),...a}));t.displayName="Card";let n=a.forwardRef(({className:e,...a},t)=>(0,i.jsx)("div",{ref:t,className:(0,r.cn)("flex flex-col space-y-1.5 p-6",e),...a}));n.displayName="CardHeader";let l=a.forwardRef(({className:e,...a},t)=>(0,i.jsx)("h3",{ref:t,className:(0,r.cn)("font-semibold leading-none tracking-tight",e),...a}));l.displayName="CardTitle";let o=a.forwardRef(({className:e,...a},t)=>(0,i.jsx)("p",{ref:t,className:(0,r.cn)("text-sm text-muted-foreground",e),...a}));o.displayName="CardDescription";let s=a.forwardRef(({className:e,...a},t)=>(0,i.jsx)("div",{ref:t,className:(0,r.cn)("p-6 pt-0",e),...a}));s.displayName="CardContent",a.forwardRef(({className:e,...a},t)=>(0,i.jsx)("div",{ref:t,className:(0,r.cn)("flex items-center p-6 pt-0",e),...a})).displayName="CardFooter",e.s(["Card",()=>t,"CardContent",()=>s,"CardDescription",()=>o,"CardHeader",()=>n,"CardTitle",()=>l])},63488,e=>{"use strict";let i=(0,e.i(75254).default)("mail",[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]]);e.s(["Mail",()=>i],63488)},43432,e=>{"use strict";let i=(0,e.i(75254).default)("phone",[["path",{d:"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",key:"9njp5v"}]]);e.s(["Phone",()=>i],43432)},71689,e=>{"use strict";let i=(0,e.i(75254).default)("arrow-left",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);e.s(["ArrowLeft",()=>i],71689)},49267,e=>{"use strict";var i=e.i(43476),a=e.i(71645),r=e.i(70658),t=e.i(69457),n=e.i(15288),l=e.i(19455),o=e.i(71689),s=e.i(78583),d=e.i(98919);let u=(0,e.i(75254).default)("scale",[["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"m19 8 3 8a5 5 0 0 1-6 0zV7",key:"zcdpyk"}],["path",{d:"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1",key:"1yorad"}],["path",{d:"m5 8 3 8a5 5 0 0 1-6 0zV7",key:"eua70x"}],["path",{d:"M7 21h10",key:"1b0cd5"}]]);var c=e.i(74875),g=e.i(7486),m=e.i(63488),p=e.i(43432),h=e.i(22016);let v="Atlas Software d.o.o.",k="Hrvaska Ul. 10",b="1000 Ljubljana",f="Slovenia",y="info@atlas-software.si",z="+386 1 234 5678",j={terms:{sl:{title:"Pogoji uporabe",content:`
# Pogoji uporabe B2B portala

Zadnja posodobitev: ${new Date().toLocaleDateString("sl-SI")}

## 1. Splosne dolocbe

Ti pogoji uporabe urejajo uporabo B2B portala, ki ga upravlja ${v} (v nadaljevanju "ponudnik storitev").

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

${v}
${k}
${b}, ${f}
Email: ${y}
Tel: ${z}
      `},de:{title:"Nutzungsbedingungen",content:`
# Nutzungsbedingungen des B2B-Portals

Letzte Aktualisierung: ${new Date().toLocaleDateString("de-DE")}

## 1. Allgemeine Bestimmungen

Diese Nutzungsbedingungen regeln die Nutzung des B2B-Portals, das von ${v} (im Folgenden "Dienstanbieter") betrieben wird.

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

${v}
${k}
${b}, ${f}
E-Mail: ${y}
Tel: ${z}
      `},en:{title:"Terms of Use",content:`
# B2B Portal Terms of Use

Last updated: ${new Date().toLocaleDateString("en-US")}

## 1. General Provisions

These terms of use govern the use of the B2B portal operated by ${v} (hereinafter "Service Provider").

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

${v}
${k}
${b}, ${f}
Email: ${y}
Tel: ${z}
      `},tr:{title:"Kullanim Sartlari",content:`
# B2B Portal Kullanim Sartlari

Son guncelleme: ${new Date().toLocaleDateString("tr-TR")}

## 1. Genel Hukumler

Bu kullanim sartlari, ${v} (bundan sonra "Hizmet Saglayici") tarafindan isletilen B2B portalinin kullanimini duzenler.

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

${v}
${k}
${b}, ${f}
E-posta: ${y}
Tel: ${z}
      `}},privacy:{sl:{title:"Politika zasebnosti",content:`
# Politika zasebnosti

Zadnja posodobitev: ${new Date().toLocaleDateString("sl-SI")}

## 1. Upravljavec podatkov

${v}
${k}
${b}, ${f}
Email: ${y}

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
${y}

## 9. Pritozba

Imate pravico vloziti pritozbo pri Informacijskem pooblascencu RS.
      `},de:{title:"Datenschutzrichtlinie",content:`
# Datenschutzrichtlinie

Letzte Aktualisierung: ${new Date().toLocaleDateString("de-DE")}

## 1. Verantwortlicher

${v}
${k}
${b}, ${f}
E-Mail: ${y}

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
${y}

## 9. Beschwerde

Sie haben das Recht, eine Beschwerde bei der zustandigen Aufsichtsbehorde einzureichen.
      `},en:{title:"Privacy Policy",content:`
# Privacy Policy

Last updated: ${new Date().toLocaleDateString("en-US")}

## 1. Data Controller

${v}
${k}
${b}, ${f}
Email: ${y}

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
${y}

## 9. Complaint

You have the right to lodge a complaint with the relevant supervisory authority.
      `},tr:{title:"Gizlilik Politikasi",content:`
# Gizlilik Politikasi

Son guncelleme: ${new Date().toLocaleDateString("tr-TR")}

## 1. Veri Sorumlusu

${v}
${k}
${b}, ${f}
E-posta: ${y}

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
${y}

## 9. Sikayet

Ilgili denetim makamina sikayet hakkiniz vardir.
      `}},help:{sl:{title:"Pomoc in podpora",content:`
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

**${v}**
${k}
${b}, ${f}

**E-posta:** ${y}
**Telefon:** ${z}

**Delovni cas podpore:**
Ponedeljek - Petek: 8:00 - 16:00
      `},de:{title:"Hilfe und Support",content:`
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

**${v}**
${k}
${b}, ${f}

**E-Mail:** ${y}
**Telefon:** ${z}

**Support-Offnungszeiten:**
Montag - Freitag: 8:00 - 16:00
      `},en:{title:"Help and Support",content:`
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

**${v}**
${k}
${b}, ${f}

**Email:** ${y}
**Phone:** ${z}

**Support Hours:**
Monday - Friday: 8:00 AM - 4:00 PM
      `},tr:{title:"Yardim ve Destek",content:`
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

**${v}**
${k}
${b}, ${f}

**E-posta:** ${y}
**Telefon:** ${z}

**Destek Saatleri:**
Pazartesi - Cuma: 8:00 - 16:00
      `}}};function S({type:e}){let[f,S]=(0,a.useState)("sl");(0,a.useEffect)(()=>{let e=(0,r.getSession)();e?.partnerId&&(0,t.getData)(`partners/${e.partnerId}`).then(e=>{e?.b2bLogin?.language&&S(e.b2bLogin.language)})},[]);let x=j[e];if(!x)return(0,i.jsxs)("div",{className:"flex flex-col items-center justify-center h-[60vh]",children:[(0,i.jsx)(s.FileText,{className:"w-16 h-16 text-gray-300 mb-4"}),(0,i.jsx)("p",{className:"text-gray-500",children:"Page not found"}),(0,i.jsx)(h.default,{href:"/b2b/products",children:(0,i.jsxs)(l.Button,{variant:"outline",className:"mt-4",children:[(0,i.jsx)(o.ArrowLeft,{className:"w-4 h-4 mr-2"}),"Back"]})})]});let w=x[f]||x.en,$="terms"===e?u:"privacy"===e?d.Shield:c.HelpCircle;return(0,i.jsxs)("div",{className:"max-w-4xl mx-auto space-y-6",children:[(0,i.jsxs)("div",{className:"flex items-center gap-4",children:[(0,i.jsx)(h.default,{href:"/b2b/products",children:(0,i.jsx)(l.Button,{variant:"ghost",size:"icon",children:(0,i.jsx)(o.ArrowLeft,{className:"w-5 h-5"})})}),(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)("div",{className:"p-2 bg-blue-100 rounded-lg",children:(0,i.jsx)($,{className:"w-6 h-6 text-blue-600"})}),(0,i.jsx)("h1",{className:"text-2xl font-bold text-gray-900",children:w.title})]})]}),(0,i.jsx)(n.Card,{children:(0,i.jsx)(n.CardContent,{className:"pt-6",children:(0,i.jsx)("div",{className:"prose prose-gray max-w-none",dangerouslySetInnerHTML:{__html:w.content.replace(/^### (.*$)/gim,'<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>').replace(/^## (.*$)/gim,'<h2 class="text-xl font-bold mt-8 mb-3 text-gray-900">$1</h2>').replace(/^# (.*$)/gim,'<h1 class="text-2xl font-bold mb-4 text-gray-900">$1</h1>').replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/^- (.*$)/gim,'<li class="ml-4">$1</li>').replace(/\n\n/g,'</p><p class="mb-4">').replace(/\n/g,"<br/>")}})})}),(0,i.jsx)(n.Card,{className:"bg-gray-50",children:(0,i.jsx)(n.CardContent,{className:"pt-6",children:(0,i.jsxs)("div",{className:"flex flex-col md:flex-row items-start md:items-center gap-6",children:[(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)("div",{className:"p-3 bg-white rounded-lg shadow-sm",children:(0,i.jsx)(g.Building2,{className:"w-8 h-8 text-blue-600"})}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-bold text-gray-900",children:v}),(0,i.jsxs)("p",{className:"text-sm text-gray-500",children:[k,", ",b]})]})]}),(0,i.jsxs)("div",{className:"flex flex-wrap gap-4 text-sm",children:[(0,i.jsxs)("a",{href:`mailto:${y}`,className:"flex items-center gap-2 text-gray-600 hover:text-blue-600",children:[(0,i.jsx)(m.Mail,{className:"w-4 h-4"}),y]}),(0,i.jsxs)("a",{href:`tel:${z}`,className:"flex items-center gap-2 text-gray-600 hover:text-blue-600",children:[(0,i.jsx)(p.Phone,{className:"w-4 h-4"}),z]})]})]})})})]})}e.s(["LegalContent",()=>S],49267)},88432,e=>{"use strict";var i=e.i(43476),a=e.i(49267);function r(){return(0,i.jsx)(a.LegalContent,{type:"help"})}e.s(["default",()=>r])},27510,e=>{e.v(i=>Promise.all(["static/chunks/54ab083194d7bfbe.js"].map(i=>e.l(i))).then(()=>i(48323)))}]);