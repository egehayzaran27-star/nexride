const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    passenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Passenger'
    },
    origin: String,
    destination: String
})

module.exports = mongoose.model('Booking', BookingSchema)