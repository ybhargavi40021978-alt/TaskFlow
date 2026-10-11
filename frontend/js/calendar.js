/**
 * TaskFlow — Interface 8: Calendar Page
 * Complete Vanilla JavaScript Application Logic
 * 
 * Features:
 * - Full Calendar State Management (Year, Month, Selected Date, View Modes)
 * - Dynamic Month, Week, and Day Renderers with accurate date calculations
 * - Real-time Schedule Metric Cards (Upcoming Tasks, Due Today, Overdue, Milestones)
 * - Multi-criteria Filtering (Search text, Category, Project) and Quick Filter Cards
 * - Upcoming Events Sidebar Panel with grouped dates (Today, Tomorrow, Upcoming)
 * - Full Event CRUD (Create, Read Details, Update, Delete with Confirmation)
 * - LocalStorage persistence for user edits & additions
 * - Global Search with live suggestions and Ctrl+K hotkey
 * - Notifications, Workspace & Profile menus, Mobile Drawer, and Keyboard Navigation
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Constants & Initial State
  // =========================================================================
  const STORAGE_KEY = 'taskflow_calendar_events_v2';
  
  // Anchor date for consistent interface demo experience
  const TODAY_STR = '2026-10-11';
  const TODAY_DATE = new Date(2026, 9, 11); // Month is 0-indexed (9 = October)
  
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  // Seed Event Data (10 realistic collaborative events)
  const SEED_EVENTS = [];

  // Application State
  const state = {
    currentYear: 2026,
    currentMonth: 9, // October (0-indexed)
    selectedDate: '2026-10-11',
    activeView: 'month', // 'month' | 'week' | 'day'
    activeCardFilter: null, // null | 'Task' | 'today' | 'overdue' | 'Milestone'
    searchQuery: '',
    categoryFilter: 'all',
    projectFilter: 'all',
    events: [],
    selectedEventId: null,
    editingEventId: null
  };

  // =========================================================================
  // 2. Storage & Event Service
  // =========================================================================
  function loadEvents() {
    state.events = [];
  }

  function saveEvents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  // =========================================================================
  // 3. Date Utility Helpers
  // =========================================================================
  function formatDateISO(year, month, day) {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDateISO(isoStr) {
    if (!isoStr) return new Date();
    const parts = isoStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay(); // 0 = Sunday
  }

  // =========================================================================
  // 4. Filtering Logic
  // =========================================================================
  function getFilteredEvents() {
    return state.events.filter(event => {
      // 1. Text Search (title, description, project)
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDesc = (event.description || '').toLowerCase().includes(query);
        const matchesProj = (event.project || '').toLowerCase().includes(query);
        const matchesDate = (event.date || '').includes(query);
        if (!matchesTitle && !matchesDesc && !matchesProj && !matchesDate) {
          return false;
        }
      }

      // 2. Category Select Filter
      if (state.categoryFilter !== 'all') {
        if (event.type !== state.categoryFilter) return false;
      }

      // 3. Project Select Filter
      if (state.projectFilter !== 'all') {
        if (event.project !== state.projectFilter) return false;
      }

      // 4. Summary Card Filter
      if (state.activeCardFilter) {
        if (state.activeCardFilter === 'Task') {
          if (event.type !== 'Task' || event.date < TODAY_STR) return false;
        } else if (state.activeCardFilter === 'today') {
          if (event.date !== TODAY_STR) return false;
        } else if (state.activeCardFilter === 'overdue') {
          const isOverdue = event.isOverdue || (event.date < TODAY_STR && (event.type === 'Deadline' || event.type === 'Task'));
          if (!isOverdue) return false;
        } else if (state.activeCardFilter === 'Milestone') {
          if (event.type !== 'Milestone' || event.date < TODAY_STR) return false;
        }
      }

      return true;
    });
  }

  function getEventsForDate(dateStr) {
    const list = getFilteredEvents();
    return list.filter(evt => evt.date === dateStr);
  }

  // =========================================================================
  // 5. Summary Card Calculations
  // =========================================================================
  function updateSummaryCards() {
    let upcomingTasksCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    let milestonesCount = 0;

    state.events.forEach(event => {
      // Upcoming Tasks (type === Task and date >= Today)
      if (event.type === 'Task' && event.date >= TODAY_STR) {
        upcomingTasksCount++;
      }

      // Due Today (date === Today)
      if (event.date === TODAY_STR) {
        dueTodayCount++;
      }

      // Overdue (explicit flag or date < Today for deadlines/tasks)
      const isOverdue = event.isOverdue || (event.date < TODAY_STR && (event.type === 'Deadline' || event.type === 'Task'));
      if (isOverdue) {
        overdueCount++;
      }

      // Milestones (type === Milestone and date >= Today)
      if (event.type === 'Milestone' && event.date >= TODAY_STR) {
        milestonesCount++;
      }
    });

    const countTasksEl = document.getElementById('countUpcomingTasks');
    const countTodayEl = document.getElementById('countDueToday');
    const countOverdueEl = document.getElementById('countOverdue');
    const countMilestonesEl = document.getElementById('countMilestones');

    if (countTasksEl) countTasksEl.textContent = String(upcomingTasksCount).padStart(2, '0');
    if (countTodayEl) countTodayEl.textContent = String(dueTodayCount).padStart(2, '0');
    if (countOverdueEl) countOverdueEl.textContent = String(overdueCount).padStart(2, '0');
    if (countMilestonesEl) countMilestonesEl.textContent = String(milestonesCount).padStart(2, '0');

    // Update summary card active UI highlight
    document.querySelectorAll('.summary-card').forEach(card => {
      const filterType = card.dataset.filterType;
      if (state.activeCardFilter && state.activeCardFilter === filterType) {
        card.classList.add('active-filter');
      } else {
        card.classList.remove('active-filter');
      }
    });
  }

  // =========================================================================
  // 6. Calendar Header & Navigation Controls
  // =========================================================================
  function updatePeriodDisplay() {
    const labelEl = document.getElementById('currentPeriodLabel');
    if (!labelEl) return;

    if (state.activeView === 'month') {
      labelEl.textContent = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;
    } else if (state.activeView === 'week') {
      const selected = parseDateISO(state.selectedDate);
      const dayOfWeek = selected.getDay();
      const startOfWeek = new Date(selected);
      startOfWeek.setDate(selected.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = MONTH_NAMES[startOfWeek.getMonth()].slice(0, 3);
      const endMonth = MONTH_NAMES[endOfWeek.getMonth()].slice(0, 3);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        labelEl.textContent = `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      } else {
        labelEl.textContent = `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      }
    } else if (state.activeView === 'day') {
      const selected = parseDateISO(state.selectedDate);
      labelEl.textContent = `${MONTH_NAMES[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`;
    }
  }

  function handlePrevPeriod() {
    if (state.activeView === 'month') {
      state.currentMonth--;
      if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
      }
    } else if (state.activeView === 'week') {
      const d = parseDateISO(state.selectedDate);
      d.setDate(d.getDate() - 7);
      state.selectedDate = formatDateISO(d.getFullYear(), d.getMonth(), d.getDate());
      state.currentYear = d.getFullYear();
      state.currentMonth = d.getMonth();
    } else if (state.activeView === 'day') {
      const d = parseDateISO(state.selectedDate);
      d.setDate(d.getDate() - 1);
      state.selectedDate = formatDateISO(d.getFullYear(), d.getMonth(), d.getDate());
      state.currentYear = d.getFullYear();
      state.currentMonth = d.getMonth();
    }
    renderCalendar();
  }

  function handleNextPeriod() {
    if (state.activeView === 'month') {
      state.currentMonth++;
      if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
      }
    } else if (state.activeView === 'week') {
      const d = parseDateISO(state.selectedDate);
      d.setDate(d.getDate() + 7);
      state.selectedDate = formatDateISO(d.getFullYear(), d.getMonth(), d.getDate());
      state.currentYear = d.getFullYear();
      state.currentMonth = d.getMonth();
    } else if (state.activeView === 'day') {
      const d = parseDateISO(state.selectedDate);
      d.setDate(d.getDate() + 1);
      state.selectedDate = formatDateISO(d.getFullYear(), d.getMonth(), d.getDate());
      state.currentYear = d.getFullYear();
      state.currentMonth = d.getMonth();
    }
    renderCalendar();
  }

  function handleTodayJump() {
    state.currentYear = TODAY_DATE.getFullYear();
    state.currentMonth = TODAY_DATE.getMonth();
    state.selectedDate = TODAY_STR;
    renderCalendar();
  }

  function handleViewChange(newView) {
    if (state.activeView === newView) return;
    state.activeView = newView;

    // Update segmented buttons
    document.querySelectorAll('.view-segment-btn').forEach(btn => {
      const isSelected = btn.dataset.view === newView;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    renderCalendar();
  }

  // =========================================================================
  // 7. Month View Rendering
  // =========================================================================
  function renderMonthView() {
    const monthWrapper = document.getElementById('monthViewWrapper');
    const weekWrapper = document.getElementById('weekViewWrapper');
    const dayWrapper = document.getElementById('dayViewWrapper');
    const gridEl = document.getElementById('monthDaysGrid');

    if (!monthWrapper || !gridEl) return;

    monthWrapper.style.display = 'flex';
    if (weekWrapper) weekWrapper.style.display = 'none';
    if (dayWrapper) dayWrapper.style.display = 'none';

    gridEl.innerHTML = '';

    const year = state.currentYear;
    const month = state.currentMonth;
    const daysInCurrentMonth = getDaysInMonth(year, month);
    const startDayIndex = getFirstDayOfWeek(year, month); // 0 (Sun) - 6 (Sat)

    // Previous month filler days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    // 1. Render Leading Days from Previous Month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = formatDateISO(prevYear, prevMonth, dayNum);
      const cellEl = createDateCell(dateStr, dayNum, true);
      gridEl.appendChild(cellEl);
    }

    // 2. Render Current Month Days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = formatDateISO(year, month, day);
      const cellEl = createDateCell(dateStr, day, false);
      gridEl.appendChild(cellEl);
    }

    // 3. Render Trailing Days from Next Month to complete rows (35 or 42 cells)
    const totalCellsSoFar = startDayIndex + daysInCurrentMonth;
    const totalCellsTarget = totalCellsSoFar > 35 ? 42 : 35;
    const trailingDays = totalCellsTarget - totalCellsSoFar;

    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let day = 1; day <= trailingDays; day++) {
      const dateStr = formatDateISO(nextYear, nextMonth, day);
      const cellEl = createDateCell(dateStr, day, true);
      gridEl.appendChild(cellEl);
    }
  }

  function createDateCell(dateStr, dayNum, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'month-day-cell';
    cell.dataset.date = dateStr;
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${dateStr}`);

    if (isOtherMonth) {
      cell.classList.add('is-other-month');
    }
    if (dateStr === TODAY_STR) {
      cell.classList.add('is-today');
    }
    if (dateStr === state.selectedDate) {
      cell.classList.add('is-selected');
    }

    // Cell Header (Day Number & optional Today pill)
    const header = document.createElement('div');
    header.className = 'day-cell-header';

    const numSpan = document.createElement('span');
    numSpan.className = 'day-number';
    numSpan.textContent = dayNum;
    header.appendChild(numSpan);

    if (dateStr === TODAY_STR) {
      const todayBadge = document.createElement('span');
      todayBadge.className = 'today-indicator-badge';
      todayBadge.textContent = 'TODAY';
      header.appendChild(todayBadge);
    }

    cell.appendChild(header);

    // Event container
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'cell-events-list';

    const dayEvents = getEventsForDate(dateStr);
    const MAX_VISIBLE = 3;
    const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
    const hiddenCount = dayEvents.length - MAX_VISIBLE;

    visibleEvents.forEach(evt => {
      const pill = createEventPill(evt);
      eventsContainer.appendChild(pill);
    });

    if (hiddenCount > 0) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'more-events-link';
      moreBtn.textContent = `+${hiddenCount} more`;
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedDate = dateStr;
        handleViewChange('day');
      });
      eventsContainer.appendChild(moreBtn);
    }

    cell.appendChild(eventsContainer);

    // Cell click listeners
    cell.addEventListener('click', (e) => {
      // If clicking directly on empty area, select date or prompt create
      if (!e.target.closest('.event-pill') && !e.target.closest('.more-events-link')) {
        document.querySelectorAll('.month-day-cell').forEach(c => c.classList.remove('is-selected'));
        cell.classList.add('is-selected');
        state.selectedDate = dateStr;
        
        // Double-click or quick action opens create event
        openCreateEventModal(dateStr);
      }
    });

    return cell;
  }

  function createEventPill(event) {
    const pill = document.createElement('div');
    const typeClass = `pill-${event.type.toLowerCase()}`;
    pill.className = `event-pill ${typeClass}`;
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.title = `${event.title} (${event.type}) • ${event.startTime ? formatTimeDisplay(event.startTime) : 'All day'}`;

    const dot = document.createElement('span');
    dot.className = 'pill-dot';

    const text = document.createElement('span');
    text.className = 'pill-title';
    text.textContent = event.title;

    pill.appendChild(dot);
    pill.appendChild(text);

    if (event.startTime) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'pill-time';
      timeSpan.textContent = formatTimeDisplay(event.startTime);
      pill.appendChild(timeSpan);
    }

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      openEventDetailsModal(event.id);
    });

    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        openEventDetailsModal(event.id);
      }
    });

    return pill;
  }

  // =========================================================================
  // 8. Week View Rendering
  // =========================================================================
  function renderWeekView() {
    const monthWrapper = document.getElementById('monthViewWrapper');
    const weekWrapper = document.getElementById('weekViewWrapper');
    const dayWrapper = document.getElementById('dayViewWrapper');
    const headerRow = document.getElementById('weekHeaderRow');
    const gridBody = document.getElementById('weekGridBody');

    if (!weekWrapper || !headerRow || !gridBody) return;

    if (monthWrapper) monthWrapper.style.display = 'none';
    weekWrapper.style.display = 'flex';
    if (dayWrapper) dayWrapper.style.display = 'none';

    headerRow.innerHTML = '';
    gridBody.innerHTML = '';

    // Calculate start of week (Sunday)
    const selected = parseDateISO(state.selectedDate);
    const dayOfWeek = selected.getDay();
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - dayOfWeek);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(formatDateISO(d.getFullYear(), d.getMonth(), d.getDate()));
    }

    // 1. Week Header (Time label placeholder + 7 day headings)
    const timeColHead = document.createElement('div');
    timeColHead.className = 'week-col-head time-axis-head';
    timeColHead.textContent = 'GMT';
    headerRow.appendChild(timeColHead);

    weekDates.forEach((dateStr, idx) => {
      const d = parseDateISO(dateStr);
      const isToday = dateStr === TODAY_STR;
      const isSelected = dateStr === state.selectedDate;

      const colHead = document.createElement('div');
      colHead.className = `week-col-head ${isToday ? 'is-today-head' : ''} ${isSelected ? 'is-selected-head' : ''}`;
      colHead.innerHTML = `
        <span class="week-head-dayname">${DAY_NAMES[idx].slice(0, 3)}</span>
        <span class="week-head-daynum">${d.getDate()}</span>
      `;
      colHead.addEventListener('click', () => {
        state.selectedDate = dateStr;
        renderWeekView();
      });
      headerRow.appendChild(colHead);
    });

    // 2. Hourly Timeline Rows (8:00 AM to 6:00 PM)
    const hours = [
      '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
    ];

    hours.forEach(hourStr => {
      const rowEl = document.createElement('div');
      rowEl.className = 'week-hour-row';

      // Time label column
      const timeAxisCell = document.createElement('div');
      timeAxisCell.className = 'week-time-label';
      timeAxisCell.textContent = formatTimeDisplay(hourStr);
      rowEl.appendChild(timeAxisCell);

      // 7 day slot columns
      weekDates.forEach(dateStr => {
        const slotCell = document.createElement('div');
        slotCell.className = 'week-slot-cell';
        slotCell.dataset.date = dateStr;
        slotCell.dataset.hour = hourStr;

        // Check if any events fall into this hour slot
        const dayEvts = getEventsForDate(dateStr);
        const matchingEvts = dayEvts.filter(evt => {
          if (!evt.startTime) return hourStr === '09:00'; // All-day fallback in morning
          const evtHour = evt.startTime.slice(0, 2);
          return evtHour === hourStr.slice(0, 2);
        });

        matchingEvts.forEach(evt => {
          const card = document.createElement('div');
          const typeClass = `week-card-${evt.type.toLowerCase()}`;
          card.className = `week-event-card ${typeClass}`;
          card.innerHTML = `
            <div class="week-card-title">${evt.title}</div>
            <div class="week-card-time">${evt.startTime ? formatTimeDisplay(evt.startTime) : 'All day'}</div>
          `;
          card.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventDetailsModal(evt.id);
          });
          slotCell.appendChild(card);
        });

        slotCell.addEventListener('click', (e) => {
          if (!e.target.closest('.week-event-card')) {
            openCreateEventModal(dateStr, hourStr);
          }
        });

        rowEl.appendChild(slotCell);
      });

      gridBody.appendChild(rowEl);
    });
  }

  // =========================================================================
  // 9. Day View Rendering
  // =========================================================================
  function renderDayView() {
    const monthWrapper = document.getElementById('monthViewWrapper');
    const weekWrapper = document.getElementById('weekViewWrapper');
    const dayWrapper = document.getElementById('dayViewWrapper');
    const dayTitleEl = document.getElementById('dayHeaderTitle');
    const dayMetaEl = document.getElementById('dayHeaderMeta');
    const timelineBody = document.getElementById('dayTimelineBody');

    if (!dayWrapper || !dayTitleEl || !timelineBody) return;

    if (monthWrapper) monthWrapper.style.display = 'none';
    if (weekWrapper) weekWrapper.style.display = 'none';
    dayWrapper.style.display = 'flex';

    timelineBody.innerHTML = '';

    const selected = parseDateISO(state.selectedDate);
    const dayEvents = getEventsForDate(state.selectedDate);

    // Format Header: e.g. "Sunday, October 11, 2026"
    dayTitleEl.textContent = `${DAY_NAMES[selected.getDay()]}, ${MONTH_NAMES[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`;
    if (dayMetaEl) {
      dayMetaEl.textContent = `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'} scheduled`;
    }

    if (dayEvents.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'day-view-empty-state';
      emptyDiv.innerHTML = `
        <div class="empty-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <h4 class="empty-title">No events scheduled for this day</h4>
        <p class="empty-desc">Take a break or schedule a new task, deadline, or team meeting for this date.</p>
        <button class="btn-primary-add" id="dayEmptyCreateBtn">
          <span>+ Create event for this date</span>
        </button>
      `;
      timelineBody.appendChild(emptyDiv);

      const emptyCreateBtn = document.getElementById('dayEmptyCreateBtn');
      if (emptyCreateBtn) {
        emptyCreateBtn.addEventListener('click', () => {
          openCreateEventModal(state.selectedDate);
        });
      }
      return;
    }

    // Sort events by startTime
    const sorted = [...dayEvents].sort((a, b) => {
      const tA = a.startTime || '00:00';
      const tB = b.startTime || '00:00';
      return tA.localeCompare(tB);
    });

    sorted.forEach(evt => {
      const card = document.createElement('div');
      const typeClass = `day-card-${evt.type.toLowerCase()}`;
      card.className = `day-schedule-card ${typeClass}`;
      card.innerHTML = `
        <div class="day-card-time-column">
          <span class="day-card-time-main">${evt.startTime ? formatTimeDisplay(evt.startTime) : 'All day'}</span>
          <span class="day-card-time-sub">${evt.endTime ? 'to ' + formatTimeDisplay(evt.endTime) : ''}</span>
        </div>
        <div class="day-card-divider"></div>
        <div class="day-card-content">
          <div class="day-card-tag-row">
            <span class="detail-category-tag tag-${evt.type.toLowerCase()}">${evt.type}</span>
            <span class="detail-project-tag">${evt.project || 'General'}</span>
          </div>
          <h4 class="day-card-title">${evt.title}</h4>
          ${evt.description ? `<p class="day-card-desc">${evt.description}</p>` : ''}
          <div class="day-card-meta">
            <span class="day-meta-participants">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              ${evt.participants || 'Team Member'}
            </span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        openEventDetailsModal(evt.id);
      });

      timelineBody.appendChild(card);
    });
  }

  // =========================================================================
  // 10. Master Render Function
  // =========================================================================
  function renderCalendar() {
    updatePeriodDisplay();
    updateSummaryCards();
    renderUpcomingPanel();

    if (state.activeView === 'month') {
      renderMonthView();
    } else if (state.activeView === 'week') {
      renderWeekView();
    } else if (state.activeView === 'day') {
      renderDayView();
    }
  }

  // =========================================================================
  // 11. Right-Side Upcoming Events Panel Rendering
  // =========================================================================
  function renderUpcomingPanel() {
    const listEl = document.getElementById('upcomingScrollList');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Filter upcoming events from TODAY_STR onwards
    const upcomingEvents = state.events
      .filter(evt => evt.date >= TODAY_STR)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));

    if (upcomingEvents.length === 0) {
      listEl.innerHTML = `
        <div class="upcoming-empty-state">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span class="upcoming-empty-text">You're all caught up!</span>
          <span class="upcoming-empty-sub">No upcoming deadlines or meetings scheduled.</span>
        </div>
      `;
      return;
    }

    // Group events into Today, Tomorrow, and Later
    const todayEvents = [];
    const tomorrowDate = new Date(2026, 9, 12);
    const tomorrowStr = formatDateISO(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate());
    const tomorrowEvents = [];
    const laterEvents = [];

    upcomingEvents.forEach(evt => {
      if (evt.date === TODAY_STR) {
        todayEvents.push(evt);
      } else if (evt.date === tomorrowStr) {
        tomorrowEvents.push(evt);
      } else {
        laterEvents.push(evt);
      }
    });

    // Helper to render section group
    function renderSection(sectionTitle, eventsGroup) {
      if (eventsGroup.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'upcoming-group';

      const titleEl = document.createElement('h4');
      titleEl.className = 'upcoming-group-title';
      titleEl.textContent = sectionTitle;
      groupDiv.appendChild(titleEl);

      eventsGroup.forEach(evt => {
        const item = document.createElement('div');
        const typeClass = `upcoming-card-${evt.type.toLowerCase()}`;
        item.className = `upcoming-item-card ${typeClass}`;
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');

        const dateObj = parseDateISO(evt.date);
        const dateFormatted = `${MONTH_NAMES[dateObj.getMonth()].slice(0, 3)} ${dateObj.getDate()}`;
        const timeFormatted = evt.startTime ? formatTimeDisplay(evt.startTime) : 'All day';

        item.innerHTML = `
          <div class="upcoming-item-top">
            <span class="upcoming-type-badge badge-${evt.type.toLowerCase()}">${evt.type}</span>
            <span class="upcoming-project-label">${evt.project || 'General'}</span>
          </div>
          <h5 class="upcoming-item-title">${evt.title}</h5>
          <div class="upcoming-item-meta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>${sectionTitle === 'Today' || sectionTitle === 'Tomorrow' ? timeFormatted : `${dateFormatted} • ${timeFormatted}`}</span>
          </div>
        `;

        item.addEventListener('click', () => {
          openEventDetailsModal(evt.id);
        });

        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEventDetailsModal(evt.id);
          }
        });

        groupDiv.appendChild(item);
      });

      listEl.appendChild(groupDiv);
    }

    renderSection('Today', todayEvents);
    renderSection('Tomorrow', tomorrowEvents);
    renderSection('Upcoming', laterEvents);
  }

  // =========================================================================
  // 12. Create / Edit Event Modal Logic
  // =========================================================================
  function openCreateEventModal(datePreset, timePreset) {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const heading = document.getElementById('modalEventHeading');
    const subheading = document.getElementById('modalEventSubheading');
    const saveBtn = document.getElementById('saveEventModalBtn');
    const formId = document.getElementById('eventFormId');

    if (!modal || !form) return;

    form.reset();
    state.editingEventId = null;
    formId.value = '';

    heading.textContent = 'Create Event';
    subheading.textContent = 'Schedule a task deadline, team meeting, or project milestone.';
    saveBtn.textContent = 'Create Event';

    // Set presets
    const dateInput = document.getElementById('eventDateInput');
    const startInput = document.getElementById('eventStartTimeInput');
    const endInput = document.getElementById('eventEndTimeInput');

    if (dateInput) dateInput.value = datePreset || state.selectedDate || TODAY_STR;
    if (startInput) startInput.value = timePreset || '10:00';
    if (endInput) {
      if (timePreset) {
        const [h, m] = timePreset.split(':').map(Number);
        endInput.value = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      } else {
        endInput.value = '11:00';
      }
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    const titleInput = document.getElementById('eventTitleInput');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 80);
    }
  }

  function openEditEventModal(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('eventModal');
    const heading = document.getElementById('modalEventHeading');
    const subheading = document.getElementById('modalEventSubheading');
    const saveBtn = document.getElementById('saveEventModalBtn');
    const formId = document.getElementById('eventFormId');

    state.editingEventId = eventId;
    formId.value = eventId;

    heading.textContent = 'Edit Event';
    subheading.textContent = 'Update schedule details, assigned project, or meeting times.';
    saveBtn.textContent = 'Save Changes';

    // Populate inputs
    document.getElementById('eventTitleInput').value = event.title || '';
    document.getElementById('eventTypeSelect').value = event.type || 'Task';
    document.getElementById('eventProjectSelect').value = event.project || 'Website Redesign';
    document.getElementById('eventDateInput').value = event.date || TODAY_STR;
    document.getElementById('eventStartTimeInput').value = event.startTime || '';
    document.getElementById('eventEndTimeInput').value = event.endTime || '';
    document.getElementById('eventDescInput').value = event.description || '';
    document.getElementById('eventParticipantsSelect').value = event.participants || 'Team (All Members)';

    // Close Details Modal first
    closeEventDetailsModal();

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeCreateEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function handleEventFormSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('eventTitleInput');
    const typeSelect = document.getElementById('eventTypeSelect');
    const projectSelect = document.getElementById('eventProjectSelect');
    const dateInput = document.getElementById('eventDateInput');
    const startInput = document.getElementById('eventStartTimeInput');
    const endInput = document.getElementById('eventEndTimeInput');
    const descInput = document.getElementById('eventDescInput');
    const participantsSelect = document.getElementById('eventParticipantsSelect');

    const title = titleInput.value.trim();
    const type = typeSelect.value;
    const project = projectSelect.value;
    const date = dateInput.value;
    const startTime = startInput.value;
    const endTime = endInput.value;
    const description = descInput.value.trim();
    const participants = participantsSelect.value;

    if (!title || !date) {
      alert('Please fill out all required fields (Event Title and Date).');
      return;
    }

    // Validation: end time must be after start time if both are provided
    if (startTime && endTime) {
      if (endTime <= startTime) {
        alert('End time must be later than start time.');
        endInput.focus();
        return;
      }
    }

    if (state.editingEventId) {
      // Update existing
      const existingIdx = state.events.findIndex(e => e.id === state.editingEventId);
      if (existingIdx !== -1) {
        state.events[existingIdx] = {
          ...state.events[existingIdx],
          title,
          type,
          project,
          date,
          startTime,
          endTime,
          description,
          participants,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Create new
      const newEvent = {
        id: 'evt-' + Date.now(),
        title,
        type,
        project,
        date,
        startTime,
        endTime,
        description,
        participants,
        createdBy: 'Your Name (Lead)',
        createdAt: new Date().toISOString(),
        isOverdue: false
      };
      state.events.push(newEvent);
    }

    saveEvents();
    closeCreateEventModal();
    renderCalendar();
  }

  // =========================================================================
  // 13. Event Details Modal Logic
  // =========================================================================
  function openEventDetailsModal(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    state.selectedEventId = eventId;
    const modal = document.getElementById('eventDetailsModal');
    if (!modal) return;

    // Set values
    const catTag = document.getElementById('detailCategoryTag');
    const projTag = document.getElementById('detailProjectTag');
    const titleEl = document.getElementById('detailEventTitle');
    const dateTimeVal = document.getElementById('detailDateTimeVal');
    const participantsVal = document.getElementById('detailParticipantsVal');
    const creatorVal = document.getElementById('detailCreatorVal');
    const descEl = document.getElementById('detailEventDesc');

    if (catTag) {
      catTag.textContent = event.type;
      catTag.className = `detail-category-tag tag-${event.type.toLowerCase()}`;
    }
    if (projTag) projTag.textContent = event.project || 'General';
    if (titleEl) titleEl.textContent = event.title;

    if (dateTimeVal) {
      const d = parseDateISO(event.date);
      const formattedDate = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
      let timeText = 'All day';
      if (event.startTime) {
        timeText = formatTimeDisplay(event.startTime);
        if (event.endTime) {
          timeText += ` – ${formatTimeDisplay(event.endTime)}`;
        }
      }
      dateTimeVal.textContent = `${formattedDate} • ${timeText}`;
    }

    if (participantsVal) participantsVal.textContent = event.participants || 'Team Member';
    if (creatorVal) creatorVal.textContent = event.createdBy || 'Your Name (Lead)';
    if (descEl) descEl.textContent = event.description || 'No description provided for this event.';

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeEventDetailsModal() {
    const modal = document.getElementById('eventDetailsModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // =========================================================================
  // 14. Event Deletion Confirmation Modal
  // =========================================================================
  function openDeleteConfirmModal(eventId) {
    const event = state.events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('deleteConfirmModal');
    const targetName = document.getElementById('deleteTargetEventName');

    if (targetName) targetName.textContent = `"${event.title}"`;

    closeEventDetailsModal();

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function executeDeleteEvent() {
    if (!state.selectedEventId) return;

    state.events = state.events.filter(e => e.id !== state.selectedEventId);
    state.selectedEventId = null;

    saveEvents();
    closeDeleteConfirmModal();
    renderCalendar();
  }

  // =========================================================================
  // 15. Global Header Search & Quick Jump
  // =========================================================================
  function setupGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('searchResultsDropdown');
    const list = document.getElementById('searchResultsList');

    if (!input || !dropdown || !list) return;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.remove('is-open');
        list.innerHTML = '';
        return;
      }

      const matches = state.events.filter(evt => {
        return (
          evt.title.toLowerCase().includes(q) ||
          (evt.project && evt.project.toLowerCase().includes(q)) ||
          evt.type.toLowerCase().includes(q)
        );
      }).slice(0, 5);

      if (matches.length === 0) {
        list.innerHTML = '<div class="search-empty-item">No matching calendar events found</div>';
      } else {
        list.innerHTML = '';
        matches.forEach(evt => {
          const item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML = `
            <div class="search-item-title">${evt.title}</div>
            <div class="search-item-meta">${evt.type} • ${evt.date} • ${evt.project || 'General'}</div>
          `;
          item.addEventListener('click', () => {
            dropdown.classList.remove('is-open');
            input.value = '';
            openEventDetailsModal(evt.id);
          });
          list.appendChild(item);
        });
      }

      dropdown.classList.add('is-open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        dropdown.classList.remove('is-open');
      }
    });

    // Keyboard shortcut Ctrl+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // =========================================================================
  // 16. Event Listeners & User Interactions Setup
  // =========================================================================
  function setupEventListeners() {
    // 1. Navigation Arrows and Today Button
    const prevBtn = document.getElementById('prevPeriodBtn');
    const nextBtn = document.getElementById('nextPeriodBtn');
    const todayBtn = document.getElementById('todayNavBtn');

    if (prevBtn) prevBtn.addEventListener('click', handlePrevPeriod);
    if (nextBtn) nextBtn.addEventListener('click', handleNextPeriod);
    if (todayBtn) todayBtn.addEventListener('click', handleTodayJump);

    // 2. View Mode Segmented Controls
    document.querySelectorAll('.view-segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        handleViewChange(btn.dataset.view);
      });
    });

    // 3. Create Event Trigger Buttons
    const createBtn = document.getElementById('createEventBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openCreateEventModal(state.selectedDate);
      });
    }

    // 4. Create/Edit Modal Buttons & Form
    const eventForm = document.getElementById('eventForm');
    const closeEventBtn = document.getElementById('closeEventModalBtn');
    const cancelEventBtn = document.getElementById('cancelEventModalBtn');

    if (eventForm) eventForm.addEventListener('submit', handleEventFormSubmit);
    if (closeEventBtn) closeEventBtn.addEventListener('click', closeCreateEventModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', closeCreateEventModal);

    // 5. Event Details Modal Actions
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    const closeDetailDoneBtn = document.getElementById('closeDetailDoneBtn');
    const editDetailBtn = document.getElementById('editEventFromDetailBtn');
    const deleteDetailBtn = document.getElementById('deleteEventFromDetailBtn');

    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeEventDetailsModal);
    if (closeDetailDoneBtn) closeDetailDoneBtn.addEventListener('click', closeEventDetailsModal);
    if (editDetailBtn) {
      editDetailBtn.addEventListener('click', () => {
        if (state.selectedEventId) openEditEventModal(state.selectedEventId);
      });
    }
    if (deleteDetailBtn) {
      deleteDetailBtn.addEventListener('click', () => {
        if (state.selectedEventId) openDeleteConfirmModal(state.selectedEventId);
      });
    }

    // 6. Delete Confirmation Modal Actions
    const closeDelModalBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDelBtn = document.getElementById('cancelDeleteBtn');
    const confirmDelBtn = document.getElementById('confirmDeleteBtn');

    if (closeDelModalBtn) closeDelModalBtn.addEventListener('click', closeDeleteConfirmModal);
    if (cancelDelBtn) cancelDelBtn.addEventListener('click', closeDeleteConfirmModal);
    if (confirmDelBtn) confirmDelBtn.addEventListener('click', executeDeleteEvent);

    // 7. Filters & In-Page Search
    const searchFilterInput = document.getElementById('eventSearchFilterInput');
    const categorySelect = document.getElementById('categoryFilterSelect');
    const projectSelect = document.getElementById('projectFilterSelect');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    if (searchFilterInput) {
      searchFilterInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderCalendar();
      });
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderCalendar();
      });
    }

    if (projectSelect) {
      projectSelect.addEventListener('change', (e) => {
        state.projectFilter = e.target.value;
        renderCalendar();
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        state.searchQuery = '';
        state.categoryFilter = 'all';
        state.projectFilter = 'all';
        state.activeCardFilter = null;

        if (searchFilterInput) searchFilterInput.value = '';
        if (categorySelect) categorySelect.value = 'all';
        if (projectSelect) projectSelect.value = 'all';

        renderCalendar();
      });
    }

    // 8. Summary Cards Clickable Filters
    document.querySelectorAll('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.filterType;
        if (state.activeCardFilter === type) {
          state.activeCardFilter = null; // Toggle off
        } else {
          state.activeCardFilter = type; // Activate filter
        }
        renderCalendar();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // 9. Upcoming View All Button
    const upcomingViewAllBtn = document.getElementById('upcomingViewAllBtn');
    if (upcomingViewAllBtn) {
      upcomingViewAllBtn.addEventListener('click', () => {
        state.activeCardFilter = null;
        state.categoryFilter = 'all';
        state.projectFilter = 'all';
        state.searchQuery = '';
        if (searchFilterInput) searchFilterInput.value = '';
        if (categorySelect) categorySelect.value = 'all';
        if (projectSelect) projectSelect.value = 'all';
        handleViewChange('month');
      });
    }

    // 10. Workspace Dropdown
    const workspaceBtn = document.getElementById('workspaceBtn');
    const workspaceDropdown = document.getElementById('workspaceDropdown');
    const currentWorkspaceName = document.getElementById('currentWorkspaceName');

    if (workspaceBtn && workspaceDropdown) {
      workspaceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = workspaceDropdown.classList.contains('is-open');
        workspaceDropdown.classList.toggle('is-open', !isOpen);
        workspaceBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });

      workspaceDropdown.querySelectorAll('.dropdown-item[data-workspace]').forEach(item => {
        item.addEventListener('click', () => {
          const ws = item.dataset.workspace;
          if (currentWorkspaceName) currentWorkspaceName.textContent = ws;
          workspaceDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          workspaceDropdown.classList.remove('is-open');
          workspaceBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // 11. Notifications Dropdown
    const notifBtn = document.getElementById('notificationsBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBadge = document.getElementById('notifBadge');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifDropdown.classList.contains('is-open');
        notifDropdown.classList.toggle('is-open', !isOpen);
        notifBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });

      if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
          document.querySelectorAll('.notif-item.unread').forEach(item => {
            item.classList.remove('unread');
          });
          if (notifBadge) notifBadge.style.display = 'none';
        });
      }
    }

    // 12. Help Dropdown
    const helpBtn = document.getElementById('helpHeaderBtn');
    const helpDropdown = document.getElementById('helpDropdown');

    if (helpBtn && helpDropdown) {
      helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = helpDropdown.classList.contains('is-open');
        helpDropdown.classList.toggle('is-open', !isOpen);
        helpBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    }

    // 13. Profile Menu Dropdown (Sidebar & Header)
    const profileBtn = document.getElementById('profileBtn');
    const headerAvatarBtn = document.getElementById('headerAvatarBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    function toggleProfile(e) {
      e.stopPropagation();
      if (!profileDropdown) return;
      const isOpen = profileDropdown.classList.contains('is-open');
      profileDropdown.classList.toggle('is-open', !isOpen);
      if (profileBtn) profileBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    }

    if (profileBtn) profileBtn.addEventListener('click', toggleProfile);
    if (headerAvatarBtn) headerAvatarBtn.addEventListener('click', toggleProfile);

    const logOutBtn = document.getElementById('menuLogOut');
    if (logOutBtn) {
      logOutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of TaskFlow?')) {
          window.location.href = 'login.html';
        }
      });
    }

    // 14. Mobile Drawer Toggles
    const hamburgerBtn = document.getElementById('mobileHamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    function openMobileSidebar() {
      if (appSidebar) appSidebar.classList.add('mobile-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.add('is-visible');
    }

    function closeMobileSidebar() {
      if (appSidebar) appSidebar.classList.remove('mobile-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('is-visible');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // 15. Global Close on Click Outside for Dropdowns
    document.addEventListener('click', () => {
      if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
      if (notifDropdown) notifDropdown.classList.remove('is-open');
      if (helpDropdown) helpDropdown.classList.remove('is-open');
      if (profileDropdown) profileDropdown.classList.remove('is-open');
    });

    // 16. Modal Backdrop Clicks (close when clicking outside card)
    document.querySelectorAll('.app-modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('is-open');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    });

    // 17. Global Keyboard Shortcuts (Escape, T, M, W, D)
    window.addEventListener('keydown', (e) => {
      // Escape closes open modals & dropdowns
      if (e.key === 'Escape') {
        closeCreateEventModal();
        closeEventDetailsModal();
        closeDeleteConfirmModal();
        closeMobileSidebar();
        if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
        if (notifDropdown) notifDropdown.classList.remove('is-open');
        if (helpDropdown) helpDropdown.classList.remove('is-open');
        if (profileDropdown) profileDropdown.classList.remove('is-open');
      }

      // If user is typing in an input or textarea, don't trigger calendar view shortcuts
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key.toLowerCase() === 't') {
        handleTodayJump();
      } else if (e.key.toLowerCase() === 'm') {
        handleViewChange('month');
      } else if (e.key.toLowerCase() === 'w') {
        handleViewChange('week');
      } else if (e.key.toLowerCase() === 'd') {
        handleViewChange('day');
      }
    });
  }

  // =========================================================================
  // 17. Initialization & Real Backend Tasks
  // =========================================================================
  async function fetchCalendarEventsFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const [serverTasks, serverProjects] = await Promise.all([
        TaskFlowAPI.getTasks(),
        TaskFlowAPI.getProjects()
      ]);

      const events = [];
      const todayStr = new Date().toISOString().split('T')[0];

      if (serverTasks && Array.isArray(serverTasks)) {
        serverTasks.filter(t => t.due_date).forEach(t => {
          events.push({
            id: `task-evt-${t.id}`,
            taskId: t.id,
            title: t.title,
            type: t.status === 'Completed' ? 'Milestone' : (t.priority === 'Urgent' ? 'Deadline' : 'Task'),
            date: t.due_date,
            startTime: '09:00',
            endTime: '17:00',
            project: t.project_name || 'Project',
            description: t.description || 'Task scheduled deadline.',
            participants: t.assignee_details ? t.assignee_details.full_name : 'Unassigned',
            createdBy: 'TaskFlow',
            createdAt: t.created_at,
            isOverdue: t.due_date < todayStr && t.status !== 'Completed'
          });
        });
      }

      if (serverProjects && Array.isArray(serverProjects)) {
        serverProjects.filter(p => p.due_date).forEach(p => {
          events.push({
            id: `proj-evt-${p.id}`,
            projectId: p.id,
            title: `${p.name} (Deadline)`,
            type: 'Milestone',
            date: p.due_date,
            startTime: '10:00',
            endTime: '12:00',
            project: p.name,
            description: p.description || 'Project deliverable milestone.',
            participants: 'Project Team',
            createdBy: p.owner ? p.owner.full_name : 'TaskFlow',
            createdAt: p.created_at,
            isOverdue: p.due_date < todayStr && p.status !== 'Completed'
          });
        });
      }

      state.events = events;
      renderCalendar();
    } catch (e) {
      console.warn('Could not fetch calendar tasks from API:', e);
    }
  }

  async function init() {
    if (typeof TaskFlowAPI !== 'undefined' && !TaskFlowAPI.requireAuth()) return;
    loadEvents();
    setupEventListeners();
    setupGlobalSearch();
    renderCalendar();

    await fetchCalendarEventsFromAPI();

    if (window.TaskFlowWS) {
      TaskFlowWS.onTaskUpdate(() => {
        fetchCalendarEventsFromAPI();
      });
      TaskFlowWS.onProjectUpdate(() => {
        fetchCalendarEventsFromAPI();
      });
      TaskFlowWS.onNotification(() => {
        fetchCalendarEventsFromAPI();
      });
      TaskFlowWS.onReconnect(() => {
        fetchCalendarEventsFromAPI();
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
