const colors = require('colors')
const db = require('./database')
const Passenger = require('./passenger')
const Driver = require('./driver')
const Booking = require('./booking')

async function main() {
    try {
        // Veritabanı bağlantısının hazır olmasını bekleyelim
        await new Promise((resolve, reject) => {
            if (db.readyState === 1) return resolve()
            db.once('open', resolve)
            db.once('error', reject)
        })

        // Örnek veri oluşturalım (Eğer veritabanı boşsa)
        const driverCount = await Driver.countDocuments()
        if (driverCount === 0) {
            console.log(colors.yellow('Veritabanı boş, örnek veriler oluşturuluyor...'))
            
            const ege = await Driver.create({ name: "Ege", location: "Ankara" })
            const ali = await Passenger.create({ name: "Ali", location: "Istanbul" })
            
            const booking = new Booking({
                driver: ege._id,
                passenger: ali._id,
                origin: "Istanbul",
                destination: "Ankara"
            })
            await booking.save()
            
            ali.bookings.push(booking._id)
            await ali.save()
            
            console.log(colors.green('Örnek veriler başarıyla oluşturuldu.'))
        }

        // Bilgileri Veritabanından Çekelim
        const passengers = await Passenger.find().populate({
            path: 'bookings',
            populate: { path: 'driver' }
        })
        const drivers = await Driver.find()
        const bookings = await Booking.find().populate('passenger').populate('driver')

        // Bilgileri Yazdıralım
        printAllPassengers(passengers)
        printAllDrivers(drivers)
        printAllBookings(bookings)

    } catch (error) {
        console.error(colors.red('Bir hata oluştu:'), error)
    } finally {
        // Watch modunda olduğumuz için bağlantıyı kapatmıyoruz
    }
}

function printAllPassengers(passengers) {
    console.log(colors.cyan('\n=== TÜM YOLCULAR ==='))
    passengers.forEach(passenger => {
        console.log(colors.blue(`Yolcu: ${passenger.name}`))
        console.log(colors.blue(`  Konum: ${passenger.location}`))
        console.log(colors.blue(`  Rezervasyon Sayısı: ${passenger.bookings ? passenger.bookings.length : 0}`))
    })
}

function printAllDrivers(drivers) {
    console.log(colors.cyan('\n=== TÜM ŞOFÖRLER ==='))
    drivers.forEach(driver => {
        console.log(colors.yellow(`Şoför: ${driver.name}`))
        console.log(colors.yellow(`  Konum: ${driver.location}`))
        console.log(colors.yellow(`  Durum: ${driver.state}`))
    })
}

function printAllBookings(bookings) {
    console.log(colors.magenta('\n=== TÜM REZERVASYONLAR ==='))
    if (bookings.length === 0) {
        console.log(colors.white('  Henüz rezervasyon bulunmuyor.'))
    }
    bookings.forEach((booking, index) => {
        const passengerName = booking.passenger ? booking.passenger.name : 'Bilinmeyen'
        const driverName = booking.driver ? booking.driver.name : 'Bilinmeyen'
        console.log(colors.magenta(`  ${index + 1}. ${passengerName} -> ${driverName}: ${booking.origin} → ${booking.destination}`))
    })
}

main()