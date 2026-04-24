const colors = require('colors');
const userDb = require('./user-db');

async function runTest() {
    console.log(colors.cyan('\n=== SQLITE VERİTABANI TESTİ BAŞLIYOR ==='));

    // 1. Yeni kullanıcılar ekleyelim
    console.log(colors.yellow('\n1. Kullanıcılar ekleniyor...'));
    const user1 = userDb.addUser('Ahmet Yılmaz', 'ahmet@example.com', 'İstanbul');
    const user2 = userDb.addUser('Zeynep Demir', 'zeynep@example.com', 'Ankara');

    if (user1.success) console.log(colors.green('  Ahmet eklendi, ID: ' + user1.id));
    if (user2.success) console.log(colors.green('  Zeynep eklendi, ID: ' + user2.id));

    // 2. Bir kullanıcıyı getirelim
    console.log(colors.yellow('\n2. E-posta ile kullanıcı aranıyor (ahmet@example.com)...'));
    const foundUser = userDb.getUserByEmail('ahmet@example.com');
    if (foundUser) {
        console.log(colors.green(`  Bulundu: ${foundUser.name} - Konum: ${foundUser.location}`));
    }

    // 3. Kullanıcı bilgilerini güncelleyelim
    console.log(colors.yellow('\n3. Ahmet\'in konumu güncelleniyor (İzmir)...'));
    if (foundUser) {
        const updated = userDb.updateUser(foundUser.id, 'Ahmet Yılmaz', 'İzmir');
        if (updated) console.log(colors.green('  Başarıyla güncellendi.'));
    }

    // 4. Tüm kullanıcıları listeleyelim
    console.log(colors.yellow('\n4. Tüm kullanıcılar listeleniyor:'));
    const allUsers = userDb.getAllUsers();
    allUsers.forEach(user => {
        console.log(colors.white(`  [${user.id}] ${user.name} (${user.email}) - ${user.location}`));
    });

    console.log(colors.cyan('\n=== TEST TAMAMLANDI ===\n'));
}

// Testi çalıştır
runTest().catch(console.error);
