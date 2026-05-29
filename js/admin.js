(function () {
  function getStore(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
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

  function createEventFromForm() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const venue = document.getElementById('eventVenue').value.trim();
    const id = document.getElementById('eventId').value;

    if (!title || !description || !date || !venue) {
      alert('Please fill in all event fields.');
      return null;
    }

    return { id: id || `event-${Date.now()}`, title, description, date, venue };
  }

  function renderAnalytics() {
    const analyticsGrid = document.getElementById('analyticsGrid');
    const users = getAllUsers();
    const totalMembers = users.filter((user) => user.role !== 'admin').length;
    const facultyTotals = users.reduce((acc, user) => {
      if (!acc[user.faculty]) acc[user.faculty] = 0;
      acc[user.faculty] += 1;
      return acc;
    }, {});
    const interestTotals = users.reduce((acc, user) => {
      if (!acc[user.interest]) acc[user.interest] = 0;
      acc[user.interest] += 1;
      return acc;
    }, {});
    const popularInterest = Object.keys(interestTotals).sort((a, b) => interestTotals[b] - interestTotals[a])[0] || 'N/A';

    analyticsGrid.innerHTML = '';
    const cards = [
      { title: 'Total Members', value: totalMembers },
      { title: 'Popular Faculty', value: Object.entries(facultyTotals).sort((a, b) => b[1] - a[1]).map(([key, value]) => `${key} (${value})`).join(', ') || 'None' },
      { title: 'Top ICT Interest', value: popularInterest }
    ];

    cards.forEach((card) => {
      const cardNode = document.createElement('div');
      cardNode.className = 'analytics-card';
      cardNode.innerHTML = `<h3>${card.value}</h3><p>${card.title}</p>`;
      analyticsGrid.appendChild(cardNode);
    });
  }

  function renderMembers(filterText = '') {
    const list = document.getElementById('membersList');
    const users = getAllUsers().filter((user) => user.role !== 'admin');
    list.innerHTML = '';
    const search = filterText.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (!search) return true;
      return user.name.toLowerCase().includes(search) || user.faculty.toLowerCase().includes(search);
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

  function renderEvents() {
    const list = document.getElementById('adminEventsList');
    const events = getEvents();
    const users = getAllUsers().filter((user) => user.role !== 'admin');
    const attendanceRecords = window.attendanceApi.getAttendanceRecords();
    list.innerHTML = '';

    if (!events.length) {
      list.innerHTML = '<p>No events created yet.</p>';
      return;
    }

    events.forEach((event) => {
      const item = document.createElement('div');
      item.className = 'event-item';
      const eventAttendance = attendanceRecords.filter((record) => record.eventId === event.id);
      item.innerHTML = `
        <div>
          <h3>${event.title}</h3>
          <p>${event.description}</p>
          <p><strong>${formatDate(event.date)}</strong> • ${event.venue}</p>
          <p><strong>Attendance Records:</strong> ${eventAttendance.length}</p>
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
          <p>Select a student and status for this event.</p>
        </div>
        <div class="attendance-status">
          <select class="member-select" data-event-id="${event.id}">
            <option value="">Select member</option>
            ${users.map((user) => `<option value="${user.id}">${user.name} (${user.role})</option>`).join('')}
          </select>
          <select class="status-select" data-event-id="${event.id}">
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
          <button class="button button-primary" data-save-attendance="${event.id}">Save</button>
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
      user.role = role;
      saveUsers(users);
      renderAnalytics();
      renderMembers(document.getElementById('memberSearch').value);
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
      renderAnalytics();
      renderMembers(document.getElementById('memberSearch').value);
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
        document.getElementById('eventId').value = eventItem.id;
      }
      if (deleteButton) {
        const eventId = deleteButton.dataset.deleteEvent;
        if (!confirm('Delete this event and all attendance history?')) return;
        saveEvents(getEvents().filter((item) => item.id !== eventId));
        const remaining = window.attendanceApi.getAttendanceRecords().filter((record) => record.eventId !== eventId);
        window.attendanceApi.saveAttendanceRecords(remaining);
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
        window.attendanceApi.markAttendance(eventId, selectMember.value, selectStatus.value);
        alert('Attendance updated successfully.');
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
      } else {
        events.push(newEvent);
      }
      saveEvents(events);
      renderEvents();
      form.reset();
      document.getElementById('eventId').value = '';
      alert('Event saved successfully.');
    });
  }

  function setupSearch() {
    const searchInput = document.getElementById('memberSearch');
    searchInput.addEventListener('input', () => {
      renderMembers(searchInput.value);
    });
  }

  function setupExport() {
    const exportButton = document.getElementById('exportJson');
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
    renderAnalytics();
    renderMembers();
    renderEvents();
    setupEventForm();
    setupSearch();
    setupExport();
    wireMemberActions();
    wireEventActions();
    setupDarkMode();
    document.getElementById('logoutButton').addEventListener('click', window.auth.logout);
  }

  document.addEventListener('DOMContentLoaded', setupAdminPage);
})();
