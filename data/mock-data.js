(function () {
  function getStore(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  function saveStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function createUser(user) {
    const existing = getStore('clubUsers') || [];
    existing.push(user);
    saveStore('clubUsers', existing);
  }

  function initDefaultData() {
    if (!getStore('clubUsers')) {
      const adminUser = {
        id: 'admin-100',
        name: 'ICT Club Admin',
        email: 'admin@ictclub.edu',
        phone: '0000000000',
        studentId: 'ADMIN01',
        faculty: 'IT',
        interest: 'Club Management',
        password: 'Admin@123',
        role: 'admin',
        joinedEvents: []
      };
      const sampleMember = {
        id: 'member-101',
        name: 'Evelyn Tarek',
        email: 'evelyn@student.edu',
        phone: '0712345678',
        studentId: '2024ICT015',
        faculty: 'IT',
        interest: 'Software Engineering',
        password: 'Member@123',
        role: 'member',
        joinedEvents: []
      };
      saveStore('clubUsers', [adminUser, sampleMember]);
    }

    if (!getStore('clubEvents')) {
      const events = [
        {
          id: 'event-001',
          title: 'Cybersecurity Bootcamp',
          description: 'Hands-on learning and live demonstrations.',
          date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          venue: 'Innovation Lab'
        },
        {
          id: 'event-002',
          title: 'AI & Machine Learning Talk',
          description: 'Career paths, case studies and practical tools.',
          date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          venue: 'Assembly Hall'
        }
      ];
      saveStore('clubEvents', events);
    }

    if (!getStore('clubAttendance')) {
      saveStore('clubAttendance', []);
    }
  }

  window.initClubData = initDefaultData;
  initDefaultData();
})();
