require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

console.log('=== E-POSTA BAĞLANTI TESTİ ===');
console.log('EMAIL_USER:', EMAIL_USER);
console.log('EMAIL_PASS:', EMAIL_PASS ? `${EMAIL_PASS.substring(0, 4)}****` : 'TANIMLANMAMIŞ');

async function testEmail() {
    // Test 1: Port 465 (SSL)
    console.log('\n--- Test 1: Port 465 (SSL) ---');
    try {
        const t1 = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            connectionTimeout: 10000,
        });
        await t1.verify();
        console.log('✅ Port 465 BAĞLANTI BAŞARILI!');
        
        const info = await t1.sendMail({
            from: EMAIL_USER,
            to: EMAIL_USER,
            subject: 'NexRide Test - Port 465',
            text: 'Bu bir test e-postasıdır.'
        });
        console.log('✅ E-POSTA GÖNDERİLDİ:', info.messageId);
        return;
    } catch (err) {
        console.error('❌ Port 465 BAŞARISIZ:', err.message);
    }

    // Test 2: Port 587 (STARTTLS)
    console.log('\n--- Test 2: Port 587 (STARTTLS) ---');
    try {
        const t2 = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            connectionTimeout: 10000,
        });
        await t2.verify();
        console.log('✅ Port 587 BAĞLANTI BAŞARILI!');
        
        const info = await t2.sendMail({
            from: EMAIL_USER,
            to: EMAIL_USER,
            subject: 'NexRide Test - Port 587',
            text: 'Bu bir test e-postasıdır.'
        });
        console.log('✅ E-POSTA GÖNDERİLDİ:', info.messageId);
        return;
    } catch (err) {
        console.error('❌ Port 587 BAŞARISIZ:', err.message);
    }

    // Test 3: service: 'gmail'
    console.log('\n--- Test 3: service: gmail ---');
    try {
        const t3 = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: EMAIL_USER, pass: EMAIL_PASS },
            connectionTimeout: 10000,
        });
        await t3.verify();
        console.log('✅ service:gmail BAĞLANTI BAŞARILI!');
        
        const info = await t3.sendMail({
            from: EMAIL_USER,
            to: EMAIL_USER,
            subject: 'NexRide Test - service:gmail',
            text: 'Bu bir test e-postasıdır.'
        });
        console.log('✅ E-POSTA GÖNDERİLDİ:', info.messageId);
        return;
    } catch (err) {
        console.error('❌ service:gmail BAŞARISIZ:', err.message);
    }

    console.log('\n⛔ TÜM YÖNTEMLER BAŞARISIZ OLDU.');
    console.log('Olası sebepler:');
    console.log('1. Gmail Uygulama Şifresi geçersiz veya süresi dolmuş olabilir.');
    console.log('2. Ağınız (ISP/Firewall) SMTP portlarını engelliyor olabilir.');
    console.log('3. Gmail hesabında 2 Adımlı Doğrulama kapalı olabilir.');
    console.log('4. Uygulama şifresi yanlış hesap için oluşturulmuş olabilir.');
}

testEmail().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
