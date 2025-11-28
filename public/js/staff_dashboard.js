// Banka Frontend - Staff Dashboard Service

// Helper to create authenticated API requests (reused logic)
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

    // Cache busting for GET requests
    if (options.method === 'GET' || !options.method) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}_t=${Date.now()}`;
    }

    const response = await fetch(url, { ...options, headers, cache: 'no-store' });

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

function initStaffDashboard() {
    protectPage(); // From auth.js

    const session = getSession();
    if (!session || session.user.role !== 'staff') {
        window.location.href = 'dashboard.html'; // Redirect non-staff
        return;
    }

    document.getElementById('staff-name').textContent = `${session.user.first_name} ${session.user.last_name}`;

    // Default to overview view
    switchStaffTab('overview');
}

function switchStaffTab(tab) {
    // Update active link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.toLowerCase() === tab) {
            link.classList.add('active');
        }
    });

    const contentEl = document.getElementById('dashboard-content');

    if (tab === 'overview') {
        renderStaffOverview(contentEl);
    } else if (tab === 'accounts') {
        renderStaffAccounts(contentEl);
    } else if (tab === 'users') {
        renderStaffUsers(contentEl);
    }
}

function renderStaffOverview(contentEl) {
    const session = getSession();
    const user = session ? session.user : { first_name: 'Staff' };

    contentEl.innerHTML = `
        <div class="dashboard-header">
            <h2>Welcome, ${user.first_name}!</h2>
            <p>Here is a quick overview of your dashboard.</p>
        </div>
        
        <div class="overview-cards">
            <div class="card" onclick="switchStaffTab('accounts')" style="cursor: pointer;">
                <div class="icon-container" style="background-color: var(--primary-color); color: white; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-bottom: 1rem;">
                    <i class="fas fa-wallet fa-lg"></i>
                </div>
                <h3>Manage Accounts</h3>
                <p>View, credit, or debit client accounts.</p>
            </div>
            
            <div class="card" onclick="switchStaffTab('users')" style="cursor: pointer;">
                <div class="icon-container" style="background-color: var(--accent-color); color: white; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-bottom: 1rem;">
                    <i class="fas fa-users fa-lg"></i>
                </div>
                <h3>View Users</h3>
                <p>Browse the list of all registered users.</p>
            </div>
        </div>
    `;
}

async function renderStaffAccounts(contentEl) {
    contentEl.innerHTML = `<p>Loading all accounts...</p>`;

    try {
        const { accounts } = await fetchWithAuth(`${API_BASE_URL}/api/accounts`);

        let html = `
      <div class="dashboard-header">
        <h2>All User Accounts (Cashier View)</h2>
      </div>
    `;

        if (!accounts || accounts.length === 0) {
            html += '<p>No bank accounts found in the system.</p>';
        } else {
            html += '<div class="table-responsive">';
            html += '<table class="data-table">';
            html += '<thead><tr><th>Account #</th><th>Owner</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>';
            html += '<tbody>';
            accounts.forEach(account => {
                html += `
          <tr>
            <td>${account.account_number}</td>
            <td>${account.owner_first_name} ${account.owner_last_name} <br><small class="text-muted">${account.owner_email}</small></td>
            <td class="font-weight-bold">RWF ${Number(account.balance).toLocaleString()}</td>
            <td><span class="status-badge ${account.status}">${account.status}</span></td>
            <td class="actions">
              <button class="button-small" onclick="viewAccount('${account.id}')"><i class="fas fa-eye"></i> View</button>
              <button class="button-small" onclick="showTransactionForm('${account.id}', 'credit')"><i class="fas fa-plus-circle"></i> Credit</button>
              <button class="button-small button-danger" onclick="showTransactionForm('${account.id}', 'debit')"><i class="fas fa-minus-circle"></i> Debit</button>
            </td>
          </tr>
        `;
            });
            html += '</tbody></table></div>';
        }

        html += `<div id="staff-action-details" style="margin-top: 2rem;"></div>`;
        contentEl.innerHTML = html;

    } catch (error) {
        console.error('Failed to render staff dashboard:', error);
        contentEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function renderStaffUsers(contentEl) {
    contentEl.innerHTML = `<p>Loading all users...</p>`;

    try {
        const { users } = await fetchWithAuth(`${API_BASE_URL}/api/users`);

        let html = `
      <div class="dashboard-header">
        <h2>All Users (Read-Only)</h2>
      </div>
    `;

        if (!users || users.length === 0) {
            html += '<p>No users found in the system.</p>';
        } else {
            html += '<div class="table-responsive">';
            html += '<table class="data-table">';
            html += '<thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>';
            html += '<tbody>';
            users.forEach(user => {
                html += `
          <tr>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td><span class="status-badge ${user.status}">${user.status}</span></td>
            <td class="actions">
              <button class="button-small" onclick="viewUser('${user.id}')">View</button>
            </td>
          </tr>
        `;
            });
            html += '</tbody></table></div>';
        }

        contentEl.innerHTML = html;

    } catch (error) {
        console.error('Failed to render users:', error);
        contentEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function viewAccount(accountId) {
    const modal = document.getElementById('account-details-modal');
    const content = document.getElementById('account-details-content');
    content.innerHTML = '<p>Loading...</p>';
    openModal('account-details-modal');

    try {
        const [accountRes, transactionsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/accounts/${accountId}`),
            fetchWithAuth(`${API_BASE_URL}/api/accounts/${accountId}/transactions`)
        ]);

        const { account } = accountRes;
        const { transactions } = transactionsRes;

        // Ensure UI consistency: Sync account balance with the latest transaction
        if (transactions && transactions.length > 0) {
            const latestTx = transactions[0]; // Transactions are ordered by created_at DESC
            // If there is a mismatch, prefer the transaction history as it's the ledger of truth
            if (Number(account.balance) !== Number(latestTx.new_balance)) {
                console.warn(`Balance mismatch detected. Account: ${account.balance}, Tx: ${latestTx.new_balance}. Syncing to Tx.`);
                account.balance = latestTx.new_balance;
            }
        }

        let html = `
            <div class="details-view">
                <p><strong>Account Number:</strong> ${account.account_number}</p>
                <p><strong>Owner:</strong> ${account.owner_first_name} ${account.owner_last_name} (${account.owner_email})</p>
                <p><strong>Type:</strong> ${account.type}</p>
                <p><strong>Balance:</strong> RWF ${Number(account.balance).toLocaleString()}</p>
                <p><strong>Status:</strong> <span class="status-badge ${account.status}">${account.status}</span></p>
                <p><strong>Created:</strong> ${new Date(account.created_at).toLocaleDateString()}</p>
                <p><strong>Account ID:</strong> ${account.id}</p>
            </div>
            <hr>
            <h3>Transaction History</h3>
        `;

        if (!transactions || transactions.length === 0) {
            html += '<p>No transactions found for this account.</p>';
        } else {
            html += '<table class="transactions-table" style="width: 100%; font-size: 0.9rem;">';
            html += '<thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>New Balance</th><th>Cashier</th></tr></thead>';
            html += '<tbody>';
            transactions.forEach(tx => {
                let cashierDisplay = 'System';
                if (tx.cashier_id) {
                    if (tx.cashier_first_name && tx.cashier_last_name) {
                        cashierDisplay = `${tx.cashier_first_name} ${tx.cashier_last_name}`;
                    } else {
                        cashierDisplay = 'Staff';
                    }
                }

                html += `
                    <tr>
                        <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                        <td>${tx.type}</td>
                        <td>${Number(tx.amount).toLocaleString()}</td>
                        <td>${Number(tx.new_balance).toLocaleString()}</td>
                        <td>${cashierDisplay}</td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
        }

        content.innerHTML = html;

    } catch (error) {
        content.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function viewUser(userId) {
    const modal = document.getElementById('user-details-modal');
    const content = document.getElementById('user-details-content');
    content.innerHTML = '<p>Loading...</p>';
    openModal('user-details-modal');

    try {
        const { user } = await fetchWithAuth(`${API_BASE_URL}/api/users/${userId}`);
        content.innerHTML = `
            <div class="details-view">
                <p><strong>Name:</strong> ${user.first_name} ${user.last_name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> <span class="role-badge ${user.role}">${user.role}</span></p>
                <p><strong>Status:</strong> <span class="status-badge ${user.status}">${user.status}</span></p>
                <p><strong>Email Verified:</strong> ${user.email_verified ? 'Yes' : 'No'}</p>
                <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                <p><strong>User ID:</strong> ${user.id}</p>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function showTransactionForm(accountId, type) {
    const detailsEl = document.getElementById('staff-action-details');
    if (!detailsEl) return;

    const title = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize type

    detailsEl.innerHTML = `
        <div class="card" style="max-width: 500px;">
            <h4>${title} Account</h4>
            <form id="staff-tx-form" onsubmit="handleStaffTransaction(event, '${type}')">
                <input type="hidden" name="accountId" value="${accountId}">
                <div class="form-group">
                    <label for="tx-amount">Amount</label>
                    <input type="number" id="tx-amount" name="amount" required step="0.01" min="0.01">
                </div>
                <div class="form-group">
                    <label for="tx-description">Description (Optional)</label>
                    <input type="text" id="tx-description" name="description">
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="button ${type === 'debit' ? 'button-danger' : 'button-primary'}">${title}</button>
                    <button type="button" class="button button-secondary" onclick="document.getElementById('staff-action-details').innerHTML = ''">Cancel</button>
                </div>
            </form>
        </div>
    `;
    // Scroll to form
    detailsEl.scrollIntoView({ behavior: 'smooth' });
}

async function handleStaffTransaction(event, type) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const { accountId, amount, description } = data;

    try {
        const endpoint = `${API_BASE_URL}/api/accounts/${accountId}/${type}`;
        await fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                amount: parseFloat(amount),
                description,
            }),
        });

        alert(`Account ${type}ed successfully!`);
        renderStaffAccounts(document.getElementById('dashboard-content')); // Refresh the accounts view
    } catch (error) {
        console.error(`Failed to ${type} account:`, error);
        alert(`Error: ${error.message}`);
    }
}
