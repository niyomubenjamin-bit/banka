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

function initStaffDashboard() {
    protectPage(); // From auth.js

    const session = getSession();
    if (!session || session.user.role !== 'staff') {
        window.location.href = 'dashboard.html'; // Redirect non-staff
        return;
    }

    document.getElementById('staff-name').textContent = `${session.user.first_name} ${session.user.last_name}`;

    renderStaffDashboard();
}

async function renderStaffDashboard() {
    const contentEl = document.getElementById('dashboard-content');
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
            html += '<table class="accounts-table-full">';
            html += '<thead><tr><th>Account #</th><th>Owner</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>';
            html += '<tbody>';
            accounts.forEach(account => {
                html += `
          <tr>
            <td>${account.account_number}</td>
            <td>${account.owner_first_name} ${account.owner_last_name} (${account.owner_email})</td>
            <td>RWF ${Number(account.balance).toLocaleString()}</td>
            <td><span class="status-badge ${account.status}">${account.status}</span></td>
            <td class="actions">
              <button class="button-small" onclick="showTransactionForm('${account.id}', 'credit')">Credit</button>
              <button class="button-small button-danger" onclick="showTransactionForm('${account.id}', 'debit')">Debit</button>
            </td>
          </tr>
        `;
            });
            html += '</tbody></table>';
        }

        html += `<div id="staff-action-details" style="margin-top: 2rem;"></div>`;
        contentEl.innerHTML = html;

    } catch (error) {
        console.error('Failed to render staff dashboard:', error);
        contentEl.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
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
        renderStaffDashboard(); // Refresh the dashboard
    } catch (error) {
        console.error(`Failed to ${type} account:`, error);
        alert(`Error: ${error.message}`);
    }
}
