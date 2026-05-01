# 🚖 NexRide — Uber Tipi Uygulama Geliştirme Yol Haritası

> **Mevcut Proje Analizi:** Node.js + Express + SQLite tabanlı, JWT kimlik doğrulama, cüzdan sistemi, sürücü-yolcu eşleştirme, admin paneli içeren erken aşamada bir taksi uygulaması. Leaflet.js ile harita entegrasyonu mevcut, Docker desteği var. Eksikler: gerçek zamanlı konum takibi, mobil uygulama, ödeme entegrasyonu, ölçeklenebilir mimari.

---

## 📋 Genel Bakış

| Aşama | Başlık | Tahmini Süre | Öncelik |
|-------|--------|-------------|---------|
| 1 | Mevcut Kodu Temizle & Sağlamlaştır | 1–2 hafta | 🔴 Kritik |
| 2 | Gerçek Zamanlı Harita & Konum Sistemi | 2–3 hafta | 🔴 Kritik |
| 3 | Sürücü Uygulaması | 2–3 hafta | 🔴 Kritik |
| 4 | Ödeme Sistemi | 1–2 hafta | 🟠 Yüksek |
| 5 | Bildirim Sistemi | 1 hafta | 🟠 Yüksek |
| 6 | Mobil Uygulama (React Native) | 4–6 hafta | 🟠 Yüksek |
| 7 | Ölçeklenebilir Backend Mimarisi | 2–3 hafta | 🟡 Orta |
| 8 | Admin & Analytics Paneli | 2 hafta | 🟡 Orta |
| 9 | Güvenlik & Performans | 1–2 hafta | 🟡 Orta |
| 10 | Production & DevOps | 1–2 hafta | 🟢 Son |

---

## 🔴 AŞAMA 1 — Mevcut Kodu Temizle & Sağlamlaştır
**Süre:** 1–2 hafta

### 1.1 Güvenlik Açıklarını Kapat

**Problem:** `.env` dosyasında gerçek e-posta şifresi ve JWT secret açık şekilde commit edilmiş. Admin e-postaları `server.js` içine hard-coded yazılmış.

```
Yapılacaklar:
✅ .env dosyasını .gitignore'a ekle
✅ Admin yetkilerini veritabanına taşı (hardcoded e-posta kaldır)
✅ JWT_SECRET'i güçlü rastgele değere çevir
✅ Email şifresini güvenli bir secret manager'a taşı
✅ Rate limiting tüm endpointlere uygula (şu an sadece auth'ta var)
```

### 1.2 Veritabanı Migrasyonu (SQLite → PostgreSQL)

Mevcut SQLite yapısı production için yetersiz. PostgreSQL'e geçiş gerekli.

```sql
-- Mevcut tablolar korunarak PostgreSQL'e taşınacak:
-- users, drivers, bookings, ratings, favorite_addresses,
-- notifications, transactions, verification_codes
```

**Migration planı:**
- `drizzle-orm` veya `prisma` ile schema tanımla
- Migration dosyaları oluştur
- Mevcut SQLite verilerini dışa aktar, PostgreSQL'e içe aktar

### 1.3 Kod Yapısını Refactor Et

Şu an tüm kod `server.js` ve `user-db.js` içinde. Klasör yapısı oluşturulmalı:

```
src/
├── routes/
│   ├── auth.routes.js
│   ├── booking.routes.js
│   ├── driver.routes.js
│   ├── wallet.routes.js
│   └── admin.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── booking.controller.js
│   └── ...
├── middleware/
│   ├── auth.middleware.js
│   └── admin.middleware.js
├── services/
│   ├── email.service.js
│   ├── payment.service.js
│   └── maps.service.js
├── models/
│   └── (Prisma schema veya ORM modelleri)
└── utils/
    ├── validators.js
    └── helpers.js
```

### 1.4 Validasyon Katmanı Ekle

```bash
npm install zod
# Tüm API endpoint'lerine Zod şema validasyonu ekle
```

### 1.5 Hata Yönetimi Standardize Et

Global error handler middleware oluştur. Şu an bazı endpoint'lerde tutarsız hata formatları var.

---

