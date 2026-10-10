# Air Parts Shop (HTML/CSS/JavaScript + Firebase)

ໂຄງຮ່າງເວັບສຳລັບລາຍການອາໄຫຼ່:
- `index.html` ໜ້າຮ້ານສາທາລະນະ: ຄົ້ນຫາດ້ວຍຊື່/ລະຫັດ/ໝວດໝູ່ ແລະ ສະແດງລາຄາ, ສະຕັອກ ແລະ ບ່ອນຈັດເກັບ
- `admin.html` ໜ້າເຈົ້າຂອງຮ້ານ: ເຂົ້າລະບົບ, ເພີ່ມ/ແກ້ໄຂ/ລຶບສິນຄ້າ ແລະ ອັບໂຫຼດຮູບ
- `css/style.css` ຮູບແບບໜ້າເວັບ
- `js/firebase.js` ຕັ້ງຄ່າເຊື່ອມຕໍ່ Firebase
- `js/catalog.js` ອ່ານ ແລະ ສະແດງສິນຄ້າຈາກ Realtime Database
- `js/admin.js` ເຂົ້າລະບົບ ແລະ ຈັດການຂໍ້ມູນສິນຄ້າ
- `js/image-search.js` ຄົ້ນຫາຮູບພາບເບື້ອງຕົ້ນດ້ວຍການປຽບທຽບ histogram ສີ ບໍ່ແມ່ນ AI ຈຳແນກຮຸ່ນອາໄຫຼ່

## 1. ເປີດໄຟລ໌ຜ່ານ web server
ຢ່າເປີດ `index.html` ດ້ວຍການດັບເບິລຄລິກໃຫ້ເປັນ `file://` ເພາະ browser module ອາດເຮັດວຽກບໍ່ໄດ້. ໃຫ້ໃຊ້ VS Code extension ເຊັ່ນ Live Server ຫຼື deploy ຜ່ານ Firebase Hosting/GitHub Pages.

## 2. ກວດສອບ Firebase
ໄຟລ໌ `js/firebase.js` ມີຄ່າ firebaseConfig ທີ່ທ່ານໃຫ້ມາແລ້ວ. ໂປຣເຈັກຕ້ອງເປີດໃຊ້:
1. Realtime Database
2. Authentication > Sign-in method > Email/Password
3. Storage

## 3. ສ້າງບັນຊີເຈົ້າຂອງຮ້ານ
Firebase Console > Authentication > Users > Add user. ສ້າງອີເມວ ແລະ ລະຫັດຜ່ານເຈົ້າຂອງຮ້ານ ແລ້ວບັນທຶກ UID ຂອງບັນຊີນີ້ໄວ້.

## 4. ຕັ້ງ Realtime Database Rules
ໄປທີ່ Realtime Database > Rules ແລ້ວແທນ `PUT_OWNER_UID_HERE` ດ້ວຍ UID ຈິງຂອງເຈົ້າຂອງຮ້ານກ່ອນກົດ Publish:

```json
{
  "rules": {
    "products": {
      ".read": true,
      "$productId": {
        ".write": "auth != null && auth.uid === 'PUT_OWNER_UID_HERE'"
      }
    }
  }
}
```

ກົດນີ້ອະນຸຍາດໃຫ້ທຸກຄົນອ່ານສະເພາະຂໍ້ມູນໃນ `/products` ແຕ່ມີພຽງ UID ຂອງເຈົ້າຂອງຮ້ານທີ່ຂຽນໄດ້. ຂໍ້ມູນສ່ວນອື່ນນອກ `/products` ຈະບໍ່ເປີດອ່ານ/ຂຽນດ້ວຍກົດນີ້.

## 5. ຕັ້ງ Storage Rules
ໄປທີ່ Storage > Rules ແລ້ວໃຊ້ກົດຕໍ່ໄປນີ້ ໂດຍແທນ UID ໃຫ້ກົງກັບເຈົ້າຂອງຮ້ານ:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{productId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == 'PUT_OWNER_UID_HERE'
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

ໝາຍເຫດ: ຮູບສິນຄ້າສາມາດອ່ານໄດ້ສາທາລະນະຕາມທີ່ໜ້າຮ້ານຕ້ອງການ ຫ້າມຕັ້ງ `allow write: if true;`.

## 6. ທົດສອບ
- ເປີດ `index.html` ຜ່ານ Live Server: ຖ້າຍັງບໍ່ມີສິນຄ້າ ໜ້າຮ້ານຈະສະແດງວ່າບໍ່ພົບສິນຄ້າ
- ເປີດ `admin.html` ແລ້ວເຂົ້າລະບົບດ້ວຍບັນຊີເຈົ້າຂອງຮ້ານ
- ເພີ່ມສິນຄ້າທົດລອງ 1 ລາຍການ ແລະ ຮູບພາບ
- ກັບໄປໜ້າ `index.html` ເພື່ອກວດວ່າຂໍ້ມູນສະແດງຫຼືບໍ່
- ລອງອອກຈາກລະບົບ ແລະ ເປີດ `admin.html` ອີກຄັ້ງ ຄວນບໍ່ເຫັນແບບຟອມຈັດການສິນຄ້າ

## ຂໍ້ຄວນຮູ້
- ຢ່າສົ່ງລະຫັດຜ່ານ ຫຼື service account private key ໃຫ້ຜູ້ອື່ນ
- `firebaseConfig` ແມ່ນຄ່າລະບຸໂປຣເຈັກສຳລັບເວັບ ບໍ່ແມ່ນລະຫັດຜ່ານ ແຕ່ຕ້ອງຕັ້ງ Rules ແລະ Authentication ໃຫ້ຖືກຕ້ອງ
- ຫ້າມເປີດ Database/Storage ໃຫ້ທຸກຄົນຂຽນຂໍ້ມູນໄດ້
- ການຄົ້ນຫາຮູບພາບໃນລຸ້ນນີ້ເປັນພຽງຕົວຊ່ວຍຈັດອັນດັບຈາກສີ/ລັກສະນະໂດຍລວມ ອາໄຫຼ່ທີ່ຄ້າຍກັນຫຼາຍອາດຈະຈັບຄູ່ຜິດ. ຄວນເພີ່ມ ແລະ ທົດສອບ AI ຄົ້ນຫາຮູບແບບ CLIP ໃນຂັ້ນຕໍ່ໄປ
- ຕົວຢ່າງນີ້ເກັບລາຄາເປັນຕົວເລກໂດຍຍັງບໍ່ກຳນົດສະກຸນເງິນ ຄວນເລືອກສະກຸນເງິນ ແລະ ຮູບແບບລາຄາຂອງຮ້ານກ່ອນເປີດໃຊ້ຈິງ
