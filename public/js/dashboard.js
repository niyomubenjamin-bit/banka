// Banka Frontend - Dashboard Service

// Helper to create authenticated API requests
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
    // Token is invalid or expired
    clearSession();
    window.location.href = '/signin.html';
    throw new Error('Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'An API error occurred.');
  }

  return response.json();
}

// Main function to initialize the dashboard
function initDashboard() {
  protectPage(); // From auth.js

  const session = getSession();
  if (!session) return;

  const { user } = session;

  // Redirect non-clients to their respective dashboards if they land here
  if (user.role === 'admin') {
    window.location.href = 'admin_dashboard.html';
    return;
  } else if (user.role === 'staff') {
    window.location.href = 'staff_dashboard.html';
    return;
  }

  renderClientDashboard();
}

// Render functions for Client role
async function renderClientDashboard() {
  const app = document.getElementById('app');
  const { user } = getSession();

  app.innerHTML = `
        <nav class="dashboard-navbar">
            <div class="navbar-content">
                <div class="navbar-brand">
                    <i class="fas fa-university"></i> Banka
                </div>
                <div class="navbar-links">
                    <a class="nav-link active" onclick="switchClientTab('accounts')">Accounts</a>
                    <a class="nav-link" onclick="switchClientTab('analytics')">Analytics</a>
                    <a class="nav-link" onclick="switchClientTab('settings')">Settings</a>
                    <a class="nav-link" onclick="switchClientTab('support')">Support</a>
                </div>
                <div class="navbar-user">
                    <span class="user-name">${user.first_name} ${user.last_name}</span>
                    <span class="logout-btn" onclick="handleLogout()">Logout</span>
                </div>
            </div>
        </nav>

        <div class="dashboard-container">
            <div id="dashboard-content">
                <!-- Content will be loaded here -->
            </div>
        </div>

        <!-- Transaction Details Modal -->
        <div id="tx-modal" class="modal">
            <div class="modal-content" id="modal-body">
                <!-- Details injected here -->
            </div>
        </div>
    `;

  // Initialize with Accounts view
  switchClientTab('accounts');
}

function switchClientTab(tabName) {
  // Update active state in navbar
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.textContent.toLowerCase() === tabName) {
      link.classList.add('active');
    }
  });

  const contentEl = document.getElementById('dashboard-content');
  if (!contentEl) return;

  contentEl.innerHTML = '<p>Loading...</p>';

  try {
    switch (tabName) {
      case 'accounts':
        renderClientAccounts(contentEl);
        break;
      case 'analytics':
        renderAnalytics(contentEl);
        break;
      case 'settings':
        renderSettings(contentEl);
        break;
      case 'support':
        renderSupport(contentEl);
        break;
    }
  } catch (err) {
    console.error(`Error loading tab ${tabName}:`, err);
    contentEl.innerHTML = `<p style="color: red">Error loading content: ${err.message}</p>`;
  }
}