## 🔴 AŞAMA 2 — Gerçek Zamanlı Harita & Konum Sistemi
**Süre:** 2–3 hafta

Bu aşama uygulamanın **en kritik** özelliğidir. Mevcut projede Leaflet harita var ama sürücü konumu gerçek zamanlı güncellenmiyor.

### 2.1 WebSocket Altyapısı

```bash
npm install socket.io
```

```javascript
// Olaylar:
// driver:location-update  → Sürücü konumunu günceller
// booking:status-change   → Rezervasyon durumu değişti
// driver:found            → Yolcuya sürücü atandı
// driver:arrived          → Sürücü kapıya geldi
// ride:started            → Yolculuk başladı
// ride:completed          → Yolculuk bitti
```

### 2.2 Sürücü Konum Yönetimi

```javascript
// Her sürücü bağlandığında bir "room"a katılır
// Yolcu rezervasyon yaptığında ilgili sürücünün room'una abone olur
// Sürücü her 3 saniyede bir konum gönderir

io.on('connection', (socket) => {
  socket.on('driver:join', ({ driverId }) => {
    socket.join(`driver-${driverId}`);
  });

  socket.on('driver:location-update', ({ driverId, lat, lng }) => {
    // DB'ye kaydet
    // İlgili yolculara yayınla
    io.to(`booking-${driverId}`).emit('driver:moved', { lat, lng });
  });
});
```

### 2.3 Rota & Mesafe Hesaplama

Mevcut projede fiyatlandırma el ile yapılıyor. Gerçek rota hesabı eklenecek.

```bash
# Seçenek A (ücretsiz): OpenRouteService API
# Seçenek B (ücretli ama kolay): Google Maps Distance Matrix API
# Seçenek C (self-hosted): OSRM (Open Source Routing Machine)
```

Entegrasyon:
- Alış noktası → varış noktası arası km hesapla
- Tahmini süre belirle
- Dinamik fiyat hesapla (baz ücret + km başı ücret + yoğun saat çarpanı)

### 2.4 Yakın Sürücü Bulma Algoritması

```sql
-- Haversine formülü ile en yakın müsait sürücüyü bul
SELECT *, 
  (6371 * acos(
    cos(radians(?)) * cos(radians(lat)) *
    cos(radians(lng) - radians(?)) +
    sin(radians(?)) * sin(radians(lat))
  )) AS distance
FROM drivers
WHERE is_available = 1
ORDER BY distance
LIMIT 5;
```

### 2.5 Otomatik Sürücü Eşleştirme

```
Akış:
1. Yolcu rezervasyon talebi gönderir
2. Sistem en yakın 3 sürücüyü bulur
3. 1. sürücüye istek gönderilir (30 sn timeout)
4. Kabul ederse eşleştirme yapılır
5. Reddederse veya timeout olursa 2. sürücüye geçilir
6. Hiç sürücü yoksa yolcuya bildirim: "Şu an sürücü bulunamadı"
```

---

## 🔴 AŞAMA 3 — Sürücü Uygulaması
**Süre:** 2–3 hafta

Mevcut projede `driver.html` var ama çok sınırlı. Kapsamlı sürücü arayüzü gerekli.

### 3.1 Sürücü Kayıt & Doğrulama

Yolcu kaydından farklı olarak sürücüler ek doğrulama gerektirir:

```
Sürücü Onboarding Adımları:
1. Kişisel bilgiler (TC, isim, telefon)
2. Ehliyet bilgileri (no, geçerlilik tarihi, kategori)
3. Araç bilgileri (plaka, marka, model, yıl, renk)
4. Araç ruhsatı fotoğrafı yükleme
5. Ehliyet fotoğrafı yükleme
6. Yüz doğrulama (selfie)
7. Admin onayı bekleme
```

### 3.2 Sürücü Dashboard Özellikleri

```
Ana Ekran:
- Çevrimiçi/Çevrimdışı toggle
- Aktif talep kartı (kabul et / reddet)
- Navigasyon entegrasyonu (Google Maps deep link)
- Günlük/haftalık kazanç özeti
- Değerlendirme ortalaması

Yolculuk Sırasında:
- Yolcuya konum gönderme (arka planda)
- Yolculuğu başlat / bitir butonları
- Yolcu iletişim (arama, mesaj)
- Acil durum butonu
```

