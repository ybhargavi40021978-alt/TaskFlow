/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Interface 3: Registration / Sign Up Page Logic
 * File: register.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initRegisterForm();
  initPasswordToggles();
});

/**
 * Initializes registration form validation, password strength checking, and submission handling
 */
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  const fullNameInput = document.getElementById('fullNameInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const termsCheckbox = document.getElementById('termsCheckbox');

  const fullNameError = document.getElementById('fullNameError');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const termsError = document.getElementById('termsError');

  const strengthMeter = document.getElementById('strengthMeter');
  const strengthLabel = document.getElementById('passwordStrengthLabel');

  const submitBtn = document.getElementById('submitRegisterBtn');
  const btnText = document.getElementById('btnText');
  const devBanner = document.getElementById('devNoticeBanner');
  const devNoticeText = document.getElementById('devNoticeText');

  if (!form || !fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;

  // Real-time clearance of validation errors on input
  fullNameInput.addEventListener('input', () => {
    if (fullNameInput.classList.contains('input-error')) validateFullName(false);
  });

  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('input-error')) validateEmail(false);
  });

  passwordInput.addEventListener('input', () => {
    updatePasswordStrength(passwordInput.value);
    if (passwordInput.classList.contains('input-error')) validatePassword(false);
    if (confirmPasswordInput.value.length > 0 && confirmPasswordInput.classList.contains('input-error')) {
      validateConfirmPassword(false);
    }
  });

  confirmPasswordInput.addEventListener('input', () => {
    if (confirmPasswordInput.classList.contains('input-error')) validateConfirmPassword(false);
  });

  termsCheckbox.addEventListener('change', () => {
    if (termsCheckbox.checked) {
      clearError(termsCheckbox, termsError);
    }
  });

  // Blur validations
  fullNameInput.addEventListener('blur', () => {
    if (fullNameInput.value.trim().length > 0) validateFullName(true);
  });

  emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim().length > 0) validateEmail(true);
  });

  passwordInput.addEventListener('blur', () => {
    if (passwordInput.value.length > 0) validatePassword(true);
  });

  confirmPasswordInput.addEventListener('blur', () => {
    if (confirmPasswordInput.value.length > 0) validateConfirmPassword(true);
  });

  // Validation functions
  function validateFullName(showMessage = true) {
    const val = fullNameInput.value.trim();
    if (!val) {
      if (showMessage) showError(fullNameInput, fullNameError, 'Full name is required.');
      return false;
    }
    if (val.length < 2) {
      if (showMessage) showError(fullNameInput, fullNameError, 'Please enter your full name (at least 2 characters).');
      return false;
    }
    clearError(fullNameInput, fullNameError);
    return true;
  }

  function validateEmail(showMessage = true) {
    const val = emailInput.value.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!val) {
      if (showMessage) showError(emailInput, emailError, 'Email address is required.');
      return false;
    }
    if (!emailRegex.test(val)) {
      if (showMessage) showError(emailInput, emailError, 'Please enter a valid email address (e.g. you@example.com).');
      return false;
    }
    clearError(emailInput, emailError);
    return true;
  }

  function validatePassword(showMessage = true) {
    const val = passwordInput.value;
    if (!val) {
      if (showMessage) showError(passwordInput, passwordError, 'Password is required.');
      return false;
    }
    if (val.length < 8) {
      if (showMessage) showError(passwordInput, passwordError, 'Password must be at least 8 characters.');
      return false;
    }
    clearError(passwordInput, passwordError);
    return true;
  }

  function validateConfirmPassword(showMessage = true) {
    const val = confirmPasswordInput.value;
    const pwd = passwordInput.value;

    if (!val) {
      if (showMessage) showError(confirmPasswordInput, confirmPasswordError, 'Please confirm your password.');
      return false;
    }
    if (val !== pwd) {
      if (showMessage) showError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match.');
      return false;
    }
    clearError(confirmPasswordInput, confirmPasswordError);
    return true;
  }

  function validateTerms(showMessage = true) {
    if (!termsCheckbox.checked) {
      if (showMessage) {
        termsError.textContent = 'You must agree to the Terms of Service and Privacy Policy.';
      }
      return false;
    }
    termsError.textContent = '';
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

  /**
   * Evaluates password strength and updates 4-segment meter and text label
   */
  function updatePasswordStrength(password) {
    if (!strengthMeter || !strengthLabel) return;

    strengthMeter.className = 'strength-meter';

    if (!password || password.length === 0) {
      strengthLabel.innerHTML = 'Strength: <strong>Too short</strong>';
      return;
    }

    if (password.length < 8) {
      strengthMeter.classList.add('strength-weak');
      strengthLabel.innerHTML = 'Strength: <strong style="color: #DC2626;">Weak (min. 8 chars)</strong>';
      return;
    }

    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (password.length >= 10 && score >= 4) {
      strengthMeter.classList.add('strength-strong');
      strengthLabel.innerHTML = 'Strength: <strong style="color: #16A34A;">Strong</strong>';
    } else if (score >= 3) {
      strengthMeter.classList.add('strength-good');
      strengthLabel.innerHTML = 'Strength: <strong style="color: #2563EB;">Good</strong>';
    } else if (score >= 2) {
      strengthMeter.classList.add('strength-fair');
      strengthLabel.innerHTML = 'Strength: <strong style="color: #D97706;">Fair</strong>';
    } else {
      strengthMeter.classList.add('strength-weak');
      strengthLabel.innerHTML = 'Strength: <strong style="color: #DC2626;">Weak</strong>';
    }
  }

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isNameValid = validateFullName(true);
    const isEmailValid = validateEmail(true);
    const isPasswordValid = validatePassword(true);
    const isConfirmValid = validateConfirmPassword(true);
    const isTermsValid = validateTerms(true);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid || !isTermsValid) {
      // Focus first invalid input for accessibility
      if (!isNameValid) fullNameInput.focus();
      else if (!isEmailValid) emailInput.focus();
      else if (!isPasswordValid) passwordInput.focus();
      else if (!isConfirmValid) confirmPasswordInput.focus();
      else if (!isTermsValid) termsCheckbox.focus();
      return;
    }

    // Begin Loading State
    setLoadingState(true);

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    TaskFlowAPI.register({ fullName, email, password, confirmPassword })
      .then((res) => {
        setLoadingState(false);
        if (devBanner && devNoticeText) {
          devBanner.className = 'dev-notice-banner notice-success';
          devNoticeText.innerHTML = `<strong>Account created!</strong> Welcome to TaskFlow, ${escapeHtml(fullName)}. Redirecting to dashboard...`;
          devBanner.style.display = 'flex';
          devBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      })
      .catch((err) => {
        setLoadingState(false);
        const message = err.message || 'Registration failed. Please check your details.';
        if (devBanner && devNoticeText) {
          devBanner.className = 'dev-notice-banner notice-error';
          devBanner.style.borderColor = '#DC2626';
          devBanner.style.backgroundColor = '#FEF2F2';
          devNoticeText.innerHTML = `<strong style="color: #DC2626;">Registration Failed:</strong> ${escapeHtml(message)}`;
          devBanner.style.display = 'flex';
          devBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          showError(emailInput, emailError, message);
        }
      });
  });

  function setLoadingState(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      btnText.textContent = 'Creating account...';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      btnText.textContent = 'Create Account';
    }
  }

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.innerText = string;
    return div.innerHTML;
  }
}

/**
 * Initializes independent password eye visibility toggles for both fields
 */
function initPasswordToggles() {
  setupToggle('togglePasswordBtn', 'passwordInput');
  setupToggle('toggleConfirmPasswordBtn', 'confirmPasswordInput');

  function setupToggle(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);

    if (!btn || !input) return;

    const eyeOpen = btn.querySelector('.eye-open');
    const eyeClosed = btn.querySelector('.eye-closed');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isPassword = input.getAttribute('type') === 'password';

      if (isPassword) {
        input.setAttribute('type', 'text');
        btn.setAttribute('aria-label', 'Hide password');
        btn.setAttribute('title', 'Hide password');
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'block';
      } else {
        input.setAttribute('type', 'password');
        btn.setAttribute('aria-label', 'Show password');
        btn.setAttribute('title', 'Show password');
        if (eyeOpen) eyeOpen.style.display = 'block';
        if (eyeClosed) eyeClosed.style.display = 'none';
      }

      input.focus();
    });
  }
}
