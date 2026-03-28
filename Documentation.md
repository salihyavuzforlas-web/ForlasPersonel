
# FORLAS Masraf Takip Modülü - Teknik Taslak

## 1. Firestore Koleksiyon Şemaları

### `users` Koleksiyonu
Her kullanıcının temel profil ve rol bilgilerini tutar.
- `uid`: string (Document ID)
- `email`: string
- `displayName`: string
- `role`: string ("PERSONEL" | "FINANS_MUDURU")
- `createdAt`: timestamp

### `expenses` Koleksiyonu
Tüm masraf kayıtlarının ana deposu.
- `amount`: number
- `currency`: string (default: "TRY")
- `category`: string
- `description`: string
- `expenseDate`: timestamp
- `monthKey`: string ("YYYY-MM" formatında, sorgu performansı için)
- `userId`: string
- `userName`: string
- `status`: string ("DRAFT", "SUBMITTED", "APPROVED", "REJECTED")
- `rejectionReason`: string (opsiyonel)
- `createdAt`: timestamp
- `updatedAt`: timestamp

---

## 2. Firestore Security Rules (Taslak)

```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() { return request.auth != null; }
    function getUserRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == userId;
    }

    match /expenses/{expenseId} {
      allow read: if isSignedIn() && (
        resource.data.userId == request.auth.uid || 
        getUserRole() == "FINANS_MUDURU"
      );
      
      allow create: if isSignedIn();

      allow update, delete: if isSignedIn() && (
        // Personel: Sadece kendi masrafını, onaylanmamışsa silebilir/düzenleyebilir
        (resource.data.userId == request.auth.uid && resource.data.status != "APPROVED") ||
        // Finans Müdürü: HER KOŞULDA düzenleyebilir ve silebilir
        (getUserRole() == "FINANS_MUDURU")
      );
    }
  }
}
```
