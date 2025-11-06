import { supabase } from './supabase-client.js';

const handleAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const isLoginPage = window.location.pathname.includes('login.html');
    const isSignupPage = window.location.pathname.includes('signup.html');
    const isDashboardPage = window.location.pathname.includes('dashboard.html');

    if (isLoginPage) {
        if (session) {
            window.location.replace('/dashboard.html');
            return;
        }
        setupLoginForm();
    }

    if (isSignupPage) {
        if (session) {
            window.location.replace('/dashboard.html');
            return;
        }
        setupSignupForm();
    }

    if (isDashboardPage) {
        if (!session) {
            window.location.replace('/login.html');
            return;
        }
        await setupDashboard(session.user);
    }
};

const setupSignupForm = () => {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('full_name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('authMessage');
        const submitBtn = document.getElementById('submitBtn');

        setLoading(submitBtn, true);
        showMessage(messageEl, 'Creating your account...', 'loading');

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (error) throw error;

            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 throw new Error('A user with this email already exists. Please try logging in or reset your password.');
            }
            
            if (data.user) {
                showMessage(messageEl, 'Signup successful! Please check your email to verify your account.', 'success');
                signupForm.reset();
            } else {
                throw new Error('An unexpected error occurred during signup.');
            }

        } catch (error) {
            console.error('Signup error:', error);
            showMessage(messageEl, error.message || 'An unexpected error occurred.', 'error');
        } finally {
            setLoading(submitBtn, false);
        }
    });
};

const setupLoginForm = () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('authMessage');
        const submitBtn = document.getElementById('submitBtn');

        setLoading(submitBtn, true);
        showMessage(messageEl, 'Signing in...', 'loading');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (data.session) {
                window.location.replace('/dashboard.html');
            } else {
                throw new Error('Login failed. Please check your credentials.');
            }

        } catch (error) {
            console.error('Login error:', error);
            showMessage(messageEl, error.message || 'An unexpected error occurred.', 'error');
        } finally {
            setLoading(submitBtn, false);
        }
    });
};

