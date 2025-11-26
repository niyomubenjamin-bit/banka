// Banka Frontend - Authentication Service
// Handles JWT tokens and user session data.

const API_BASE_URL = 'http://localhost:3000';

function saveSession(token, user) {
  if (token && user) {
    localStorage.setItem('banka-token', token);
    localStorage.setItem('banka-user', JSON.stringify(user));
  }
}

function getSession() {
  const token = localStorage.getItem('banka-token');
  const userStr = localStorage.getItem('banka-user');

  if (token && userStr) {
    try {
      return {
        token,
        user: JSON.parse(userStr),
      };
    } catch (e) {
      console.error('Could not parse user session data.', e);
      clearSession();
      return null;
    }
  }
  return null;
}

function clearSession() {
  localStorage.removeItem('banka-token');
  localStorage.removeItem('banka-user');
}

function isLoggedIn() {
  return getSession() !== null;
}

function getUserRole() {
  const session = getSession();
  return session ? session.user.role : null;
}

function redirectToDashboard() {
  if (!isLoggedIn()) {
    window.location.href = 'signin.html';
    return;
  }

  const role = getUserRole();
  switch (role) {
    case 'admin':
      window.location.href = 'admin_dashboard.html';
      break;
    case 'staff':
      window.location.href = 'staff_dashboard.html';
      break;
    case 'client':
    default:
      window.location.href = 'dashboard.html';
      break;
  }
}

// Global check on page load
// Redirect to signin if not logged in and not on a public page
function protectPage() {
  const publicPages = [
    '/',
    'index.html',
    'signin.html',
    'signup.html',
    'verify-otp.html',
    'contact.html',
    'about.html',
    'features.html',
    'how-it-works.html',
    'forgot-password.html',
  ];

  const currentPath = window.location.pathname;
  // Check if current path ends with any of the public pages
  const isPublicPage = publicPages.some(page => {
    if (page === '/') return currentPath === '/' || currentPath.endsWith('/index.html'); // Handle root specifically
    return currentPath.endsWith(page);
  });

  if (isLoggedIn()) {
    // If logged in, but on signin/signup page, redirect to dashboard
    if (currentPath.endsWith('signin.html') || currentPath.endsWith('signup.html')) {
      redirectToDashboard();
    }
    return;
  }

  // If not logged in and not on a public page, redirect to signin
  if (!isPublicPage) {
    window.location.href = 'signin.html';
  } else if (currentPath.endsWith('signin.html')) {
    // If on the signin page, check if there's a pending OTP verification
    const pendingOtpEmail = sessionStorage.getItem('pendingOtpEmail');
    if (pendingOtpEmail) {
      document.getElementById('otp-email-hidden').value = pendingOtpEmail;
      hideLoginForm();
      showOtpSection();
    } else {
      showLoginForm();
      hideOtpSection();
    }
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (data.password !== data.confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        accountType: data.accountType,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Signup failed');
    }

    alert(result.message); // Should contain info about account details email
    window.location.href = 'signin.html'; // Redirect to signin after successful signup
  } catch (error) {
    console.error('Signup Error:', error);
    alert(`Error: ${error.message}`);
  }
}

async function handleVerifyOtp(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        otp: data.otp,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'OTP verification failed');
    }

    saveSession(result.token, result.user);
    localStorage.removeItem('banka-verify-email');

    alert('Email verified successfully! Welcome to Banka.');
    redirectToDashboard();
  } catch (error) {
    console.error('OTP Verification Error:', error);
    alert(`Error: ${error.message}`);
  }
}

function initOtpPage() {
  const email = localStorage.getItem('banka-verify-email');
  if (email) {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.value = email;
    }
  } else {
    // If there's no email, the user probably landed here by mistake.
    // window.location.href = '/signup.html';
    console.warn('No email found for OTP verification. User should start from signup.');
  }
}

