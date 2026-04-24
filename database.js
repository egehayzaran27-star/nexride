const mongoose = require('mongoose')

// Docker ortamında 'mongodb' servis ismini kullanıyoruz. 
// Yerelde çalıştırmak isterseniz localhost kullanabilirsiniz.
const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/taxi-app'

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB bağlantısı başarılı.'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err))

module.exports = mongoose.connection