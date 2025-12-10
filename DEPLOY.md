# Deployment Rehberi

## Güncelleme Nasıl Yapılır

### Adım 1: Lokalde (bilgisayarında)
```bash
npm run deploy
```
Bu tek komut: build eder → commit eder → push eder

### Adım 2: cPanel Terminalinde
```bash
cd /home/atlasg38/erp.atlasgroup.si && git pull && cp -r out/* .
```

---

## Özet

| Nerede | Komut |
|--------|-------|
| **Lokal** | `npm run deploy` |
| **cPanel** | `git pull && cp -r out/* .` |

---

## Site Bilgileri

- **URL:** https://erp.atlasgroup.si
- **cPanel Path:** `/home/atlasg38/erp.atlasgroup.si`
- **GitHub:** https://github.com/sahineyup1/kasa-pro