// Helper functions for showing/hiding parts of the login form
function showOtpSection() {
  const otpForm = document.getElementById('otp-form');
  if (otpForm) {
    otpForm.style.display = 'block';
    // Clear any previous OTP input
    const otpInput = document.getElementById('otp');
    if (otpInput) otpInput.value = '';
  }
}

function hideOtpSection() {
  const otpForm = document.getElementById('otp-form');
  if (otpForm) {
    otpForm.style.display = 'none';
  }
}

function showLoginForm() {
  const signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.style.display = 'block';
  }
}

function hideLoginForm() {
  const signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.style.display = 'none';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const loginEmail = data.email; // Store email for potential OTP step

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    const result = await response.json();

    if (response.status === 202) {
      // OTP required for login
      alert(result.message);
      hideLoginForm();
      showOtpSection();
      document.getElementById('otp-email-hidden').value = loginEmail;
      sessionStorage.setItem('pendingOtpEmail', loginEmail);
    } else if (response.ok) {
      // Direct login successful (shouldn't happen with current backend logic, but robust)
      saveSession(result.token, result.user);
      redirectToDashboard();
    } else {
      // Login failed with other status codes
      alert(result.message || 'Login failed');
      console.error('Login Error:', result.message);
      showLoginForm(); // Show login form again on error
      hideOtpSection();
    }
  } catch (error) {
    console.error('Login Error:', error);
    alert(`Error: ${error.message}`);
    // Ensure form is visible if an unexpected error occurs
    showLoginForm();
    hideOtpSection();
  }
}

function handleLogout() {
  clearSession();
  alert('You have been logged out.');
  window.location.href = 'index.html';
}

async function handleLoginOtpVerification(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        otp: data.otp,
      }),
    });

    const result = await response.json();
    console.log('OTP Verification Result:', result);

    if (!response.ok) {
      throw new Error(result.message || 'OTP verification failed');
    }

    saveSession(result.token, result.user);
    redirectToDashboard();
  } catch (error) {
    console.error('OTP Verification Error:', error);
    alert(`Error: ${error.message}`);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: data.email }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }

    alert(result.message);

    // Switch to reset password form
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'block';
    document.getElementById('reset-email').value = data.email;

  } catch (error) {
    console.error('Forgot Password Error:', error);
    alert(`Error: ${error.message}`);
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Password reset failed');
    }

    alert('Password reset successfully! Logging you in...');
    saveSession(result.token, result.user);
    redirectToDashboard();

  } catch (error) {
    console.error('Reset Password Error:', error);
    alert(`Error: ${error.message}`);
  }
}

// Event listener for resend OTP button
document.addEventListener('DOMContentLoaded', () => {
  const resendOtpButton = document.getElementById('resend-otp-button');
  if (resendOtpButton) {
    resendOtpButton.addEventListener('click', async () => {
      const email = document.getElementById('otp-email-hidden').value;
      if (!email) {
        alert('Email not found for OTP resend.');
        return;
      }
      try {
        // Re-call the login endpoint to trigger OTP resend
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password: 'dummy_for_resend_otp' }), // Dummy password for resend
        });

        const result = await response.json();

        if (response.status === 202) {
          alert('New OTP sent to your email.');
        } else {
          throw new Error(result.message || 'Failed to resend OTP.');
        }
      } catch (error) {
        console.error('Resend OTP Error:', error);
        alert(`Error: ${error.message}`);
      }
    });
  }

  // Initial check on DOMContentLoaded to see if OTP section should be visible
  if (window.location.pathname.endsWith('signin.html')) {
    // Always show login form and hide OTP form by default
    showLoginForm();
    hideOtpSection();

    const pendingOtpEmail = sessionStorage.getItem('pendingOtpEmail');
    if (pendingOtpEmail) {
      document.getElementById('otp-email-hidden').value = pendingOtpEmail;
      hideLoginForm(); // Hide login form again if OTP pending
      showOtpSection(); // Show OTP section if pending
    }
  }
});
