/**
 * Global Store & Utility Functions
 */

const Store = {
    // Auth helpers
    getUser: () => JSON.parse(localStorage.getItem('user')),
    getToken: () => localStorage.getItem('token'),
    setUser: (user, token) => {
        localStorage.setItem('user', JSON.stringify(user));
        if (token) localStorage.setItem('token', token);
    },
    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/';
    },

    // API Wrapper with Auth
    api: async (endpoint, options = {}) => {
        const token = Store.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const res = await fetch(endpoint, { ...options, headers });
        if (res.status === 401) {
            // Token expired or invalid
            Store.logout();
            return;
        }
        return res;
    },

    // UI Helpers
    renderNavbar: () => {
        const user = Store.getUser();
        const isAdmin = user && (user.role === 'admin' || ['egehayzaran27@gmail.com', 'sıdkıhayzaran@gmail.com'].includes(user.email));
        
        const nav = document.createElement('nav');
        nav.className = 'navbar';
        nav.innerHTML = `
            <a href="/" class="nav-brand">🚕 NexRide</a>
            <div class="nav-links">
                <a href="/index.html" class="nav-link ${location.pathname.endsWith('index.html') || location.pathname === '/' ? 'active' : ''}">Taksi Çağır</a>
                <a href="/wallet.html" class="nav-link ${location.pathname.endsWith('wallet.html') ? 'active' : ''}">Cüzdan</a>
                <a href="/maps.html" class="nav-link ${location.pathname.endsWith('maps.html') ? 'active' : ''}">Canlı Harita</a>
                <a href="/dashboard.html" class="nav-link ${location.pathname.endsWith('dashboard.html') ? 'active' : ''}">Seyahatlerim</a>
                ${(user && user.role === 'driver') || (user && user.isDriver) ? `<a href="/driver.html" class="nav-link ${location.pathname.endsWith('driver.html') ? 'active' : ''}">Sürücü Paneli</a>` : ''}
                ${user && (user.role === 'user' || user.role === 'admin') && !user.isDriver ? `<a href="#" onclick="Store.openBecomeDriverModal()" class="nav-link" style="color:var(--success)">Sürücü Ol</a>` : ''}
                ${isAdmin ? `<a href="/admin.html" class="nav-link ${location.pathname.endsWith('admin.html') ? 'active' : ''}" style="color:var(--error)">Admin</a>` : ''}

            </div>
            <div class="nav-user">
                <span style="font-size: 0.85rem; font-weight: 600;">${user ? user.firstName : ''}</span>
                <button onclick="Store.logout()" class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.7rem;">Çıkış</button>
            </div>
        `;
        document.body.prepend(nav);
        lucide.createIcons();

        // Universal Become Driver Modal
        if (!document.getElementById('becomeDriverModal')) {
            const modal = document.createElement('div');
            modal.id = 'becomeDriverModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div style="width: 80px; height: 80px; background: rgba(34, 197, 94, 0.1); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: var(--success);">
                        <i data-lucide="car" style="width: 40px; height: 40px;"></i>
                    </div>
                    <h2 style="margin-bottom: 10px;">NexRide Sürücüsü Ol</h2>
                    <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.9rem;">Kendi aracınla çalışarak ek gelir kazanmaya başla.</p>
                    <div class="form-group" style="text-align: left; margin-bottom: 15px;">
                        <label>Araç Marka / Model</label>
                        <input type="text" id="univCarModel" placeholder="Örn: Toyota Corolla 2022">
                    </div>
                    <div class="form-group" style="text-align: left; margin-bottom: 24px;">
                        <label>Araç Plakası</label>
                        <input type="text" id="univCarPlate" placeholder="Örn: 34 ABC 123">
                    </div>
                    <button onclick="Store.submitBecomeDriver()" class="btn btn-primary" style="width: 100%; padding: 15px;">Başvuruyu Tamamla</button>
                    <button onclick="document.getElementById('becomeDriverModal').style.display='none'" class="btn btn-secondary" style="width: 100%; margin-top: 10px; background: transparent;">Vazgeç</button>
                </div>
            `;
            document.body.appendChild(modal);
            lucide.createIcons();
        }
    },

    openBecomeDriverModal: () => {
        document.getElementById('becomeDriverModal').style.display = 'flex';
    },

    submitBecomeDriver: async () => {
        const user = Store.getUser();
        const carModel = document.getElementById('univCarModel').value;
        const plate = document.getElementById('univCarPlate').value;

        if (!carModel || !plate) return showToast('Tüm alanları doldurun.', 'error');

        const res = await Store.api('/api/drivers/become-driver', {
            method: 'POST',
            body: JSON.stringify({ name: `${user.firstName} ${user.lastName}`, carModel, plate })
        });

        if (res.ok) {
            showToast('Başvurunuz alındı! Artık sürücü panelini kullanabilirsiniz.', 'success');
            user.isDriver = true;
            localStorage.setItem('user', JSON.stringify(user));
            setTimeout(() => window.location.href = '/driver.html', 1500);
        } else {
            const data = await res.json();
            showToast(data.error || 'Başvuru hatası.', 'error');
        }
    },

    formatCurrency: (amount) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    },

    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    showAlert: (message, type = 'success') => {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    },

    playSound: (type = 'info') => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            const now = ctx.currentTime;
            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'new_request') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(554.37, now + 0.15); // C#5
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.setValueAtTime(0.1, now + 0.15);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else {
                // info / notification
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gainNode.gain.setValueAtTime(0.05, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            }
        } catch(e) {
            console.log('Ses çalınamadı (kullanıcı etkileşimi gerekebilir).');
        }
    }
};

// Global click sound for all buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) {
        // Eğer butonun kendi özel sesi varsa (success/error gibi) 
        // buradaki genel ses de çalabilir ama çok kısa olduğu için sorun olmaz.
        // İstersen data-no-sound özniteliği ile engellenebilir.
        Store.playSound('info'); 
    }
});


// Global styles for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

window.Store = Store;

/**
 * Toast Bildirim Sistemi
 */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Ses çal (Store üzerinden)
    if (window.Store && window.Store.playSound) {
        window.Store.playSound(type);
    }

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Window globaline ekle
window.showToast = showToast;
