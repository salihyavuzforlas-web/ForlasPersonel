# Forlas Masraf Takip Sistemi

React + TypeScript + Supabase ile geliştirilmiş masraf takip uygulaması.

## Geliştirme Ortamı (Development)

**Gereksinimler:** Node.js 18+

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Uygulamayı çalıştırın:
   ```bash
   npm run dev
   ```

3. Tarayıcıda `http://localhost:3000` adresini açın.

## Production Build (Sunucuya Yükleme)

**ÖNEMLİ:** Sunucuya yüklemeden önce mutlaka build yapmalısınız!

1. Production build oluşturun:
   ```bash
   npm run build
   ```

2. Build işlemi tamamlandıktan sonra `dist` klasöründeki **TÜM DOSYALARI** sunucunuza yükleyin.

3. Sunucuda `dist` klasöründeki dosyaların root dizinde (public_html veya www) olması gerekiyor.

4. `index.html` dosyasının doğru yerde olduğundan emin olun.

### Natro Sunucuya Yükleme Adımları:

1. Terminal'de proje klasörüne gidin
2. `npm run build` komutunu çalıştırın
3. `dist` klasörü oluşacak
4. FileZilla veya cPanel File Manager ile `dist` klasöründeki **TÜM DOSYALARI** (index.html dahil) sunucunuzun public_html klasörüne yükleyin
5. Tarayıcıda sitenizi açın

**Not:** Eğer beyaz ekran görüyorsanız, muhtemelen build yapmadan dosyaları yüklemişsinizdir. Lütfen yukarıdaki adımları tekrar takip edin.

## Supabase Yapılandırması

Uygulama çalıştırmadan önce `.env.local` dosyanıza aşağıdaki alanları ekleyin:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Ek olarak Supabase Dashboard ayarlarını kontrol edin:

1. `Authentication > Providers > Email` aktif olmalı.
2. `Enable Email Provider` açık olmalı.
3. Kayıt alacaksanız `Enable email signup` açık olmalı.
