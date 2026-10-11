/**
 * TaskFlow — Interface 10: Task Details Page
 * Complete Vanilla JavaScript Application Logic
 * 
 * Features:
 * - Dynamic Task State Management with LocalStorage persistence
 * - Real-time Status & Priority Badge Styling and Syncing
 * - Inline & Modal Task Editing (Title, Status, Priority, Assignee, Due Date)
 * - Description View/Edit toggle with rich paragraph preservation
 * - Subtask Checklist with live progress bar and completion percentage math
 * - Attachment management with real file picker & download trigger
 * - Discussion Comments Feed with posting, Ctrl+Enter hotkey, and sorting
 * - Interactive Tags (Add/Remove) & People assignment
 * - Chronological Activity Timeline logging
 * - Shareable Task Link Copying with Clipboard API
 * - Star/Favorite toggle with feedback toast
 * - Three-dot Task Menu & Delete confirmation modal
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Initial State & Seed Task Data
  // =========================================================================
  const STORAGE_KEY = 'taskflow_task_details_v2';

  const DEFAULT_TASK = {
    id: "TASK-0",
    rawId: null,
    title: "Loading Task...",
    status: "To Do",
    priority: "Medium",
    assignee: "Unassigned",
    assigneeInitials: "--",
    assigneeRole: "Member",
    dueDate: "",
    startDate: "",
    createdDate: "",
    updatedDate: "",
    project: "",
    projectStatus: "",
    isStarred: false,
    description: "",
    subtasks: [],
    attachments: [],
    comments: [],
    tags: [],
    activity: []
  };

  let task = { ...DEFAULT_TASK };

  // =========================================================================
  // 2. Storage Helpers
  // =========================================================================
  function loadTask() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        task = JSON.parse(stored);
      } else {
        task = JSON.parse(JSON.stringify(DEFAULT_TASK));
        saveTask();
      }
    } catch (e) {
      console.warn('LocalStorage error, using fallback:', e);
      task = JSON.parse(JSON.stringify(DEFAULT_TASK));
    }
  }

  function saveTask() {
    try {
      task.updatedDate = 'Just now';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(task));
    } catch (e) {
      console.warn('Failed to save task to localStorage:', e);
    }
  }

  function logActivity(messageText) {
    const act = {
      id: 'act-' + Date.now(),
      text: messageText,
      time: 'Just now'
    };
    task.activity.unshift(act);
    renderActivityTimeline();
  }

  // =========================================================================
  // 3. UI Synchronization & Rendering
  // =========================================================================
  function renderAll() {
    renderHeaderAndMetadata();
    renderDescription();
    renderSubtasks();
    renderAttachments();
    renderComments();
    renderSidebarDetails();
    renderActivityTimeline();
  }

  // A. Header & Metadata Row
  function renderHeaderAndMetadata() {
    // Title
    const titleEl = document.getElementById('taskTitleDisplay');
    if (titleEl) titleEl.textContent = task.title;

    // Status Badge & Dropdown
    const headerStatusBadge = document.getElementById('headerStatusBadge');
    const metaStatusSelect = document.getElementById('metaStatusSelect');
    if (headerStatusBadge && metaStatusSelect) {
      headerStatusBadge.textContent = task.status;
      headerStatusBadge.className = `status-pill status-${formatSlug(task.status)}`;
      metaStatusSelect.value = task.status;
      metaStatusSelect.className = `chip-select select-status-${formatSlug(task.status)}`;
    }

    // Priority Dropdown
    const metaPrioritySelect = document.getElementById('metaPrioritySelect');
    if (metaPrioritySelect) {
      metaPrioritySelect.value = task.priority;
      metaPrioritySelect.className = `chip-select select-priority-${formatSlug(task.priority)}`;
    }

    // Assignee
    const metaAssigneeSelect = document.getElementById('metaAssigneeSelect');
    const thumbAvatar = document.getElementById('assigneeAvatarThumb');
    if (metaAssigneeSelect) metaAssigneeSelect.value = task.assignee;
    if (thumbAvatar) thumbAvatar.textContent = task.assigneeInitials || 'AM';

    // Due Date
    const metaDueDateInput = document.getElementById('metaDueDateInput');
    if (metaDueDateInput) metaDueDateInput.value = task.dueDate;

    // Project Name
    const taskProjName = document.getElementById('taskProjectName');
    const metaProjLink = document.getElementById('metaProjectLink');
    if (taskProjName) taskProjName.textContent = task.project;
    if (metaProjLink) {
      const span = metaProjLink.querySelector('span');
      if (span) span.textContent = task.project;
    }

    // Star Button
    const starBtn = document.getElementById('starTaskBtn');
    if (starBtn) {
      starBtn.classList.toggle('is-starred', !!task.isStarred);
    }
  }

  // B. Description
  function renderDescription() {
    const pEl = document.getElementById('descriptionTextParagraph');
    const textarea = document.getElementById('descriptionEditTextarea');
    if (pEl) pEl.textContent = task.description;
    if (textarea) textarea.value = task.description;
  }

  // C. Subtasks & Checklist
  function renderSubtasks() {
    const listEl = document.getElementById('subtasksListContainer');
    const badgeEl = document.getElementById('subtaskCountBadge');
    const fillEl = document.getElementById('subtaskProgressFill');
    const sideProgressPercent = document.getElementById('sideProgressPercent');
    const sideProgressDetail = document.getElementById('sideProgressDetail');
    const sideProgressFill = document.getElementById('sideProgressFill');

    if (!listEl) return;

    listEl.innerHTML = '';

    const total = task.subtasks.length;
    const completed = task.subtasks.filter(s => s.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Update Progress Badges & Bars
    if (badgeEl) badgeEl.textContent = `${completed} of ${total} completed`;
    if (fillEl) fillEl.style.width = `${percentage}%`;
    if (sideProgressPercent) sideProgressPercent.textContent = `${percentage}%`;
    if (sideProgressDetail) sideProgressDetail.textContent = `${completed} of ${total} subtasks completed`;
    if (sideProgressFill) sideProgressFill.style.width = `${percentage}%`;

    task.subtasks.forEach(sub => {
      const row = document.createElement('div');
      row.className = `subtask-item-row ${sub.completed ? 'is-completed' : ''}`;
      row.dataset.id = sub.id;

      row.innerHTML = `
        <div class="subtask-left-cluster">
          <input type="checkbox" class="subtask-checkbox" ${sub.completed ? 'checked' : ''} aria-label="Toggle subtask completion">
          <span class="subtask-title-text">${sub.title}</span>
        </div>
        <div class="subtask-right-meta">
          ${sub.dueDate ? `<span class="subtask-due-tag">${sub.dueDate}</span>` : ''}
          <div class="subtask-avatar-thumb">${sub.assignee || 'AM'}</div>
          <button class="btn-delete-subtask" title="Delete subtask" aria-label="Delete subtask">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;

      // Checkbox Listener
      const checkbox = row.querySelector('.subtask-checkbox');
      checkbox.addEventListener('change', () => {
        sub.completed = checkbox.checked;
        saveTask();
        renderSubtasks();
        logActivity(`Subtask ${sub.completed ? 'completed' : 'reopened'}: <em>${sub.title}</em>`);
        showToast(sub.completed ? 'Subtask marked completed' : 'Subtask reopened');

        if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(sub.id))) {
          TaskFlowAPI.updateSubTask(sub.id, { is_completed: sub.completed }).catch(err => console.error(err));
        }
      });

      // Delete Listener
      const deleteBtn = row.querySelector('.btn-delete-subtask');
      deleteBtn.addEventListener('click', () => {
        task.subtasks = task.subtasks.filter(s => s.id !== sub.id);
        saveTask();
        renderSubtasks();
        logActivity(`Subtask removed: <em>${sub.title}</em>`);
        showToast('Subtask removed');

        if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(sub.id))) {
          TaskFlowAPI.deleteSubTask(sub.id).catch(err => console.error(err));
        }
      });

      listEl.appendChild(row);
    });
  }

  // D. Attachments
  function renderAttachments() {
    const gridEl = document.getElementById('attachmentsGrid');
    const emptyEl = document.getElementById('attachmentsEmptyState');
    const badgeEl = document.getElementById('attachmentCountBadge');

    if (!gridEl) return;

    gridEl.innerHTML = '';

    const count = task.attachments.length;
    if (badgeEl) badgeEl.textContent = `${count} file${count === 1 ? '' : 's'}`;

    if (count === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    task.attachments.forEach(att => {
      const card = document.createElement('div');
      card.className = 'attachment-file-card';
      card.dataset.id = att.id;

      let iconClass = 'icon-default';
      let iconLabel = 'FILE';
      if (att.type === 'figma') { iconClass = 'icon-figma'; iconLabel = 'FIG'; }
      else if (att.type === 'pdf') { iconClass = 'icon-pdf'; iconLabel = 'PDF'; }
      else if (att.type === 'image') { iconClass = 'icon-image'; iconLabel = 'IMG'; }

      card.innerHTML = `
        <div class="file-icon-box ${iconClass}">${iconLabel}</div>
        <div class="file-info-col">
          <span class="file-name-text" title="${att.name}">${att.name}</span>
          <span class="file-meta-sub">${att.size} • by ${att.uploader}</span>
        </div>
        <div class="file-actions-wrap">
          <button class="btn-file-action download" title="Download file" aria-label="Download ${att.name}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="btn-file-action delete" title="Remove attachment" aria-label="Remove ${att.name}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      // Download Action
      card.querySelector('.btn-file-action.download').addEventListener('click', () => {
        showToast(`Downloading "${att.name}"…`);
      });

      // Delete Action
      card.querySelector('.btn-file-action.delete').addEventListener('click', () => {
        task.attachments = task.attachments.filter(a => a.id !== att.id);
        saveTask();
        renderAttachments();
        logActivity(`Attachment removed: <em>${att.name}</em>`);
        showToast('Attachment removed');
      });

      gridEl.appendChild(card);
    });
  }

  // E. Comments & Discussion
  function renderComments(order = 'newest') {
    const listEl = document.getElementById('commentsFeedList');
    const badgeEl = document.getElementById('commentCountBadge');
    const emptyEl = document.getElementById('commentsEmptyState');

    if (!listEl) return;

    listEl.innerHTML = '';

    const count = task.comments.length;
    if (badgeEl) badgeEl.textContent = `${count} comment${count === 1 ? '' : 's'}`;

    if (count === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    // Sort comments
    const sorted = [...task.comments].sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return order === 'newest' ? tB - tA : tA - tB;
    });

    sorted.forEach(c => {
      const row = document.createElement('div');
      row.className = 'comment-entry-row';
      row.dataset.id = c.id;

      row.innerHTML = `
        <div class="comment-author-avatar ${c.avatarClass || 'av-lead'}">${c.initials}</div>
        <div class="comment-content-wrap">
          <div class="comment-header-meta">
            <span class="comment-author-name">${c.author}</span>
            <span class="comment-time-stamp">${c.timeDisplay}</span>
          </div>
          <p class="comment-body-text">${c.text}</p>
          <div class="comment-actions-bar">
            <button class="btn-comment-sub reply-btn">Reply</button>
            ${c.canDelete ? `<button class="btn-comment-sub danger delete-comment-btn">Delete</button>` : ''}
          </div>
        </div>
      `;

      // Reply Click
      row.querySelector('.reply-btn').addEventListener('click', () => {
        const composer = document.getElementById('newCommentTextarea');
        if (composer) {
          composer.value = `@${c.author} `;
          composer.focus();
        }
      });

      // Delete Click (if user's comment)
      const delBtn = row.querySelector('.delete-comment-btn');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          task.comments = task.comments.filter(item => item.id !== c.id);
          saveTask();
          renderComments();
          logActivity(`Comment deleted by <strong>${c.author}</strong>`);
          showToast('Comment deleted');
        });
      }

      listEl.appendChild(row);
    });
  }

  // F. Sidebar Details (Dates, People, Project, Tags)
  function renderSidebarDetails() {
    // Dates
    const sideDueDate = document.getElementById('sideDueDate');
    const sideCreatedDate = document.getElementById('sideCreatedDate');
    const sideUpdatedDate = document.getElementById('sideUpdatedDate');

    if (sideDueDate) sideDueDate.textContent = `${task.dueDate} (Active)`;
    if (sideCreatedDate) sideCreatedDate.textContent = task.createdDate;
    if (sideUpdatedDate) sideUpdatedDate.textContent = task.updatedDate;

    // Assignee
    const sideAssignee = document.getElementById('sideAssigneeName');
    if (sideAssignee) sideAssignee.textContent = task.assignee;

    // Project
    const sideProj = document.getElementById('sideProjectName');
    if (sideProj) sideProj.textContent = task.project;

    // Tags
    renderTags();
  }

  function renderTags() {
    const cluster = document.getElementById('tagsCluster');
    if (!cluster) return;

    cluster.innerHTML = '';

    task.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'task-chip-tag';
      chip.innerHTML = `${tag} <button class="tag-remove-btn" aria-label="Remove tag">&times;</button>`;

      chip.querySelector('.tag-remove-btn').addEventListener('click', () => {
        task.tags = task.tags.filter(t => t !== tag);
        saveTask();
        renderTags();
        logActivity(`Tag removed: <em>${tag}</em>`);
        showToast(`Tag "${tag}" removed`);
      });

      cluster.appendChild(chip);
    });
  }

  // G. Activity Timeline
  function renderActivityTimeline() {
    const listEl = document.getElementById('activityTimelineList');
    if (!listEl) return;

    listEl.innerHTML = '';

    task.activity.slice(0, 6).forEach(act => {
      const row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML = `
        <span class="activity-text">${act.text}</span>
        <span class="activity-time">${act.time}</span>
      `;
      listEl.appendChild(row);
    });
  }

  // =========================================================================
  // 4. Form Actions & Mutation Handlers
  // =========================================================================
  function formatSlug(str) {
    return (str || '').toLowerCase().replace(/\s+/g, '-');
  }

  function handleStatusChange(newStatus) {
    const prev = task.status;
    task.status = newStatus;
    saveTask();
    renderHeaderAndMetadata();
    logActivity(`Status changed from <em>${prev}</em> to <strong>${newStatus}</strong>`);
    showToast(`Status updated to "${newStatus}"`);
    if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
      TaskFlowAPI.updateTask(task.rawId, { status: newStatus }).catch(err => console.error(err));
    }
  }

  function handlePriorityChange(newPriority) {
    const prev = task.priority;
    task.priority = newPriority;
    saveTask();
    renderHeaderAndMetadata();
    logActivity(`Priority changed from <em>${prev}</em> to <strong>${newPriority}</strong>`);
    showToast(`Priority set to "${newPriority}"`);
    if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
      TaskFlowAPI.updateTask(task.rawId, { priority: newPriority }).catch(err => console.error(err));
    }
  }

  function handleAssigneeChange(newAssignee) {
    const prev = task.assignee;
    task.assignee = newAssignee;
    
    // Set initials & thumb
    const parts = newAssignee.split(' ');
    task.assigneeInitials = parts.length > 1 ? parts[0][0] + parts[1][0] : newAssignee.slice(0, 2).toUpperCase();

    saveTask();
    renderHeaderAndMetadata();
    renderSidebarDetails();
    logActivity(`Assignee changed from <em>${prev}</em> to <strong>${newAssignee}</strong>`);
    showToast(`Task assigned to ${newAssignee}`);
  }

  function handleDueDateChange(newDate) {
    task.dueDate = newDate;
    saveTask();
    renderSidebarDetails();
    logActivity(`Due date rescheduled to <strong>${newDate}</strong>`);
    showToast(`Due date updated to ${newDate}`);
    if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
      TaskFlowAPI.updateTask(task.rawId, { due_date: newDate || null }).catch(err => console.error(err));
    }
  }

  // =========================================================================
  // 5. Modals & Dialog Controllers
  // =========================================================================
  function openEditModal() {
    const modal = document.getElementById('editTaskModal');
    if (!modal) return;

    // Populate inputs
    document.getElementById('editTitleInput').value = task.title;
    document.getElementById('editStatusSelect').value = task.status;
    document.getElementById('editPrioritySelect').value = task.priority;
    document.getElementById('editAssigneeSelect').value = task.assignee;
    document.getElementById('editDueDateInput').value = task.dueDate;
    document.getElementById('editProjectSelect').value = task.project;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeEditModal() {
    const modal = document.getElementById('editTaskModal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function handleEditFormSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('editTitleInput').value.trim();
    const status = document.getElementById('editStatusSelect').value;
    const priority = document.getElementById('editPrioritySelect').value;
    const assignee = document.getElementById('editAssigneeSelect').value;
    const dueDate = document.getElementById('editDueDateInput').value;
    const project = document.getElementById('editProjectSelect').value;

    if (!title) {
      alert('Task title is required.');
      return;
    }

    task.title = title;
    task.status = status;
    task.priority = priority;
    task.assignee = assignee;
    task.dueDate = dueDate;
    task.project = project;

    const parts = assignee.split(' ');
    task.assigneeInitials = parts.length > 1 ? parts[0][0] + parts[1][0] : assignee.slice(0, 2).toUpperCase();

    saveTask();
    closeEditModal();
    renderAll();
    logActivity(`Task properties updated`);
    showToast('Task details updated successfully');

    if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
      TaskFlowAPI.updateTask(task.rawId, {
        title,
        status,
        priority,
        due_date: dueDate || null
      }).catch(err => console.error('Failed to update task:', err));
    }
  }

  function openDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
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

  async function executeDeleteTask() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
        await TaskFlowAPI.deleteTask(task.rawId);
      }
    } catch (e) {
      console.warn(e);
    }
    showToast('Task permanently deleted. Returning to My Tasks…');
    setTimeout(() => {
      window.location.href = 'my-tasks.html';
    }, 900);
  }

  // =========================================================================
  // 6. Toast Notifications Feedback
  // =========================================================================
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
      <svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // =========================================================================
  // 7. Event Listeners Initialization
  // =========================================================================
  function setupEventListeners() {
    // 1. Status, Priority, Assignee, Due Date Metadata Controls
    const metaStatus = document.getElementById('metaStatusSelect');
    if (metaStatus) metaStatus.addEventListener('change', (e) => handleStatusChange(e.target.value));

    const metaPriority = document.getElementById('metaPrioritySelect');
    if (metaPriority) metaPriority.addEventListener('change', (e) => handlePriorityChange(e.target.value));

    const metaAssignee = document.getElementById('metaAssigneeSelect');
    if (metaAssignee) metaAssignee.addEventListener('change', (e) => handleAssigneeChange(e.target.value));

    const metaDueDate = document.getElementById('metaDueDateInput');
    if (metaDueDate) metaDueDate.addEventListener('change', (e) => handleDueDateChange(e.target.value));

    // 2. Share Button (Clipboard copy)
    const shareBtn = document.getElementById('shareTaskBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          showToast('Task link copied to clipboard!');
        }).catch(() => {
          showToast('Task link copied!');
        });
      });
    }

    // 3. Star Button
    const starBtn = document.getElementById('starTaskBtn');
    if (starBtn) {
      starBtn.addEventListener('click', () => {
        task.isStarred = !task.isStarred;
        saveTask();
        starBtn.classList.toggle('is-starred', !!task.isStarred);
        showToast(task.isStarred ? 'Task added to Starred' : 'Task removed from Starred');
      });
    }

    // 4. Three-dot Task Menu
    const moreBtn = document.getElementById('taskMoreBtn');
    const moreDropdown = document.getElementById('taskMoreDropdown');

    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.contains('is-open');
        moreDropdown.classList.toggle('is-open', !isOpen);
        moreBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });

      document.getElementById('menuCopyTaskLink').addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Task link copied to clipboard!');
        moreDropdown.classList.remove('is-open');
      });

      document.getElementById('menuDuplicateTask').addEventListener('click', () => {
        showToast('Task duplicated as #TASK-1043');
        moreDropdown.classList.remove('is-open');
      });

      document.getElementById('menuArchiveTask').addEventListener('click', () => {
        showToast('Task moved to archive');
        moreDropdown.classList.remove('is-open');
      });

      document.getElementById('menuDeleteTask').addEventListener('click', () => {
        moreDropdown.classList.remove('is-open');
        openDeleteConfirmModal();
      });
    }

    // 5. Edit Task Modal Triggers
    const openEditBtn = document.getElementById('openEditTaskModalBtn');
    const closeEditBtn = document.getElementById('closeEditModalBtn');
    const cancelEditBtn = document.getElementById('cancelEditModalBtn');
    const editForm = document.getElementById('editTaskForm');

    if (openEditBtn) openEditBtn.addEventListener('click', openEditModal);
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
    if (editForm) editForm.addEventListener('submit', handleEditFormSubmit);

    // 6. Delete Confirmation Modal Triggers
    const closeDeleteBtn = document.getElementById('closeDeleteModalBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', executeDeleteTask);

    // 7. Description View / Edit Toggle
    const editDescBtn = document.getElementById('editDescriptionBtn');
    const viewMode = document.getElementById('descriptionViewMode');
    const editMode = document.getElementById('descriptionEditMode');
    const textarea = document.getElementById('descriptionEditTextarea');
    const saveDescBtn = document.getElementById('saveDescriptionEditBtn');
    const cancelDescBtn = document.getElementById('cancelDescriptionEditBtn');

    if (editDescBtn && viewMode && editMode) {
      editDescBtn.addEventListener('click', () => {
        viewMode.style.display = 'none';
        editMode.style.display = 'flex';
        textarea.focus();
      });

      cancelDescBtn.addEventListener('click', () => {
        textarea.value = task.description;
        editMode.style.display = 'none';
        viewMode.style.display = 'block';
      });

      saveDescBtn.addEventListener('click', () => {
        task.description = textarea.value.trim();
        saveTask();
        renderDescription();
        editMode.style.display = 'none';
        viewMode.style.display = 'block';
        logActivity('Task description updated');
        showToast('Description saved successfully');
      });
    }

    // 8. Add Subtask Inline Form
    const addSubtaskForm = document.getElementById('addSubtaskForm');
    const newSubtaskInput = document.getElementById('newSubtaskInput');

    if (addSubtaskForm && newSubtaskInput) {
      addSubtaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = newSubtaskInput.value.trim();
        if (!text) return;

        const newSub = {
          id: 'sub-' + Date.now(),
          title: text,
          completed: false,
          assignee: 'AM',
          dueDate: 'Oct 18'
        };

        task.subtasks.push(newSub);
        newSubtaskInput.value = '';
        saveTask();
        renderSubtasks();
        logActivity(`Subtask added: <em>${text}</em>`);
        showToast('Subtask added');

        if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
          try {
            const created = await TaskFlowAPI.createSubTask(task.rawId, { title: text });
            newSub.id = created.id;
            renderSubtasks();
          } catch (err) {
            console.error('Failed to create subtask on backend:', err);
          }
        }
      });
    }

    // 9. Attachments Upload File Picker
    const fileInput = document.getElementById('attachmentFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(f => {
          let type = 'default';
          if (f.name.endsWith('.fig')) type = 'figma';
          else if (f.name.endsWith('.pdf')) type = 'pdf';
          else if (f.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) type = 'image';

          const sizeKb = Math.round(f.size / 1024);
          const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

          task.attachments.unshift({
            id: 'att-' + Date.now() + Math.random().toString(36).substr(2, 4),
            name: f.name,
            size: sizeStr,
            type: type,
            uploader: 'Your Name',
            date: 'Just now'
          });
        });

        fileInput.value = '';
        saveTask();
        renderAttachments();
        logActivity(`Uploaded ${files.length} attachment${files.length > 1 ? 's' : ''}`);
        showToast('File attached successfully');
      });
    }

    // 10. Post Comment Composer
    const commentForm = document.getElementById('commentComposerForm');
    const commentTextarea = document.getElementById('newCommentTextarea');
    const sortSelect = document.getElementById('commentsSortSelect');

    if (commentForm && commentTextarea) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = commentTextarea.value.trim();
        if (!text) return;

        const newComment = {
          id: 'com-' + Date.now(),
          author: 'Your Name',
          initials: 'YB',
          avatarClass: 'av-lead',
          text: text,
          timestamp: new Date().toISOString(),
          timeDisplay: 'Just now',
          canDelete: true
        };

        task.comments.push(newComment);
        commentTextarea.value = '';
        saveTask();
        renderComments(sortSelect ? sortSelect.value : 'newest');
        logActivity('<strong>Your Name</strong> posted a new comment');
        showToast('Comment posted');

        if (typeof TaskFlowAPI !== 'undefined' && task.rawId) {
          try {
            const created = await TaskFlowAPI.createTaskComment(task.rawId, text);
            newComment.id = created.id;
            if (created.author_name) newComment.author = created.author_name;
            renderComments(sortSelect ? sortSelect.value : 'newest');
          } catch (err) {
            console.error('Failed to post comment to backend:', err);
          }
        }
      });

      // Ctrl + Enter to submit comment
      commentTextarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          commentForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        renderComments(e.target.value);
      });
    }

    // 11. Add Tag Inline Form
    const addTagForm = document.getElementById('addTagForm');
    const newTagInput = document.getElementById('newTagInput');

    if (addTagForm && newTagInput) {
      addTagForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tag = newTagInput.value.trim();
        if (!tag) return;

        if (!task.tags.includes(tag)) {
          task.tags.push(tag);
          saveTask();
          renderTags();
          logActivity(`Tag added: <em>${tag}</em>`);
          showToast(`Tag "${tag}" added`);
        }
        newTagInput.value = '';
      });
    }

    // 12. Workspace Selector Dropdown
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

    // 13. Profile Dropdown
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

    // 14. Help Dropdown
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

    // 15. Mobile Drawer
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

    // 16. Global Click: Close open menus
    document.addEventListener('click', () => {
      if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
      if (profileDropdown) profileDropdown.classList.remove('is-open');
      if (helpDropdown) helpDropdown.classList.remove('is-open');
      if (moreDropdown) moreDropdown.classList.remove('is-open');
    });

    // 17. Global Keyboard Shortcuts (Escape, E for Edit, S for Star)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditModal();
        closeDeleteConfirmModal();
        closeMobileSidebar();
        if (workspaceDropdown) workspaceDropdown.classList.remove('is-open');
        if (profileDropdown) profileDropdown.classList.remove('is-open');
        if (helpDropdown) helpDropdown.classList.remove('is-open');
        if (moreDropdown) moreDropdown.classList.remove('is-open');
      }

      // Ignore if user is currently typing in an input
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key.toLowerCase() === 'e') {
        openEditModal();
      } else if (e.key.toLowerCase() === 's') {
        if (starBtn) starBtn.click();
      }
    });
  }

  // =========================================================================
  // 8. Global Search with Ctrl+K
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

      const results = [];
      if (task.title.toLowerCase().includes(q)) results.push({ type: 'Task', text: task.title });
      task.subtasks.forEach(s => {
        if (s.title.toLowerCase().includes(q)) results.push({ type: 'Subtask', text: s.title });
      });
      task.attachments.forEach(a => {
        if (a.name.toLowerCase().includes(q)) results.push({ type: 'Attachment', text: a.name });
      });

      if (results.length === 0) {
        list.innerHTML = '<div class="dropdown-item" style="color: var(--color-muted);">No matching elements found</div>';
      } else {
        list.innerHTML = '';
        results.forEach(r => {
          const item = document.createElement('div');
          item.className = 'dropdown-item';
          item.style.flexDirection = 'column';
          item.style.alignItems = 'flex-start';
          item.innerHTML = `
            <span style="font-size: 0.72rem; color: var(--color-primary); font-weight: 700;">${r.type}</span>
            <span style="font-size: 0.84rem; color: var(--color-navy-dark);">${r.text}</span>
          `;
          item.addEventListener('click', () => {
            dropdown.classList.remove('is-open');
            input.value = '';
            showToast(`Found ${r.type}: "${r.text}"`);
          });
          list.appendChild(item);
        });
      }

      dropdown.classList.add('is-open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        dropdown.classList.remove('is-open');
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // =========================================================================
  // 9. Initialization & API Sync
  // =========================================================================
  async function fetchTaskFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    const params = new URLSearchParams(window.location.search);
    let idParam = params.get('id');

    try {
      if (!idParam) {
        const allTasks = await TaskFlowAPI.getTasks();
        if (allTasks && allTasks.length > 0) {
          idParam = allTasks[0].id;
        } else {
          task = {
            id: "TASK-0",
            rawId: null,
            title: "No Tasks Found",
            status: "To Do",
            priority: "Medium",
            assignee: "None",
            assigneeInitials: "--",
            assigneeRole: "Member",
            dueDate: "No deadline",
            startDate: "-",
            createdDate: "-",
            updatedDate: "-",
            project: "Workspace",
            projectStatus: "",
            isStarred: false,
            description: "No tasks available. Create a task in My Tasks or Projects to view details here.",
            subtasks: [],
            attachments: [],
            comments: [],
            tags: [],
            activity: []
          };
          renderAll();
          return;
        }
      }

      const [serverTask, serverComments] = await Promise.all([
        TaskFlowAPI.getTask(idParam),
        TaskFlowAPI.getTaskComments(idParam).catch(() => [])
      ]);

      if (serverTask) {
        task.rawId = serverTask.id;
        task.id = `TASK-${serverTask.id}`;
        task.title = serverTask.title;
        task.status = serverTask.status || 'To Do';
        task.priority = serverTask.priority || 'Medium';
        task.description = serverTask.description || '';
        task.dueDate = serverTask.due_date || 'No deadline';
        task.project = serverTask.project_name || 'Project';
        task.createdDate = serverTask.created_at ? new Date(serverTask.created_at).toLocaleDateString() : '';
        task.updatedDate = serverTask.updated_at ? new Date(serverTask.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

        if (serverTask.assignee_details) {
          task.assignee = serverTask.assignee_details.full_name || serverTask.assignee_details.email;
          task.assigneeInitials = serverTask.assignee_details.initials || 'TF';
        } else {
          task.assignee = 'Unassigned';
          task.assigneeInitials = '--';
        }

        if (serverTask.subtasks && Array.isArray(serverTask.subtasks)) {
          task.subtasks = serverTask.subtasks.map(s => ({
            id: s.id,
            title: s.title,
            completed: Boolean(s.is_completed),
            assignee: task.assigneeInitials,
            dueDate: ''
          }));
        } else {
          task.subtasks = [];
        }

        const commentsList = Array.isArray(serverComments) ? serverComments : [];
        task.comments = commentsList.map(c => ({
          id: c.id,
          author: c.author_name || (c.author ? c.author.full_name : 'Team Member'),
          initials: (c.author_name || (c.author ? c.author.initials : 'TF')).slice(0, 2).toUpperCase(),
          avatarClass: 'av-lead',
          text: c.content,
          timestamp: c.created_at,
          timeDisplay: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          canDelete: true
        }));

        renderAll();
      }
    } catch (err) {
      console.warn('Could not fetch task details from API:', err);
    }
  }

  async function init() {
    if (typeof TaskFlowAPI !== 'undefined' && !TaskFlowAPI.requireAuth()) return;
    loadTask();
    setupEventListeners();
    setupGlobalSearch();
    await fetchTaskFromAPI();

    if (window.TaskFlowWS) {
      TaskFlowWS.onTaskUpdate((data) => {
        if (!data || !data.task_id || data.task_id == task.rawId) {
          fetchTaskFromAPI();
        }
      });
      TaskFlowWS.onComment((data) => {
        if (!data || data.task_id == task.rawId) {
          fetchTaskFromAPI();
        }
      });
      TaskFlowWS.onNotification(() => {
        fetchTaskFromAPI();
      });
      TaskFlowWS.onReconnect(() => {
        fetchTaskFromAPI();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