### 3.3 Sürücü Performans Sistemi

```
Metrikler:
- Kabul oranı (acceptance rate)
- Tamamlama oranı (completion rate)
- Ortalama değerlendirme
- Toplam yolculuk sayısı
- Haftalık kazanç

Teşvik Sistemi:
- Yoğun saat primi
- Hedef tamamlama bonusu ("10 yolculuk yap, 50₺ bonus kazan")
```

---

## 🟠 AŞAMA 4 — Ödeme Sistemi
**Süre:** 1–2 hafta

Mevcut projede dahili cüzdan sistemi var (SQLite'da balance). Gerçek ödeme altyapısı eklenmeli.

### 4.1 Ödeme Entegrasyonları

```
Türkiye için önerilen sıra:

1. İyzico (en kolay Türkiye entegrasyonu)
   - Kredi/banka kartı
   - 3D Secure
   - Taksit seçeneği

2. Param (alternatif)
   - Yerel banka transferleri
   - Sanal kart

3. Stripe (uluslararası)
   - Global ölçeklenme için
```

```bash
npm install iyzipay
```

### 4.2 Cüzdan Sistemi İyileştirme

Mevcut cüzdan sistemini genişlet:

```
Mevcut: balance alanı + transactions tablosu ✅
Eklenecekler:
- Otomatik para yükleme (saved card ile)
- Para iadesi (refund) işlemleri
- Fatura/makbuz PDF üretimi
- Harcama limiti belirleme
```

### 4.3 Dinamik Fiyatlandırma

```javascript
function calculatePrice(distanceKm, durationMin, demandMultiplier = 1.0) {
  const BASE_FARE = 15;        // Biniş ücreti
  const PER_KM = 8;            // KM başı ücret
  const PER_MIN = 0.5;         // Dakika başı ücret
  
  const rawPrice = BASE_FARE + (distanceKm * PER_KM) + (durationMin * PER_MIN);
  return Math.round(rawPrice * demandMultiplier);
}

// Yoğun saat çarpanı: 1.0 - 2.5x arası
// Araç tipi çarpanı: standart=1x, konfor=1.3x, XL=1.5x
```

---

## 🟠 AŞAMA 5 — Bildirim Sistemi
**Süre:** 1 hafta

Mevcut projede bildirimler tablosu var ama push notification yok.

### 5.1 Push Notification

```bash
npm install firebase-admin
# Firebase Cloud Messaging (FCM) ile:
# - iOS & Android push bildirimleri
# - Web push bildirimleri
```

```
Bildirim Senaryoları:
- "Sürücünüz yolda, tahmini varış: 4 dk"
- "Sürücünüz kapınızda"
- "Yolculuğunuz tamamlandı. Lütfen değerlendirin."
- "₺50 cüzdanınıza yüklendi"
- "Rezervasyonunuz iptal edildi, iade yapıldı"
```

### 5.2 SMS Bildirimi

```bash
npm install twilio
# Twilio ile SMS: Türkiye için Netgsm alternatif
```

### 5.3 In-App Bildirim Merkezi

Mevcut `notifications` tablosunu aktif kullan:

```javascript
// WebSocket üzerinden anlık bildirim gönder
// Okunmamış bildirim sayacı (badge)
// Bildirim geçmişi ekranı
```

---

## 🟠 AŞAMA 6 — Mobil Uygulama
**Süre:** 4–6 hafta

Bu aşama en büyük iş yüküdür. React Native önerilir (tek kod tabanı, iOS + Android).

### 6.1 Tech Stack

```
Framework: React Native (Expo ile başla, eject gerekirse eject et)
Navigasyon: React Navigation v6
State: Zustand veya Redux Toolkit
Harita: react-native-maps
Konum: expo-location
Push: expo-notifications
HTTP: axios + react-query
```

### 6.2 Ekran Listesi — Yolcu Uygulaması

```
Auth:
├── SplashScreen
├── OnboardingScreen (3 slide)
├── LoginScreen
├── RegisterScreen
└── ForgotPasswordScreen

Ana Akış:
├── HomeScreen (harita + adres arama)
├── RideOptionsScreen (araç tipi seç, fiyat gör)
├── DriverMatchingScreen (sürücü aranıyor animasyonu)
├── ActiveRideScreen (harita + sürücü konumu canlı)
├── RideCompletedScreen (fiyat + değerlendirme)
└── RatingScreen

Hesap:
├── ProfileScreen
├── RideHistoryScreen
├── WalletScreen
├── AddMoneyScreen
├── PaymentMethodsScreen
├── NotificationsScreen
└── SettingsScreen
```

### 6.3 Ekran Listesi — Sürücü Uygulaması

```
├── DriverHomeScreen (online/offline toggle + harita)
├── RideRequestScreen (talep geldi, kabul/reddet)
├── NavigateToPickupScreen (yolcuya git)
├── ActiveRideScreen (yolculuk devam ediyor)
├── EarningsScreen (günlük/haftalık kazanç)
└── DriverProfileScreen
```

### 6.4 Harita Özellikleri

```javascript
// react-native-maps ile:
- Kullanıcı konumu mavi nokta
- Sürücü konumu araç ikonu (gerçek zamanlı hareket)
- Alış ve varış noktası marker
- Rota çizimi (polyline)
- Tahmini süre ve mesafe overlay
```

---

## 🟡 AŞAMA 7 — Ölçeklenebilir Backend Mimarisi
**Süre:** 2–3 hafta

Mevcut monolitik yapı küçük ölçekte çalışır. Büyüme için yeniden tasarım gerekli.

### 7.1 SQLite → PostgreSQL Geçişi

```yaml
# docker-compose.yml güncelleme
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: nexride
      POSTGRES_USER: nexride_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 7.2 Redis Cache & Session

```bash
npm install ioredis
# Kullanım alanları:
# - Verification code'ları Redis'te sakla (şu an SQLite'da)
# - Sürücü konum cache (her DB yazımı yerine)
# - Rate limiting için distributed counter
# - Session store
```

### 7.3 Kuyruklama Sistemi

```bash
npm install bullmq
# Asenkron görevler için:
# - Email gönderimi (şu an senkron, timeout riski var)
# - Push notification gönderimi
# - Fatura PDF üretimi
# - Sürücü eşleştirme işlemi
```

### 7.4 API Versiyonlama

```javascript
// Mobil app güncellemelerini kırmamak için
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes); // gelecekteki değişiklikler
```

---

## 🟡 AŞAMA 8 — Admin & Analytics Paneli
**Süre:** 2 hafta

Mevcut `admin.html` var ama yetersiz. Kapsamlı dashboard gerekli.

### 8.1 Admin Panel Özellikleri

```
Kullanıcı Yönetimi:
- Kullanıcı listesi, arama, filtre ✅ (mevcut)
- Kullanıcı ban/unban
- Profil düzenleme ✅ (mevcut)
- Bakiye düzenleme

