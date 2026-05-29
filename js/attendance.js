(function () {
  function getStore(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  function saveStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getAttendanceRecords() {
    return getStore('clubAttendance');
  }

  function saveAttendanceRecords(records) {
    saveStore('clubAttendance', records);
  }

  function getAttendanceRecord(eventId, userId) {
    return getAttendanceRecords().find((record) => record.eventId === eventId && record.userId === userId);
  }

  function markAttendance(eventId, userId, status) {
    const records = getAttendanceRecords();
    const timestamp = new Date().toISOString();
    const existing = records.find((item) => item.eventId === eventId && item.userId === userId);
    if (existing) {
      existing.status = status;
      existing.timestamp = timestamp;
    } else {
      records.push({ eventId, userId, status, timestamp });
    }
    saveAttendanceRecords(records);
  }

  function getUserAttendanceHistory(userId) {
    return getAttendanceRecords().filter((record) => record.userId === userId);
  }

  function getAttendanceByEvent(eventId) {
    return getAttendanceRecords().filter((record) => record.eventId === eventId);
  }

  function calculateAttendancePercentage(userId, joinedEventsCount) {
    if (!joinedEventsCount) return 0;
    const history = getUserAttendanceHistory(userId);
    const present = history.filter((record) => record.status === 'present').length;
    return Math.round((present / joinedEventsCount) * 100);
  }

  window.attendanceApi = {
    getAttendanceRecords,
    saveAttendanceRecords,
    getAttendanceRecord,
    markAttendance,
    getUserAttendanceHistory,
    getAttendanceByEvent,
    calculateAttendancePercentage
  };
})();
