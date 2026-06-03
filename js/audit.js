(function () {
  const STORAGE_KEY = 'clubAudit';

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getAuditLogs() {
    return safeParse(localStorage.getItem(STORAGE_KEY), []);
  }

  function saveAuditLogs(logs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }

  function log(action, details) {
    const current = window.auth && typeof window.auth.getCurrentUser === 'function' ? window.auth.getCurrentUser() : null;
    const entry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      details: details || '',
      userId: current?.id || null,
      userName: current?.name || 'Guest',
      role: current?.role || 'unknown'
    };

    const logs = getAuditLogs();
    logs.unshift(entry);
    if (logs.length > 120) logs.length = 120;
    saveAuditLogs(logs);
    if (window.notify) {
      window.notify(`Audit: ${action}`, 'info');
    }
    return entry;
  }

  window.audit = {
    getAuditLogs,
    saveAuditLogs,
    log
  };
})();
