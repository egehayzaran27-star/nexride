const userDb = require('../../user-db');

class UserRepository {
    /**
     * ID ile kullanıcı getirir
     */
    findById(id) {
        return userDb.getUserById(id);
    }

    /**
     * E-posta ile kullanıcı getirir
     */
    findByEmail(email) {
        return userDb.getUserByEmail(email);
    }

    /**
     * Yeni kullanıcı oluşturur
     */
    create(userData) {
        return userDb.registerUser(userData);
    }

    /**
     * Kullanıcı bilgilerini günceller
     */
    update(id, data) {
        return userDb.updateUser(id, data);
    }

    /**
     * Kullanıcı siler
     */
    delete(id) {
        return userDb.deleteUser(id);
    }

    /**
     * Tüm kullanıcıları listeler
     */
    findAll() {
        return userDb.getAllUsers();
    }

    /**
     * Arama yapar
     */
    search(query) {
        return userDb.searchUsers(query);
    }
}

module.exports = new UserRepository();