Sürücü Yönetimi:
- Yeni sürücü başvuruları onaylama
- Sürücü belge doğrulama
- Anlık sürücü haritası (tüm sürücülerin konumu)
- Sürücü suspend/aktivasyon

Rezervasyon Yönetimi:
- Tüm rezervasyonlar ✅ (mevcut, pagination var)
- Rezervasyon detay
- Dispute (anlaşmazlık) yönetimi

Finansal:
- Günlük/haftalık/aylık gelir grafiği
- Ödeme işlemleri
- İade yönetimi

Analytics:
- En yoğun bölgeler haritası (heat map)
- Sürücü performans rankingu
- Yolcu retention oranı
```

### 8.2 Raporlama

```javascript
// Otomatik raporlar:
// - Günlük gelir özeti (e-mail ile)
// - Haftalık sürücü ödemeleri
// - Aylık finansal rapor (PDF)
```

---

## 🟡 AŞAMA 9 — Güvenlik & Performans
**Süre:** 1–2 hafta

### 9.1 Güvenlik Hardening

```
Mevcut durumda eksikler:
- [ ] HTTPS zorunlu kılınmamış (Nginx reverse proxy ekle)
- [ ] Input sanitization eksik (SQL injection riski düşük çünkü ORM var ama doğrula)
- [ ] File upload validasyonu yok (sürücü belge yükleme için gerekecek)
- [ ] CORS düzgün yapılandırılmamış
- [ ] API key rotation mekanizması yok
```

```bash
npm install multer sharp  # Güvenli dosya yükleme
npm install express-validator  # Input validasyonu
```

### 9.2 Performans Optimizasyonu

```sql
-- Kritik indexler ekle
CREATE INDEX idx_bookings_userId ON bookings(userId);
CREATE INDEX idx_bookings_driverId ON bookings(driverId);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_drivers_available ON drivers(is_available);
CREATE INDEX idx_drivers_location ON drivers(lat, lng); -- Geospatial index
```

### 9.3 Test Coverage

```bash
npm install --save-dev jest supertest @faker-js/faker
# Hedef: %80 test coverage
# Unit tests: servis fonksiyonları
# Integration tests: API endpoint'leri
# E2E tests: kritik kullanıcı akışları
```

---

## 🟢 AŞAMA 10 — Production & DevOps
**Süre:** 1–2 hafta

### 10.1 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        run: # SSH ile sunucuya deploy
```

