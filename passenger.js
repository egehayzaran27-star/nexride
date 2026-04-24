const mongoose = require('mongoose')

const PassengerSchema = new mongoose.Schema({
    name: String,
    location: String,
    state: {
        type: String,
        default: "Bekliyor"
    },
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    }]
})

PassengerSchema.methods.book = function(driver, origin, destination) {
    const Booking = mongoose.model('Booking')
    const booking = new Booking({
        driver: driver._id,
        passenger: this._id,
        origin,
        destination
    })
    this.bookings.push(booking)
    return booking
}

module.exports = mongoose.model('Passenger', PassengerSchema)