async function renderClientAccounts(contentEl) {
  try {
    const { accounts } = await fetchWithAuth(`${API_BASE_URL}/api/accounts/me`);

    let accountsHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>My Accounts</h2>
                <button onclick="document.getElementById('create-account-form').style.display = 'block'" class="button button-primary">
                    + New Account
                </button>
            </div>

            <div id="create-account-form" style="display: none; background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--light-border-color);">
                <h3 style="margin-top: 0;">Open New Account</h3>
                <form onsubmit="handleCreateAccount(event)">
                    <div class="form-group">
                        <label>Account Type</label>
                        <select name="type" required>
                            <option value="savings">Savings</option>
                            <option value="current">Current</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="button button-primary">Create</button>
                        <button type="button" class="button button-secondary" onclick="document.getElementById('create-account-form').style.display = 'none'">Cancel</button>
                    </div>
                </form>
            </div>
        `;

    if (accounts.length === 0) {
      accountsHtml += '<p>You have no accounts yet.</p>';
    } else {
      accountsHtml += '<div class="accounts-grid">';

      for (const account of accounts) {
        const { transactions } = await fetchWithAuth(`${API_BASE_URL}/api/accounts/${account.id}/transactions`);
        const recentTx = transactions.slice(0, 5); // Get last 5

        accountsHtml += `
                    <div class="account-card">
                        <div class="card-header">
                            <span class="account-type">${account.type}</span>
                            <span class="status-badge ${account.status}">${account.status}</span>
                        </div>
                        <div class="card-balance">
                            <div class="balance-label">Available Balance</div>
                            <div class="balance-amount">RWF ${Number(account.balance).toLocaleString()}</div>
                        </div>
                        <span class="account-number">Account number : ${account.account_number}</span>
                        
                        <div class="card-actions">
                            <button class="button button-outline btn-block" onclick="toggleTransactions('${account.id}')">
                                View Transactions
                            </button>
                        </div>

                        <div id="tx-list-${account.id}" style="display: none; margin-top: 1.5rem; border-top: 1px solid var(--light-border-color); padding-top: 1rem;">
                            <h4 style="margin-bottom: 1rem;">Recent Activity</h4>
                            ${recentTx.length > 0 ? `
                                <table class="transactions-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentTx.map(tx => `
                                            <tr>
                                                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                                                <td><span style="color: ${tx.type === 'credit' ? 'green' : 'red'}; font-weight: 600; text-transform: capitalize;">${tx.type}</span></td>
                                                <td>RWF ${Number(tx.amount).toLocaleString()}</td>
                                                <td style="text-align: right;">
                                                    <button class="button-small" onclick="showTransactionDetails('${account.id}', '${tx.id}')">View</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: var(--gray-text-color); font-style: italic;">No recent transactions.</p>'}
                        </div>
                    </div>
                `;
      }
      accountsHtml += '</div>';
    }

    contentEl.innerHTML = accountsHtml;

  } catch (err) {
    console.error('Error rendering accounts:', err);
    contentEl.innerHTML = '<p>Failed to load accounts.</p>';
  }
}

function toggleTransactions(accountId) {
  const el = document.getElementById(`tx-list-${accountId}`);
  if (el.style.display === 'none') {
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

async function handleCreateAccount(event) {
  event.preventDefault();
  const type = event.target.type.value;

  try {
    const data = await fetchWithAuth(`${API_BASE_URL}/api/accounts`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });

    if (data) {
      alert('Account created successfully!');
      switchClientTab('accounts'); // Refresh
    }
  } catch (err) {
    alert(err.message);
  }
}

async function renderAnalytics(contentEl) {
  try {
    const { accounts } = await fetchWithAuth(`${API_BASE_URL}/api/accounts/me`);

    if (!accounts || accounts.length === 0) {
      contentEl.innerHTML = '<p>No accounts found to analyze.</p>';
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;

    const txPromises = accounts.map(acc =>
      fetchWithAuth(`${API_BASE_URL}/api/accounts/${acc.id}/transactions`)
        .then(res => res.transactions)
        .catch(() => [])
    );

    const allTransactionsResults = await Promise.all(txPromises);
    const allTransactions = allTransactionsResults.flat();

    allTransactions.forEach(tx => {
      const amount = Number(tx.amount);
      if (tx.type === 'credit') {
        totalIncome += amount;
      } else if (tx.type === 'debit') {
        totalExpense += amount;
      }
    });

    const maxVal = Math.max(totalIncome, totalExpense, 1);
    const incomeHeight = (totalIncome / maxVal) * 100; // Percentage based
    const expenseHeight = (totalExpense / maxVal) * 100;

    contentEl.innerHTML = `
            <div class="analytics-summary">
                <div class="stat-card income">
                    <h3>Total Income</h3>
                    <div class="value">RWF ${totalIncome.toLocaleString()}</div>
                </div>
                <div class="stat-card expense">
                    <h3>Total Expenses</h3>
                    <div class="value">RWF ${totalExpense.toLocaleString()}</div>
                </div>
            </div>

            <div class="chart-container">
                <h3>Financial Overview</h3>
                <div class="simple-bar-chart">
                    <div class="bar-group">
                        <div class="bar-label">RWF ${totalIncome.toLocaleString()}</div>
                        <div class="bar income" style="height: ${incomeHeight}%"></div>
                        <span>Income</span>
                    </div>
                    <div class="bar-group">
                        <div class="bar-label">RWF ${totalExpense.toLocaleString()}</div>
                        <div class="bar expense" style="height: ${expenseHeight}%"></div>
                        <span>Expenses</span>
                    </div>
                </div>
            </div>
        `;

  } catch (err) {
    console.error('Analytics error:', err);
    contentEl.innerHTML = '<p>Failed to load analytics data.</p>';
  }
}

function renderSettings(contentEl) {
  const { user } = getSession();
  const settings = user.settings || {};

  const lowBalance = settings.alert_low_balance === true;
  const txAlert = settings.alert_transaction === true;

  contentEl.innerHTML = `
        <div class="settings-section">
            <h3>Notification Preferences</h3>
            <p>Manage your email and SMS alerts.</p>
            
            <label class="form-checkbox">
                <span class="toggle-label">Low Balance Alerts</span>
                <input type="checkbox" id="alert-low-balance" ${lowBalance ? 'checked' : ''} onchange="toggleSetting('alert_low_balance', this.checked)">
            </label>
            
            <label class="form-checkbox">
                <span class="toggle-label">Transaction Alerts</span>
                <input type="checkbox" id="alert-transaction" ${txAlert ? 'checked' : ''} onchange="toggleSetting('alert_transaction', this.checked)">
            </label>
        </div>
    `;
}

async function toggleSetting(key, value) {
  const { user } = getSession();
  const currentSettings = user.settings || {};

  const newSettings = {
    ...currentSettings,
    [key]: value
  };

  try {
    const { user: updatedUser } = await fetchWithAuth(`${API_BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      body: JSON.stringify({ settings: newSettings }),
    });

    if (updatedUser) {
      // Update session with new user data
      const session = getSession();
      session.user = updatedUser;
      localStorage.setItem('banka_session', JSON.stringify(session));
      console.log(`Setting ${key} updated to ${value}`);
    }
  } catch (err) {
    console.error('Failed to update settings:', err);
    alert('Failed to save setting. Please try again.');
    // Revert checkbox state visually if needed, but for now simple alert is enough
    // Ideally we would re-render the settings to sync with server state
    const contentEl = document.getElementById('dashboard-content');
    if (contentEl) renderSettings(contentEl);
  }
}

