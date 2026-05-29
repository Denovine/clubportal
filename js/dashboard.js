(function () {
  function getStore(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  function saveStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getEvents() {
    return getStore('clubEvents');
  }

  function saveUsers(users) {
    localStorage.setItem('clubUsers', JSON.stringify(users));
  }

  function getCurrentUser() {
    return window.auth.getCurrentUser();
  }

  function updateUser(user) {
    const users = window.auth.getUsers();
    const index = users.findIndex((item) => item.id === user.id);
    if (index >= 0) {
      users[index] = user;
      saveUsers(users);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderProfile(user) {
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = '';
    const rows = [
      { label: 'Full Name', value: user.name },
      { label: 'Email', value: user.email },
      { label: 'Phone', value: user.phone },
      { label: 'Student ID', value: user.studentId },
      { label: 'Faculty', value: user.faculty },
      { label: 'Interest', value: user.interest },
      { label: 'Role', value: user.role }
    ];
    rows.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'profile-row';
      row.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      profileContent.appendChild(row);
    });
  }

  function renderStats(user) {
    const statsGrid = document.getElementById('statsGrid');
    const totalJoined = user.joinedEvents?.length || 0;
    const attendancePercent = window.attendanceApi.calculateAttendancePercentage(user.id, totalJoined);
    statsGrid.innerHTML = '';
    const stats = [
      { label: 'Events Joined', value: totalJoined },
      { label: 'Attendance', value: `${attendancePercent}%` }
    ];
    stats.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `<h3>${item.value}</h3><p>${item.label}</p>`;
      statsGrid.appendChild(card);
    });
  }

  function renderEvents(user) {
    const eventsList = document.getElementById('eventsList');
    const events = getEvents();
    eventsList.innerHTML = '';

    if (!events.length) {
      eventsList.innerHTML = '<p>No events are available yet. Check back soon.</p>';
      return;
    }

    events.forEach((event) => {
      const item = document.createElement('div');
      item.className = 'event-item';
      const joined = user.joinedEvents?.includes(event.id);
      item.innerHTML = `
        <div>
          <h3>${event.title}</h3>
          <p>${event.description}</p>
          <p><strong>${formatDate(event.date)}</strong> • ${event.venue}</p>
        </div>
        <div class="event-actions">
          <button class="button button-secondary" ${joined ? 'disabled' : ''} data-event-id="${event.id}">${joined ? 'Joined' : 'Join Event'}</button>
        </div>
      `;
      const button = item.querySelector('button');
      button.addEventListener('click', () => {
        if (joined) return;
        user.joinedEvents = user.joinedEvents || [];
        user.joinedEvents.push(event.id);
        updateUser(user);
        renderEvents(user);
        renderStats(user);
        alert('You joined the event. Your attendance history will update once it is marked.');
      });
      eventsList.appendChild(item);
    });
  }

  function renderAttendanceHistory(user) {
    const historyContainer = document.getElementById('attendanceHistory');
    const history = window.attendanceApi.getUserAttendanceHistory(user.id);
    historyContainer.innerHTML = '';

    if (!history.length) {
      historyContainer.innerHTML = '<p>No attendance records available yet.</p>';
      return;
    }

    const events = getEvents();
    history.forEach((record) => {
      const event = events.find((e) => e.id === record.eventId) || { title: 'Unknown event' };
      const item = document.createElement('div');
      item.className = 'attendance-item';
      item.innerHTML = `
        <div>
          <h3>${event.title}</h3>
          <p>${record.status.toUpperCase()} • ${new Date(record.timestamp).toLocaleString()}</p>
        </div>
      `;
      historyContainer.appendChild(item);
    });
  }

  function setupDashboard() {
    const user = window.auth.requireAuth(['member', 'leader']);
    if (!user) return;

    renderProfile(user);
    renderStats(user);
    renderEvents(user);
    renderAttendanceHistory(user);

    document.getElementById('logoutButton').addEventListener('click', window.auth.logout);

    const darkToggle = document.getElementById('darkModeToggle');
    darkToggle.addEventListener('click', () => {
      const root = document.documentElement;
      const mode = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', mode);
      darkToggle.textContent = mode === 'dark' ? 'Light Mode' : 'Dark Mode';
    });
  }

  document.addEventListener('DOMContentLoaded', setupDashboard);
})();
