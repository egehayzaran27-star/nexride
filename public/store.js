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
            <a href="/" class="nav-brand">NexRide</a>
            <div class="nav-links">
                <a href="/menu.html" class="nav-link ${location.pathname.endsWith('menu.html') ? 'active' : ''}">Menü</a>
                <a href="/index.html" class="nav-link ${location.pathname.endsWith('index.html') || location.pathname === '/' ? 'active' : ''}">Taksi Çağır</a>
                <a href="/wallet.html" class="nav-link ${location.pathname.endsWith('wallet.html') ? 'active' : ''}">Cüzdan</a>
                <a href="/dashboard.html" class="nav-link ${location.pathname.endsWith('dashboard.html') ? 'active' : ''}">Profil</a>
                ${isAdmin ? `<a href="/admin.html" class="nav-link ${location.pathname.endsWith('admin.html') ? 'active' : ''}" style="color:var(--error)">Admin</a>` : ''}
                <button onclick="Store.logout()" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.75rem;">Çıkış</button>
            </div>
        `;
        document.body.prepend(nav);
        lucide.createIcons();
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
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            background: ${type === 'success' ? 'var(--success)' : 'var(--error)'};
            color: white;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease forwards;
        `;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => alertDiv.remove(), 300);
        }, 3000);
    }
};

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