function renderSupport(contentEl) {
  contentEl.innerHTML = `
        <div class="support-container">
            <div class="support-header">
                <h2>Contact Support</h2>
                <p>We're here to help! Send us a message and we'll get back to you as soon as possible.</p>
            </div>
            
            <div class="support-content">
                <div class="support-info">
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <h4>Email Us</h4>
                            <p>niyomubenjamin@gmail.com</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <div>
                            <h4>Call Us</h4>
                            <p>+250 782491807</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <div>
                            <h4>Working Hours</h4>
                            <p>Mon - Fri: 8am - 6pm</p>
                        </div>
                    </div>
                </div>

                <div class="support-form-card">
                    <form onsubmit="handleSupportSubmit(event)" id="support-form">
                        <div class="form-group">
                            <label>Subject</label>
                            <select name="subject" required class="form-select">
                                <option value="" disabled selected>Select a topic</option>
                                <option value="General Inquiry">General Inquiry</option>
                                <option value="Technical Issue">Technical Issue</option>
                                <option value="Account Problem">Account Problem</option>
                                <option value="Feedback">Feedback</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Message</label>
                            <textarea name="message" required rows="6" placeholder="Please describe your issue in detail..."></textarea>
                        </div>
                        <button type="submit" class="button button-primary btn-block" id="support-submit-btn">
                            <span>Send Message</span>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

async function handleSupportSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const btn = document.getElementById('support-submit-btn');
  const originalBtnContent = btn.innerHTML;

  // Set loading state
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  const subject = form.subject.value;
  const message = form.message.value;
  const { user } = getSession();

  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/contact`, {
      method: 'POST',
      body: JSON.stringify({
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        subject,
        message
      }),
    });

    if (response) {
      // Show success message (could be improved with a toast/modal, but alert is okay for now)
      alert('Message sent successfully! We will contact you shortly.');
      form.reset();
    }
  } catch (err) {
    console.error('Error sending support message:', err);
    alert('Failed to send message. Please try again later.');
  } finally {
    // Reset button state
    btn.disabled = false;
    btn.innerHTML = originalBtnContent;
  }
}

async function showTransactionDetails(accountId, transactionId) {
  const modal = document.getElementById('tx-modal');
  const modalBody = document.getElementById('modal-body');

  if (!modal || !modalBody) return;

  modal.style.display = "block";

  // Reset content with header structure
  modalBody.innerHTML = `
        <div class="modal-header">
            <h3>Transaction Details</h3>
            <span class="close-button" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body">
            <p>Loading details...</p>
        </div>
    `;

  try {
    const { transaction } = await fetchWithAuth(`${API_BASE_URL}/api/accounts/${accountId}/transactions/${transactionId}`);

    const modalContentBody = modalBody.querySelector('.modal-body');
    modalContentBody.innerHTML = `
            <div class="tx-details-grid">
                <div class="tx-detail-item">
                    <span class="tx-detail-label">Transaction ID</span>
                    <span class="tx-detail-value">#${transaction.id}</span>
                </div>
                <div class="tx-detail-item">
                    <span class="tx-detail-label">Date</span>
                    <span class="tx-detail-value">${new Date(transaction.created_at).toLocaleString()}</span>
                </div>
                <div class="tx-detail-item">
                    <span class="tx-detail-label">Type</span>
                    <span class="tx-detail-value" style="text-transform: capitalize;">${transaction.type}</span>
                </div>
                <div class="tx-detail-item">
                    <span class="tx-detail-label">Amount</span>
                    <span class="tx-detail-value">RWF ${Number(transaction.amount).toLocaleString()}</span>
                </div>
                <div class="tx-detail-item">
                    <span class="tx-detail-label">Old Balance</span>
                    <span class="tx-detail-value">RWF ${Number(transaction.old_balance).toLocaleString()}</span>
                </div>
                <div class="tx-detail-item">
                    <span class="tx-detail-label">New Balance</span>
                    <span class="tx-detail-value">RWF ${Number(transaction.new_balance).toLocaleString()}</span>
                </div>
                <div class="tx-detail-item" style="grid-column: span 2;">
                    <span class="tx-detail-label">Description</span>
                    <span class="tx-detail-value">${transaction.description || 'N/A'}</span>
                </div>
            </div>
        `;
  } catch (err) {
    const modalContentBody = modalBody.querySelector('.modal-body');
    modalContentBody.innerHTML = `<p style="color: red">Error: ${err.message}</p>`;
  }
}

function closeModal() {
  const modal = document.getElementById('tx-modal');
  if (modal) modal.style.display = "none";
}

window.onclick = function (event) {
  const modal = document.getElementById('tx-modal');
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
