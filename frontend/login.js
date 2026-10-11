/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Interface 2: Login Page Logic
 * File: login.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initPasswordToggle();
});

/**
 * Initializes form validation and submission handling
 */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const submitBtn = document.getElementById('submitLoginBtn');
  const btnText = document.getElementById('btnText');
  const devBanner = document.getElementById('devNoticeBanner');
  const devNoticeText = document.getElementById('devNoticeText');

  if (!form || !emailInput || !passwordInput) return;

  // Real-time validation clearance on typing
  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('input-error')) {
      validateEmail(false);
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordInput.classList.contains('input-error')) {
      validatePassword(false);
    }
  });

  emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim().length > 0) {
      validateEmail(true);
    }
  });

  passwordInput.addEventListener('blur', () => {
    if (passwordInput.value.length > 0) {
      validatePassword(true);
    }
  });

  // Validation functions
  function validateEmail(showMessage = true) {
    const value = emailInput.value.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!value) {
      if (showMessage) {
        showError(emailInput, emailError, 'Email address is required.');
      }
      return false;
    }

    if (!emailRegex.test(value)) {
      if (showMessage) {
        showError(emailInput, emailError, 'Please enter a valid email address (e.g. you@example.com).');
      }
      return false;
    }

    clearError(emailInput, emailError);
    return true;
  }

  function validatePassword(showMessage = true) {
    const value = passwordInput.value;

    if (!value) {
      if (showMessage) {
        showError(passwordInput, passwordError, 'Password is required.');
      }
      return false;
    }

    if (value.length < 6) {
      if (showMessage) {
        showError(passwordInput, passwordError, 'Password must be at least 6 characters.');
      }
      return false;
    }

    clearError(passwordInput, passwordError);
    return true;
  }

  function showError(input, errorElement, message) {
    input.classList.add('input-error');
    input.setAttribute('aria-invalid', 'true');
    errorElement.textContent = message;
  }

  function clearError(input, errorElement) {
    input.classList.remove('input-error');
    input.removeAttribute('aria-invalid');
    errorElement.textContent = '';
  }

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isEmailValid = validateEmail(true);
    const isPasswordValid = validatePassword(true);

    if (!isEmailValid || !isPasswordValid) {
      // Set focus to the first invalid input for accessibility
      if (!isEmailValid) {
        emailInput.focus();
      } else {
        passwordInput.focus();
      }
      return;
    }

    // Begin Submission Loading State
    setLoadingState(true);

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    TaskFlowAPI.login({ email, password })
      .then((res) => {
        setLoadingState(false);
        if (devBanner && devNoticeText) {
          devBanner.className = 'dev-notice-banner notice-success';
          devNoticeText.innerHTML = `<strong>Signed in successfully!</strong> Redirecting to workspace...`;
          devBanner.style.display = 'flex';
        }
        const urlParams = new URLSearchParams(window.location.search);
        const nextUrl = urlParams.get('next') || 'dashboard.html';
        setTimeout(() => {
          window.location.href = nextUrl;
        }, 500);
      })
      .catch((err) => {
        setLoadingState(false);
        const message = err.message || 'Invalid email or password.';
        if (devBanner && devNoticeText) {
          devBanner.className = 'dev-notice-banner notice-error';
          devBanner.style.borderColor = '#DC2626';
          devBanner.style.backgroundColor = '#FEF2F2';
          devNoticeText.innerHTML = `<strong style="color: #DC2626;">Sign In Failed:</strong> ${escapeHtml(message)}`;
          devBanner.style.display = 'flex';
          devBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          showError(passwordInput, passwordError, message);
        }
      });
  });

  function setLoadingState(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      btnText.textContent = 'Signing in...';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      btnText.textContent = 'Sign In';
    }
  }

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.innerText = string;
    return div.innerHTML;
  }
}

/**
 * Initializes Password Eye Visibility Toggle
 */
function initPasswordToggle() {
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('passwordInput');

  if (!toggleBtn || !passwordInput) return;

  const eyeOpen = toggleBtn.querySelector('.eye-open');
  const eyeClosed = toggleBtn.querySelector('.eye-closed');

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isPassword = passwordInput.getAttribute('type') === 'password';

    if (isPassword) {
      passwordInput.setAttribute('type', 'text');
      toggleBtn.setAttribute('aria-label', 'Hide password');
      toggleBtn.setAttribute('title', 'Hide password');
      if (eyeOpen) eyeOpen.style.display = 'none';
      if (eyeClosed) eyeClosed.style.display = 'block';
    } else {
      passwordInput.setAttribute('type', 'password');
      toggleBtn.setAttribute('aria-label', 'Show password');
      toggleBtn.setAttribute('title', 'Show password');
      if (eyeOpen) eyeOpen.style.display = 'block';
      if (eyeClosed) eyeClosed.style.display = 'none';
    }

    // Keep focus inside password input without losing cursor position
    passwordInput.focus();
  });
}
