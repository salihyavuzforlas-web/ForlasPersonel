# Firebase Kurulum ve Yapılandırma

## 1. Firestore Security Rules

Firebase Console'da (https://console.firebase.google.com/project/forlas/firestore/rules) aşağıdaki Security Rules'ı güncelleyin:

**ÖNEMLİ:** Sadece aşağıdaki kodu kopyalayın (yorum satırları ve açıklamalar olmadan):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() { 
      return request.auth != null; 
    }
    
    function getUserRole() { 
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

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
        (resource.data.userId == request.auth.uid && resource.data.status != "APPROVED") ||
        (getUserRole() == "FINANS_MUDURU")
      );
    }
  }
}
```

**Adımlar:**
1. Yukarıdaki kodun tamamını seçip kopyalayın
2. Firebase Console'da Rules editörüne yapıştırın
3. Tüm eski kodun silindiğinden emin olun
4. "Publish" butonuna tıklayarak kaydedin

**Alternatif:** Proje klasöründeki `firestore.rules` dosyasını kullanabilirsiniz.

## 2. Firestore Index Oluşturma

Uygulama çalışırken konsolda görünen index hataları için:

1. Konsolda görünen linke tıklayın veya Firebase Console'a gidin:
   https://console.firebase.google.com/project/forlas/firestore/indexes

2. Hata mesajında gösterilen index'leri oluşturun. Genellikle şu index'ler gerekli olacaktır:

   **Index 1: Month Filter + Order By**
   - Collection: `expenses`
   - Fields:
     - `monthKey` (Ascending)
     - `expenseDate` (Descending)
   - Query scope: Collection

   **Index 2: Date Range Filter + Order By**
   - Collection: `expenses`
   - Fields:
     - `expenseDate` (Ascending)
     - `expenseDate` (Descending)
   - Query scope: Collection

3. Index'ler oluşturulduktan sonra birkaç dakika içinde aktif olacaktır.

## 3. Kullanıcı Rollerini Kontrol Etme

Finans Müdürü rolüne sahip kullanıcının `users` koleksiyonunda doğru rolü olduğundan emin olun:

```javascript
// Firestore'da users/{userId} dokümanında:
{
  uid: "user-id",
  email: "email@example.com",
  displayName: "Kullanıcı Adı",
  role: "FINANS_MUDURU", // veya "PERSONEL"
  createdAt: timestamp
}
```

## Sorun Giderme

### Permission Denied Hatası
- Kullanıcının `users` koleksiyonunda rol bilgisi olduğundan emin olun
- Security Rules'ın güncel olduğunu kontrol edin
- Firebase Console'da kullanıcının Authentication'da olduğunu doğrulayın

### Index Hatası
- Konsoldaki linke tıklayarak index'i oluşturun
- Index oluşturulana kadar (2-5 dakika) bekleyin
- Sayfayı yenileyin