### 10.2 Altyapı Seçenekleri

```
Seçenek A — Hızlı başlangıç (önerilen):
- Railway veya Render (kolay deploy, ücretsiz tier var)
- Managed PostgreSQL (Railway built-in)
- Redis Cloud (ücretsiz 30MB)

Seçenek B — Production ready:
- AWS EC2 veya DigitalOcean Droplet
- AWS RDS (PostgreSQL managed)
- ElastiCache (Redis)
- CloudFront CDN

Seçenek C — Tam Türkiye odaklı:
- Turhost veya Natro VPS
- Yerel mevzuat uyumu için veri Türkiye'de
```

### 10.3 Monitoring

```bash
# Uygulama monitoring
npm install @sentry/node  # Hata takibi

# Altyapı monitoring
# - Uptime Robot (ücretsiz uptime check)
# - Grafana + Prometheus (ileri seviye)
```

### 10.4 Deployment Checklist

```
Pre-launch:
- [ ] Tüm .env değerleri production değerlerine güncellendi
- [ ] Email şifresi .env'den kaldırıldı, secret manager kullanılıyor
- [ ] HTTPS sertifikası kuruldu (Let's Encrypt)
- [ ] Yedekleme (backup) sistemi kuruldu
- [ ] Rate limiting production değerlerine ayarlandı
- [ ] Log rotasyonu yapılandırıldı
- [ ] Health check endpoint'i eklendi (/api/health)
- [ ] Smoke testler geçiyor
```

---

## 🗓️ Özet Timeline

```
Hafta 1-2:   Aşama 1 — Temizlik & Güvenlik
Hafta 3-5:   Aşama 2 — Gerçek Zamanlı Harita
Hafta 6-8:   Aşama 3 — Sürücü Uygulaması
Hafta 9:     Aşama 4 — Ödeme Sistemi
Hafta 10:    Aşama 5 — Bildirimler
Hafta 11-16: Aşama 6 — Mobil Uygulama (paralel geliştirilebilir)
Hafta 17-19: Aşama 7 — Backend Mimarisi
Hafta 20-21: Aşama 8 — Admin Panel
Hafta 22:    Aşama 9 — Güvenlik & Performans
Hafta 23-24: Aşama 10 — Production
```

---

## 💡 Hemen Başlanacaklar (Bu Hafta)

1. **`.env` dosyasını `.gitignore`'a ekle** ve yeni bir JWT secret oluştur
2. **Admin e-postalarını** koddan veritabanına taşı
3. **Klasör yapısını** routes/controllers/services olarak yeniden düzenle
4. **WebSocket (Socket.io)** kurulumunu yap, temel sürücü konum akışını bağla
5. **PostgreSQL**'e geçiş için Prisma schema dosyasını yaz

---

*Proje Adı: NexRide | Yazar: Ege Hayzaran | Analiz Tarihi: Mayıs 2026*
