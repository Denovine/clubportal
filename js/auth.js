(function () {
  function getStore(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (error) {
      return [];
    }
  }

  function saveStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() {
    return getStore('clubUsers') || [];
  }

  function saveUsers(users) {
    saveStore('clubUsers', users);
  }

  function findUserByEmail(email) {
    return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  function findUserByStudentId(studentId) {
    return getUsers().find((user) => user.studentId.toLowerCase() === studentId.toLowerCase());
  }

  function getCurrentUserId() {
    return localStorage.getItem('clubCurrentUserId');
  }

  function getCurrentUser() {
    const id = getCurrentUserId();
    return id ? getUsers().find((user) => user.id === id) : null;
  }

  function setCurrentUser(userId) {
    localStorage.setItem('clubCurrentUserId', userId);
  }

  function clearCurrentUser() {
    localStorage.removeItem('clubCurrentUserId');
  }

  function redirectTo(page) {
    window.location.href = page;
  }

  function displayMessage(element, message) {
    if (!element) return;
    element.textContent = message;
  }

  function clearErrors(form) {
    Array.from(form.querySelectorAll('.input-error')).forEach((el) => (el.textContent = ''));
  }

  function validateSignup(values) {
    const errors = {};
    if (!values.name.trim()) errors.name = 'Full name is required.';
    if (!values.email.trim()) errors.email = 'Email is required.';
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email.';
    if (!values.phone.trim()) errors.phone = 'Phone number is required.';
    if (values.phone && !/^\d{7,15}$/.test(values.phone.replace(/\s+/g, ''))) errors.phone = 'Enter a valid phone number.';
    if (!values.studentId.trim()) errors.studentId = 'Student ID is required.';
    if (!values.faculty) errors.faculty = 'Select faculty.';
    if (!values.interest) errors.interest = 'Select interest.';
    if (!values.password) errors.password = 'Password is required.';
    if (values.password && values.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (findUserByEmail(values.email)) errors.email = 'This email is already registered.';
    if (findUserByStudentId(values.studentId)) errors.studentId = 'This student ID is already registered.';
    return errors;
  }

  function showValidationErrors(errors) {
    Object.keys(errors).forEach((key) => {
      const element = document.getElementById(`${key}Error`);
      if (element) element.textContent = errors[key];
    });
  }

  function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    emailError.textContent = '';
    passwordError.textContent = '';

    if (!email) {
      emailError.textContent = 'Email is required.';
      return;
    }
    if (!password) {
      passwordError.textContent = 'Password is required.';
      return;
    }

    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      passwordError.textContent = 'Email or password is incorrect.';
      return;
    }

    setCurrentUser(user.id);
    if (window.audit) window.audit.log('login', `User logged in: ${user.email}`);
    if (window.notify) window.notify('Welcome back! Redirecting to your dashboard.', 'success');
    if (user.role === 'admin') {
      redirectTo('admin.html');
    } else {
      redirectTo('dashboard.html');
    }
  }

  function handleSignup(event) {
    event.preventDefault();
    const values = {
      name: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      studentId: document.getElementById('studentId').value,
      faculty: document.getElementById('faculty').value,
      interest: document.getElementById('interest').value,
      password: document.getElementById('password').value,
      confirmPassword: document.getElementById('confirmPassword').value
    };

    const errors = validateSignup(values);
    clearErrors(document.getElementById('signupForm'));

    if (Object.keys(errors).length) {
      showValidationErrors(errors);
      return;
    }

    const users = getUsers();
    const newUser = {
      id: `member-${Date.now()}`,
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      studentId: values.studentId.trim(),
      faculty: values.faculty,
      interest: values.interest,
      password: values.password,
      role: 'member',
      joinedEvents: []
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser.id);
    if (window.audit) window.audit.log('signup', `New member registered: ${newUser.email}`);
    if (window.notify) window.notify('Registration successful. Redirecting to dashboard.', 'success');
    redirectTo('dashboard.html');
  }

  function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.panel');
    tabs.forEach((button) => {
      button.addEventListener('click', () => {
        tabs.forEach((tab) => tab.classList.remove('active'));
        panels.forEach((panel) => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.target).classList.add('active');
      });
    });
  }

  function setupPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.textContent = isPassword ? 'Hide' : 'Show';
      });
    });
  }

  function updateSignupButtonState() {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const signupButton = document.querySelector('#signupForm button[type="submit"]');
    if (!passwordInput || !confirmInput || !signupButton) return;
    const passwordsMatch = passwordInput.value && passwordInput.value === confirmInput.value;
    signupButton.disabled = !passwordsMatch;
    signupButton.classList.toggle('button-primary', passwordsMatch);
    signupButton.classList.toggle('button-secondary', !passwordsMatch);
  }

  function requireAuth(allowedRoles) {
    const current = getCurrentUser();
    if (!current) {
      if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        redirectTo('index.html');
      }
      return null;
    }

    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
      if (current.role === 'admin') redirectTo('admin.html');
      else redirectTo('dashboard.html');
      return null;
    }

    if (allowedRoles && !allowedRoles.includes(current.role)) {
      if (current.role === 'admin') redirectTo('admin.html');
      else redirectTo('dashboard.html');
      return null;
    }

    return current;
  }

  function setupAuthPage() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    setupTabs();
    setupPasswordToggles();

    if (signupForm) {
      const passwordInput = document.getElementById('password');
      const confirmInput = document.getElementById('confirmPassword');
      if (passwordInput && confirmInput) {
        passwordInput.addEventListener('input', updateSignupButtonState);
        confirmInput.addEventListener('input', updateSignupButtonState);
        updateSignupButtonState();
      }
    }

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
  }

  function logout() {
    const current = getCurrentUser();
    clearCurrentUser();
    if (window.audit && current) window.audit.log('logout', `User logged out: ${current.email}`);
    if (window.notify) window.notify('You have been logged out.', 'info');
    redirectTo('index.html');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initClubData === 'function') window.initClubData();
    setupAuthPage();
  });

  window.auth = {
    getUsers,
    saveUsers,
    getCurrentUser,
    getCurrentUserId,
    requireAuth,
    logout,
    setCurrentUser,
    clearCurrentUser,
    findUserByEmail
  };
})();
