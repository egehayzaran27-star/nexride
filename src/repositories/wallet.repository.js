const userDb = require('../../user-db');

class WalletRepository {
    getBalance(userId) {
        return userDb.getUserBalance(userId);
    }

    addBalance(userId, amount) {
        return userDb.addBalance(userId, amount);
    }

    transfer(fromUserId, toEmail, amount) {
        return userDb.transferMoney(fromUserId, toEmail, amount);
    }

    getTransactions(userId) {
        return userDb.getTransactions(userId);
    }

    pay(userId, bookingId, method) {
        return userDb.payForBooking(userId, bookingId, method);
    }

    addTip(userId, bookingId, amount) {
        return userDb.addTipToBooking(userId, bookingId, amount);
    }

    saveCode(email, code, expiresAt) {
        return userDb.addVerificationCode(email, code, expiresAt);
    }

    getCode(email) {
        return userDb.getVerificationCode(email);
    }

    deleteCode(email) {
        return userDb.deleteVerificationCode(email);
    }
}

module.exports = new WalletRepository();
