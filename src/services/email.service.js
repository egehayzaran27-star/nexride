const nodemailer = require('nodemailer');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ EMAIL_USER veya EMAIL_PASS eksik! .env dosyasını kontrol edin.');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
    debug: true, // Hataları detaylı gör
    logger: true // SMTP trafiğini logla
});


/**
 * 6 haneli doğrulama kodunu kullanıcıya e-posta ile gönderir.
 */
async function sendVerificationEmail(toEmail, code, subject = 'NexRide — Doğrulama Kodu') {
    console.log(`\n\x1b[33m%s\x1b[0m`, `🔑 DOĞRULAMA KODU (${toEmail}): ${code}`);

    const emailPromise = transporter.sendMail({
        from: `"NexRide" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        html: `<div style="padding:20px;"><h3>NexRide Doğrulama Kodu</h3><h1>${code}</h1></div>`,
    });

    try {
        await emailPromise;
        console.log(`✅ E-posta başarıyla gönderildi: ${toEmail}`);
    } catch (err) {
        console.error(`❌ E-posta hatası: ${err.message}`);
        throw err; // Hata fırlatalım ki frontend de bilsin
    }
}

/**
 * Kullanıcıya genel bildirim e-postası gönderir.
 */
async function sendNotificationEmail(toEmail, subject, htmlContent) {
    console.log(`📨 Bildirim e-postası gönderiliyor: ${toEmail}`);
    try {
        const info = await transporter.sendMail({
            from: `"NexRide" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject,
            html: htmlContent,
        });
        console.log(`✅ Bildirim gönderildi: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`❌ Bildirim gönderim hatası (${toEmail}):`, err.message);
        throw err;
    }
}

module.exports = { sendVerificationEmail, sendNotificationEmail };
