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
    return window.auth.getUsers().filter((user) => user.role !== 'admin' || user.id !== window.auth.getCurrentUserId());
  }

  function getAllUsers() {
    return window.auth.getUsers();
  }

  function saveUsers(users) {
    window.auth.saveUsers(users);
  }

  function getEvents() {
    return getStore('clubEvents');
  }

  function saveEvents(events) {
    saveStore('clubEvents', events);
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getNonAdminUsers() {
    return getAllUsers().filter((user) => user.role !== 'admin');
  }

  function getUniqueValues(users, key) {
    return Array.from(new Set(users.map((user) => user[key]).filter(Boolean))).sort();
  }

  function getFilterValues() {
    return {
      search: document.getElementById('memberSearch')?.value.trim().toLowerCase() || '',
      faculty: document.getElementById('filterFaculty')?.value || '',
      interest: document.getElementById('filterInterest')?.value || '',
      role: document.getElementById('filterRole')?.value || ''
    };
  }

  function populateFilterOptions() {
    const users = getNonAdminUsers();
    const facultySelect = document.getElementById('filterFaculty');
    const interestSelect = document.getElementById('filterInterest');
    if (!facultySelect || !interestSelect) return;
    const facultyOptions = getUniqueValues(users, 'faculty');
    const interestOptions = getUniqueValues(users, 'interest');

    facultySelect.innerHTML = '<option value="">All Faculties</option>' + facultyOptions.map((value) => `<option value="${value}">${value}</option>`).join('');
    interestSelect.innerHTML = '<option value="">All Interests</option>' + interestOptions.map((value) => `<option value="${value}">${value}</option>`).join('');
  }

  function createEventFromForm() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const venue = document.getElementById('eventVenue').value.trim();
    const capacity = parseInt(document.getElementById('eventCapacity').value, 10) || 30;
    const id = document.getElementById('eventId').value;

    if (!title || !description || !date || !venue) {
      alert('Please fill in all event fields.');
      return null;
    }

    const events = getEvents();
    if (!id && events.some((item) => item.title.toLowerCase() === title.toLowerCase() && item.date === date)) {
      alert('An event with the same title and date already exists.');
      return null;
    }

    return { id: id || `event-${Date.now()}`, title, description, date, venue, capacity };
  }

  function createBarChart(data) {
    const max = Math.max(...Object.values(data), 1);
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => `
        <div class="chart-row">
          <span>${label}</span>
          <div class="chart-bar">
            <div style="width: ${Math.round((count / max) * 100)}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `)
      .join('');
  }

  function renderAnalytics() {
    const analyticsGrid = document.getElementById('analyticsGrid');
    const users = getNonAdminUsers();
    const attendanceRecords = window.attendanceApi.getAttendanceRecords();
    const totalMembers = users.length;
    const activeMembers = users.filter((user) => (user.joinedEvents || []).length > 0).length;
    const inactiveMembers = totalMembers - activeMembers;
    const attendanceTotals = attendanceRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});
    const presentCount = attendanceTotals.present || 0;
    const totalAttendance = attendanceRecords.length || 1;
    const attendanceRate = Math.round((presentCount / totalAttendance) * 100);
    const facultyTotals = users.reduce((acc, user) => {
      if (!user.faculty) return acc;
      acc[user.faculty] = (acc[user.faculty] || 0) + 1;
      return acc;
    }, {});
    const interestTotals = users.reduce((acc, user) => {
      if (!user.interest) return acc;
      acc[user.interest] = (acc[user.interest] || 0) + 1;
      return acc;
    }, {});

    analyticsGrid.innerHTML = `
      <div class="analytics-card summary-card">
        <div>
          <h3>${totalMembers}</h3>
          <p>Total Members</p>
        </div>
        <div class="mini-stats">
          <span>${activeMembers} active</span>
          <span>${inactiveMembers} inactive</span>
        </div>
      </div>
      <div class="analytics-card progress-card">
        <div>
          <h3>${attendanceRate}%</h3>
          <p>Attendance Rate</p>
        </div>
        <div class="progress-bar"><div style="width: ${attendanceRate}%"></div></div>
      </div>
      <div class="analytics-card chart-card">
        <h3>Members per Faculty</h3>
        <div class="chart-content">${createBarChart(facultyTotals)}</div>
      </div>
      <div class="analytics-card chart-card">
        <h3>Members per Interest</h3>
        <div class="chart-content">${createBarChart(interestTotals)}</div>
      </div>
    `;
  }

  function renderMembers(filterText = '', facultyFilter = '', interestFilter = '', roleFilter = '') {
    const list = document.getElementById('membersList');
    const users = getNonAdminUsers();
    list.innerHTML = '';
    const search = filterText.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (search && ![user.name, user.email, user.faculty, user.interest, user.role].some((value) => value?.toLowerCase().includes(search))) {
        return false;
      }
      if (facultyFilter && user.faculty !== facultyFilter) return false;
      if (interestFilter && user.interest !== interestFilter) return false;
      if (roleFilter && user.role !== roleFilter) return false;
      return true;
    });

    if (!filtered.length) {
      list.innerHTML = '<p>No members found.</p>';
      return;
    }

    filtered.forEach((user) => {
      const item = document.createElement('div');
      item.className = 'member-item';
      item.innerHTML = `
        <div>
          <h3>${user.name}</h3>
          <p>${user.email}</p>
          <p>${user.faculty} • ${user.interest}</p>
          <p>Role: ${user.role}</p>
        </div>
        <div class="event-actions">
          <select class="role-select" data-user-id="${user.id}">
            <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="leader" ${user.role === 'leader' ? 'selected' : ''}>Leader</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <button class="button button-danger" data-delete-id="${user.id}">Delete</button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  function renderAuditLog() {
    const container = document.getElementById('auditLog');
    const logs = window.audit.getAuditLogs();
    if (!logs.length) {
      container.innerHTML = '<p>No audit records yet.</p>';
      return;
    }

    container.innerHTML = logs.slice(0, 8).map((entry) => `
      <div class="audit-row">
        <div>
          <strong>${entry.action}</strong>
          <p>${entry.details}</p>
        </div>
        <div>
          <span>${new Date(entry.timestamp).toLocaleString()}</span>
          <small>${entry.userName} (${entry.role})</small>
        </div>
      </div>
    `).join('');
  }

  function getEventAttendeeCount(eventId) {
    return getNonAdminUsers().filter((user) => user.joinedEvents?.includes(eventId)).length;
  }

  function renderEvents() {
    const list = document.getElementById('adminEventsList');
    const events = getEvents();
    const users = getNonAdminUsers();
    const attendanceRecords = window.attendanceApi.getAttendanceRecords();
    list.innerHTML = '';

    if (!events.length) {
      list.innerHTML = '<p>No events created yet.</p>';
      return;
    }

    events.forEach((event) => {
      const attendeeCount = getEventAttendeeCount(event.id);
      const eventAttendance = attendanceRecords.filter((record) => record.eventId === event.id);
      const isLocked = window.attendanceApi.isAttendanceLocked(event.date);
      const capacity = Number(event.capacity) || 30;
      const full = attendeeCount >= capacity;

      const item = document.createElement('div');
      item.className = 'event-item';
      item.innerHTML = `
        <div>
          <h3>${event.title}</h3>
          <p>${event.description}</p>
          <p><strong>${formatDate(event.date)}</strong> • ${event.venue}</p>
          <p>Capacity: ${capacity} | RSVPs: ${attendeeCount}</p>
          <p><strong>Attendance records:</strong> ${eventAttendance.length}</p>
          ${isLocked ? '<span class="badge badge-locked">Attendance locked</span>' : ''}
          ${full && !isLocked ? '<span class="badge badge-full">Full</span>' : ''}
        </div>
        <div class="event-actions">
          <button class="button button-secondary" data-edit-id="${event.id}">Edit</button>
          <button class="button button-danger" data-delete-event="${event.id}">Remove</button>
        </div>
      `;

      const panel = document.createElement('div');
      panel.className = 'attendance-item';
      panel.innerHTML = `
        <div>
          <h3>Mark Attendance</h3>
          <p>${isLocked ? 'This event is locked for changes.' : 'Select a student and status for this event.'}</p>
        </div>
        <div class="attendance-status">
          <select class="member-select" data-event-id="${event.id}" ${isLocked ? 'disabled' : ''}>
            <option value="">Select member</option>
            ${users.map((user) => `<option value="${user.id}">${user.name} (${user.role})</option>`).join('')}
          </select>
          <select class="status-select" data-event-id="${event.id}" ${isLocked ? 'disabled' : ''}>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
          <button class="button button-primary" data-save-attendance="${event.id}" ${isLocked ? 'disabled' : ''}>Save</button>
        </div>
      `;

      list.appendChild(item);
      list.appendChild(panel);
    });
  }

  function wireMemberActions() {
    const list = document.getElementById('membersList');
    list.addEventListener('change', (event) => {
      const roleSelect = event.target.closest('.role-select');
      if (!roleSelect) return;
      const userId = roleSelect.dataset.userId;
      const role = roleSelect.value;
      const users = getAllUsers();
      const user = users.find((item) => item.id === userId);
      if (!user) return;
      const previousRole = user.role;
      user.role = role;
      saveUsers(users);
      if (window.audit) window.audit.log('role-change', `${user.email} role changed from ${previousRole} to ${role}`);
      renderAnalytics();
      const filters = getFilterValues();
      renderMembers(filters.search, filters.faculty, filters.interest, filters.role);
    });

    list.addEventListener('click', (event) => {
      const deleteButton = event.target.closest('[data-delete-id]');
      if (!deleteButton) return;
      const userId = deleteButton.dataset.deleteId;
      if (!confirm('Delete this member permanently?')) return;
      const users = getAllUsers().filter((user) => user.id !== userId);
      saveUsers(users);
      const records = window.attendanceApi.getAttendanceRecords().filter((record) => record.userId !== userId);
      window.attendanceApi.saveAttendanceRecords(records);
      if (window.audit) window.audit.log('member-delete', `User ${userId} was deleted from system.`);
      populateFilterOptions();
      const filters = getFilterValues();
      renderAnalytics();
      renderMembers(filters.search, filters.faculty, filters.interest, filters.role);
    });
  }

  function wireEventActions() {
    const list = document.getElementById('adminEventsList');
    list.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-id]');
      const deleteButton = event.target.closest('[data-delete-event]');
      const saveAttendanceButton = event.target.closest('[data-save-attendance]');
      if (editButton) {
        const eventId = editButton.dataset.editId;
        const events = getEvents();
        const eventItem = events.find((item) => item.id === eventId);
        if (!eventItem) return;
        document.getElementById('eventTitle').value = eventItem.title;
        document.getElementById('eventDescription').value = eventItem.description;
        document.getElementById('eventDate').value = eventItem.date;
        document.getElementById('eventVenue').value = eventItem.venue;
        document.getElementById('eventCapacity').value = eventItem.capacity || 30;
        document.getElementById('eventId').value = eventItem.id;
      }
      if (deleteButton) {
        const eventId = deleteButton.dataset.deleteEvent;
        if (!confirm('Delete this event and all attendance history?')) return;
        saveEvents(getEvents().filter((item) => item.id !== eventId));
        const remaining = window.attendanceApi.getAttendanceRecords().filter((record) => record.eventId !== eventId);
        window.attendanceApi.saveAttendanceRecords(remaining);
        if (window.audit) window.audit.log('event-delete', `Event ${eventId} removed.`);
        renderEvents();
      }
      if (saveAttendanceButton) {
        const eventId = saveAttendanceButton.dataset.saveAttendance;
        const selectMember = list.querySelector(`.member-select[data-event-id="${eventId}"]`);
        const selectStatus = list.querySelector(`.status-select[data-event-id="${eventId}"]`);
        if (!selectMember.value) {
          alert('Choose a member to mark attendance.');
          return;
        }
        const success = window.attendanceApi.markAttendance(eventId, selectMember.value, selectStatus.value);
        if (!success) {
          alert('This event is locked and cannot be updated.');
          return;
        }
        if (window.audit) window.audit.log('attendance-update', `Attendance for ${selectMember.value} on ${eventId} set to ${selectStatus.value}.`);
        if (window.notify) window.notify('Attendance updated successfully.', 'success');
        renderEvents();
      }
    });
  }

  function setupEventForm() {
    const form = document.getElementById('eventForm');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const newEvent = createEventFromForm();
      if (!newEvent) return;
      const events = getEvents();
      const foundIndex = events.findIndex((item) => item.id === newEvent.id);
      if (foundIndex >= 0) {
        events[foundIndex] = newEvent;
        if (window.audit) window.audit.log('event-update', `Event ${newEvent.id} updated.`);
      } else {
        events.push(newEvent);
        if (window.audit) window.audit.log('event-create', `Event created: ${newEvent.title}.`);
      }
      saveEvents(events);
      renderEvents();
      form.reset();
      document.getElementById('eventId').value = '';
      if (window.notify) window.notify('Event saved successfully.', 'success');
    });
  }

  function setupSearch() {
    const searchInput = document.getElementById('memberSearch');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
      const filters = getFilterValues();
      renderMembers(filters.search, filters.faculty, filters.interest, filters.role);
    });
  }

  function setupFilters() {
    ['filterFaculty', 'filterInterest', 'filterRole'].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener('change', () => {
        const filters = getFilterValues();
        renderMembers(filters.search, filters.faculty, filters.interest, filters.role);
      });
    });

    const clearButton = document.getElementById('clearFilters');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        document.getElementById('memberSearch').value = '';
        document.getElementById('filterFaculty').value = '';
        document.getElementById('filterInterest').value = '';
        document.getElementById('filterRole').value = '';
        renderMembers('', '', '', '');
      });
    }
  }

  function setupExport() {
    const exportButton = document.getElementById('exportJson');
    if (!exportButton) return;
    exportButton.addEventListener('click', () => {
      const data = getAllUsers();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'ict-club-members.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });
  }

  function setupDarkMode() {
    const darkToggle = document.getElementById('darkModeToggle');
    if (!darkToggle) return;
    darkToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      darkToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
  }

  function setupAdminPage() {
    const user = window.auth.requireAuth(['admin']);
    if (!user) return;
    populateFilterOptions();
    renderAnalytics();
    renderMembers('', '', '', '');
    renderEvents();
    renderAuditLog();
    setupEventForm();
    setupSearch();
    setupFilters();
    setupExport();
    wireMemberActions();
    wireEventActions();
    setupDarkMode();
    document.getElementById('logoutButton').addEventListener('click', window.auth.logout);
  }

  document.addEventListener('DOMContentLoaded', setupAdminPage);
})();
