const mongoose = require('mongoose')

const DriverSchema = new mongoose.Schema({
    name: String,
    location: String,
    state: {
        type: String,
        default: "Hazır"
    }
})

DriverSchema.methods.startDrive = function(destination) {
    this.state = "Sürüş başladı"
    console.log(`${this.name} ${this.state} to ${destination}`)
}

DriverSchema.methods.pickUp = function(passenger) {
    console.log(`${this.name} picked up ${passenger.name}`)
}

module.exports = mongoose.model('Driver', DriverSchema)