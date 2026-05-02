const UserRepository = require('../repositories/user.repository');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthController {
    /**
     * Kullanıcı Girişi
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const user = await UserRepository.findByEmail(email);

            if (!user) {
                return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
            }

            // Şifre kontrolü
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Hatalı şifre.' });
            }

            // Token oluştur (Web ve Mobil için ortak)
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'gizli-anahtar',
                { expiresIn: '24h' }
            );

            // Hassas verileri çıkar
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                token,
                user: userWithoutPassword
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Yeni Kullanıcı Kaydı
     */
    async register(req, res, next) {
        try {
            const { email, password, firstName, lastName, tcNo, role = 'user' } = req.body;

            // E-posta kontrolü
            const existing = await UserRepository.findByEmail(email);
            if (existing) {
                return res.status(400).json({ error: 'Bu e-posta zaten kullanımda.' });
            }

            // Şifre hashleme
            const hashedPassword = await bcrypt.hash(password, 10);

            // Kaydet
            const result = UserRepository.create({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                tcNo,
                role
            });

            if (result.success) {
                res.status(201).json({ success: true, message: 'Kayıt başarılı.' });
            } else {
                res.status(400).json({ success: false, error: 'Kayıt yapılamadı.' });
            }
        } catch (err) {
            next(err);
        }
    }

    /**
     * Profil Bilgilerini Getir
     */
    async getProfile(req, res, next) {
        try {
            const user = await UserRepository.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
            
            const { password, ...safeUser } = user;
            res.json(safeUser);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();
