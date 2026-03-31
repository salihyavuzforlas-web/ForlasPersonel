# Firebase Firestore -> Supabase Migration

## 1) Supabase tablolarini olustur

Supabase SQL Editor'da `supabase/schema.sql` dosyasini calistir.

## 2) Migration env dosyasi hazirla

Proje kok dizininde `.env.migration.local` olustur ve asagidaki degerleri doldur:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FIREBASE_AUTH_EMAIL=...
FIREBASE_AUTH_PASSWORD=...
```

Not:
- `FIREBASE_AUTH_EMAIL/PASSWORD` kullanicisi Firestore koleksiyonlarini okuyabilmeli.
- En pratik secenek `FINANS_MUDURU` rolu ile giris yapan bir kullanici.

## 3) Migration komutunu calistir

```bash
set -a && source ".env.migration.local" && set +a && npm run migrate:firebase-to-supabase
```

Script su koleksiyonlari tasir:
- `users` -> `users`
- `expenses` -> `expenses`
- `routePlans` -> `route_plans`
- `meetingNotes` -> `meeting_notes`
- `promotionsCampaigns` -> `promotions_campaigns`

Upsert yapildigi icin tekrar calistirmak guvenlidir (`id` bazli).

## 4) Kontrol sorgulari

```sql
select count(*) from public.users;
select count(*) from public.expenses;
select count(*) from public.route_plans;
select count(*) from public.meeting_notes;
select count(*) from public.promotions_campaigns;
```

## Onemli guvenlik notu

- `SUPABASE_SERVICE_ROLE_KEY` sadece backend/migration icin kullanilmalidir.
- Frontend tarafinda sadece anon key kullanin.
