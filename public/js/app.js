const appRoot = document.getElementById('app-root');
const yearSpan = document.getElementById('year');
const navLogin = document.getElementById('nav-login');
const navSignup = document.getElementById('nav-signup');
const navDashboard = document.getElementById('nav-dashboard');
const navLogout = document.getElementById('nav-logout');

// Simple client-side auth state
let authToken = window.localStorage.getItem('bankaToken') || null;
let currentUser = null;
nyearSpan.textContent = new Date().getFullYear();

function setAuthState({ token, user }) {
  authToken = token || null;
  currentUser = user || null;

  if (authToken) {
    window.localStorage.setItem('bankaToken', authToken);
  } else {
    window.localStorage.removeItem('bankaToken');
  }

  updateNavForAuth();
}

function updateNavForAuth() {
  const isLoggedIn = Boolean(authToken);

  if (isLoggedIn) {
    navLogin.classList.add('hidden');
    navSignup.classList.add('hidden');
    navDashboard.classList.remove('hidden');
    navLogout.classList.remove('hidden');
  } else {
    navLogin.classList.remove('hidden');
    navSignup.classList.remove('hidden');
    navDashboard.classList.add('hidden');
    navLogout.classList.add('hidden');
  }
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // ignore JSON parse errors for non-JSON responses
  }

  if (!response.ok) {
    const message = (data && data.message) || 'Request failed';
    throw new Error(message);
  }

  return data;
}

function renderWelcome() {
  appRoot.innerHTML = `
    <section class="card">
      <h1>Welcome to Banka</h1>
      <p>A lightweight core banking web application for clients, staff, and admins.</p>
      <p>Use the navigation to sign up or log in.</p>
    </section>
  `;
}

function renderLogin() {
  appRoot.innerHTML = `
    <section class="card">
      <h2>Login</h2>
      <form id="login-form" class="form">
        <div class="form__field">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" required />
        </div>
        <div class="form__field">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" required />
        </div>
        <button type="submit" class="button-primary">Sign In</button>
        <button type="button" id="forgot-password-link">Forgot password?</button>
        <p id="login-error" style="color: #b91c1c; margin-top: 0.5rem;"></p>
      </form>
    </section>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      setAuthState({ token: data.token, user: data.user });
      renderDashboardPlaceholder();
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed';
    }
  });

  const forgotBtn = document.getElementById('forgot-password-link');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      errorEl.textContent = 'Forgot password flow not wired to UI yet. Use API directly.';
    });
  }
}

function renderSignup() {
  appRoot.innerHTML = `
    <section class="card">
      <h2>Sign Up</h2>
      <form id="signup-form" class="form">
        <div class="form__field">
          <label for="first-name">First Name</label>
          <input type="text" id="first-name" required />
        </div>
        <div class="form__field">
          <label for="last-name">Last Name</label>
          <input type="text" id="last-name" required />
        </div>
        <div class="form__field">
          <label for="signup-email">Email</label>
          <input type="email" id="signup-email" required />
        </div>
        <div class="form__field">
          <label for="signup-password">Password</label>
          <input type="password" id="signup-password" required />
        </div>
        <button type="submit" class="button-primary">Create Account</button>
        <p id="signup-message" style="margin-top: 0.5rem;"></p>
      </form>
    </section>
  `;

  const form = document.getElementById('signup-form');
  const messageEl = document.getElementById('signup-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageEl.style.color = '#1f2933';
    messageEl.textContent = '';

    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
      await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: { firstName, lastName, email, password },
      });

      renderOtpVerification(email);
    } catch (err) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = err.message || 'Signup failed';
    }
  });
}

function renderOtpVerification(email) {
  appRoot.innerHTML = `
    <section class="card">
      <h2>Verify Email</h2>
      <p>We have sent a 6-digit verification code to <strong>${email}</strong>.</p>
      <form id="otp-form" class="form" style="margin-top: 1rem;">
        <div class="form__field">
          <label for="otp-code">Verification Code</label>
          <input type="text" id="otp-code" required maxlength="6" />
        </div>
        <button type="submit" class="button-primary">Verify</button>
        <p id="otp-message" style="margin-top: 0.5rem;"></p>
      </form>
    </section>
  `;

  const form = document.getElementById('otp-form');
  const messageEl = document.getElementById('otp-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageEl.style.color = '#1f2933';
    messageEl.textContent = '';

    const otp = document.getElementById('otp-code').value.trim();

    try {
      const data = await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: { email, otp },
      });

      // Auto-login after successful verification using returned token/user
      setAuthState({ token: data.token, user: data.user });
      messageEl.textContent = 'Email verified! Redirecting to dashboard...';
      setTimeout(() => {
        renderDashboardPlaceholder();
      }, 800);
    } catch (err) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = err.message || 'Verification failed';
    }
  });
}

function renderDashboardPlaceholder() {
  appRoot.innerHTML = `
    <section class="card">
      <h2>Dashboard</h2>
      <p>This is a placeholder for role-based dashboards (Client, Staff, Admin).</p>
    </section>
  `;
}

navLogin.addEventListener('click', () => {
  renderLogin();
});

navSignup.addEventListener('click', () => {
  renderSignup();
});

navDashboard.addEventListener('click', () => {
  renderDashboardPlaceholder();
});

navLogout.addEventListener('click', () => {
  setAuthState({ token: null, user: null });
  renderWelcome();
});

// Initial render
updateNavForAuth();
renderWelcome();
