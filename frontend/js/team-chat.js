/**
 * TaskFlow — Interface 17: Team Chat & Real-Time Collaboration
 * File: team-chat.js
 * Vanilla JavaScript implementation for full-screen chat workspace,
 * real-time messaging simulation, message actions, filters, search, and persistence.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Initial State & Seed Data
  // =========================================================================

  let CURRENT_USER = {
    id: 'user_current',
    name: 'You',
    avatar: 'TF',
    role: 'Member',
    email: '',
    color: 'av-blue'
  };

  let teamMembers = [];
  const SEED_CONVERSATIONS = [];
  const SEED_MESSAGES = {};

  // =========================================================================
  // 2. State Management & Storage
  // =========================================================================

  let conversations = [];
  let messagesByConv = {};
  let activeConvId = 'conv-1';
  let activeFilter = 'all';
  let convSearchQuery = '';
  let inChatSearchQuery = '';
  let activeReplyTo = null; // { id, senderName, text }
  let stagedAttachment = null; // { name, size, type }
  let selectedRecipient = null; // for New Message dialog
  let messageToEdit = null;
  let confirmCallback = null;

  function loadState() {
    conversations = [];
    messagesByConv = {};
    activeConvId = null;

    if (typeof TaskFlowAPI !== 'undefined' && TaskFlowAPI.getUser()) {
      const u = TaskFlowAPI.getUser();
      CURRENT_USER = {
        id: u.id,
        name: u.full_name || u.email,
        avatar: u.initials || 'TF',
        role: u.job_title || 'Team Member',
        email: u.email,
        color: 'av-blue'
      };
    }
  }

  function saveState() {
    try {
      localStorage.setItem('taskflow_chat_conversations', JSON.stringify(conversations));
      localStorage.setItem('taskflow_chat_messages', JSON.stringify(messagesByConv));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    updateUnreadBadges();
  }

  // =========================================================================
  // 3. DOM Elements Cache
  // =========================================================================

  const el = {};

  function cacheDom() {
    el.appLayout = document.getElementById('appLayout');
    el.appSidebar = document.getElementById('appSidebar');
    el.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    el.closeSidebarBtn = document.getElementById('closeSidebarBtn');
    el.mobileHamburgerBtn = document.getElementById('mobileHamburgerBtn');
    el.sidebarChatBadge = document.getElementById('sidebarChatBadge');

    // Dropdowns
    el.workspaceBtn = document.getElementById('workspaceBtn');
    el.workspaceDropdown = document.getElementById('workspaceDropdown');
    el.profileBtn = document.getElementById('profileBtn');
    el.profileDropdown = document.getElementById('profileDropdown');
    el.notificationsBtn = document.getElementById('notificationsBtn');
    el.notifDropdown = document.getElementById('notifDropdown');
    el.helpHeaderBtn = document.getElementById('helpHeaderBtn');
    el.helpDropdown = document.getElementById('helpDropdown');
    el.headerAvatarBtn = document.getElementById('headerAvatarBtn');
    el.headerUserDropdown = document.getElementById('headerUserDropdown');

    // Chat Workspace
    el.chatWorkspace = document.getElementById('chatWorkspace');
    el.conversationsList = document.getElementById('conversationsList');
    el.convEmptyState = document.getElementById('convEmptyState');
    el.conversationSearchInput = document.getElementById('conversationSearchInput');
    el.convSearchClearBtn = document.getElementById('convSearchClearBtn');
    el.totalUnreadCount = document.getElementById('totalUnreadCount');
    el.composeMessageBtn = document.getElementById('composeMessageBtn');
    el.emptyNewMessageBtn = document.getElementById('emptyNewMessageBtn');

    // Filter Tabs
    el.convFilterTabs = document.querySelectorAll('.conv-tab-btn');

    // Center Active Chat
    el.activeChatPanel = document.getElementById('activeChatPanel');
    el.noSelectionState = document.getElementById('noSelectionState');
    el.activeContactAvatar = document.getElementById('activeContactAvatar');
    el.activePresenceDot = document.getElementById('activePresenceDot');
    el.activeContactName = document.getElementById('activeContactName');
    el.activePinnedBadge = document.getElementById('activePinnedBadge');
    el.activeContactStatus = document.getElementById('activeContactStatus');
    el.mobileChatBackBtn = document.getElementById('mobileChatBackBtn');

    // Header buttons
    el.btnSearchInChat = document.getElementById('btnSearchInChat');
    el.btnToggleDetails = document.getElementById('btnToggleDetails');
    el.btnChatMoreOptions = document.getElementById('btnChatMoreOptions');
    el.chatOptionsDropdown = document.getElementById('chatOptionsDropdown');
    el.optMarkUnread = document.getElementById('optMarkUnread');
    el.optMuteNotifications = document.getElementById('optMuteNotifications');
    el.optMuteText = document.getElementById('optMuteText');
    el.optPinConversation = document.getElementById('optPinConversation');
    el.optPinText = document.getElementById('optPinText');
    el.optClearSearch = document.getElementById('optClearSearch');
    el.optLeaveOrDelete = document.getElementById('optLeaveOrDelete');
    el.optDeleteText = document.getElementById('optDeleteText');

    // In-chat search
    el.inChatSearchBar = document.getElementById('inChatSearchBar');
    el.inChatSearchInput = document.getElementById('inChatSearchInput');
    el.inChatMatchCount = document.getElementById('inChatMatchCount');
    el.btnCloseChatSearch = document.getElementById('btnCloseChatSearch');

    // Messages container
    el.chatMessagesContainer = document.getElementById('chatMessagesContainer');
    el.chatNoMessagesPrompt = document.getElementById('chatNoMessagesPrompt');

    // Composer
    el.composerReplyPreview = document.getElementById('composerReplyPreview');
    el.replyPreviewSender = document.getElementById('replyPreviewSender');
    el.replyPreviewText = document.getElementById('replyPreviewText');
    el.cancelReplyBtn = document.getElementById('cancelReplyBtn');

    el.composerAttachmentPreview = document.getElementById('composerAttachmentPreview');
    el.attPreviewName = document.getElementById('attPreviewName');
    el.attPreviewSize = document.getElementById('attPreviewSize');
    el.removeAttachmentBtn = document.getElementById('removeAttachmentBtn');

    el.attachFileBtn = document.getElementById('attachFileBtn');
    el.fileAttachmentInput = document.getElementById('fileAttachmentInput');
    el.emojiPickerBtn = document.getElementById('emojiPickerBtn');
    el.emojiQuickPicker = document.getElementById('emojiQuickPicker');
    el.messageInput = document.getElementById('messageInput');
    el.sendMessageBtn = document.getElementById('sendMessageBtn');

    // Right Details Panel
    el.conversationDetailsPanel = document.getElementById('conversationDetailsPanel');
    el.closeDetailsPanelBtn = document.getElementById('closeDetailsPanelBtn');
    el.detailsAvatar = document.getElementById('detailsAvatar');
    el.detailsName = document.getElementById('detailsName');
    el.detailsRole = document.getElementById('detailsRole');
    el.detailsPresence = document.getElementById('detailsPresence');
    el.detailsPresenceText = document.getElementById('detailsPresenceText');
    el.qaMuteBtn = document.getElementById('qaMuteBtn');
    el.qaPinBtn = document.getElementById('qaPinBtn');
    el.qaSearchBtn = document.getElementById('qaSearchBtn');
    el.detailsEmail = document.getElementById('detailsEmail');
    el.detailsDepartment = document.getElementById('detailsDepartment');
    el.detailsTimezone = document.getElementById('detailsTimezone');
    el.sharedProjectTitle = document.getElementById('sharedProjectTitle');
    el.groupMembersSection = document.getElementById('groupMembersSection');
    el.membersCountNumber = document.getElementById('membersCountNumber');
    el.groupMembersList = document.getElementById('groupMembersList');
    el.muteTogglePill = document.getElementById('muteTogglePill');
    el.pinTogglePill = document.getElementById('pinTogglePill');
    el.dangerActionLabel = document.getElementById('dangerActionLabel');
    el.btnToggleMuteRow = document.getElementById('btnToggleMuteRow');
    el.btnTogglePinRow = document.getElementById('btnTogglePinRow');
    el.btnDangerLeaveOrDelete = document.getElementById('btnDangerLeaveOrDelete');

    // Modals
    el.modalBackdrop = document.getElementById('modalBackdrop');
    el.newMessageModal = document.getElementById('newMessageModal');
    el.closeNewMsgModalBtn = document.getElementById('closeNewMsgModalBtn');
    el.cancelNewMsgBtn = document.getElementById('cancelNewMsgBtn');
    el.startConversationBtn = document.getElementById('startConversationBtn');
    el.recipientSearchInput = document.getElementById('recipientSearchInput');
    el.recipientResultsList = document.getElementById('recipientResultsList');
    el.selectedRecipientPill = document.getElementById('selectedRecipientPill');
    el.selectedRecAvatar = document.getElementById('selectedRecAvatar');
    el.selectedRecName = document.getElementById('selectedRecName');
    el.removeSelectedRecBtn = document.getElementById('removeSelectedRecBtn');
    el.initialMessageInput = document.getElementById('initialMessageInput');

    el.editMessageModal = document.getElementById('editMessageModal');
    el.closeEditModalBtn = document.getElementById('closeEditModalBtn');
    el.cancelEditBtn = document.getElementById('cancelEditBtn');
    el.saveEditBtn = document.getElementById('saveEditBtn');
    el.editMessageTextarea = document.getElementById('editMessageTextarea');

    el.confirmActionModal = document.getElementById('confirmActionModal');
    el.closeConfirmModalBtn = document.getElementById('closeConfirmModalBtn');
    el.cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
    el.executeConfirmBtn = document.getElementById('executeConfirmBtn');
    el.confirmModalText = document.getElementById('confirmModalText');

    el.toastContainer = document.getElementById('toastContainer');
    el.globalSearchInput = document.getElementById('globalSearchInput');
    el.searchResultsDropdown = document.getElementById('searchResultsDropdown');
    el.searchResultsList = document.getElementById('searchResultsList');
  }

  // =========================================================================
  // 4. Render Conversation List (Panel 1)
  // =========================================================================

  function renderConversationsList() {
    if (!el.conversationsList) return;

    // Filter conversations
    let filtered = conversations.filter(conv => {
      // Category tab filter
      if (activeFilter === 'unread' && (!conv.unreadCount || conv.unreadCount <= 0)) {
        return false;
      }
      if (activeFilter === 'direct' && conv.type !== 'direct') {
        return false;
      }
      if (activeFilter === 'groups' && conv.type !== 'group') {
        return false;
      }

      // Search query filter
      if (convSearchQuery.trim() !== '') {
        const query = convSearchQuery.toLowerCase();
        const matchName = conv.name.toLowerCase().includes(query);
        const matchLast = (conv.lastMessageText || '').toLowerCase().includes(query);
        const matchProject = (conv.project || '').toLowerCase().includes(query);
        if (!matchName && !matchLast && !matchProject) {
          return false;
        }
      }

      return true;
    });

    // Sort: Pinned first, then chronological
    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    el.conversationsList.innerHTML = '';

    if (filtered.length === 0) {
      el.convEmptyState.style.display = 'flex';
      return;
    } else {
      el.convEmptyState.style.display = 'none';
    }

    filtered.forEach(conv => {
      const item = document.createElement('div');
      item.className = `conv-item ${conv.id === activeConvId ? 'active' : ''} ${conv.unreadCount > 0 ? 'unread' : ''}`;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('data-conv-id', conv.id);

      // Presence dot
      let presenceHtml = '';
      if (conv.type === 'direct') {
        presenceHtml = `<span class="presence-dot ${conv.status || 'offline'}" title="${conv.status || 'offline'}"></span>`;
      }

      // Pin icon
      let pinHtml = '';
      if (conv.pinned) {
        pinHtml = `
          <span class="conv-pin-icon" title="Pinned">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          </span>
        `;
      }

      // Unread count
      let unreadHtml = '';
      if (conv.unreadCount > 0) {
        unreadHtml = `<span class="conv-unread-count">${conv.unreadCount}</span>`;
      }

      item.innerHTML = `
        <div class="conv-avatar-wrap">
          <div class="conv-avatar ${conv.type === 'group' ? 'group-avatar' : conv.avatarColor || 'av-blue'}">
            ${conv.avatar}
          </div>
          ${presenceHtml}
        </div>
        <div class="conv-meta">
          <div class="conv-top-line">
            <span class="conv-name">${escapeHtml(conv.name)}</span>
            <span class="conv-time">${conv.lastMessageTime || ''}</span>
          </div>
          <div class="conv-bottom-line">
            <span class="conv-preview">${escapeHtml(conv.lastMessageText || 'No messages yet')}</span>
            <div class="conv-badges-group">
              ${pinHtml}
              ${unreadHtml}
            </div>
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        selectConversation(conv.id);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectConversation(conv.id);
        }
      });

      el.conversationsList.appendChild(item);
    });
  }

  function updateUnreadBadges() {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    if (el.totalUnreadCount) {
      el.totalUnreadCount.textContent = totalUnread;
      el.totalUnreadCount.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }
    if (el.sidebarChatBadge) {
      el.sidebarChatBadge.textContent = totalUnread;
      el.sidebarChatBadge.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }
  }

  // =========================================================================
  // 5. Select & Load Active Conversation
  // =========================================================================

  function selectConversation(convId) {
    activeConvId = convId;
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      if (el.noSelectionState) el.noSelectionState.style.display = 'flex';
      return;
    }

    if (el.noSelectionState) el.noSelectionState.style.display = 'none';

    // Mark as read
    if (conv.unreadCount > 0) {
      conv.unreadCount = 0;
      saveState();
    }

    // Update active class in list
    document.querySelectorAll('.conv-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-conv-id') === convId);
      if (item.getAttribute('data-conv-id') === convId) {
        item.classList.remove('unread');
        const badge = item.querySelector('.conv-unread-count');
        if (badge) badge.remove();
      }
    });

    // Update Active Header
    el.activeContactName.textContent = conv.name;
    el.activeContactAvatar.textContent = conv.avatar;
    el.activeContactAvatar.className = `contact-avatar-bubble ${conv.type === 'group' ? 'group-avatar' : conv.avatarColor || 'av-blue'}`;
    
    if (conv.type === 'direct') {
      el.activePresenceDot.style.display = 'block';
      el.activePresenceDot.className = `presence-indicator-dot ${conv.status || 'offline'}`;
      el.activePresenceDot.title = conv.status || 'offline';
      el.activeContactStatus.textContent = conv.statusText || 'Available in Workspace';
    } else {
      el.activePresenceDot.style.display = 'none';
      el.activeContactStatus.textContent = conv.statusText || `${(conv.members || []).length} members`;
    }

    el.activePinnedBadge.style.display = conv.pinned ? 'inline-flex' : 'none';

    // Update Details Panel
    renderDetailsPanel(conv);

    // Render Messages
    renderMessages();
    loadMessagesForConv(convId);

    // Mobile view handling
    if (window.innerWidth <= 768) {
      el.chatWorkspace.classList.add('mobile-view-chat');
    }

    // Clear in-chat search if open
    closeInChatSearch();

    // Reset reply & attachment state
    clearReplyState();
    clearAttachmentState();

    // Focus composer input
    if (el.messageInput) {
      el.messageInput.focus();
    }
  }

  // =========================================================================
  // 6. Render Messages (Panel 2)
  // =========================================================================

  function renderMessages() {
    if (!el.chatMessagesContainer) return;

    const msgs = messagesByConv[activeConvId] || [];
    el.chatMessagesContainer.innerHTML = '';

    if (msgs.length === 0) {
      el.chatNoMessagesPrompt.style.display = 'block';
      return;
    } else {
      el.chatNoMessagesPrompt.style.display = 'none';
    }

    let lastDate = null;
    let matchCount = 0;

    msgs.forEach((msg, index) => {
      // Date Divider
      if (msg.date && msg.date !== lastDate) {
        lastDate = msg.date;
        const dateDiv = document.createElement('div');
        dateDiv.className = 'chat-date-separator';
        dateDiv.innerHTML = `<span class="date-separator-pill">${msg.date}</span>`;
        el.chatMessagesContainer.appendChild(dateDiv);
      }

      const isOutgoing = msg.senderId === CURRENT_USER.id;
      const row = document.createElement('div');
      row.className = `chat-message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
      row.id = `msg-row-${msg.id}`;

      // In-chat search match test
      const isSearchMatch = inChatSearchQuery.trim() !== '' && 
                            msg.text.toLowerCase().includes(inChatSearchQuery.toLowerCase());
      if (isSearchMatch) {
        matchCount++;
      }

      // Avatar
      const avatarHtml = `
        <div class="msg-avatar ${msg.senderColor || 'av-blue'}">
          ${msg.senderAvatar || 'TF'}
        </div>
      `;

      // Group sender label
      let senderLabelHtml = '';
      const conv = conversations.find(c => c.id === activeConvId);
      if (!isOutgoing && conv && conv.type === 'group') {
        senderLabelHtml = `<span class="msg-sender-name">${escapeHtml(msg.senderName)}</span>`;
      }

      // Quoted Reply inside bubble
      let replyHtml = '';
      if (msg.replyTo) {
        replyHtml = `
          <div class="msg-reply-quote">
            <span class="reply-quote-sender">${escapeHtml(msg.replyTo.senderName)}</span>
            <span class="reply-quote-snippet">"${escapeHtml(msg.replyTo.text)}"</span>
          </div>
        `;
      }

      // Attachment Card
      let attachmentHtml = '';
      if (msg.attachment) {
        attachmentHtml = `
          <div class="msg-attachment-card">
            <div class="attachment-icon-pill">${msg.attachment.type || 'FILE'}</div>
            <div class="attachment-meta">
              <span class="attachment-name">${escapeHtml(msg.attachment.name)}</span>
              <span class="attachment-size">${escapeHtml(msg.attachment.size)}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </div>
        `;
      }

      // Reactions list
      let reactionsHtml = '';
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        reactionsHtml = `<div class="msg-reactions-row">`;
        for (const [emoji, count] of Object.entries(msg.reactions)) {
          if (count > 0) {
            const hasUserReacted = (msg.userReactions || []).includes(emoji);
            reactionsHtml += `
              <button class="reaction-pill ${hasUserReacted ? 'user-reacted' : ''}" data-msg-id="${msg.id}" data-emoji="${emoji}" type="button">
                <span>${emoji}</span>
                <span class="reaction-count">${count}</span>
              </button>
            `;
          }
        }
        reactionsHtml += `</div>`;
      }

      // Hover actions menu
      const canEditDelete = isOutgoing;
      const hoverActionsHtml = `
        <div class="msg-hover-actions">
          <button class="hover-action-btn btn-action-reply" title="Reply to message" data-msg-id="${msg.id}" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          </button>
          <button class="hover-action-btn btn-action-react" title="React with emoji" data-msg-id="${msg.id}" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
          </button>
          <button class="hover-action-btn btn-action-copy" title="Copy text" data-msg-id="${msg.id}" type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          ${canEditDelete ? `
            <button class="hover-action-btn btn-action-edit" title="Edit message" data-msg-id="${msg.id}" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="hover-action-btn btn-action-delete" title="Delete message" data-msg-id="${msg.id}" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          ` : ''}
        </div>
      `;

      // Read status checkmark for outgoing
      let readReceiptHtml = '';
      if (isOutgoing) {
        readReceiptHtml = `
          <span class="read-status-icon" title="Delivered and read">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline><polyline points="20 12 15 17 12 14"></polyline></svg>
          </span>
        `;
      }

      row.innerHTML = `
        ${!isOutgoing ? avatarHtml : ''}
        <div class="msg-content-column">
          ${senderLabelHtml}
          <div class="msg-bubble-wrap">
            ${hoverActionsHtml}
            <div class="msg-bubble ${isSearchMatch ? 'search-highlight' : ''}">
              ${replyHtml}
              <div class="msg-text-body">${formatMessageText(msg.text)}</div>
              ${attachmentHtml}
            </div>
            ${reactionsHtml}
          </div>
          <div class="msg-meta-row">
            <span>${msg.timestamp}</span>
            ${msg.isEdited ? '<span class="msg-edited-tag">(edited)</span>' : ''}
            ${readReceiptHtml}
          </div>
        </div>
      `;

      el.chatMessagesContainer.appendChild(row);
    });

    // Update in-chat search count
    if (inChatSearchQuery.trim() !== '') {
      el.inChatMatchCount.textContent = `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`;
    }

    // Scroll to bottom
    scrollToBottom();
  }

  function scrollToBottom() {
    if (el.chatMessagesContainer) {
      el.chatMessagesContainer.scrollTop = el.chatMessagesContainer.scrollHeight;
    }
  }

  function formatMessageText(text) {
    if (!text) return '';
    // Basic escape
    let safe = escapeHtml(text);
    // Linkify URLs
    safe = safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2563EB; text-decoration:underline;">$1</a>');
    // Line breaks
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  function escapeHtml(string) {
    if (!string) return '';
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // 7. Right Details Panel (Panel 3)
  // =========================================================================

  function renderDetailsPanel(conv) {
    if (!el.conversationDetailsPanel) return;

    el.detailsName.textContent = conv.name;
    el.detailsAvatar.textContent = conv.avatar;
    el.detailsAvatar.className = `details-avatar-lg ${conv.type === 'group' ? 'group-avatar' : conv.avatarColor || 'av-blue'}`;
    
    if (conv.type === 'direct') {
      el.detailsRole.textContent = conv.role || 'Team Member';
      el.detailsPresenceText.textContent = conv.status === 'online' ? 'Active in Workspace' : (conv.status === 'away' ? 'Away' : 'Offline');
      el.detailsEmail.textContent = conv.email || 'team.member@taskflow.dev';
      el.detailsDepartment.textContent = conv.department || 'Product & Engineering';
      el.detailsTimezone.textContent = conv.timezone || 'EST (UTC-5)';
      el.groupMembersSection.style.display = 'none';
      el.dangerActionLabel.textContent = 'Clear Conversation History';
    } else {
      el.detailsRole.textContent = conv.description || 'Project collaboration channel';
      el.detailsPresenceText.textContent = `${(conv.members || []).length} Workspace Members`;
      el.detailsEmail.textContent = 'Public Workspace Channel';
      el.detailsDepartment.textContent = 'Team-wide channel';
      el.detailsTimezone.textContent = 'Global (UTC-8 to UTC+5:30)';
      el.dangerActionLabel.textContent = 'Leave Group Channel';

      // Render group members
      el.groupMembersSection.style.display = 'block';
      el.membersCountNumber.textContent = (conv.members || []).length;
      el.groupMembersList.innerHTML = '';

      const memberObjs = (conv.members || []).map(mid => {
        if (mid === CURRENT_USER.id) return CURRENT_USER;
        return teamMembers.find(m => m.id === mid) || { name: 'Teammate', avatar: 'TM', role: 'Contributor', color: 'av-blue' };
      });

      memberObjs.forEach(mem => {
        const li = document.createElement('li');
        li.className = 'member-item-row';
        li.innerHTML = `
          <div class="mem-avatar-sm ${mem.color || 'av-blue'}">${mem.avatar}</div>
          <div class="mem-name-meta">
            <span class="mem-name">${escapeHtml(mem.name)}</span>
            <span class="mem-role">${escapeHtml(mem.role)}</span>
          </div>
          ${mem.id === CURRENT_USER.id ? '<span class="admin-tag">You</span>' : ''}
        `;
        el.groupMembersList.appendChild(li);
      });
    }

    el.sharedProjectTitle.textContent = conv.project || 'TaskFlow Platform Operations';

    // Mute & Pin toggles in details panel
    el.muteTogglePill.textContent = conv.muted ? 'On' : 'Off';
    el.muteTogglePill.className = `toggle-pill ${conv.muted ? 'on' : ''}`;
    el.pinTogglePill.textContent = conv.pinned ? 'On' : 'Off';
    el.pinTogglePill.className = `toggle-pill ${conv.pinned ? 'on' : ''}`;

    el.optMuteText.textContent = conv.muted ? 'Unmute notifications' : 'Mute notifications';
    el.optPinText.textContent = conv.pinned ? 'Unpin conversation' : 'Pin conversation';
  }

  // =========================================================================
  // 8. Sending, Replying & Message Actions
  // =========================================================================

  async function handleSendMessage() {
    const text = el.messageInput.value.trim();
    if (!text && !stagedAttachment) return;

    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;

    if (el.sendMessageBtn) el.sendMessageBtn.disabled = true;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;

    const newMsg = {
      id: 'msg-' + Date.now(),
      conversationId: activeConvId,
      senderId: CURRENT_USER.id,
      senderName: CURRENT_USER.name,
      senderAvatar: CURRENT_USER.avatar,
      senderColor: CURRENT_USER.color,
      text: text,
      timestamp: timeStr,
      date: 'Today',
      reactions: {},
      userReactions: [],
      isEdited: false
    };

    if (activeReplyTo) {
      newMsg.replyTo = {
        id: activeReplyTo.id,
        senderName: activeReplyTo.senderName,
        text: activeReplyTo.text
      };
    }

    if (stagedAttachment) {
      newMsg.attachment = {
        name: stagedAttachment.name,
        size: stagedAttachment.size,
        type: stagedAttachment.type
      };
    }

    if (!messagesByConv[activeConvId]) {
      messagesByConv[activeConvId] = [];
    }
    messagesByConv[activeConvId].push(newMsg);

    conv.lastMessageText = text || `Shared file: ${stagedAttachment.name}`;
    conv.lastMessageTime = timeStr;

    const targetConvId = conv.rawId || conv.id;
    try {
      if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(targetConvId))) {
        const serverMsg = await TaskFlowAPI.sendMessage(targetConvId, text);
        if (serverMsg) {
          newMsg.id = `msg-${serverMsg.id}`;
          newMsg.rawId = serverMsg.id;
        }
      }
    } catch (err) {
      console.error('Failed to send message to backend:', err);
    } finally {
      saveState();
      renderMessages();
      renderConversationsList();

      el.messageInput.value = '';
      el.messageInput.style.height = 'auto';
      if (el.sendMessageBtn) el.sendMessageBtn.disabled = false;
      clearReplyState();
      clearAttachmentState();
      showToast('Message sent');
    }
  }

  function setReplyState(msgId) {
    const msgs = messagesByConv[activeConvId] || [];
    const target = msgs.find(m => m.id === msgId);
    if (!target) return;

    activeReplyTo = {
      id: target.id,
      senderName: target.senderName,
      text: target.text.length > 70 ? target.text.substring(0, 67) + '...' : target.text
    };

    el.replyPreviewSender.textContent = `Replying to ${activeReplyTo.senderName}`;
    el.replyPreviewText.textContent = `"${activeReplyTo.text}"`;
    el.composerReplyPreview.style.display = 'flex';
    el.messageInput.focus();
  }

  function clearReplyState() {
    activeReplyTo = null;
    if (el.composerReplyPreview) {
      el.composerReplyPreview.style.display = 'none';
    }
  }

  function clearAttachmentState() {
    stagedAttachment = null;
    if (el.composerAttachmentPreview) {
      el.composerAttachmentPreview.style.display = 'none';
    }
    if (el.fileAttachmentInput) {
      el.fileAttachmentInput.value = '';
    }
    updateSendButtonState();
  }

  function toggleEmojiReaction(msgId, emoji) {
    const msgs = messagesByConv[activeConvId] || [];
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    if (!msg.userReactions) msg.userReactions = [];

    const userIndex = msg.userReactions.indexOf(emoji);
    if (userIndex > -1) {
      // Remove reaction
      msg.userReactions.splice(userIndex, 1);
      msg.reactions[emoji] = (msg.reactions[emoji] || 1) - 1;
      if (msg.reactions[emoji] <= 0) {
        delete msg.reactions[emoji];
      }
    } else {
      // Add reaction
      msg.userReactions.push(emoji);
      msg.reactions[emoji] = (msg.reactions[emoji] || 0) + 1;
    }

    saveState();
    renderMessages();
  }

  function openEditModal(msgId) {
    const msgs = messagesByConv[activeConvId] || [];
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;

    messageToEdit = msg;
    el.editMessageTextarea.value = msg.text;
    showModal(el.editMessageModal);
    el.editMessageTextarea.focus();
  }

  function saveEditedMessage() {
    if (!messageToEdit) return;
    const newText = el.editMessageTextarea.value.trim();
    if (!newText) {
      showToast('Message cannot be empty');
      return;
    }

    messageToEdit.text = newText;
    messageToEdit.isEdited = true;

    saveState();
    renderMessages();
    hideModals();
    showToast('Message updated');
    messageToEdit = null;
  }

  function deleteMessage(msgId) {
    promptConfirm('Are you sure you want to delete this message? This cannot be undone.', () => {
      let msgs = messagesByConv[activeConvId] || [];
      messagesByConv[activeConvId] = msgs.filter(m => m.id !== msgId);
      saveState();
      renderMessages();
      showToast('Message deleted');
    });
  }

  function copyMessageText(msgId) {
    const msgs = messagesByConv[activeConvId] || [];
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;

    navigator.clipboard.writeText(msg.text).then(() => {
      showToast('Text copied to clipboard');
    }).catch(() => {
      showToast('Copied text');
    });
  }

  function updateSendButtonState() {
    const hasText = el.messageInput.value.trim().length > 0;
    const hasAtt = stagedAttachment !== null;
    el.sendMessageBtn.disabled = !hasText && !hasAtt;
  }

  // =========================================================================
  // 9. Modals & Dialog Handling
  // =========================================================================

  function showModal(modalEl) {
    if (el.modalBackdrop) el.modalBackdrop.classList.add('show');
    if (modalEl) modalEl.classList.add('show');
  }

  function hideModals() {
    if (el.modalBackdrop) el.modalBackdrop.classList.remove('show');
    document.querySelectorAll('.taskflow-modal').forEach(m => m.classList.remove('show'));
  }

  function promptConfirm(text, onConfirm) {
    el.confirmModalText.textContent = text;
    confirmCallback = onConfirm;
    showModal(el.confirmActionModal);
  }

  // New Message Recipient Search
  function renderRecipientOptions(query = '') {
    el.recipientResultsList.innerHTML = '';
    const filtered = teamMembers.filter(m => {
      if (query.trim() === '') return true;
      const q = query.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      el.recipientResultsList.innerHTML = '<div style="padding:12px; font-size:0.8rem; color:#64748B; text-align:center;">No matching team members</div>';
      return;
    }

    filtered.forEach(m => {
      const row = document.createElement('div');
      row.className = 'recipient-option-item';
      row.innerHTML = `
        <div class="rec-avatar ${m.color}">${m.avatar}</div>
        <div class="rec-meta">
          <span class="rec-name">${escapeHtml(m.name)}</span>
          <span class="rec-sub">${escapeHtml(m.role)} • ${m.status}</span>
        </div>
      `;
      row.addEventListener('click', () => {
        selectRecipientForNewMsg(m);
      });
      el.recipientResultsList.appendChild(row);
    });
  }

  function selectRecipientForNewMsg(member) {
    selectedRecipient = member;
    el.recipientSearchInput.value = '';
    el.recipientResultsList.style.display = 'none';

    el.selectedRecAvatar.textContent = member.avatar;
    el.selectedRecAvatar.className = `selected-rec-avatar ${member.color}`;
    el.selectedRecName.textContent = member.name;
    el.selectedRecipientPill.style.display = 'inline-flex';

    el.startConversationBtn.disabled = false;
  }

  function removeRecipientSelection() {
    selectedRecipient = null;
    el.selectedRecipientPill.style.display = 'none';
    el.startConversationBtn.disabled = true;
    el.recipientResultsList.style.display = 'flex';
    renderRecipientOptions('');
  }

  async function startConversationFromModal() {
    if (!selectedRecipient) return;
    if (el.startConversationBtn) el.startConversationBtn.disabled = true;

    try {
      let existing = conversations.find(c => c.type === 'direct' && (c.targetUserId === selectedRecipient.id || c.name === selectedRecipient.name));

      if (!existing && typeof TaskFlowAPI !== 'undefined') {
        const created = await TaskFlowAPI.createConversation({
          title: selectedRecipient.name || selectedRecipient.email,
          is_group: false,
          members: [selectedRecipient.id]
        });

        if (created) {
          existing = {
            id: `conv-${created.id}`,
            rawId: created.id,
            type: 'direct',
            targetUserId: selectedRecipient.id,
            name: selectedRecipient.name || selectedRecipient.email,
            avatar: selectedRecipient.avatar || 'TM',
            avatarColor: selectedRecipient.color || 'av-blue',
            role: selectedRecipient.role || 'Collaborator',
            status: selectedRecipient.status || 'online',
            statusText: 'Active in Workspace',
            email: selectedRecipient.email,
            department: selectedRecipient.department,
            timezone: 'Local',
            project: 'TaskFlow Collaboration',
            pinned: false,
            muted: false,
            unreadCount: 0,
            lastMessageText: '',
            lastMessageTime: 'Just now'
          };
          conversations.unshift(existing);
          messagesByConv[existing.id] = [];
        }
      }

      const initText = el.initialMessageInput.value.trim();
      if (initText && existing) {
        const targetId = existing.rawId || existing.id;
        if (Number.isInteger(Number(targetId))) {
          await TaskFlowAPI.sendMessage(targetId, initText);
        }
      }

      hideModals();
      if (existing) {
        selectConversation(existing.id);
      }
      renderConversationsList();
      showToast(`Conversation started with ${selectedRecipient.name}`);
    } catch (err) {
      console.error('Error starting conversation:', err);
      showToast('Could not start conversation: ' + (err.message || 'Error'));
    } finally {
      if (el.startConversationBtn) el.startConversationBtn.disabled = false;
    }
  }

  // =========================================================================
  // 10. In-Chat & Global Search
  // =========================================================================

  function openInChatSearch() {
    el.inChatSearchBar.style.display = 'flex';
    el.inChatSearchInput.focus();
    el.btnSearchInChat.classList.add('active');
  }

  function closeInChatSearch() {
    inChatSearchQuery = '';
    if (el.inChatSearchBar) el.inChatSearchBar.style.display = 'none';
    if (el.inChatSearchInput) el.inChatSearchInput.value = '';
    if (el.btnSearchInChat) el.btnSearchInChat.classList.remove('active');
    renderMessages();
  }

  // =========================================================================
  // 11. Toast Notifications
  // =========================================================================

  function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${escapeHtml(message)}</span>
    `;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // =========================================================================
  // 12. Setup Event Listeners
  // =========================================================================

  function setupEventListeners() {
    // Mobile Sidebar Toggles
    if (el.mobileHamburgerBtn) {
      el.mobileHamburgerBtn.addEventListener('click', () => {
        el.appSidebar.classList.add('mobile-open');
        el.sidebarBackdrop.classList.add('show');
      });
    }

    if (el.closeSidebarBtn) {
      el.closeSidebarBtn.addEventListener('click', () => {
        el.appSidebar.classList.remove('mobile-open');
        el.sidebarBackdrop.classList.remove('show');
      });
    }

    if (el.sidebarBackdrop) {
      el.sidebarBackdrop.addEventListener('click', () => {
        el.appSidebar.classList.remove('mobile-open');
        el.sidebarBackdrop.classList.remove('show');
      });
    }

    // Mobile Chat Back to list
    if (el.mobileChatBackBtn) {
      el.mobileChatBackBtn.addEventListener('click', () => {
        el.chatWorkspace.classList.remove('mobile-view-chat');
      });
    }

    // Dropdowns toggling
    function setupDropdown(btn, dropdown) {
      if (!btn || !dropdown) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('show');
        closeAllDropdowns();
        if (!isOpen) {
          dropdown.classList.add('show');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    }

    setupDropdown(el.workspaceBtn, el.workspaceDropdown);
    setupDropdown(el.profileBtn, el.profileDropdown);
    setupDropdown(el.notificationsBtn, el.notifDropdown);
    setupDropdown(el.helpHeaderBtn, el.helpDropdown);
    setupDropdown(el.headerAvatarBtn, el.headerUserDropdown);
    setupDropdown(el.btnChatMoreOptions, el.chatOptionsDropdown);

    document.addEventListener('click', (e) => {
      closeAllDropdowns();
      if (el.emojiQuickPicker && !el.emojiPickerBtn.contains(e.target)) {
        el.emojiQuickPicker.classList.remove('show');
      }
    });

    function closeAllDropdowns() {
      document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('show'));
      document.querySelectorAll('[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }

    // Filter Tabs
    el.convFilterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.convFilterTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        activeFilter = tab.getAttribute('data-filter');
        renderConversationsList();
      });
    });

    // Conversation Search
    if (el.conversationSearchInput) {
      el.conversationSearchInput.addEventListener('input', (e) => {
        convSearchQuery = e.target.value;
        if (el.convSearchClearBtn) {
          el.convSearchClearBtn.style.display = convSearchQuery ? 'block' : 'none';
        }
        renderConversationsList();
      });
    }

    if (el.convSearchClearBtn) {
      el.convSearchClearBtn.addEventListener('click', () => {
        el.conversationSearchInput.value = '';
        convSearchQuery = '';
        el.convSearchClearBtn.style.display = 'none';
        renderConversationsList();
      });
    }

    // Composer Input Events
    if (el.messageInput) {
      el.messageInput.addEventListener('input', () => {
        // Auto-expand textarea
        el.messageInput.style.height = 'auto';
        el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 120) + 'px';
        updateSendButtonState();
      });

      el.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      });
    }

    if (el.sendMessageBtn) {
      el.sendMessageBtn.addEventListener('click', handleSendMessage);
    }

    // Emoji Picker Trigger
    if (el.emojiPickerBtn) {
      el.emojiPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.emojiQuickPicker.classList.toggle('show');
      });
    }

    // Emoji button click inside popover
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        el.messageInput.value += emoji;
        updateSendButtonState();
        el.emojiQuickPicker.classList.remove('show');
        el.messageInput.focus();
      });
    });

    // Attachment Trigger
    if (el.attachFileBtn && el.fileAttachmentInput) {
      el.attachFileBtn.addEventListener('click', () => {
        el.fileAttachmentInput.click();
      });

      el.fileAttachmentInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Size check (max 15MB)
        if (file.size > 15 * 1024 * 1024) {
          showToast('File size must be under 15MB');
          return;
        }

        const sizeFormatted = file.size > 1024 * 1024
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (file.size / 1024).toFixed(0) + ' KB';

        const ext = file.name.split('.').pop().toUpperCase();

        stagedAttachment = {
          name: file.name,
          size: sizeFormatted,
          type: ext.substring(0, 4)
        };

        el.attPreviewName.textContent = stagedAttachment.name;
        el.attPreviewSize.textContent = stagedAttachment.size;
        el.composerAttachmentPreview.style.display = 'flex';
        updateSendButtonState();
        showToast(`Attached ${stagedAttachment.name}`);
      });
    }

    if (el.removeAttachmentBtn) {
      el.removeAttachmentBtn.addEventListener('click', clearAttachmentState);
    }

    // Cancel Reply Button
    if (el.cancelReplyBtn) {
      el.cancelReplyBtn.addEventListener('click', clearReplyState);
    }

    // Details Panel Toggle
    if (el.btnToggleDetails) {
      el.btnToggleDetails.addEventListener('click', () => {
        const isCollapsed = el.conversationDetailsPanel.classList.toggle('collapsed');
        el.btnToggleDetails.classList.toggle('active', !isCollapsed);
        el.btnToggleDetails.setAttribute('aria-expanded', !isCollapsed);
      });
    }

    if (el.closeDetailsPanelBtn) {
      el.closeDetailsPanelBtn.addEventListener('click', () => {
        el.conversationDetailsPanel.classList.add('collapsed');
        el.btnToggleDetails.classList.remove('active');
        el.btnToggleDetails.setAttribute('aria-expanded', 'false');
      });
    }

    // In-chat search buttons
    if (el.btnSearchInChat) {
      el.btnSearchInChat.addEventListener('click', () => {
        if (el.inChatSearchBar.style.display === 'flex') {
          closeInChatSearch();
        } else {
          openInChatSearch();
        }
      });
    }

    if (el.btnCloseChatSearch) {
      el.btnCloseChatSearch.addEventListener('click', closeInChatSearch);
    }

    if (el.inChatSearchInput) {
      el.inChatSearchInput.addEventListener('input', (e) => {
        inChatSearchQuery = e.target.value;
        renderMessages();
      });
    }

    // Options dropdown actions
    if (el.optMarkUnread) {
      el.optMarkUnread.addEventListener('click', () => {
        const conv = conversations.find(c => c.id === activeConvId);
        if (conv) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          saveState();
          renderConversationsList();
          showToast('Marked conversation as unread');
        }
      });
    }

    if (el.optMuteNotifications) {
      el.optMuteNotifications.addEventListener('click', () => {
        toggleMuteActiveConv();
      });
    }

    if (el.optPinConversation) {
      el.optPinConversation.addEventListener('click', () => {
        togglePinActiveConv();
      });
    }

    if (el.optClearSearch) {
      el.optClearSearch.addEventListener('click', () => {
        closeInChatSearch();
      });
    }

    if (el.optLeaveOrDelete) {
      el.optLeaveOrDelete.addEventListener('click', () => {
        handleLeaveOrDeleteConv();
      });
    }

    // Details panel toggle rows
    if (el.btnToggleMuteRow) el.btnToggleMuteRow.addEventListener('click', toggleMuteActiveConv);
    if (el.btnTogglePinRow) el.btnTogglePinRow.addEventListener('click', togglePinActiveConv);
    if (el.qaMuteBtn) el.qaMuteBtn.addEventListener('click', toggleMuteActiveConv);
    if (el.qaPinBtn) el.qaPinBtn.addEventListener('click', togglePinActiveConv);
    if (el.qaSearchBtn) el.qaSearchBtn.addEventListener('click', openInChatSearch);
    if (el.btnDangerLeaveOrDelete) el.btnDangerLeaveOrDelete.addEventListener('click', handleLeaveOrDeleteConv);

    function toggleMuteActiveConv() {
      const conv = conversations.find(c => c.id === activeConvId);
      if (!conv) return;
      conv.muted = !conv.muted;
      saveState();
      renderDetailsPanel(conv);
      showToast(conv.muted ? 'Conversation muted' : 'Conversation unmuted');
    }

    function togglePinActiveConv() {
      const conv = conversations.find(c => c.id === activeConvId);
      if (!conv) return;
      conv.pinned = !conv.pinned;
      el.activePinnedBadge.style.display = conv.pinned ? 'inline-flex' : 'none';
      saveState();
      renderDetailsPanel(conv);
      renderConversationsList();
      showToast(conv.pinned ? 'Conversation pinned' : 'Conversation unpinned');
    }

    function handleLeaveOrDeleteConv() {
      const conv = conversations.find(c => c.id === activeConvId);
      if (!conv) return;
      const isGroup = conv.type === 'group';
      promptConfirm(
        isGroup ? `Are you sure you want to leave ${conv.name}?` : `Are you sure you want to clear message history with ${conv.name}?`,
        () => {
          messagesByConv[activeConvId] = [];
          conv.lastMessageText = 'Conversation history cleared';
          saveState();
          renderMessages();
          renderConversationsList();
          showToast(isGroup ? 'Left group' : 'History cleared');
        }
      );
    }

    // Message History Event Delegation (Reactions, Reply, Edit, Delete, Copy)
    if (el.chatMessagesContainer) {
      el.chatMessagesContainer.addEventListener('click', (e) => {
        // Reaction pill click
        const reactionBtn = e.target.closest('.reaction-pill');
        if (reactionBtn) {
          const msgId = reactionBtn.getAttribute('data-msg-id');
          const emoji = reactionBtn.getAttribute('data-emoji');
          toggleEmojiReaction(msgId, emoji);
          return;
        }

        // Reply hover button
        const replyBtn = e.target.closest('.btn-action-reply');
        if (replyBtn) {
          const msgId = replyBtn.getAttribute('data-msg-id');
          setReplyState(msgId);
          return;
        }

        // React hover button
        const reactBtn = e.target.closest('.btn-action-react');
        if (reactBtn) {
          const msgId = reactBtn.getAttribute('data-msg-id');
          toggleEmojiReaction(msgId, '👍');
          return;
        }

        // Copy hover button
        const copyBtn = e.target.closest('.btn-action-copy');
        if (copyBtn) {
          const msgId = copyBtn.getAttribute('data-msg-id');
          copyMessageText(msgId);
          return;
        }

        // Edit hover button
        const editBtn = e.target.closest('.btn-action-edit');
        if (editBtn) {
          const msgId = editBtn.getAttribute('data-msg-id');
          openEditModal(msgId);
          return;
        }

        // Delete hover button
        const delBtn = e.target.closest('.btn-action-delete');
        if (delBtn) {
          const msgId = delBtn.getAttribute('data-msg-id');
          deleteMessage(msgId);
          return;
        }
      });
    }

    // New Message Dialog Modal
    function openNewMessageModal() {
      selectedRecipient = null;
      el.selectedRecipientPill.style.display = 'none';
      el.recipientSearchInput.value = '';
      el.initialMessageInput.value = '';
      el.startConversationBtn.disabled = true;
      renderRecipientOptions('');
      showModal(el.newMessageModal);
      el.recipientSearchInput.focus();
    }

    if (el.composeMessageBtn) el.composeMessageBtn.addEventListener('click', openNewMessageModal);
    if (el.emptyNewMessageBtn) el.emptyNewMessageBtn.addEventListener('click', openNewMessageModal);

    const btnSelectCompose = document.getElementById('btnSelectCompose');
    if (btnSelectCompose) btnSelectCompose.addEventListener('click', openNewMessageModal);

    if (el.closeNewMsgModalBtn) el.closeNewMsgModalBtn.addEventListener('click', hideModals);
    if (el.cancelNewMsgBtn) el.cancelNewMsgBtn.addEventListener('click', hideModals);
    if (el.removeSelectedRecBtn) el.removeSelectedRecBtn.addEventListener('click', removeRecipientSelection);

    if (el.recipientSearchInput) {
      el.recipientSearchInput.addEventListener('input', (e) => {
        renderRecipientOptions(e.target.value);
      });
    }

    if (el.startConversationBtn) {
      el.startConversationBtn.addEventListener('click', startConversationFromModal);
    }

    // Edit Modal Buttons
    if (el.closeEditModalBtn) el.closeEditModalBtn.addEventListener('click', hideModals);
    if (el.cancelEditBtn) el.cancelEditBtn.addEventListener('click', hideModals);
    if (el.saveEditBtn) el.saveEditBtn.addEventListener('click', saveEditedMessage);

    // Confirm Modal Buttons
    if (el.closeConfirmModalBtn) el.closeConfirmModalBtn.addEventListener('click', hideModals);
    if (el.cancelConfirmBtn) el.cancelConfirmBtn.addEventListener('click', hideModals);
    if (el.executeConfirmBtn) {
      el.executeConfirmBtn.addEventListener('click', () => {
        hideModals();
        if (typeof confirmCallback === 'function') {
          confirmCallback();
          confirmCallback = null;
        }
      });
    }

    // Modal Backdrop click to dismiss
    if (el.modalBackdrop) {
      el.modalBackdrop.addEventListener('click', hideModals);
    }

    // Global keyboard shortcuts (Ctrl+K for search, Escape to close modals)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (el.globalSearchInput) el.globalSearchInput.focus();
      }

      if (e.key === 'Escape') {
        hideModals();
        closeAllDropdowns();
        closeInChatSearch();
        clearReplyState();
      }
    });

    // Global Search Header matching
    if (el.globalSearchInput) {
      el.globalSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) {
          el.searchResultsDropdown.classList.remove('show');
          return;
        }

        const matchingConvs = conversations.filter(c => 
          c.name.toLowerCase().includes(q) || 
          (c.lastMessageText || '').toLowerCase().includes(q)
        );

        el.searchResultsList.innerHTML = '';
        if (matchingConvs.length === 0) {
          el.searchResultsList.innerHTML = '<div style="padding:10px; font-size:0.75rem; color:#64748B;">No matching chats found</div>';
        } else {
          matchingConvs.forEach(c => {
            const row = document.createElement('div');
            row.className = 'search-result-item';
            row.style.cssText = 'padding:8px 12px; cursor:pointer; font-size:0.8rem; border-bottom:1px solid #EEF2F6;';
            row.innerHTML = `<strong>${escapeHtml(c.name)}</strong> <small style="color:#64748B;">(${c.type})</small>`;
            row.addEventListener('click', () => {
              el.searchResultsDropdown.classList.remove('show');
              el.globalSearchInput.value = '';
              selectConversation(c.id);
            });
            el.searchResultsList.appendChild(row);
          });
        }
        el.searchResultsDropdown.classList.add('show');
      });
    }
  }

  // =========================================================================
  // 13. Initialization & Real-Time Sync
  // =========================================================================

  async function loadMessagesForConv(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv || !conv.rawId || typeof TaskFlowAPI === 'undefined') return;

    try {
      const serverMsgs = await TaskFlowAPI.getMessages(conv.rawId);
      if (Array.isArray(serverMsgs)) {
        messagesByConv[convId] = serverMsgs.map(m => {
          const senderObj = m.sender || {};
          const isMe = (senderObj.id === CURRENT_USER.id) || (m.sender_id === CURRENT_USER.id);
          return {
            id: `msg-${m.id}`,
            rawId: m.id,
            conversationId: convId,
            senderId: isMe ? CURRENT_USER.id : (senderObj.id || m.sender_id || 'other'),
            senderName: isMe ? CURRENT_USER.name : (senderObj.full_name || senderObj.email || m.sender_name || 'Team Member'),
            senderAvatar: isMe ? CURRENT_USER.avatar : (senderObj.initials || m.sender_initials || 'TM'),
            senderColor: 'av-blue',
            text: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: 'Today',
            reactions: {},
            userReactions: [],
            isEdited: false
          };
        });

        if (activeConvId === convId) {
          renderMessages();
        }
      }
    } catch (err) {
      console.warn('Failed to fetch messages for conv:', err);
    }
  }

  async function fetchConversationsFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const serverConvs = await TaskFlowAPI.getConversations();
      if (serverConvs && Array.isArray(serverConvs)) {
        conversations = serverConvs.map(c => {
          const isGroup = Boolean(c.is_group || c.conversation_type === 'group');
          let displayName = c.title || (isGroup ? '#channel' : 'Direct Message');
          let displayAvatar = isGroup ? '#' : 'DM';
          let role = isGroup ? `${(c.members || []).length || c.members_count || 2} members` : 'Direct Chat';

          if (!isGroup && c.other_member) {
            displayName = c.other_member.full_name || c.other_member.email;
            displayAvatar = c.other_member.initials || 'DM';
            role = c.other_member.job_title || 'Collaborator';
          }

          return {
            id: `conv-${c.id}`,
            rawId: c.id,
            type: isGroup ? 'group' : 'direct',
            name: displayName,
            avatar: displayAvatar,
            avatarColor: 'av-blue',
            role: role,
            status: 'online',
            statusText: isGroup ? `${(c.members || []).length || 2} members` : 'Active in Workspace',
            lastMessageText: c.last_message ? c.last_message.content : 'No messages yet',
            lastMessageTime: c.last_message ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            unreadCount: 0,
            pinned: false,
            muted: false
          };
        });

        if (conversations.length > 0) {
          if (!conversations.some(c => c.id === activeConvId)) {
            activeConvId = conversations[0].id;
          }
        } else {
          activeConvId = null;
        }

        renderConversationsList();
        if (activeConvId) {
          selectConversation(activeConvId);
        } else {
          if (el.noSelectionState) el.noSelectionState.style.display = 'flex';
          if (el.chatMessagesContainer) el.chatMessagesContainer.innerHTML = '';
        }
      }
    } catch (e) {
      console.warn('Could not fetch conversations from backend:', e);
    }
  }

  async function loadTeamMembersFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const users = await TaskFlowAPI.getUsers();
      if (Array.isArray(users)) {
        teamMembers = users.filter(u => u.id !== CURRENT_USER.id).map(u => ({
          id: u.id,
          name: u.full_name || u.email,
          avatar: u.initials || 'TM',
          role: u.job_title || 'Team Member',
          email: u.email,
          status: 'online',
          color: 'av-blue',
          department: u.department || 'General',
          timezone: 'Local'
        }));
      }
    } catch (e) {
      console.warn('Could not load team members:', e);
    }
  }

  function setupRealtimeListeners() {
    if (typeof TaskFlowWS === 'undefined') return;

    TaskFlowWS.onChatMessage((msgData) => {
      const rawConvId = msgData.conversation_id;
      const conv = conversations.find(c => c.rawId == rawConvId || c.id === `conv-${rawConvId}`);
      if (conv) {
        const convId = conv.id;
        if (!messagesByConv[convId]) messagesByConv[convId] = [];

        const isMe = msgData.sender_id === CURRENT_USER.id;
        const exists = messagesByConv[convId].some(m => m.rawId === msgData.id || m.id === `msg-${msgData.id}`);
        if (!exists) {
          messagesByConv[convId].push({
            id: `msg-${msgData.id}`,
            rawId: msgData.id,
            conversationId: convId,
            senderId: msgData.sender_id,
            senderName: isMe ? CURRENT_USER.name : (msgData.sender_name || 'Team Member'),
            senderAvatar: isMe ? CURRENT_USER.avatar : (msgData.sender_initials || 'TM'),
            senderColor: 'av-blue',
            text: msgData.content,
            timestamp: new Date(msgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: 'Today',
            reactions: {},
            userReactions: [],
            isEdited: false
          });

          conv.lastMessageText = msgData.content;
          conv.lastMessageTime = new Date(msgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (activeConvId === convId) {
            renderMessages();
          } else {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
            updateUnreadBadges();
          }
          renderConversationsList();
        }
      }
    });

    TaskFlowWS.onReconnect(() => {
      fetchConversationsFromAPI().then(() => {
        if (activeConvId) loadMessagesForConv(activeConvId);
      });
    });
  }

  async function init() {
    if (typeof TaskFlowAPI !== 'undefined' && !TaskFlowAPI.requireAuth()) return;
    loadState();
    cacheDom();
    setupEventListeners();

    renderConversationsList();
    if (activeConvId) {
      selectConversation(activeConvId);
    }
    updateUnreadBadges();

    await loadTeamMembersFromAPI();
    await fetchConversationsFromAPI();
    setupRealtimeListeners();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
