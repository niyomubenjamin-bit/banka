// Banka Frontend - Admin Dashboard Service

// Helper to create authenticated API requests (reused logic, could be shared)
async function fetchWithAuth(url, options = {}) {
    const session = getSession();
    if (!session || !session.token) {
        throw new Error('No authentication token found. Please sign in.');
    }

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        clearSession();
        window.location.href = 'signin.html';
        throw new Error('Session expired. Please sign in again.');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'An API error occurred.');
    }

    return response.json();
}

function initAdminDashboard() {
    protectPage(); // From auth.js

    const session = getSession();
    if (!session || session.user.role !== 'admin') {
        window.location.href = 'dashboard.html'; // Redirect non-admins
        return;
    }

    document.getElementById('admin-name').textContent = `${session.user.first_name} ${session.user.last_name}`;

    // Initial load
    switchAdminTab('overview');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.toLowerCase() === tabName) {
            link.classList.add('active');
        }
    });

    const contentEl = document.getElementById('dashboard-content');
    contentEl.innerHTML = '<p>Loading...</p>';

    if (tabName === 'overview') {
        renderAdminOverview(contentEl);
    } else if (tabName === 'users') {
        renderAdminUsers(contentEl);
    } else if (tabName === 'accounts') {
        renderAdminAccounts(contentEl);
    }
}

async function renderAdminOverview(contentEl) {
    try {
        const summaryData = await fetchWithAuth(`${API_BASE_URL}/api/admin/dashboard/summary`);
        const summary = summaryData.accounts;
        const transactions = summaryData.transactions;

        contentEl.innerHTML = `
      <div class="dashboard-header">
        <h2>Dashboard Overview</h2>
      </div>
      
      <div class="summary-cards">
        <div class="stat-card">
            <h3>Total Accounts</h3>
            <div class="value">${summary.total}</div>
        </div>
        <div class="stat-card">
            <h3>Active Accounts</h3>
            <div class="value">${summary.active}</div>
        </div>
        <div class="stat-card">
            <h3>Dormant Accounts</h3>
            <div class="value">${summary.dormant}</div>
        </div>
        <div class="stat-card income">
            <h3>Total Credited</h3>
            <div class="value">RWF ${transactions.totalCredited.toLocaleString()}</div>
        </div>
        <div class="stat-card expense">
            <h3>Total Debited</h3>
            <div class="value">RWF ${transactions.totalDebited.toLocaleString()}</div>
        </div>
      </div>
    `;
    } catch (error) {
        console.error('Failed to render overview:', error);
        contentEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function renderAdminUsers(contentEl) {
    try {
        const { users } = await fetchWithAuth(`${API_BASE_URL}/api/admin/users`);

        let html = `
      <div class="dashboard-header">
        <h2>User Management</h2>
        <button class="button button-primary" onclick="openModal('create-user-modal')">+ Create Staff/Admin</button>
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${u.first_name} ${u.last_name}</td>
              <td>${u.email}</td>
              <td><span class="role-badge ${u.role}">${u.role}</span></td>
              <td><span class="status-badge ${u.status}">${u.status}</span></td>
              <td class="actions">
                ${u.role !== 'admin' || u.email !== getSession().user.email ? `
                    ${!u.email_verified ? `
                        <button class="button-small button-primary" onclick="handleUserAction('${u.id}', 'verify')">Verify</button>
                    ` : ''}
                    <button class="button-small ${u.status === 'active' ? 'button-warning' : 'button-success'}"
                            onclick="handleUserAction('${u.id}', '${u.status === 'active' ? 'deactivate' : 'activate'}')">
                      ${u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="button-small button-danger" onclick="handleUserAction('${u.id}', 'delete')">Delete</button>
                ` : '<span class="text-muted">Current User</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
        contentEl.innerHTML = html;
    } catch (error) {
        console.error('Failed to render users:', error);
        contentEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function renderAdminAccounts(contentEl) {
    try {
        const { accounts } = await fetchWithAuth(`${API_BASE_URL}/api/accounts`);

        let html = `
      <div class="dashboard-header">
        <h2>Account Management</h2>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Account #</th>
            <th>Owner</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map(a => `
            <tr>
              <td>${a.account_number}</td>
              <td>${a.owner_first_name} ${a.owner_last_name}</td>
              <td>RWF ${Number(a.balance).toLocaleString()}</td>
              <td><span class="status-badge ${a.status}">${a.status}</span></td>
              <td class="actions">
                <button class="button-small ${a.status === 'active' ? 'button-warning' : 'button-success'}"
                        onclick="handleAccountAction('${a.id}', '${a.status === 'active' ? 'deactivate' : 'activate'}')">
                  ${a.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button class="button-small button-danger" onclick="handleAccountAction('${a.id}', 'delete')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
        contentEl.innerHTML = html;
    } catch (error) {
        console.error('Failed to render accounts:', error);
        contentEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// Actions
async function handleAdminCreateUser(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        await fetchWithAuth(`${API_BASE_URL}/api/auth/admin/users`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        alert('User created successfully! They will need to verify their email.');
        closeModal('create-user-modal');
        form.reset();
        switchAdminTab('users'); // Refresh
    } catch (error) {
        console.error('Failed to create user:', error);
        alert(`Error: ${error.message}`);
    }
}

async function handleUserAction(userId, action) {
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }

    let method = 'PATCH';
    let endpoint = `${API_BASE_URL}/api/admin/users/${userId}/${action}`;

    if (action === 'delete') {
        method = 'DELETE';
        endpoint = `${API_BASE_URL}/api/admin/users/${userId}`;
    }

    try {
        await fetchWithAuth(endpoint, { method });
        alert(`User ${action}d successfully.`);
        switchAdminTab('users'); // Refresh
    } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        alert(`Error: ${error.message}`);
    }
}

async function handleAccountAction(accountId, action) {
    if (!confirm(`Are you sure you want to ${action} this account?`)) {
        return;
    }

    let method = 'PATCH';
    let endpoint = `${API_BASE_URL}/api/admin/accounts/${accountId}/${action}`;

    if (action === 'delete') {
        method = 'DELETE';
        endpoint = `${API_BASE_URL}/api/admin/accounts/${accountId}`;
    }

    try {
        await fetchWithAuth(endpoint, { method });
        alert(`Account ${action}d successfully.`);
        switchAdminTab('accounts'); // Refresh
    } catch (error) {
        console.error(`Failed to ${action} account:`, error);
        alert(`Error: ${error.message}`);
    }
}

// Modal Helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
