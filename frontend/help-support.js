/**
 * TaskFlow — Interface 16: Help & Support Page
 * Script: help-support.js
 * 
 * Implements real-time help search, category filtering, FAQ accordions,
 * modal article reading views with feedback capture, and support ticket submission.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =========================================================================
  // 1. Storage Keys & Initial User State
  // =========================================================================
  const STORAGE_KEYS = {
    USER_PROFILE: 'taskflow_user_profile',
    USER_AVATAR: 'taskflow_user_avatar',
    ACTIVE_WORKSPACE: 'taskflow_current_workspace',
    THEME: 'taskflow_theme',
    SUPPORT_TICKETS: 'taskflow_support_tickets',
    ARTICLE_FEEDBACK: 'taskflow_article_feedback'
  };

  const DEFAULT_USER = {
    fullName: 'Your Name',
    email: 'your.name@workspace.com',
    role: 'Product Lead',
    workspace: 'Team Workspace'
  };

  let userProfile = { ...DEFAULT_USER };
  let currentAvatar = null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (stored) userProfile = { ...DEFAULT_USER, ...JSON.parse(stored) };
    currentAvatar = localStorage.getItem(STORAGE_KEYS.USER_AVATAR);
  } catch (e) {
    console.warn('Error reading stored profile:', e);
  }

  // Apply Theme
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (savedTheme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // =========================================================================
  // 2. Knowledge Base Article Database
  // =========================================================================
  const ARTICLES = [
    {
      id: 'art-getting-started',
      title: 'Getting Started with TaskFlow',
      category: 'Getting Started',
      categorySlug: 'getting-started',
      readTime: '4 min read',
      updated: 'Oct 11, 2026',
      summary: 'A comprehensive walkthrough of account setup, navigation shortcuts, and creating your first workspace.',
      keywords: ['start', 'onboarding', 'new', 'account', 'login', 'navigation', 'dashboard', 'overview'],
      content: `
        <h4>Welcome to TaskFlow</h4>
        <p>TaskFlow is a collaborative project management application designed for software engineering, design, and product teams. This guide will walk you through setting up your account, understanding the primary navigation structure, and setting up your first project board.</p>
        
        <h4>1. Navigating the Workspace</h4>
        <p>The application interface is divided into two primary zones:</p>
        <ul>
          <li><strong>Left Sidebar (240px):</strong> Gives quick access to Overview (Dashboard), My Tasks, Projects Hub, Team Inbox, Calendar, Starred items, Settings, and Help & Support.</li>
          <li><strong>Top Header (72px):</strong> Contains breadcrumb routing, global search (accessible anytime with <code>Ctrl + K</code>), Help resources, notification alerts, and your account profile menu.</li>
        </ul>

        <div class="pro-tip-box">
          <strong>Pro-Tip:</strong> Press <code>Ctrl + K</code> anywhere in the application to immediately open the global quick search bar.
        </div>

        <h4>2. Switching Active Workspaces</h4>
        <p>TaskFlow supports multiple workspaces. To switch between your team and personal accounts, click the workspace dropdown at the top of the sidebar. You can switch between active workspaces or create a new workspace with custom member permissions.</p>

        <h4>3. Next Steps</h4>
        <p>Once your workspace is ready, proceed to create your first project and invite team members to collaborate.</p>
      `
    },
    {
      id: 'art-create-projects',
      title: 'Creating and Managing Projects',
      category: 'Tasks & Projects',
      categorySlug: 'tasks-projects',
      readTime: '5 min read',
      updated: 'Oct 10, 2026',
      summary: 'Learn how to configure project leads, set milestone target dates, invite collaborators, and track velocity.',
      keywords: ['project', 'create project', 'milestone', 'lead', 'team', 'velocity', 'kanban'],
      content: `
        <h4>Project Structure in TaskFlow</h4>
        <p>Projects organize your team's initiatives into actionable boards. Each project contains dedicated Kanban columns (Backlog, In Progress, Review, Done), milestone timelines, assignee workloads, and activity logs.</p>

        <h4>Creating a New Project</h4>
        <ol>
          <li>Navigate to the <strong>Projects</strong> page from the sidebar.</li>
          <li>Click the primary blue <strong>+ Create Project</strong> button in the top action area.</li>
          <li>Enter a descriptive Project Name, select a Department or Team category, and specify target start and due dates.</li>
          <li>Assign a Project Lead responsible for overseeing task assignments and approving milestone deliverables.</li>
          <li>Select team members to invite as project collaborators.</li>
          <li>Click <strong>Create Project</strong> to generate the interactive project board.</li>
        </ol>

        <div class="pro-tip-box">
          <strong>Best Practice:</strong> Use color swatches during project creation to visually distinguish client-facing projects from internal engineering tasks.
        </div>
      `
    },
    {
      id: 'art-manage-tasks',
      title: 'Organizing Tasks and Deadlines',
      category: 'Tasks & Projects',
      categorySlug: 'tasks-projects',
      readTime: '3 min read',
      updated: 'Oct 09, 2026',
      summary: 'Understand how to use priority chips, assign task owners, structure subtasks, and prevent overdue blockers.',
      keywords: ['task', 'create task', 'deadline', 'priority', 'subtask', 'assign', 'due date', 'overdue'],
      content: `
        <h4>Managing Tasks Efficiently</h4>
        <p>Tasks are the foundational units of progress in TaskFlow. Every task can have assignees, priority indicators, subtasks checklists, file attachments, and collaborative discussion threads.</p>

        <h4>Creating Tasks in Kanban Columns</h4>
        <p>Within any project board, simply click the <strong>+ Add Task</strong> button located at the bottom of any column:</p>
        <ul>
          <li><strong>Backlog:</strong> Unscheduled items waiting for sprint triage.</li>
          <li><strong>In Progress:</strong> Active development or design work currently underway.</li>
          <li><strong>In Review:</strong> Work submitted for peer review or QA testing.</li>
          <li><strong>Completed:</strong> Verified deliverables ready for deployment.</li>
        </ul>

        <h4>Setting Priorities & Subtasks</h4>
        <p>Open the <strong>Task Details</strong> page by clicking on any task card. Assign a priority pill (<em>Low</em>, <em>Medium</em>, <em>High</em>, or <em>Urgent</em>) and add granular subtasks with checkbox trackers.</p>
      `
    },
    {
      id: 'art-team-members',
      title: 'Inviting and Managing Team Members',
      category: 'Team Collaboration',
      categorySlug: 'team-collaboration',
      readTime: '4 min read',
      updated: 'Oct 08, 2026',
      summary: 'Invite colleagues via email pills, configure member permissions (Admin, Lead, Contributor, Viewer), and manage access.',
      keywords: ['member', 'invite', 'team', 'roles', 'permissions', 'admin', 'collaborate', 'people'],
      content: `
        <h4>Collaborator Directory</h4>
        <p>The <strong>Team Members</strong> page provides a comprehensive management directory for viewing project collaborators, role distribution, and pending invitations.</p>

        <h4>Inviting Colleagues</h4>
        <ol>
          <li>Go to the <strong>Team Members</strong> page.</li>
          <li>Click the blue <strong>+ Invite Member</strong> button.</li>
          <li>Enter email addresses using the multi-email tag input (press Enter or comma after each address).</li>
          <li>Assign the appropriate role:
            <ul>
              <li><strong>Admin:</strong> Full workspace configuration and member management.</li>
              <li><strong>Project Lead:</strong> Creates projects and assigns team tasks.</li>
              <li><strong>Contributor:</strong> Updates assigned tasks, logs time, and adds comments.</li>
              <li><strong>Viewer:</strong> Read-only access to boards and calendar milestones.</li>
            </ul>
          </li>
          <li>Click <strong>Send Invitations</strong>. Teammates will receive a direct email invitation link.</li>
        </ol>
      `
    },
    {
      id: 'art-profile-customization',
      title: 'Customizing Your Profile',
      category: 'Account & Settings',
      categorySlug: 'account-settings',
      readTime: '3 min read',
      updated: 'Oct 07, 2026',
      summary: 'Upload custom avatars, configure your bio, review assigned vs completed task metrics, and manage contact visibility.',
      keywords: ['profile', 'avatar', 'photo', 'edit profile', 'name', 'email', 'phone', 'bio'],
      content: `
        <h4>Your Personal Identity</h4>
        <p>The <strong>My Profile</strong> page displays your personal account information, work credentials, assigned task statistics, and recent activity timeline.</p>

        <h4>Updating Personal Information</h4>
        <ol>
          <li>Open <strong>My Profile</strong> from the bottom sidebar or top header dropdown.</li>
          <li>Click the <strong>Edit Profile</strong> button in the heading row.</li>
          <li>Update your Full Name, Email Address, Contact Phone, Job Title, and Department.</li>
          <li>Write an introductory bio in the <strong>About Me</strong> textarea.</li>
          <li>Click <strong>Save Changes</strong> to store your updates.</li>
        </ol>

        <h4>Changing Profile Picture</h4>
        <p>Hover over your circular avatar and click the camera button. Select an image file (JPEG, PNG, or WebP up to 5MB). Preview your circular crop and click <strong>Save Photo</strong>.</p>
      `
    },
    {
      id: 'art-notifications-digest',
      title: 'Managing Notifications and Preferences',
      category: 'Calendar & Notifications',
      categorySlug: 'calendar-notifications',
      readTime: '4 min read',
      updated: 'Oct 06, 2026',
      summary: 'Customize which events trigger email alerts, configure daily vs immediate delivery, and manage in-app bells.',
      keywords: ['notification', 'alert', 'email', 'bell', 'digest', 'frequency', 'mentions'],
      content: `
        <h4>Notification Channels</h4>
        <p>TaskFlow alerts you to critical events across your projects through in-app notifications and email summaries.</p>

        <h4>Configuring Notification Preferences</h4>
        <ol>
          <li>Navigate to <strong>Settings</strong> and select the <strong>Notifications</strong> tab.</li>
          <li>Toggle individual email alerts: Task Assignments, Due Dates, Comments & Mentions, and Weekly Summary.</li>
          <li>Toggle in-app bells: New assignments, Status changes, and Team member joins.</li>
          <li>Select your preferred frequency:
            <ul>
              <li><strong>Immediately:</strong> Real-time instant alerts.</li>
              <li><strong>Daily Summary:</strong> Consolidated digest sent every morning.</li>
              <li><strong>Weekly Summary:</strong> Combined progress report delivered on Mondays.</li>
            </ul>
          </li>
          <li>Click <strong>Save Notification Preferences</strong>.</li>
        </ol>
      `
    }
  ];

  // =========================================================================
  // 3. Render User Information Across Interface
  // =========================================================================
  function renderUserInfo() {
    const name = userProfile.fullName || 'Your Name';
    const email = userProfile.email || 'your.name@workspace.com';
    const role = userProfile.role || 'Product Lead';

    // Initials calculation
    const parts = name.trim().split(/\s+/);
    const initials = parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    // Text nodes
    const nameNodes = ['sidebarUserName', 'profileMenuName', 'headerUserName', 'headerMenuName'];
    nameNodes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = name;
    });

    const roleNodes = ['sidebarUserRole', 'headerUserRole'];
    roleNodes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = role;
    });

    const emailNodes = ['profileMenuEmail', 'headerMenuEmail'];
    emailNodes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = email;
    });

    // Avatars
    const avatarNodes = [
      document.getElementById('sidebarAvatar'),
      document.getElementById('profileMenuAvatar'),
      document.getElementById('headerMenuAvatar')
    ];

    avatarNodes.forEach(node => {
      if (!node) return;
      if (currentAvatar) {
        node.style.backgroundImage = `url("${currentAvatar}")`;
        node.textContent = '';
      } else {
        node.style.backgroundImage = 'none';
        node.textContent = initials;
      }
    });

    const headerAvatar = document.getElementById('headerAvatarDisplay');
    const headerInitials = document.getElementById('headerAvatarInitials');
    if (headerAvatar) {
      if (currentAvatar) {
        headerAvatar.style.backgroundImage = `url("${currentAvatar}")`;
        if (headerInitials) headerInitials.textContent = '';
      } else {
        headerAvatar.style.backgroundImage = 'none';
        if (headerInitials) headerInitials.textContent = initials;
      }
    }
  }

  renderUserInfo();

  // =========================================================================
  // 4. Dropdowns & Global Listeners
  // =========================================================================
  function closeAllDropdowns() {
    ['workspaceDropdown', 'profileDropdown', 'headerProfileDropdown', 'helpDropdown'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show');
    });
  }

  const bindDropdown = (btnId, dropdownId) => {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('show');
      closeAllDropdowns();
      if (!isOpen) dropdown.classList.add('show');
    });
  };

  bindDropdown('workspaceBtn', 'workspaceDropdown');
  bindDropdown('profileBtn', 'profileDropdown');
  bindDropdown('headerAvatarBtn', 'headerProfileDropdown');
  bindDropdown('helpHeaderBtn', 'helpDropdown');

  document.addEventListener('click', closeAllDropdowns);

  // Mobile sidebar drawer
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const hamburger = document.getElementById('mobileHamburgerBtn');
  const closeSidebar = document.getElementById('closeSidebarBtn');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
    });
  }

  const closeDrawer = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  };

  if (closeSidebar) closeSidebar.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Global search shortcut (Ctrl+K)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const search = document.getElementById('helpSearchInput') || document.getElementById('globalSearchInput');
      if (search) {
        search.focus();
        search.select();
      }
    }
  });

  // Logout actions
  const handleLogout = () => {
    showToast('Signing out of TaskFlow...', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 800);
  };
  const logoutSidebar = document.getElementById('logoutSidebarBtn');
  const logoutHeader = document.getElementById('logoutHeaderBtn');
  if (logoutSidebar) logoutSidebar.addEventListener('click', handleLogout);
  if (logoutHeader) logoutHeader.addEventListener('click', handleLogout);

  // =========================================================================
  // 5. Help Search Functionality
  // =========================================================================
  const searchForm = document.getElementById('helpSearchForm');
  const searchInput = document.getElementById('helpSearchInput');
  const clearBtn = document.getElementById('btnClearSearch');
  const resultsContainer = document.getElementById('searchResultsContainer');
  const resultsList = document.getElementById('searchResultsList');
  const queryEcho = document.getElementById('searchQueryEcho');
  const countBadge = document.getElementById('searchCountBadge');
  const closeResultsBtn = document.getElementById('btnCloseResults');

  function performSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      if (resultsContainer) resultsContainer.style.display = 'none';
      if (clearBtn) clearBtn.classList.remove('show');
      return;
    }

    if (clearBtn) clearBtn.classList.add('show');
    if (queryEcho) queryEcho.textContent = query;

    // Filter articles
    const matches = ARTICLES.filter(art => {
      const inTitle = art.title.toLowerCase().includes(q);
      const inSummary = art.summary.toLowerCase().includes(q);
      const inCategory = art.category.toLowerCase().includes(q);
      const inKeywords = art.keywords.some(k => k.toLowerCase().includes(q));
      return inTitle || inSummary || inCategory || inKeywords;
    });

    if (resultsContainer) resultsContainer.style.display = 'block';
    if (countBadge) countBadge.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'}`;

    if (!resultsList) return;
    resultsList.innerHTML = '';

    if (matches.length === 0) {
      resultsList.innerHTML = `
        <div class="no-results-box">
          <h4 class="no-results-title">No articles found</h4>
          <p class="no-results-desc">No help content matches "${query}". Try another search term or browse the categories below.</p>
          <button type="button" class="btn-secondary btn-sm" id="btnResetSearchNoResults">Clear Search</button>
        </div>
      `;
      const resetBtn = document.getElementById('btnResetSearchNoResults');
      if (resetBtn) resetBtn.addEventListener('click', clearSearch);
    } else {
      matches.forEach(art => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.setAttribute('data-article-id', art.id);
        item.innerHTML = `
          <div class="result-main">
            <div class="result-title-row">
              <span class="result-title">${art.title}</span>
              <span class="category-pill cat-blue">${art.category}</span>
            </div>
            <p class="result-desc">${art.summary}</p>
          </div>
          <span class="article-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        `;
        item.addEventListener('click', () => openArticle(art.id));
        resultsList.appendChild(item);
      });
    }

    // Scroll slightly so results are fully visible
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearSearch() {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    if (clearBtn) clearBtn.classList.remove('show');
    if (resultsContainer) resultsContainer.style.display = 'none';
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (searchInput) performSearch(searchInput.value);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      if (val) {
        if (clearBtn) clearBtn.classList.add('show');
      } else {
        if (clearBtn) clearBtn.classList.remove('show');
        if (resultsContainer) resultsContainer.style.display = 'none';
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearSearch();
      }
    });
  }

  if (clearBtn) clearBtn.addEventListener('click', clearSearch);
  if (closeResultsBtn) closeResultsBtn.addEventListener('click', () => {
    if (resultsContainer) resultsContainer.style.display = 'none';
  });

  // Quick search pills
  document.querySelectorAll('.tag-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const q = pill.getAttribute('data-query');
      if (searchInput) searchInput.value = q;
      performSearch(q);
    });
  });

  // =========================================================================
  // 6. Category Cards Click Handlers
  // =========================================================================
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const catSlug = card.getAttribute('data-category');
      const catTitle = card.querySelector('.category-card-title').textContent;
      
      // Filter or search for category
      if (searchInput) searchInput.value = catTitle;
      performSearch(catTitle);
      showToast(`Showing articles for category: ${catTitle}`, 'info');
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // =========================================================================
  // 7. Frequently Asked Questions (Accordion)
  // =========================================================================
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Optional single-item accordion behavior
      accordionItems.forEach(el => {
        el.classList.remove('active');
        const t = el.querySelector('.accordion-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Scroll to popular articles from FAQ
  const btnAllArticles = document.getElementById('btnViewAllArticlesFromFAQ');
  if (btnAllArticles) {
    btnAllArticles.addEventListener('click', () => {
      const target = document.getElementById('popularArticlesSection');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // =========================================================================
  // 8. Article Detail Modal View
  // =========================================================================
  const articleModal = document.getElementById('articleModal');
  const closeArticleBtn = document.getElementById('closeArticleModalBtn');
  const backFromArticleBtn = document.getElementById('btnBackFromArticle');
  const articleModalTitle = document.getElementById('articleModalTitle');
  const articleModalCategoryPill = document.getElementById('articleModalCategoryPill');
  const articleModalCategory = document.getElementById('articleModalCategory');
  const articleModalUpdated = document.getElementById('articleModalUpdated');
  const articleModalReadTime = document.getElementById('articleModalReadTime');
  const articleContentRendered = document.getElementById('articleContentRendered');
  
  // Feedback elements
  const btnFeedbackYes = document.getElementById('btnFeedbackYes');
  const btnFeedbackNo = document.getElementById('btnFeedbackNo');
  const feedbackThanksMsg = document.getElementById('feedbackThanksMsg');
  const feedbackButtons = document.querySelector('.feedback-buttons');

  let activeArticleId = null;

  function openArticle(articleId) {
    const article = ARTICLES.find(a => a.id === articleId);
    if (!article) return;

    activeArticleId = articleId;

    if (articleModalTitle) articleModalTitle.textContent = article.title;
    if (articleModalCategoryPill) articleModalCategoryPill.textContent = article.category;
    if (articleModalCategory) articleModalCategory.textContent = article.category;
    if (articleModalUpdated) articleModalUpdated.textContent = `Updated ${article.updated}`;
    if (articleModalReadTime) articleModalReadTime.textContent = article.readTime;
    if (articleContentRendered) articleContentRendered.innerHTML = article.content;

    // Reset feedback buttons
    if (feedbackButtons) feedbackButtons.style.display = 'flex';
    if (feedbackThanksMsg) feedbackThanksMsg.style.display = 'none';

    if (articleModal) {
      articleModal.classList.add('show');
      articleModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeArticleModal() {
    if (articleModal) {
      articleModal.classList.remove('show');
      articleModal.setAttribute('aria-hidden', 'true');
    }
  }

  if (closeArticleBtn) closeArticleBtn.addEventListener('click', closeArticleModal);
  if (backFromArticleBtn) backFromArticleBtn.addEventListener('click', closeArticleModal);

  // Article row triggers
  document.querySelectorAll('.article-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-article-id');
      if (id) openArticle(id);
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        row.click();
      }
    });
  });

  // Article feedback capture
  function handleFeedback(isHelpful) {
    if (!activeArticleId) return;
    if (feedbackButtons) feedbackButtons.style.display = 'none';
    if (feedbackThanksMsg) feedbackThanksMsg.style.display = 'block';

    try {
      const feedbackStore = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARTICLE_FEEDBACK) || '{}');
      feedbackStore[activeArticleId] = {
        helpful: isHelpful,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.ARTICLE_FEEDBACK, JSON.stringify(feedbackStore));
    } catch (e) {
      console.warn('Could not save feedback:', e);
    }

    showToast('Thank you for rating this article!', 'success');
  }

  if (btnFeedbackYes) btnFeedbackYes.addEventListener('click', () => handleFeedback(true));
  if (btnFeedbackNo) btnFeedbackNo.addEventListener('click', () => handleFeedback(false));

  // =========================================================================
  // 9. Support Request Modal & Form
  // =========================================================================
  const supportModal = document.getElementById('supportModal');
  const closeSupportModalBtn = document.getElementById('closeSupportModalBtn');
  const btnCancelSupportModal = document.getElementById('btnCancelSupportModal');
  const supportForm = document.getElementById('supportRequestForm');
  const supportSubject = document.getElementById('supportSubject');
  const supportCategory = document.getElementById('supportCategory');
  const supportPriority = document.getElementById('supportPriority');
  const supportDescription = document.getElementById('supportDescription');
  const attachmentInput = document.getElementById('supportAttachmentInput');
  const fileDropText = document.getElementById('fileDropText');
  const btnSupportSpinner = document.getElementById('btnSupportSpinner');
  const btnSubmitSupportTicket = document.getElementById('btnSubmitSupportTicket');

  function openSupportModal() {
    closeAllDropdowns();
    if (supportModal) {
      supportModal.classList.add('show');
      supportModal.setAttribute('aria-hidden', 'false');
      if (supportSubject) {
        supportSubject.value = '';
        supportSubject.closest('.form-group').classList.remove('has-error');
        supportSubject.focus();
      }
      if (supportDescription) {
        supportDescription.value = '';
        supportDescription.closest('.form-group').classList.remove('has-error');
      }
      if (attachmentInput) attachmentInput.value = '';
      if (fileDropText) fileDropText.textContent = 'Click or drag a screenshot or log file (Max 10MB)';
    }
  }

  function closeSupportModal() {
    if (supportModal) {
      supportModal.classList.remove('show');
      supportModal.setAttribute('aria-hidden', 'true');
    }
  }

  const topContactBtn = document.getElementById('btnTopContactSupport');
  const openSupportBtn = document.getElementById('btnOpenSupportModal');
  const headerSupportBtn = document.getElementById('headerOpenSupportModalBtn');
  const scrollToCategoriesBtn = document.getElementById('btnScrollToCategories');

  if (topContactBtn) topContactBtn.addEventListener('click', openSupportModal);
  if (openSupportBtn) openSupportBtn.addEventListener('click', openSupportModal);
  if (headerSupportBtn) headerSupportBtn.addEventListener('click', openSupportModal);

  if (scrollToCategoriesBtn) {
    scrollToCategoriesBtn.addEventListener('click', () => {
      const catSection = document.getElementById('categoriesSection');
      if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (closeSupportModalBtn) closeSupportModalBtn.addEventListener('click', closeSupportModal);
  if (btnCancelSupportModal) btnCancelSupportModal.addEventListener('click', closeSupportModal);

  // Attachment input change
  if (attachmentInput && fileDropText) {
    attachmentInput.addEventListener('change', () => {
      const file = attachmentInput.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          attachmentInput.closest('.form-group').classList.add('has-error');
          attachmentInput.value = '';
          fileDropText.textContent = 'File too large. Please select a file under 10MB.';
        } else {
          attachmentInput.closest('.form-group').classList.remove('has-error');
          fileDropText.textContent = `Attached: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        }
      }
    });
  }

  // Support Request Submission
  if (supportForm) {
    supportForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      const subjectVal = supportSubject.value.trim();
      const descVal = supportDescription.value.trim();

      if (!subjectVal) {
        supportSubject.closest('.form-group').classList.add('has-error');
        isValid = false;
      } else {
        supportSubject.closest('.form-group').classList.remove('has-error');
      }

      if (!descVal) {
        supportDescription.closest('.form-group').classList.add('has-error');
        isValid = false;
      } else {
        supportDescription.closest('.form-group').classList.remove('has-error');
      }

      if (!isValid) return;

      // Loading state
      if (btnSupportSpinner) btnSupportSpinner.style.display = 'inline-block';
      if (btnSubmitSupportTicket) btnSubmitSupportTicket.disabled = true;

      // Simulate API submission
      setTimeout(() => {
        const ticket = {
          id: 'TICK-' + Math.floor(1000 + Math.random() * 9000),
          subject: subjectVal,
          category: supportCategory.value,
          priority: supportPriority.value,
          description: descVal,
          submittedAt: new Date().toISOString(),
          status: 'Open'
        };

        try {
          const tickets = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPORT_TICKETS) || '[]');
          tickets.unshift(ticket);
          localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify(tickets));
        } catch (err) {
          console.warn('Could not store ticket:', err);
        }

        if (btnSupportSpinner) btnSupportSpinner.style.display = 'none';
        if (btnSubmitSupportTicket) btnSubmitSupportTicket.disabled = false;

        closeSupportModal();
        showToast(`Support ticket #${ticket.id} created! Our team will respond shortly.`, 'success');
      }, 700);
    });
  }

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSupportModal();
      closeArticleModal();
    }
  });

  // Modal overlay click outside
  [supportModal, articleModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === supportModal) closeSupportModal();
        if (modal === articleModal) closeArticleModal();
      }
    });
  });

  // =========================================================================
  // 10. Toast Notification System
  // =========================================================================
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Load real user identity if authenticated
  if (typeof TaskFlowAPI !== 'undefined' && TaskFlowAPI.isAuthenticated()) {
    TaskFlowAPI.getProfile().then(user => {
      if (user) {
        userProfile.fullName = user.full_name || user.email;
        userProfile.email = user.email;
        userProfile.role = user.job_title || user.role || 'Member';
        renderUserProfile();
      }
    }).catch(console.warn);
  }
});
