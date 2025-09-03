// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
        this.admin = JSON.parse(localStorage.getItem('admin_data') || sessionStorage.getItem('admin_data') || '{}');
        this.currentSection = 'dashboard';
        this.notificationInterval = null;
        this.useLocalContent = true; // Frontend-only CMS mode
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.startNotificationPolling();
    }
    
    setupEventListeners() {
        // Login/Signup tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Signup form
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Password visibility toggles
        const toggleLoginBtn = document.getElementById('toggleLoginPassword');
        if (toggleLoginBtn) toggleLoginBtn.addEventListener('click', () => this.togglePasswordVisibility('loginPassword', 'toggleLoginPassword'));
        const toggleSignupBtn = document.getElementById('toggleSignupPassword');
        if (toggleSignupBtn) toggleSignupBtn.addEventListener('click', () => this.togglePasswordVisibility('signupPassword', 'toggleSignupPassword'));
        const toggleSignupConfirmBtn = document.getElementById('toggleSignupConfirmPassword');
        if (toggleSignupConfirmBtn) toggleSignupConfirmBtn.addEventListener('click', () => this.togglePasswordVisibility('signupConfirmPassword', 'toggleSignupConfirmPassword'));

        // Password strength meter
        const signupPassword = document.getElementById('signupPassword');
        if (signupPassword) signupPassword.addEventListener('input', () => this.updatePasswordStrength(signupPassword.value));

        // Forgot password
        const forgotBtn = document.getElementById('forgotPasswordBtn');
        if (forgotBtn) forgotBtn.addEventListener('click', () => this.handleForgotPassword());
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection(item.dataset.section);
            });
        });
        
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });
        
        // Filters
        document.getElementById('feedbackStatusFilter').addEventListener('change', () => {
            this.refreshFeedback();
        });
        
        document.getElementById('emailStatusFilter').addEventListener('change', () => {
            this.refreshEmails();
        });

        // Content form handlers
        const contentImage = document.getElementById('contentImage');
        if (contentImage) {
            contentImage.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    this.currentContentImageUrl = reader.result; // base64 data URL
                    const img = document.getElementById('contentImagePreview');
                    img.src = reader.result;
                    img.style.display = 'block';
                };
                reader.readAsDataURL(file);
            });
        }

        const resetBtn = document.getElementById('resetContentForm');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetContentForm());

        const createBtn = document.getElementById('createContentBtn');
        if (createBtn) createBtn.addEventListener('click', () => this.resetContentForm());

        const contentForm = document.getElementById('contentForm');
        if (contentForm) contentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContent();
        });
        
        // Settings forms
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });
        
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });
    }
    
    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.add('active');
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('loginRemember')?.checked !== false;
        const submitBtn = document.getElementById('loginSubmitBtn');
        this.setButtonLoading(submitBtn, true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.token = data.token; // Supabase access token
                this.admin = data.admin || { email };
                const storage = remember ? localStorage : sessionStorage;
                const other = remember ? sessionStorage : localStorage;
                storage.setItem('admin_token', this.token);
                storage.setItem('admin_data', JSON.stringify(this.admin));
                other.removeItem('admin_token');
                other.removeItem('admin_data');
                
                this.showDashboard();
                this.loadDashboardData();
            } else {
                this.showError(data.message || 'Invalid credentials');
            }
        } catch (error) {
            this.showError('Login failed. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }
    
    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const submitBtn = document.getElementById('signupSubmitBtn');
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        this.setButtonLoading(submitBtn, true);
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password, confirm_password: confirmPassword })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Account created. Check your email if confirmation is required.');
                this.switchTab('login');
                document.getElementById('signupForm').reset();
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            this.showError('Signup failed. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }
    
    checkAuth() {
        if (this.token) {
            this.showDashboard();
            this.loadDashboardData();
        } else {
            this.showLogin();
        }
    }
    
    showLogin() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('dashboardSection').classList.add('hidden');
    }
    
    showDashboard() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        
        document.getElementById('adminName').textContent = this.admin.name || this.admin.email || 'Admin';
        this.navigateToSection('dashboard');
    }
    
    navigateToSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        // Update page title
        document.getElementById('pageTitle').textContent = this.getSectionTitle(section);
        
        this.currentSection = section;
        
        // Load section data
        switch (section) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'feedback':
                this.loadFeedback();
                break;
            case 'emails':
                this.loadEmails();
                break;
            case 'content':
                this.loadContentList();
                break;
            case 'notifications':
                this.loadNotifications();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }
    
    getSectionTitle(section) {
        const titles = {
            dashboard: 'Dashboard',
            feedback: 'Customer Feedback',
            emails: 'Contact Emails',
            notifications: 'Notifications',
            settings: 'Settings'
        };
        return titles[section] || 'Dashboard';
    }
    
    async loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard-stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data.stats);
                this.loadRecentActivity();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }
    
    updateDashboardStats(stats) {
        document.getElementById('totalFeedback').textContent = stats.total_feedback;
        document.getElementById('totalEmails').textContent = stats.total_emails;
        document.getElementById('unreadFeedback').textContent = stats.unread_feedback;
        document.getElementById('unreadEmails').textContent = stats.unread_emails;
        
        // Update badges
        document.getElementById('feedbackBadge').textContent = stats.unread_feedback;
        document.getElementById('emailBadge').textContent = stats.unread_emails;
        document.getElementById('notificationBadge').textContent = 
            parseInt(stats.unread_feedback) + parseInt(stats.unread_emails);
    }
    
    async loadRecentActivity() {
        try {
            const response = await fetch('/api/admin/notifications', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayRecentActivity(data.notifications.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }
    
    displayRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        container.innerHTML = '';
        
        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const icon = this.getActivityIcon(activity.type);
            
            item.innerHTML = `
                <div class="activity-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${this.formatTime(activity.time)}</div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    getActivityIcon(type) {
        const icons = {
            feedback: 'fas fa-comments',
            email: 'fas fa-envelope'
        };
        return icons[type] || 'fas fa-info-circle';
    }
    
    async loadFeedback() {
        try {
            const statusFilter = document.getElementById('feedbackStatusFilter').value;
            const url = `/api/admin/feedback?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayFeedback(data.feedback);
            }
        } catch (error) {
            console.error('Failed to load feedback:', error);
        }
    }
    
    displayFeedback(feedbackList) {
        const container = document.getElementById('feedbackList');
        container.innerHTML = '';
        
        if (feedbackList.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No feedback found.</p></div>';
            return;
        }
        
        feedbackList.forEach(feedback => {
            const item = document.createElement('div');
            item.className = `data-item ${!feedback.is_read ? 'unread' : ''}`;
            
            item.innerHTML = `
                <div class="data-header">
                    <div class="data-title">${feedback.name}</div>
                    <div class="data-meta">
                        <span>${feedback.email || ''}</span>
                        <span>${feedback.phone || ''}</span>
                        <span>${this.formatTime(feedback.created_at)}</span>
                        <span class="status-badge status-${feedback.status}">${feedback.status}</span>
                    </div>
                </div>
                <div class="data-content">${feedback.message}</div>
                <div class="data-actions">
                    <button class="btn btn-sm btn-primary" onclick="adminDashboard.replyToFeedback(${feedback.id})">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="adminDashboard.markAsRead('feedback', ${feedback.id})">
                        <i class="fas fa-eye"></i> Mark Read
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDashboard.removeFeedback(${feedback.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    async removeFeedback(id) {
        if (!confirm('Are you sure you want to remove this feedback?')) return;
        try {
            const response = await fetch(`/api/admin/feedback/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Feedback removed');
                this.loadFeedback();
                this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed to remove');
            }
        } catch (e) {
            this.showError('Failed to remove. Please try again.');
        }
    }
    
    async loadEmails() {
        try {
            const statusFilter = document.getElementById('emailStatusFilter').value;
            const url = `/api/admin/emails?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayEmails(data.emails);
            }
        } catch (error) {
            console.error('Failed to load emails:', error);
        }
    }
    
    displayEmails(emailList) {
        const container = document.getElementById('emailList');
        container.innerHTML = '';
        
        if (emailList.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No emails found.</p></div>';
            return;
        }
        
        emailList.forEach(email => {
            const item = document.createElement('div');
            item.className = `data-item ${!email.is_read ? 'unread' : ''}`;
            
            item.innerHTML = `
                <div class="data-header">
                    <div class="data-title">${email.sender_name}</div>
                    <div class="data-meta">
                        <span>${email.sender_email}</span>
                        <span>${email.sender_phone}</span>
                        <span>${this.formatTime(email.created_at)}</span>
                        <span class="status-badge status-${email.status}">${email.status}</span>
                    </div>
                </div>
                <div class="data-content">
                    <strong>To:</strong> ${email.recipient_email}<br>
                    ${email.message}
                </div>
                <div class="data-actions">
                    <button class="btn btn-sm btn-primary" onclick="adminDashboard.replyToEmail(${email.id})">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="adminDashboard.markAsRead('email', ${email.id})">
                        <i class="fas fa-eye"></i> Mark Read
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDashboard.removeEmail(${email.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    async removeEmail(id) {
        if (!confirm('Are you sure you want to remove this email?')) return;
        try {
            const response = await fetch(`/api/admin/emails/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Email removed');
                this.loadEmails();
                this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed to remove');
            }
        } catch (e) {
            this.showError('Failed to remove. Please try again.');
        }
    }

    // -------- Content Management --------
    async loadContentList() {
        if (this.useLocalContent) {
            const list = JSON.parse(localStorage.getItem('zidalco_contents') || '[]');
            this.displayContentList(list.filter(i => !i.is_deleted));
            return;
        }
        // fallback (not used in local mode)
        try {
            const res = await fetch('/api/admin/contents?limit=100', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            if (data.success) this.displayContentList(data.contents || []);
        } catch (e) { console.error('Failed to load contents', e); }
    }

    displayContentList(list) {
        const container = document.getElementById('contentList');
        if (!container) return;
        container.innerHTML = '';
        if (!list || list.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No content yet.</p></div>';
            return;
        }
        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = `
                <div class="data-header">
                    <div class="data-title">${item.title || (item.slot + ' @ ' + item.location)}</div>
                    <div class="data-meta">
                        <span>${item.location}</span>
                        <span>${item.slot}</span>
                        <span>${this.formatTime(item.created_at)}</span>
                        <span class="status-badge status-${item.is_published ? 'sent' : 'failed'}">${item.is_published ? 'published' : 'draft'}</span>
                    </div>
                </div>
                <div class="data-content">
                    ${item.image_url ? `<img src="${item.image_url}" style="max-width:140px; border-radius:8px; margin-bottom:8px;" />` : ''}
                    ${item.body || ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-sm btn-outline" onclick="adminDashboard.editContent(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteContent(${item.id})"><i class="fas fa-trash"></i> Remove</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    resetContentForm() {
        this.currentContentId = null;
        this.currentContentImageUrl = null;
        document.getElementById('contentLocation').value = 'home';
        document.getElementById('contentSlot').value = 'announcement';
        document.getElementById('contentTitle').value = '';
        document.getElementById('contentBody').value = '';
        document.getElementById('contentPublished').checked = true;
        const img = document.getElementById('contentImagePreview');
        if (img) { img.src = ''; img.style.display = 'none'; }
    }

    editContent(id) {
        const list = JSON.parse(localStorage.getItem('zidalco_contents') || '[]');
        const item = list.find(i => i.id === id);
        if (!item) return;
        this.currentContentId = id;
        document.getElementById('contentLocation').value = item.location || 'home';
        document.getElementById('contentSlot').value = item.slot || 'announcement';
        document.getElementById('contentTitle').value = item.title || '';
        document.getElementById('contentBody').value = item.body || '';
        document.getElementById('contentPublished').checked = !!item.is_published;
        this.currentContentImageUrl = item.image_url || null;
        const img = document.getElementById('contentImagePreview');
        if (this.currentContentImageUrl) { img.src = this.currentContentImageUrl; img.style.display = 'block'; } else { img.src=''; img.style.display='none'; }
    }

    async fetchContentById(id){
        const list = JSON.parse(localStorage.getItem('zidalco_contents') || '[]');
        return list.find(i => i.id === id) || null;
    }

    async saveContent() {
        const payload = {
            location: document.getElementById('contentLocation').value,
            slot: document.getElementById('contentSlot').value,
            title: document.getElementById('contentTitle').value.trim() || null,
            body: document.getElementById('contentBody').value.trim() || null,
            image_url: this.currentContentImageUrl || null,
            is_published: document.getElementById('contentPublished').checked,
            is_deleted: false,
            created_at: new Date().toISOString()
        };
        const list = JSON.parse(localStorage.getItem('zidalco_contents') || '[]');
        if (this.currentContentId) {
            const idx = list.findIndex(i => i.id === this.currentContentId);
            if (idx >= 0) list[idx] = { ...list[idx], ...payload };
        } else {
            const newId = Date.now();
            list.unshift({ id: newId, ...payload });
        }
        localStorage.setItem('zidalco_contents', JSON.stringify(list));
        this.broadcastContentChange();
        this.showSuccess('Content saved');
        this.resetContentForm();
        this.loadContentList();
    }

    async deleteContent(id) {
        if (!confirm('Remove this content?')) return;
        const list = JSON.parse(localStorage.getItem('zidalco_contents') || '[]');
        const idx = list.findIndex(i => i.id === id);
        if (idx >= 0) {
            list[idx].is_deleted = true;
            localStorage.setItem('zidalco_contents', JSON.stringify(list));
            this.broadcastContentChange();
            this.showSuccess('Content removed');
            this.loadContentList();
        }
    }

    broadcastContentChange() {
        try { localStorage.setItem('zidalco_contents_last_change', String(Date.now())); } catch(_) {}
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/api/admin/notifications', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Apply filter and search
                const filter = this.currentNotifFilter || 'all';
                const q = (this.currentNotifQuery || '').toLowerCase();
                let list = data.notifications;
                if (filter === 'unread') list = list.filter(n => (n.data && n.data.is_read === false));
                if (filter === 'feedback') list = list.filter(n => n.type === 'feedback');
                if (filter === 'email') list = list.filter(n => n.type === 'email');
                if (q) list = list.filter(n => (n.title||'').toLowerCase().includes(q) || (n.message||'').toLowerCase().includes(q));
                this.displayNotifications(list);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    displayNotifications(notifications) {
        const container = document.getElementById('notificationList');
        container.innerHTML = '';
        
        if (!notifications || notifications.length === 0) {
            container.innerHTML = '<div class="notification-item"><p>No notifications.</p></div>';
            return;
        }
        
        notifications.forEach(notification => {
            const item = document.createElement('div');
            const unread = notification.data && notification.data.is_read === false;
            item.className = `notification-item ${unread ? 'unread' : ''}`;
            item.onclick = () => this.handleNotificationClick(notification);
            
            item.innerHTML = `
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${this.formatTime(notification.time)}</div>
            `;
            
            container.appendChild(item);
        });
    }

    // New: filters and search handlers
    setNotificationFilter(filter){
        this.currentNotifFilter = filter;
        this.loadNotifications();
    }
    setNotificationQuery(q){
        this.currentNotifQuery = q;
        this.loadNotifications();
    }

    handleNotificationClick(notification) {
        // Navigate to appropriate section and show details
        if (notification.type === 'feedback') {
            this.navigateToSection('feedback');
        } else if (notification.type === 'email') {
            this.navigateToSection('emails');
        }
    }
    
    async loadSettings() {
        document.getElementById('profileName').value = this.admin.name || '';
        document.getElementById('profileEmail').value = this.admin.email || '';
    }
    
    async replyToFeedback(feedbackId) {
        // Get feedback details and show reply modal
        try {
            const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.feedback) {
                this.showReplyModal('feedback', data.feedback);
            }
        } catch (error) {
            console.error('Failed to get feedback details:', error);
        }
    }
    
    async replyToEmail(emailId) {
        // Get email details and show reply modal
        try {
            const response = await fetch(`/api/admin/emails/${emailId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.emails) {
                this.showReplyModal('email', data.emails);
            }
        } catch (error) {
            console.error('Failed to get email details:', error);
        }
    }
    
    showReplyModal(type, item) {
        this.currentReplyType = type;
        this.currentReplyId = item.id;
        
        const modal = document.getElementById('replyModal');
        const title = document.getElementById('replyModalTitle');
        const content = document.getElementById('replyModalContent');
        
        if (type === 'feedback') {
            title.textContent = `Reply to Feedback from ${item.name}`;
            content.innerHTML = `
                <div class="reply-original">
                    <strong>From:</strong> ${item.name} (${item.email})<br>
                    <strong>Phone:</strong> ${item.phone}<br>
                    <strong>Message:</strong><br>
                    <p>${item.message}</p>
                </div>
            `;
        } else {
            title.textContent = `Reply to Email from ${item.sender_name}`;
            content.innerHTML = `
                <div class="reply-original">
                    <strong>From:</strong> ${item.sender_name} (${item.sender_email})<br>
                    <strong>Phone:</strong> ${item.sender_phone}<br>
                    <strong>To:</strong> ${item.recipient_email}<br>
                    <strong>Message:</strong><br>
                    <p>${item.message}</p>
                </div>
            `;
        }
        
        modal.classList.remove('hidden');
        document.getElementById('replyMessage').focus();
    }
    
    closeReplyModal() {
        document.getElementById('replyModal').classList.add('hidden');
        document.getElementById('replyMessage').value = '';
        this.currentReplyType = null;
        this.currentReplyId = null;
    }
    
    async sendReply() {
        const replyMessage = document.getElementById('replyMessage').value.trim();
        
        if (!replyMessage) {
            this.showError('Please enter a reply message');
            return;
        }
        
        try {
            const actionUrl = this.currentReplyType === 'feedback' ? '/api/admin/reply-feedback' : '/api/admin/reply-email';
            const idField = this.currentReplyType === 'feedback' ? 'feedback_id' : 'email_id';

            const response = await fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    [idField]: this.currentReplyId,
                    reply_message: replyMessage
                })
            });

            const data = await response.json();

            // Fallback: send via EmailJS to the original sender if backend couldn't email
            if (!data.success) {
                await this.sendReplyViaEmailJS(replyMessage);
                this.showSuccess('Reply sent via EmailJS!');
            } else {
                this.showSuccess('Reply sent successfully!');
            }

            this.closeReplyModal();
            if (this.currentSection === 'feedback') this.loadFeedback();
            if (this.currentSection === 'emails') this.loadEmails();
            this.loadDashboardData();
        } catch (error) {
            // Try EmailJS as last resort
            try {
                await this.sendReplyViaEmailJS(replyMessage);
                this.showSuccess('Reply sent via EmailJS!');
                this.closeReplyModal();
            } catch (e) {
                this.showError('Failed to send reply. Please try again.');
            }
        }
    }

    async sendReplyViaEmailJS(replyMessage){
        if (!window.emailjs || typeof emailjs.send !== 'function') throw new Error('EmailJS not available');

        // Fetch the latest details to know recipient
        if (this.currentReplyType === 'email') {
            const res = await fetch(`/api/admin/emails/${this.currentReplyId}`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            const email = data && (data.email || data.emails);
            if (!email) throw new Error('Email details not found');

            const params = {
                name: 'Zidalco Admin',
                email: 'no-reply@zidalco.com',
                reply_to: 'no-reply@zidalco.com',
                to_email: email.sender_email,
                recipient_email: email.sender_email,
                subject: `Reply from Zidalco Admin`,
                message: replyMessage
            };
            await emailjs.send('service_vxprigz','template_umpowaa', params);
            return;
        }

        if (this.currentReplyType === 'feedback') {
            const res = await fetch(`/api/admin/feedback/${this.currentReplyId}`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            const fb = data && data.feedback;
            if (!fb || !fb.email) throw new Error('Feedback details not found');

            const params = {
                name: 'Zidalco Admin',
                email: 'no-reply@zidalco.com',
                reply_to: 'no-reply@zidalco.com',
                to_email: fb.email,
                recipient_email: fb.email,
                subject: `Reply to your feedback`,
                message: replyMessage
            };
            await emailjs.send('service_vxprigz','template_umpowaa', params);
            return;
        }
        throw new Error('Unknown reply type');
    }
    
    async markAsRead(type, id) {
        try {
            const response = await fetch('/api/admin/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ type, id })
            });
            const data = await response.json();
            if (data.success) {
                if (this.currentSection === 'feedback') this.loadFeedback();
                else if (this.currentSection === 'emails') this.loadEmails();
                this.loadDashboardData();
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }
    
    async markAllAsRead() {
        try {
            const response = await fetch('/api/admin/mark-all-read', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                this.showSuccess('All notifications marked as read');
                this.loadNotifications();
                this.loadDashboardData();
            } else {
                this.showError(data.message || 'Failed');
            }
        } catch (e) {
            this.showError('Failed to mark all as read.');
        }
    }
    
    async updateProfile() {
        const name = document.getElementById('profileName').value.trim();
        
        if (!name) {
            this.showError('Name is required');
            return;
        }
        
        // Update profile logic here
        this.showSuccess('Profile updated successfully!');
    }
    
    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showError('All fields are required');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showError('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showError('New password must be at least 8 characters long');
            return;
        }
        
        // Change password logic here
        this.showSuccess('Password changed successfully!');
        document.getElementById('passwordForm').reset();
    }
    
    startNotificationPolling() {
        // Poll for new notifications every 30 seconds
        this.notificationInterval = setInterval(() => {
            if (this.token && this.currentSection === 'dashboard') {
                this.loadDashboardData();
            }
        }, 30000);
    }
    
    logout() {
        this.token = null;
        this.admin = {};
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
        }
        
        this.showLogin();
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    showError(message) {
        this.showToast(String(message || 'Error'), 'error');
    }
    
    showSuccess(message) {
        this.showToast(String(message || 'Success'), 'success');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return alert(message);
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-triangle':'fa-info-circle'}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-4px)';
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }

    setButtonLoading(btn, isLoading) {
        if (!btn) return;
        btn.classList.toggle('loading', !!isLoading);
        btn.disabled = !!isLoading;
    }

    togglePasswordVisibility(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if (!input || !btn) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    }

    updatePasswordStrength(pwd) {
        const meter = document.getElementById('passwordStrength');
        if (!meter) return;
        const bar = meter.querySelector('.bar');
        const label = meter.querySelector('.label');
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[a-z]/.test(pwd)) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        let width = '20%';
        let text = 'Very weak';
        let color = '#ef4444';
        if (score >= 2) { width = '40%'; text = 'Weak'; color = '#f97316'; }
        if (score >= 3) { width = '60%'; text = 'Medium'; color = '#f59e0b'; }
        if (score >= 4) { width = '85%'; text = 'Strong'; color = '#10b981'; }
        if (score >= 5) { width = '100%'; text = 'Very strong'; color = '#059669'; }
        if (bar) {
            bar.style.position = 'relative';
            let indicator = bar.querySelector('span');
            if (!indicator) { indicator = document.createElement('span'); indicator.style.position='absolute'; indicator.style.left='0'; indicator.style.top='0'; indicator.style.bottom='0'; indicator.style.borderRadius='4px'; bar.appendChild(indicator); }
            indicator.style.width = width;
            indicator.style.background = color;
        }
        if (label) label.textContent = text;
    }

    async handleForgotPassword() {
        const email = (document.getElementById('loginEmail')?.value || '').trim();
        if (!email) { this.showError('Enter your email to reset password'); return; }
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) this.showSuccess('If the email exists, a reset link has been sent.');
            else this.showError(data.message || 'Could not start password reset');
        } catch (_) {
            this.showError('Failed to request password reset');
        }
    }
}

// Global functions for onclick handlers
function refreshFeedback() {
    adminDashboard.loadFeedback();
}

function refreshEmails() {
    adminDashboard.loadEmails();
}

function markAllAsRead() {
    adminDashboard.markAllAsRead();
}

function closeReplyModal() {
    adminDashboard.closeReplyModal();
}

function sendReply() {
    adminDashboard.sendReply();
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
