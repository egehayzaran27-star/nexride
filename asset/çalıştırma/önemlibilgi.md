Mongoose verilerini terminalden çalıştırmak ve kayıtları görmek için projenizde halihazırda bulunan fetch-records.js dosyasını kullanabiliriz.

Ancak, yaptığım kontrollerde projenizin şu anda SQLite kullandığını ve arka planda bir MongoDB servisinin çalışmadığını gördüm. Mongoose ile verileri çekebilmek için MongoDB'nin çalışıyor olması gerekir.

1. Terminalden Mongoose Verilerini Görme
Eğer MongoDB'niz yerelde (localhost) çalışıyorsa, şu komutla verileri terminale yazdırabilirsiniz:

powershell
# PowerShell üzerinden (Bağlantı adresini yerel yaparak)
$env:MONGO_URI="mongodb://localhost:27017/taxi-app"; node fetch-records.js
2. fetch-records.js Ne Yapıyor?
Bu dosya projenizdeki Passenger, Driver ve Booking modellerini kullanarak şunları yapar:

Veritabanına bağlanır.
Eğer veritabanı boşsa örnek veriler (Ege, Ali vb.) oluşturur.
Tüm yolcuları, şoförleri ve rezervasyonları renkli bir şekilde terminale listeler.
3. MongoDB'yi Başlatma (Docker ile)
Eğer MongoDB kurulu değilse, docker-compose.yml dosyanıza MongoDB ekleyebilirim. Şu anki docker-compose.yml dosyanızda sadece uygulama servisi bulunuyor.

Eğer Mongoose kullanmaya devam etmek istiyorsanız, MongoDB'yi Docker'a eklememi ister misiniz?

Şu anki SQLite verilerini görmek isterseniz de şu komutu kullanabilirsiniz:

powershell
node test-database.js

...............................................................

Artık Mongoose verilerini terminalden görebilmek için şu adımları takip edebilirsiniz:

1. MongoDB'yi Başlatın
Terminalden şu komutu çalıştırarak MongoDB ve uygulamayı Docker üzerinde ayağa kaldırın:

powershell
docker-compose up -d
2. Verileri Terminalden Çalıştırın
Konteynerlar çalıştıktan sonra, Mongoose verilerini terminale yazdırmak için şu komutu kullanın:

powershell
docker-compose exec app node fetch-records.js
Bu komut:

Docker içindeki app konteynerına bağlanır.
fetch-records.js dosyasını çalıştırır.
Veritabanı boşsa örnek verileri oluşturur ve hepsini terminale listeler.
Yaptığım Değişiklikler:

mongodb servisi eklendi (resmi mongo:latest imajı kullanıldı).
Verilerin kaybolmaması için mongo_data volume yapısı kuruldu.
Uygulamanın MongoDB'ye erişebilmesi için MONGO_URI çevre değişkeni tanımlandı.
1
docker-compose.yml
mongo-connection.js diye yeni bir file oluştur
mongo-connection.js dosyası oluşturuldu. MongoDB bağlantı mantığını bu dosyaya taşıyabilirsiniz.

Dosya içeriği:

javascript
const mongoose = require('mongoose')
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/taxi-app'
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB bağlantısı başarılı.'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err))
module.exports = mongoose.connection
Diğer dosyalarda (örneğin fetch-records.js) bu bağlantıyı kullanmak isterseniz require('./database') yerine require('./mongo-connection') şeklinde güncelleyebilirsiniz.

...............................................................

mongo-connection.js dosyası oluşturuldu. MongoDB bağlantı mantığını bu dosyaya taşıyabilirsiniz.

Dosya içeriği:

javascript
const mongoose = require('mongoose')
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/taxi-app'
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB bağlantısı başarılı.'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err))
module.exports = mongoose.connection
Diğer dosyalarda (örneğin fetch-records.js) bu bağlantıyı kullanmak isterseniz require('./database') yerine require('./mongo-connection') şeklinde güncelleyebilirsiniz.

...............................................................

MongoDB verilerinizi bir masaüstü panelinden (GUI) izlemek için en iyi yöntem MongoDB Compass kullanmaktır.

Masaüstü Paneline (MongoDB Compass) Bağlanma:
Eğer bilgisayarınızda MongoDB Compass yüklü ise:

Compass'ı açın.
New Connection (Yeni Bağlantı) kısmına şu adresi yapıştırın: mongodb://localhost:27017
Connect butonuna basın.
Docker üzerinde 27017 portunu dışarıya açtığım için (ports: - "27017:27017"), Compass doğrudan Docker içindeki veritabanına bağlanabilecektir.

Alternatif: Web Üzerinden İzleme (Mongo Express)
Eğer herhangi bir uygulama indirmeden tarayıcı üzerinden bir panel görmek isterseniz, docker-compose.yml dosyanıza küçük bir ekleme yaparak Mongo Express panelini aktif edebiliriz.

Bunu yapmamı ister misiniz? Bu sayede http://localhost:8081 adresinden tüm verileri bir web arayüzü ile görebilirsiniz.

...............................................................