const WalletRepository = require('../repositories/wallet.repository');
const UserRepository = require('../repositories/user.repository');
const { sendVerificationEmail } = require('../services/email.service');

class WalletController {
    /**
     * E-posta ile doğrulama kodu gönderir
     */
    async sendEmail(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'E-posta gerekli.' });

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            WalletRepository.saveCode(email, code, expiresAt);
            await sendVerificationEmail(email, code);

            res.json({ success: true, message: 'Doğrulama kodu e-postanıza gönderildi.' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Bakiye yükleme (Doğrulama kodu ile)
     */
    async deposit(req, res, next) {
        try {
            const { userId, amount, code } = req.body;
            const user = await UserRepository.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const savedCode = WalletRepository.getCode(user.email);
            if (!savedCode || savedCode.code !== code) {
                return res.status(400).json({ error: 'Geçersiz doğrulama kodu.' });
            }

            if (new Date(savedCode.expires_at) < new Date()) {
                return res.status(400).json({ error: 'Kod süresi dolmuş.' });
            }

            const result = WalletRepository.addBalance(userId, amount);
            if (result.success) {
                WalletRepository.deleteCode(user.email);
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Yolculuk ödemesi
     */
    async pay(req, res, next) {
        try {
            const { userId, bookingId, method, code } = req.body;

            if (method === 'Wallet') {
                const user = await UserRepository.findById(userId);
                const savedCode = WalletRepository.getCode(user.email);
                if (!savedCode || savedCode.code !== code) {
                    return res.status(400).json({ error: 'Geçersiz doğrulama kodu.' });
                }
                WalletRepository.deleteCode(user.email);
            }

            const result = WalletRepository.pay(userId, bookingId, method);
            if (result.success) res.json(result);
            else res.status(400).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * İşlem geçmişi
     */
    async getTransactions(req, res, next) {
        try {
            const { userId } = req.params;
            const transactions = WalletRepository.getTransactions(userId);
            res.json(transactions);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new WalletController();
