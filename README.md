# Değerlendirici

Değerlendirici, öğretim elemanlarının her ders için belgeleri toplamasını, sınav puanlarını incelemesini ve ders değerlendirme dosyasını ZIP olarak indirmesini sağlar. Öğrenci bilgileri ve yüklenen belgeler tarayıcıda işlenir. [Uygulamayı aç](https://tunabirgun.github.io/degerlendirici/)

## İlk ders dosyanızı hazırlayın

1. **Yeni ders** ile başlayın. Ders bilgilerini kendiniz girebilir veya izlenceden okutabilirsiniz. Kaydetmeden önce tanınan bilgileri ve öğrenme çıktılarını kontrol edin.
2. **Not tablosu** ekranında OBS yoklamasından öğrenci listesini yükleyin. Bir sınav tanımlayıp soru puanlarını girin veya mevcut puan tablosunu içe aktarın.
3. **Belge Listesi** üzerinden cevap anahtarlarını ve öğrenci çalışmalarını ilgili sınava bağlayın. Raporu yazarken soru ve sınav ortalamaları ile öğrenme çıktısı eşleştirmelerinden yararlanın.
4. **Paket durumu** üzerinden eksikleri gözden geçirin. **Paketi İndir** seçili derse ait belgeleri tek bir ZIP içinde toplar. Eksik bölümler varken de paket alabilirsiniz.

## Dosyanın sekiz bölümü

### 1. Dosya Kapağı ve Belgeler Listesi

Öğretim elemanının unvanını, adlarını ve soyadlarını ayrı işler. kapakta soyadlarını büyük harfle yazar. Kapak şablonunda öğrenci faaliyeti türleri seçilebilir ve “Diğer” için açıklama yazılabilir. Kapak PDF veya Word olarak indirilebilir.

### 2. Ders İzlencesi

Yeni ders açarken veya mevcut derste izlence seçilebilir. DOCX dosyalarında metni, tabloları ve numaralı listeleri okur. Metin içeren PDF ve TXT dosyalarından yazıyı doğrudan alır. Taranmış sayfa ve görüntülerde tarayıcıda çalışan Türkçe OCR kullanır. Bulabildiği ders adını, kodunu, akademik yılı, dönemi ve sorumlu öğretim elemanını forma aktarır.

**Öğrenme çıktıları.** Araç numaralı ana ÖÇ’leri ayıklar, “a”, “b” gibi alt maddeleri dışarıda bırakmaya çalışır. Öğretim elemanı sonuçları gözden geçirir. her çıktının numarasını ve metnini ayrı ayrı düzeltebilir veya yeni çıktı ekleyebilir. Taramanın kalitesi ve belgenin düzeni tanımayı etkiler.

### 3. Öğrenci Devam Çizelgesi

OBS ders veya sınav yoklamasından öğrenci numarası ve ad-soyad okuyabilir. XLS, XLSX, CSV, PDF ve taranmış PNG, JPG veya WebP desteklenir. Taramalarda OCR kullanılır. Okunan liste aktarım öncesinde gösterilir. aynı numara için farklı adlar varsa kullanıcı doğru kaydı seçebilir. Liste yeni sınavlara temel olur. İstenirse mevcut sınavlara eksik öğrenciler eklenir ve girilmiş puanlar korunur.

### 4. Dönem Sonu Harf Notları ve İstatistikler

Uygun OBS harf notu PDF’sinden dağılımı okur ve onaya sunar. Not tablosundaki harfleri veya sayısal dönem sonu puanları için seçili baremi kullanabilir. Sınav ağırlıkları toplamı %100 olduğunda ve gerekli puanlar tam olduğunda ağırlıklı sonuç hesaplayabilir. Varsayılan eşikler düzenlenebilir. Harf başına öğrenci sayısını ve yüzdesini gösterir. sütun ve pasta grafiklerini oluşturur. Grafikler rapora ve ZIP’e eklenebilir.

### 5. Faaliyet ve Not Tablosu

Vize, final, mazeret, bütünleme ve diğer faaliyetler ayrı sayfalarda tanımlanabilir. Soru sayısı, azami puan, sınav ağırlığı ve soruların hangi ÖÇ’leri ölçtüğü düzenlenebilir. Mazeret ve bütünleme dahil, hangi sınavların rapor istatistiklerine gireceğini hoca seçer. Öğrenciler katılmadı olarak işaretlenebilir. XLS/XLSX/CSV içe aktarımı, hücrelere toplu yapıştırma, boş Excel şablonu, Excel ve CSV dışa aktarımı sunulur.

### 6. Ders Değerlendirme Raporu

Öğretim elemanı giriş ve değerlendirme ölçütlerini, değerlendirme metnini ve başarıyı artırmak için yapılacak işlemleri yazar. Yazarken ana ÖÇ listesini, soru–ÖÇ eşleştirmelerini, soru başına azami ve ortalama puanları, sınav ortalamasını ve harf dağılımını inceleyebilir. Word çıktısında rapora dahil edilen sınavların tabloları, mevcutsa dağılım grafikleri, öğrenme çıktıları ve imza alanı bulunur. Uzun soru tabloları sayfa genişliğine göre bölünür. Yorum ve önerilerin yazarı öğretim elemanıdır.

### 7. Cevap Anahtarları

Her dosya bir sınava, istenirse bir veya birkaç soruya bağlanabilir. Soru seçimi boş bırakılırsa anahtar tüm sınava ait kabul edilir. Önerilen paket adı yükleme sırasında gösterilir. örneğin “Final Sınavı Cevap Anahtarı.pdf”.

### 8. Öğrenci Faaliyet Örnekleri

Örnekler sınava veya faaliyete ve “Yetersiz”, “Orta”, “İyi” düzeylerinden birine göre sınıflandırılır. Dosyalar sınav ve düzey bilgisiyle adlandırılır. PDF, JPG, PNG ve WebP örneklerinin pakete giren kopyalarına damga eklenir. Örneğin “Vize - İyi - 2/4” ilgili örneğin dört sayfasından ikincisini gösterir. Sayaç her dosyada yeniden başlar. Hangi öğrenci çalışmasının örnek olacağını öğretim elemanı seçer.

## Kayıtlar ve gizlilik

Dersler, puanlar ve belgeler cihazdaki tarayıcı profilinde IndexedDB ile saklanır. OCR ve belge üretimi aynı cihazda çalışır. Tarayıcının site verilerini temizlemek kayıtları siler. Saklamak istediğiniz belgelerin ZIP çıktısını ayrıca indirin.

## Yerelde çalıştırma

Proje klasöründe Python 3 ile aşağıdaki komutu çalıştırıp [yerel uygulamayı](http://127.0.0.1:8000/degerlendirici/) açın.

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory public
```

Uygulama kodu, Türkçe OCR dosyaları ve belge şablonları `public/degerlendirici/` dizinindedir. GitHub Actions, `main` dalına gönderilen değişiklikleri GitHub Pages üzerinden yayımlar.