const setupDashboard = async (user) => {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardContent = document.getElementById('dashboardContent');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
                alert('Failed to log out. Please try again.');
            } else {
                window.location.replace('/login.html');
            }
        });
    }

    if (!dashboardContent) return;

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;
        
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${profile.full_name || user.email}`;
        }

        if (profile.role === 'admin') {
            await setupAdminDashboard(dashboardContent);
        } else {
            await setupCustomerDashboard(dashboardContent, user.id);
        }

    } catch (error) {
        console.error('Error setting up dashboard:', error);
        dashboardContent.innerHTML = `<p class="auth-message error show">Error loading your dashboard. Please try again later.</p>`;
    }
};

const setupAdminDashboard = async (container) => {
    container.innerHTML = `
        <h2>Admin Panel</h2>
        <div class="dashboard-grid">
            <div class="dashboard-card" id="file-upload-section">
                <h3>Upload Document</h3>
                <form id="uploadForm" class="upload-form"></form>
            </div>
            <div class="dashboard-card" id="all-files-section">
                <h3>All Documents</h3>
                <div id="all-files-list" class="file-list-container"></div>
            </div>
        </div>
    `;

    await renderFileUploadForm(document.getElementById('uploadForm'));
    await renderAllFilesList(document.getElementById('all-files-list'));
};

const renderFileUploadForm = async (formContainer) => {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'customer');

    if (error) {
        formContainer.innerHTML = `<p class="auth-message error show">Could not load users.</p>`;
        return;
    }

    const userOptions = users.map(user => `<option value="${user.id}">${user.full_name} (${user.email})</option>`).join('');

    formContainer.innerHTML = `
        <div class="form-group">
            <label for="customerSelect">Select Customer</label>
            <select id="customerSelect" name="customer_id" required>${userOptions}</select>
        </div>
        <div class="form-group">
            <label for="fileType">Document Type</label>
            <select id="fileType" name="file_type" required>
                <option value="invoice">Invoice</option>
                <option value="quotation">Quotation</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fileInput">Select File</label>
            <input type="file" id="fileInput" name="file" required>
        </div>
        <div class="form-actions">
            <button type="submit" class="submit-btn" id="uploadBtn">
                <span class="btn-text">Upload File</span>
                <div class="btn-loading"><div class="cosmic-spinner"></div></div>
            </button>
        </div>
        <div id="uploadMessage" class="auth-message"></div>
    `;

    formContainer.addEventListener('submit', handleFileUpload);
};

const handleFileUpload = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('#fileInput');
    const customerId = form.querySelector('#customerSelect').value;
    const fileType = form.querySelector('#fileType').value;
    const file = fileInput.files[0];
    const uploadBtn = form.querySelector('#uploadBtn');
    const messageEl = form.querySelector('#uploadMessage');

    if (!file || !customerId || !fileType) {
        showMessage(messageEl, 'Please fill all fields and select a file.', 'error');
        return;
    }

    setLoading(uploadBtn, true);
    showMessage(messageEl, 'Uploading...', 'loading');

    try {
        const filePath = `${customerId}/${fileType}-${Date.now()}-${file.name}`;
        
        // Upload file to storage
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Insert record into documents table
        const { error: insertError } = await supabase
            .from('documents')
            .insert({
                user_id: customerId,
                file_path: filePath,
                file_name: file.name,
                document_type: fileType,
            });
        
        if (insertError) throw insertError;
        
        showMessage(messageEl, 'File uploaded successfully!', 'success');
        form.reset();
        await renderAllFilesList(document.getElementById('all-files-list')); // Refresh list
    } catch (error) {
        console.error('Upload failed:', error);
        showMessage(messageEl, `Upload failed: ${error.message}`, 'error');
    } finally {
        setLoading(uploadBtn, false);
    }
};

const renderAllFilesList = async (container) => {
    container.innerHTML = `<div class="cosmic-spinner-container"><div class="cosmic-spinner"></div></div>`;
    
    const { data, error } = await supabase
        .from('documents')
        .select(`
            id,
            file_name,
            document_type,
            created_at,
            profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="auth-message error show">Could not load files.</p>`;
        return;
    }

    if (data.length === 0) {
        container.innerHTML = `<p>No documents have been uploaded yet.</p>`;
        return;
    }

    const fileRows = data.map(file => `
        <div class="file-item">
            <div class="file-info">
                <span class="file-name">${file.file_name} (${file.document_type})</span>
                <span class="file-meta">For: ${file.profiles.full_name || file.profiles.email}</span>
                <span class="file-meta">Uploaded: ${new Date(file.created_at).toLocaleDateString()}</span>
            </div>
            <div class="file-actions">
                <button class="secondary-btn small-btn delete-btn" data-id="${file.id}">Delete</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="file-list">${fileRows}</div>`;
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFileDelete(btn.dataset.id));
    });
};

const handleFileDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) return;

    try {
        // Get file path from DB
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('file_path')
            .eq('id', fileId)
            .single();
        
        if (fetchError) throw fetchError;

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([doc.file_path]);
        
        if (storageError) throw storageError;

        // Delete from DB
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', fileId);

        if (dbError) throw dbError;

        alert('File deleted successfully.');
        await renderAllFilesList(document.getElementById('all-files-list')); // Refresh list
    } catch (error) {
        console.error('Delete failed:', error);
        alert(`Failed to delete file: ${error.message}`);
    }
};

const setupCustomerDashboard = async (container, userId) => {
    container.innerHTML = `
        <h2>Your Documents</h2>
        <div class="dashboard-grid">
            <div class="dashboard-card" id="invoices-section">
                <h3>Invoices</h3>
                <div id="customer-invoices" class="file-list-container"></div>
            </div>
            <div class="dashboard-card" id="quotations-section">
                <h3>Quotations</h3>
                <div id="customer-quotations" class="file-list-container"></div>
            </div>
        </div>
    `;

    await renderCustomerFiles(document.getElementById('customer-invoices'), userId, 'invoice');
    await renderCustomerFiles(document.getElementById('customer-quotations'), userId, 'quotation');
};

const renderCustomerFiles = async (container, userId, docType) => {
    container.innerHTML = `<div class="cosmic-spinner-container"><div class="cosmic-spinner"></div></div>`;
    
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .eq('document_type', docType)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p class="auth-message error show">Could not load your ${docType}s.</p>`;
        return;
    }

    if (data.length === 0) {
        container.innerHTML = `<p>No ${docType}s available yet.</p>`;
        return;
    }

    const fileRows = data.map(file => `
        <div class="file-item">
            <div class="file-info">
                <span class="file-name">${file.file_name}</span>
                <span class="file-meta">Uploaded: ${new Date(file.created_at).toLocaleDateString()}</span>
            </div>
            <div class="file-actions">
                <button class="cta-btn small-btn download-btn" data-path="${file.file_path}">Download</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="file-list">${fileRows}</div>`;
    
    container.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFileDownload(btn.dataset.path));
    });
};

const handleFileDownload = async (filePath) => {
    try {
        const { data, error } = await supabase.storage
            .from('documents')
            .download(filePath);
        
        if (error) throw error;

        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filePath.split('-').pop(); // Get original filename
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Download error:', error);
        alert(`Failed to download file: ${error.message}`);
    }
};

const showMessage = (element, text, type) => {
    if (!element) return;
    element.textContent = text;
    element.className = `auth-message ${type} show`;
};

const setLoading = (button, isLoading) => {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    if (isLoading) {
        button.disabled = true;
        if(btnText) btnText.style.opacity = '0';
        if(btnLoading) btnLoading.style.opacity = '1';
    } else {
        button.disabled = false;
        if(btnText) btnText.style.opacity = '1';
        if(btnLoading) btnLoading.style.opacity = '0';
    }
};

document.addEventListener('DOMContentLoaded', handleAuth);
