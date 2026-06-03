(function () {
  const STORAGE_KEY = 'clubNotifications';
  const TOAST_TIMEOUT = 3800;
  const containerId = 'toastContainer';

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getNotifications() {
    return safeParse(localStorage.getItem(STORAGE_KEY), []);
  }

  function saveNotifications(notifications) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }

  function ensureContainer() {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function displayToast(notification) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.type}`;
    toast.textContent = notification.message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, TOAST_TIMEOUT);
  }

  function queueNotification(message, type = 'info') {
    const notification = {
      id: `notification-${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString()
    };
    const queue = getNotifications();
    queue.push(notification);
    saveNotifications(queue);
    if (document.readyState !== 'loading') {
      displayToast(notification);
    }
  }

  function flushNotifications() {
    const queue = getNotifications();
    if (!queue.length) return;
    queue.forEach(displayToast);
    localStorage.removeItem(STORAGE_KEY);
  }

  document.addEventListener('DOMContentLoaded', flushNotifications);

  window.notificationApi = {
    getNotifications,
    saveNotifications,
    queueNotification,
    flushNotifications
  };

  window.notify = function (message, type = 'info') {
    queueNotification(message, type);
  };
})();
