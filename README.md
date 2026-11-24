# Değerlendirici

Ders belgelerini bir araya getirip her ders için ayrı bir ZIP dosyası hazırlayan, Türkçe ve tarayıcıda çalışan bir araç. **[Uygulamayı aç](https://tunabirgun.github.io/degerlendirici/)**

## Kullanım

1. **Yeni ders** ile ders bilgilerini girin. Birden çok ders açabilir ve dersler arasında geçebilirsiniz.
2. Belge listesindeki ilgili bölümü açıp dosyaları seçin. İzlence, devam çizelgesi, not istatistikleri, faaliyet ve not tablosu, rapor, cevap anahtarları ve öğrenci faaliyet örnekleri için ayrı bölümler bulunur.
3. Not tablonuz hazırsa dosya olarak ekleyin. Yeni bir Excel çıktısı almak için **Excel’den soru puanlarını yapıştır** alanına başlık satırıyla birlikte hücreleri yapıştırıp kaydedin. İlk iki sütun öğrenci numarası ve adıdır; sonraki her sütun bir sorudur. Katılmayan öğrenci için her soruya `G` yazın. Oluşturulan XLSX'te toplam puan ile soru ve sınav ortalamaları formüllüdür. G satırları ortalamaya girmez.
4. Raporu dosya olarak ekleyebilir veya **Raporu burada yaz** ile kaydedebilirsiniz. **Paketi İndir**, adı ders adını taşıyan bir ZIP üretir. Pakette DOCX kapak, işaretli belge listesi, yüklediğiniz dosyalar ve oluşturduğunuz not tablosu veya rapor bulunur. Eksik bölümler varken de indirebilirsiniz.

## Sekiz belge bölümü

[Bağımsız sürüm](https://tunabirgun.github.io/degerlendirici/) belgeleri düzenlemek ve ZIP hazırlamak içindir. [Tam sürüm](https://tunabirgun.com/degerlendirici) ayrıca izlence ve yoklama okuma, sınav yönetimi, öğrenme çıktısı (ÖÇ) eşleştirme ve istatistik üretme işlevlerini içerir. Her iki araç da yüklenen ders belgelerini tarayıcıda işler. OBS ile çalışırken öğretim elemanı, OBS’den indirdiği dosyayı seçer.

### 1. Dosya Kapağı ve Belgeler Listesi

- **Bağımsız sürüm:** Ders adı, kodu, öğretim elemanı, akademik yıl ve dönemi kullanarak ZIP içinde bir Word kapağı oluşturur. Kapakta sekiz bölüm sıralanır. Eklenen dosyalar ve araçta kaydedilen not tablosu veya rapor için ilgili kutu işaretlenir. Ekrandaki hazır bölüm sayısı paketlenebilen içeriği gösterir; belgelerin akademik doğruluğunu öğretim elemanı kontrol eder.
- **Tam sürüm:** Öğretim elemanının unvanını, adlarını ve soyadlarını ayrı işler; kapakta soyadlarını büyük harfle yazar. Kapak şablonunda öğrenci faaliyeti türleri seçilebilir ve “Diğer” için açıklama yazılabilir. Kapak PDF veya Word olarak indirilebilir.

### 2. Ders İzlencesi

- **Bağımsız sürüm:** Yüklenen izlenceyi ilgili klasöre ekler. Taranmış PDF de yüklenebilir. Ders bilgilerini kullanıcı girer.
- **Tam sürüm:** Yeni ders açarken veya mevcut derste izlence seçilebilir. DOCX dosyalarında metni, tabloları ve numaralı listeleri okur. Metin içeren PDF ve TXT dosyalarından yazıyı doğrudan alır. Taranmış sayfa ve görüntülerde tarayıcıda çalışan Türkçe OCR kullanır. Bulabildiği ders adını, kodunu, akademik yılı, dönemi ve sorumlu öğretim elemanını forma aktarır.
- **Öğrenme çıktıları:** Tam sürüm numaralı ana ÖÇ’leri ayıklar, “a”, “b” gibi alt maddeleri dışarıda bırakmaya çalışır. Öğretim elemanı sonuçları gözden geçirir; her çıktının numarasını ve metnini ayrı ayrı düzeltebilir veya yeni çıktı ekleyebilir. Taramanın kalitesi ve belgenin düzeni tanımayı etkiler.

### 3. Öğrenci Devam Çizelgesi

- **Bağımsız sürüm:** OBS’den alınan çizelgeyi özgün biçiminde saklar ve paketler. Yoklama dosyasından öğrenci listesi çıkarmaz.
- **Tam sürüm:** OBS ders veya sınav yoklamasından öğrenci numarası ve ad-soyad okuyabilir. XLS, XLSX, CSV, PDF ve taranmış PNG, JPG veya WebP desteklenir. Taramalarda OCR kullanılır. Okunan liste aktarım öncesinde gösterilir; aynı numara için farklı adlar varsa kullanıcı doğru kaydı seçebilir. Liste yeni sınavlara temel olur. İstenirse mevcut sınavlara eksik öğrenciler eklenir ve girilmiş puanlar korunur.

### 4. Dönem Sonu Harf Notları ve İstatistikler

- **Bağımsız sürüm:** Harf notu dökümünü, OBS istatistiklerini ve hazır grafikleri bu bölüme dosya olarak ekler.
- **Tam sürüm:** Uygun OBS harf notu PDF’sinden dağılımı okur ve onaya sunar. Not tablosundaki harfleri veya sayısal dönem sonu puanları için seçili baremi kullanabilir. Sınav ağırlıkları toplamı %100 olduğunda ve gerekli puanlar tam olduğunda ağırlıklı sonuç hesaplayabilir. Varsayılan eşikler düzenlenebilir. Harf başına öğrenci sayısını ve yüzdesini gösterir; sütun ve pasta grafiklerini oluşturur. Grafikler rapora ve ZIP’e eklenebilir.

### 5. Faaliyet ve Not Tablosu

- **Bağımsız sürüm:** Hazır not dosyalarını ekler veya Excel’den başlıklarla yapıştırılan verilerle ders başına bir XLSX üretir. İlk iki sütun öğrenci numarası ve ad-soyad, kalan sütunlar soru puanlarıdır. Her öğrenci için toplam, her soru için ortalama ve sınavın genel ortalaması Excel formülleriyle hesaplanır. Bütün sorularına G yazılan öğrenci ortalamalardan çıkarılır; sıfır puan ortalamaya dahil edilir.
- **Tam sürüm:** Vize, final, mazeret, bütünleme ve diğer faaliyetler ayrı sayfalarda tanımlanabilir. Soru sayısı, azami puan, sınav ağırlığı ve soruların hangi ÖÇ’leri ölçtüğü düzenlenebilir. Mazeret ve bütünleme dahil, hangi sınavların rapor istatistiklerine gireceğini hoca seçer. Öğrenciler katılmadı olarak işaretlenebilir. XLS/XLSX/CSV içe aktarımı, hücrelere toplu yapıştırma, boş Excel şablonu, Excel ve CSV dışa aktarımı sunulur.

### 6. Ders Değerlendirme Raporu

- **Bağımsız sürüm:** Hazır raporu dosya olarak alır. Alternatif olarak kullanıcının yazıp kaydettiği değerlendirmeyi ders bilgileriyle birlikte Word raporuna dönüştürür.
- **Tam sürüm:** Öğretim elemanı giriş ve değerlendirme ölçütlerini, değerlendirme metnini ve başarıyı artırmak için yapılacak işlemleri yazar. Yazarken ana ÖÇ listesini, soru–ÖÇ eşleştirmelerini, soru başına azami ve ortalama puanları, sınav ortalamasını ve harf dağılımını inceleyebilir. Word çıktısında rapora dahil edilen sınavların tabloları, mevcutsa dağılım grafikleri, öğrenme çıktıları ve imza alanı bulunur. Uzun soru tabloları sayfa genişliğine göre bölünür. Yorum ve önerilerin yazarı öğretim elemanıdır.

### 7. Cevap Anahtarları

- **Bağımsız sürüm:** Bir veya birden fazla cevap anahtarı yüklenebilir. ZIP’te ilgili klasörde, sıra numarası ve dosya adıyla bulunurlar.
- **Tam sürüm:** Her dosya bir sınava, istenirse bir veya birkaç soruya bağlanabilir. Soru seçimi boş bırakılırsa anahtar tüm sınava ait kabul edilir. Önerilen paket adı yükleme sırasında gösterilir; örneğin “Final Sınavı Cevap Anahtarı.pdf”.

### 8. Öğrenci Faaliyet Örnekleri

- **Bağımsız sürüm:** Öğretim elemanının seçtiği sınav kâğıtlarını, ödevleri, sunumları ve diğer örnekleri bu bölümde toplar. Yüklenen dosya içeriği korunur.
- **Tam sürüm:** Örnekler sınava veya faaliyete ve “Yetersiz”, “Orta”, “İyi” düzeylerinden birine göre sınıflandırılır. Dosyalar sınav ve düzey bilgisiyle adlandırılır. PDF, JPG, PNG ve WebP örneklerinin pakete giren kopyalarına damga eklenir. Örneğin “Vize - İyi - 2/4” ilgili örneğin dört sayfasından ikincisini gösterir. Sayaç her dosyada yeniden başlar. Hangi öğrenci çalışmasının örnek olacağını öğretim elemanı seçer.

## Veriler nerede?

Dosyalar ve ders bilgileri tarayıcının IndexedDB alanında, kullandığınız cihaz ve tarayıcı profiline bağlı olarak saklanır. Uygulama bunları bir sunucuya göndermez. Tarayıcı verilerini temizlemek kayıtları siler. Belgelerinizi korumak için ZIP çıktısını ayrıca saklayın.

## Yerel çalıştırma

Node.js 24 ile proje klasöründe `npm ci` ve ardından `npm run dev` çalıştırın. Terminalde gösterilen yerel adresi açın. Statik yayını oluşturmak için `npm run build` komutunu kullanın. GitHub Pages dağıtımı main dalındaki iş akışıyla yapılır.
