const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Giriş ve Kayıt (Public)
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Profil İşlemleri (Private)
router.get('/profile', authMiddleware, AuthController.getProfile);

module.exports = router;
