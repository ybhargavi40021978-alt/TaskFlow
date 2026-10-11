/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Interface 7: Inbox / Messages Logic
 * File: inbox.js
 */

document.addEventListener('DOMContentLoaded', () => {
  InboxManager.init();
});

/**
 * InboxManager Module
 * State management, conversation selection, messaging, attachments, details panel, and responsive controls.
 */
const InboxManager = (() => {
  // --- Real Conversation Records from Database ---
  const initialConversations = [];

  // State
  let conversations = [...initialConversations];
  let activeConversationId = null;
  let currentFilter = 'all'; // 'all' | 'unread' | 'groups'
  let pendingAttachment = null;
  let isDetailsPanelCollapsed = false;

  // DOM Elements Cache
  const elements = {
    // List panel
    conversationsList: document.getElementById('conversationsList'),
    conversationSearchInput: document.getElementById('conversationSearchInput'),
    convFilterTabs: document.querySelectorAll('.conv-tab-btn'),
    unreadTotalCountBadge: document.getElementById('unreadTotalCountBadge'),
    sidebarInboxBadge: document.getElementById('sidebarInboxBadge'),
    composeMessageBtn: document.getElementById('composeMessageBtn'),

    // Chat Panel
    chatPanel: document.getElementById('chatPanel'),
    chatEmptyState: document.getElementById('chatEmptyState'),
    chatActiveWrap: document.getElementById('chatActiveWrap'),
    chatMobileBackBtn: document.getElementById('chatMobileBackBtn'),
    activeChatAvatar: document.getElementById('activeChatAvatar'),
    activeChatPresenceDot: document.getElementById('activeChatPresenceDot'),
    activeChatName: document.getElementById('activeChatName'),
    activeChatPresence: document.getElementById('activeChatPresence'),
    chatMessagesContainer: document.getElementById('chatMessagesContainer'),

    // Header actions
    toggleChatSearchBtn: document.getElementById('toggleChatSearchBtn'),
    toggleDetailsPanelBtn: document.getElementById('toggleDetailsPanelBtn'),
    chatMoreMenuBtn: document.getElementById('chatMoreMenuBtn'),
    chatMoreDropdown: document.getElementById('chatMoreDropdown'),
    chatActionMarkUnread: document.getElementById('chatActionMarkUnread'),
    chatActionMute: document.getElementById('chatActionMute'),
    chatActionClear: document.getElementById('chatActionClear'),
    chatActionDelete: document.getElementById('chatActionDelete'),

    // Inline search in chat
    chatInlineSearchBar: document.getElementById('chatInlineSearchBar'),
    chatMessageSearchInput: document.getElementById('chatMessageSearchInput'),
    closeChatSearchBtn: document.getElementById('closeChatSearchBtn'),

    // Composer
    composerForm: document.getElementById('composerForm'),
    composerTextarea: document.getElementById('composerTextarea'),
    composerSendBtn: document.getElementById('composerSendBtn'),
    composerAttachBtn: document.getElementById('composerAttachBtn'),
    composerFileInput: document.getElementById('composerFileInput'),
    attachmentPreviewBar: document.getElementById('attachmentPreviewBar'),
    attachmentPreviewName: document.getElementById('attachmentPreviewName'),
    removeAttachmentBtn: document.getElementById('removeAttachmentBtn'),
    composerEmojiBtn: document.getElementById('composerEmojiBtn'),
    emojiPaletteDropdown: document.getElementById('emojiPaletteDropdown'),

    // Details Panel
    detailsPanel: document.getElementById('detailsPanel'),
    detailsAvatar: document.getElementById('detailsAvatar'),
    detailsName: document.getElementById('detailsName'),
    detailsRole: document.getElementById('detailsRole'),
    detailsEmail: document.getElementById('detailsEmail'),
    detailsGroupSection: document.getElementById('detailsGroupSection'),
    detailsMembersCount: document.getElementById('detailsMembersCount'),
    detailsParticipantsList: document.getElementById('detailsParticipantsList'),
    sharedFilesCount: document.getElementById('sharedFilesCount'),
    sharedFilesList: document.getElementById('sharedFilesList'),
    muteToggleInput: document.getElementById('muteToggleInput'),

    // Modals
    composeModal: document.getElementById('composeModal'),
    composeForm: document.getElementById('composeForm'),
    composeRecipientSelect: document.getElementById('composeRecipientSelect'),
    composeMessageInput: document.getElementById('composeMessageInput'),
    closeComposeModalBtn: document.getElementById('closeComposeModalBtn'),
    cancelComposeModalBtn: document.getElementById('cancelComposeModalBtn')
  };

  /**
   * Initialize module
   */
  async function fetchConversationsFromAPI() {
    if (typeof TaskFlowAPI === 'undefined' || !TaskFlowAPI.isAuthenticated()) return;
    try {
      const serverConvs = await TaskFlowAPI.getConversations();
      if (serverConvs && Array.isArray(serverConvs) && serverConvs.length > 0) {
        conversations = serverConvs.map(c => {
          const isGroup = c.conversation_type === 'group';
          let displayName = c.title || (isGroup ? 'Team Group' : 'Direct Chat');
          let displayAvatar = isGroup ? 'TG' : 'DC';
          let role = isGroup ? `${c.members_count} members` : 'Collaborator';

          if (!isGroup && c.other_member) {
            displayName = c.other_member.full_name || c.other_member.email;
            displayAvatar = c.other_member.initials || 'DC';
            role = c.other_member.job_title || 'Collaborator';
          }

          return {
            id: `conv-${c.id}`,
            rawId: c.id,
            type: isGroup ? 'group' : 'individual',
            name: displayName,
            role: role,
            email: isGroup ? '' : (c.other_member ? c.other_member.email : ''),
            avatar: displayAvatar,
            color: 'blue',
            isOnline: true,
            presenceText: isGroup ? `${c.members_count} members` : 'Online',
            unreadCount: 0,
            lastMessage: c.last_message ? c.last_message.content : 'No messages yet',
            lastTimestamp: c.last_message ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            messages: [],
            sharedFiles: [],
            sharedLinks: []
          };
        });

        if (conversations.length > 0) {
          activeConversationId = conversations[0].id;
        }

        renderConversationList();
        selectConversation(activeConversationId);
        updateUnreadCounter();
      }
    } catch (e) {
      console.warn('Could not fetch conversations from API in inbox:', e);
    }
  }

  async function init() {
    if (typeof TaskFlowAPI !== 'undefined' && !TaskFlowAPI.requireAuth()) return;
    initShellNavigation();
    initConversationList();
    initChatInteractions();
    initComposer();
    initDetailsPanel();
    initComposeModal();
    initGlobalSearch();
    initKeyboardShortcuts();

    // Render initial state
    updateUnreadCounter();
    renderConversationList();
    selectConversation(activeConversationId);

    await fetchConversationsFromAPI();
  }

  /**
   * Update Total Unread Counters
   */
  function updateUnreadCounter() {
    const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    if (elements.unreadTotalCountBadge) {
      elements.unreadTotalCountBadge.textContent = totalUnread;
      elements.unreadTotalCountBadge.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }
    if (elements.sidebarInboxBadge) {
      elements.sidebarInboxBadge.textContent = totalUnread;
      elements.sidebarInboxBadge.style.display = totalUnread > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Filter conversations based on search and tabs
   */
  function getFilteredConversations() {
    const searchVal = (elements.conversationSearchInput?.value || '').trim().toLowerCase();

    return conversations.filter(conv => {
      // Tab filter
      if (currentFilter === 'unread' && conv.unreadCount <= 0) return false;
      if (currentFilter === 'groups' && conv.type !== 'group') return false;

      // Search filter
      if (searchVal) {
        const matchesName = conv.name.toLowerCase().includes(searchVal);
        const matchesLast = (conv.lastMessage || '').toLowerCase().includes(searchVal);
        if (!matchesName && !matchesLast) return false;
      }

      return true;
    });
  }

  /**
   * Render Conversation List in Left Panel A
   */
  function renderConversationList() {
    if (!elements.conversationsList) return;
    elements.conversationsList.innerHTML = '';

    const visibleConvs = getFilteredConversations();

    if (visibleConvs.length === 0) {
      elements.conversationsList.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #64748B; font-size: 0.8125rem;">
          No conversations found.
        </div>
      `;
      return;
    }

    visibleConvs.forEach(conv => {
      const item = document.createElement('div');
      item.className = `conversation-item ${conv.id === activeConversationId ? 'active' : ''}`;
      item.dataset.conversationId = conv.id;
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', String(conv.id === activeConversationId));

      const isGroup = conv.type === 'group';
      const avatarBg = conv.color === 'purple' ? 'background: #8B5CF6;' : conv.color === 'amber' ? 'background: #F59E0B;' : conv.color === 'green' ? 'background: #10B981;' : 'background: #3B82F6;';

      item.innerHTML = `
        <div class="conv-avatar-wrap">
          <div class="conv-avatar ${isGroup ? 'group-avatar' : ''}" style="${avatarBg}">
            ${escapeHtml(conv.avatar)}
          </div>
          <span class="presence-dot ${conv.isOnline ? 'online' : ''}"></span>
        </div>
        <div class="conv-meta-wrap">
          <div class="conv-top-row">
            <span class="conv-name">${escapeHtml(conv.name)}</span>
            <span class="conv-time">${escapeHtml(conv.lastTimestamp)}</span>
          </div>
          <div class="conv-preview-row">
            <span class="conv-preview-text">${escapeHtml(conv.lastMessage)}</span>
            ${conv.unreadCount > 0 ? `<span class="conv-unread-bubble">${conv.unreadCount}</span>` : ''}
          </div>
        </div>
      `;

      item.addEventListener('click', () => {
        selectConversation(conv.id);
      });

      elements.conversationsList.appendChild(item);
    });
  }

  /**
   * Select Conversation and render messages
   */
  function selectConversation(convId) {
    activeConversationId = convId;
    const conv = conversations.find(c => c.id === convId);

    if (!conv) {
      if (elements.chatEmptyState) elements.chatEmptyState.style.display = 'flex';
      if (elements.chatActiveWrap) elements.chatActiveWrap.style.display = 'none';
      return;
    }

    // Reset unread count for this conversation
    if (conv.unreadCount > 0) {
      conv.unreadCount = 0;
      updateUnreadCounter();
    }

    // Update active highlight in conversation list
    renderConversationList();

    if (elements.chatEmptyState) elements.chatEmptyState.style.display = 'none';
    if (elements.chatActiveWrap) elements.chatActiveWrap.style.display = 'flex';

    // Mobile panel switch
    if (window.innerWidth < 768 && elements.chatPanel) {
      elements.chatPanel.classList.add('mobile-active');
    }

    // Header info
    if (elements.activeChatName) elements.activeChatName.textContent = conv.name;
    if (elements.activeChatPresence) elements.activeChatPresence.textContent = conv.presenceText || (conv.isOnline ? 'Online' : 'Offline');
    if (elements.activeChatAvatar) {
      elements.activeChatAvatar.textContent = conv.avatar;
      elements.activeChatAvatar.style.background = conv.color === 'purple' ? '#8B5CF6' : conv.color === 'amber' ? '#F59E0B' : conv.color === 'green' ? '#10B981' : '#3B82F6';
    }
    if (elements.activeChatPresenceDot) {
      elements.activeChatPresenceDot.className = `presence-badge-dot ${conv.isOnline ? 'online' : ''}`;
    }

    // Render Messages
    renderMessages(conv);
    loadMessagesForConv(conv);

    // Update Details Panel
    updateDetailsPanel(conv);

    // Focus composer
    elements.composerTextarea?.focus();
  }

  /**
   * Render Messages in Central Panel B
   */
  function renderMessages(conv, filterQuery = '') {
    if (!elements.chatMessagesContainer) return;
    elements.chatMessagesContainer.innerHTML = '';

    const msgs = conv.messages || [];

    if (msgs.length === 0) {
      elements.chatMessagesContainer.innerHTML = `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #64748B; font-size: 0.875rem;">
          No messages yet. Start the conversation!
        </div>
      `;
      return;
    }

    let lastDateGroup = '';

    msgs.forEach((msg) => {
      // Apply inline search filter if present
      if (filterQuery && !msg.text.toLowerCase().includes(filterQuery.toLowerCase())) {
        return;
      }

      // Render date separator if day changed
      if (msg.dateGroup && msg.dateGroup !== lastDateGroup) {
        lastDateGroup = msg.dateGroup;
        const dateSep = document.createElement('div');
        dateSep.className = 'date-separator-wrap';
        dateSep.innerHTML = `<span class="date-separator-pill">${escapeHtml(msg.dateGroup)}</span>`;
        elements.chatMessagesContainer.appendChild(dateSep);
      }

      const row = document.createElement('div');
      row.className = `message-row ${msg.isOutgoing ? 'outgoing' : 'incoming'}`;
      row.dataset.messageId = msg.id;

      // Sender Avatar (for incoming)
      let avatarHtml = '';
      if (!msg.isOutgoing) {
        avatarHtml = `<div class="msg-sender-avatar av-blue" title="${escapeHtml(msg.senderName)}">${escapeHtml(msg.senderAvatar || 'AM')}</div>`;
      }

      // Sender Name in group chats for incoming
      let senderNameHtml = '';
      if (!msg.isOutgoing && conv.type === 'group') {
        senderNameHtml = `<span class="msg-sender-name">${escapeHtml(msg.senderName)}</span>`;
      }

      // Optional Attachment HTML
      let attachmentHtml = '';
      if (msg.attachment) {
        attachmentHtml = `
          <div class="msg-attachment-card">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span>${escapeHtml(msg.attachment)}</span>
          </div>
        `;
      }

      // Optional Task Reference Link
      let taskLinkHtml = '';
      if (msg.taskRef) {
        taskLinkHtml = `
          <div class="msg-task-link-card" onclick="window.location.href='my-tasks.html';" style="cursor: pointer;" title="Open task">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${escapeHtml(msg.taskRef)}</span>
          </div>
        `;
      }

      // Read status ticks
      let ticksHtml = '';
      if (msg.isOutgoing) {
        ticksHtml = `<span class="msg-read-ticks" title="Delivered & Read">✓✓</span>`;
      }

      row.innerHTML = `
        ${avatarHtml}
        <div class="msg-content-block">
          ${senderNameHtml}
          <div class="msg-bubble">
            ${escapeHtml(msg.text)}
            ${attachmentHtml}
            ${taskLinkHtml}
          </div>
          <div class="msg-meta-row">
            <span>${escapeHtml(msg.timestamp)}</span>
            ${ticksHtml}
          </div>
        </div>

        <!-- Hover Actions -->
        <div class="msg-hover-actions">
          <button class="msg-hover-btn action-copy-msg" title="Copy message">Copy</button>
          ${msg.isOutgoing ? `<button class="msg-hover-btn action-delete-msg" title="Delete message" style="color: #DC2626;">Delete</button>` : ''}
        </div>
      `;

      // Copy Action
      row.querySelector('.action-copy-msg')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(msg.text);
        showToast('Message copied to clipboard.');
      });

      // Delete Action
      row.querySelector('.action-delete-msg')?.addEventListener('click', () => {
        deleteMessage(conv.id, msg.id);
      });

      elements.chatMessagesContainer.appendChild(row);
    });

    // Auto-scroll to bottom
    scrollToBottom();
  }

  /**
   * Scroll messages container to bottom smoothly
   */
  function scrollToBottom() {
    if (elements.chatMessagesContainer) {
      elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
    }
  }

  /**
   * Send Message
   */
  async function sendMessage() {
    const text = elements.composerTextarea.value.trim();
    if (!text && !pendingAttachment) return;

    const conv = conversations.find(c => c.id === activeConversationId);
    if (!conv) return;

    if (elements.composerSendBtn) elements.composerSendBtn.disabled = true;

    const currentUser = (typeof TaskFlowAPI !== 'undefined' && TaskFlowAPI.getUser()) ? TaskFlowAPI.getUser() : {};
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id || 'current-user',
      senderName: currentUser.full_name || 'You',
      senderAvatar: currentUser.initials || 'TF',
      isOutgoing: true,
      text: text,
      attachment: pendingAttachment ? pendingAttachment.name : null,
      timestamp: timeStr,
      dateGroup: 'Today',
      status: 'sent'
    };

    conv.messages.push(newMsg);
    conv.lastMessage = text || (pendingAttachment ? `Attachment: ${pendingAttachment.name}` : '');
    conv.lastTimestamp = timeStr;

    const targetConvId = conv.rawId || conv.id;
    try {
      if (typeof TaskFlowAPI !== 'undefined' && Number.isInteger(Number(targetConvId))) {
        const serverMsg = await TaskFlowAPI.sendMessage(targetConvId, text);
        if (serverMsg) newMsg.id = `msg-${serverMsg.id}`;
      }
    } catch (err) {
      console.error('Failed to send message to backend:', err);
    } finally {
      elements.composerTextarea.value = '';
      elements.composerTextarea.style.height = 'auto';
      clearPendingAttachment();
      updateSendButtonState();

      renderMessages(conv);
      renderConversationList();
      showToast('Message sent.');
    }
  }

  /**
   * Delete message from conversation
   */
  function deleteMessage(convId, msgId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    const idx = conv.messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      conv.messages.splice(idx, 1);
      renderMessages(conv);
      showToast('Message deleted.');
    }
  }

  /**
   * Update Right Details Panel C
   */
  function updateDetailsPanel(conv) {
    if (!elements.detailsPanel) return;

    if (elements.detailsName) elements.detailsName.textContent = conv.name;
    if (elements.detailsAvatar) {
      elements.detailsAvatar.textContent = conv.avatar;
      elements.detailsAvatar.style.background = conv.color === 'purple' ? '#8B5CF6' : conv.color === 'amber' ? '#F59E0B' : conv.color === 'green' ? '#10B981' : '#3B82F6';
    }
    if (elements.detailsRole) elements.detailsRole.textContent = conv.type === 'group' ? 'Team Group' : (conv.role || 'Member');
    if (elements.detailsEmail) elements.detailsEmail.textContent = conv.type === 'group' ? conv.description : (conv.email || '');

    // Group participants
    if (conv.type === 'group' && conv.participants) {
      if (elements.detailsGroupSection) elements.detailsGroupSection.style.display = 'flex';
      if (elements.detailsMembersCount) elements.detailsMembersCount.textContent = conv.participants.length;
      if (elements.detailsParticipantsList) {
        elements.detailsParticipantsList.innerHTML = conv.participants.map(p => `
          <li class="participant-item">
            <span class="part-avatar" style="background: ${p.color === 'purple' ? '#8B5CF6' : p.color === 'green' ? '#10B981' : '#3B82F6'}">${p.avatar}</span>
            <span style="flex: 1; font-weight: 600;">${escapeHtml(p.name)}</span>
            <span style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(p.role)}</span>
          </li>
        `).join('');
      }
    } else {
      if (elements.detailsGroupSection) elements.detailsGroupSection.style.display = 'none';
    }

    // Shared files count
    if (elements.sharedFilesCount) {
      elements.sharedFilesCount.textContent = (conv.sharedFiles || []).length;
    }
  }

  /**
   * Initialize Left Panel A Interactions
   */
  function initConversationList() {
    // Search input
    elements.conversationSearchInput?.addEventListener('input', () => {
      renderConversationList();
    });

    // Filter tabs (All, Unread, Groups)
    elements.convFilterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        elements.convFilterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderConversationList();
      });
    });

    // Compose button
    elements.composeMessageBtn?.addEventListener('click', openComposeModal);
    elements.emptyStateComposeBtn?.addEventListener('click', openComposeModal);
  }

  /**
   * Initialize Central Chat Panel B Interactions
   */
  function initChatInteractions() {
    // Mobile back button to conversation list
    elements.chatMobileBackBtn?.addEventListener('click', () => {
      elements.chatPanel?.classList.remove('mobile-active');
    });

    // Toggle details panel
    elements.toggleDetailsPanelBtn?.addEventListener('click', () => {
      isDetailsPanelCollapsed = !isDetailsPanelCollapsed;
      elements.detailsPanel?.classList.toggle('collapsed', isDetailsPanelCollapsed);
      elements.toggleDetailsPanelBtn?.classList.toggle('active', !isDetailsPanelCollapsed);
    });

    // Toggle chat message search
    elements.toggleChatSearchBtn?.addEventListener('click', () => {
      const isVisible = elements.chatInlineSearchBar.style.display === 'flex';
      elements.chatInlineSearchBar.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        elements.chatMessageSearchInput?.focus();
      }
    });

    elements.closeChatSearchBtn?.addEventListener('click', () => {
      elements.chatInlineSearchBar.style.display = 'none';
      elements.chatMessageSearchInput.value = '';
      const conv = conversations.find(c => c.id === activeConversationId);
      if (conv) renderMessages(conv);
    });

    elements.chatMessageSearchInput?.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      const conv = conversations.find(c => c.id === activeConversationId);
      if (conv) renderMessages(conv, query);
    });

    // 3-dot dropdown menu
    elements.chatMoreMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      elements.chatMoreDropdown?.classList.toggle('active');
    });

    elements.chatActionMarkUnread?.addEventListener('click', () => {
      const conv = conversations.find(c => c.id === activeConversationId);
      if (conv) {
        conv.unreadCount = 1;
        updateUnreadCounter();
        renderConversationList();
        showToast('Marked as unread.');
      }
      closeAllDropdowns();
    });

    elements.chatActionMute?.addEventListener('click', () => {
      closeAllDropdowns();
      showToast('Conversation notifications muted.');
    });

    elements.chatActionClear?.addEventListener('click', () => {
      closeAllDropdowns();
      if (confirm('Clear all messages in this conversation?')) {
        const conv = conversations.find(c => c.id === activeConversationId);
        if (conv) {
          conv.messages = [];
          conv.lastMessage = 'No messages';
          renderMessages(conv);
          renderConversationList();
          showToast('Message history cleared.');
        }
      }
    });

    elements.chatActionDelete?.addEventListener('click', () => {
      closeAllDropdowns();
      if (confirm('Delete this entire conversation?')) {
        const idx = conversations.findIndex(c => c.id === activeConversationId);
        if (idx !== -1) {
          conversations.splice(idx, 1);
          activeConversationId = conversations.length > 0 ? conversations[0].id : null;
          updateUnreadCounter();
          renderConversationList();
          selectConversation(activeConversationId);
          showToast('Conversation deleted.');
        }
      }
    });
  }

  /**
   * Initialize Message Composer
   */
  function initComposer() {
    // Textarea input event for expanding and enabling button
    elements.composerTextarea?.addEventListener('input', () => {
      // Auto expand height up to 120px
      elements.composerTextarea.style.height = 'auto';
      elements.composerTextarea.style.height = Math.min(elements.composerTextarea.scrollHeight, 120) + 'px';
      updateSendButtonState();
    });

    // Enter sends, Shift+Enter newline
    elements.composerTextarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Form submit
    elements.composerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    // Attach File
    elements.composerAttachBtn?.addEventListener('click', () => {
      elements.composerFileInput?.click();
    });

    elements.composerFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        pendingAttachment = file;
        if (elements.attachmentPreviewName) elements.attachmentPreviewName.textContent = file.name;
        if (elements.attachmentPreviewBar) elements.attachmentPreviewBar.style.display = 'block';
        updateSendButtonState();
        showToast(`Attached ${file.name}`);
      }
    });

    elements.removeAttachmentBtn?.addEventListener('click', () => {
      clearPendingAttachment();
      updateSendButtonState();
    });

    // Emoji Picker Trigger
    elements.composerEmojiBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = elements.emojiPaletteDropdown.style.display === 'block';
      elements.emojiPaletteDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emoji = btn.dataset.emoji;
        insertEmojiIntoComposer(emoji);
        elements.emojiPaletteDropdown.style.display = 'none';
      });
    });

    document.addEventListener('click', () => {
      if (elements.emojiPaletteDropdown) {
        elements.emojiPaletteDropdown.style.display = 'none';
      }
    });
  }

  function clearPendingAttachment() {
    pendingAttachment = null;
    if (elements.composerFileInput) elements.composerFileInput.value = '';
    if (elements.attachmentPreviewBar) elements.attachmentPreviewBar.style.display = 'none';
  }

  function updateSendButtonState() {
    const hasText = (elements.composerTextarea?.value || '').trim().length > 0;
    const hasAttach = pendingAttachment !== null;
    const canSend = hasText || hasAttach;
    if (elements.composerSendBtn) {
      elements.composerSendBtn.disabled = !canSend;
    }
  }

  function insertEmojiIntoComposer(emoji) {
    const input = elements.composerTextarea;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = input.value;

    input.value = val.substring(0, start) + emoji + val.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    updateSendButtonState();
  }

  /**
   * Initialize Right Details Panel C
   */
  function initDetailsPanel() {
    elements.muteToggleInput?.addEventListener('change', (e) => {
      showToast(e.target.checked ? 'Notifications muted for this chat.' : 'Notifications unmuted.');
    });
  }

  /**
   * Initialize Compose Modal
   */
  function openComposeModal() {
    elements.composeModal?.classList.add('open');
    elements.composeModal?.setAttribute('aria-hidden', 'false');
    elements.composeRecipientSelect?.focus();
  }

  function closeComposeModal() {
    elements.composeModal?.classList.remove('open');
    elements.composeModal?.setAttribute('aria-hidden', 'true');
    elements.composeForm?.reset();
  }

  function initComposeModal() {
    elements.closeComposeModalBtn?.addEventListener('click', closeComposeModal);
    elements.cancelComposeModalBtn?.addEventListener('click', closeComposeModal);
    elements.composeModal?.addEventListener('click', (e) => {
      if (e.target === elements.composeModal) closeComposeModal();
    });

    elements.composeForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const recipientVal = elements.composeRecipientSelect.value;
      const initialText = elements.composeMessageInput.value.trim();

      if (!recipientVal || !initialText) return;

      const submitBtn = document.getElementById('startConversationBtn');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (typeof TaskFlowAPI !== 'undefined') {
          const recName = elements.composeRecipientSelect.options[elements.composeRecipientSelect.selectedIndex]?.text || 'Direct Message';
          const conv = await TaskFlowAPI.createConversation({
            title: recName.split(' (')[0],
            is_group: false,
            members: [recipientVal]
          });

          if (conv) {
            await TaskFlowAPI.sendMessage(conv.id, initialText);
            closeComposeModal();
            await fetchConversationsFromAPI();
            selectConversation(`conv-${conv.id}`);
            showToast('Conversation started.');
          }
        }
      } catch (err) {
        console.error('Error starting conversation:', err);
        showToast('Could not start conversation: ' + (err.message || 'Error'));
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  /**
   * Global Header Search & Suggestions
   */
  function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    const resultsDropdown = document.getElementById('searchResultsDropdown');
    const resultsList = document.getElementById('searchResultsList');

    if (!searchInput || !resultsDropdown || !resultsList) return;

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        resultsDropdown.classList.remove('active');
        resultsList.innerHTML = '';
        return;
      }

      const matches = [];
      conversations.forEach(c => {
        if (c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)) {
          matches.push({ title: c.name, subtitle: `Conversation • ${c.type}`, convId: c.id });
        }
      });

      if (matches.length === 0) {
        resultsList.innerHTML = `<div style="padding: 12px; font-size: 0.8125rem; color: #64748B; text-align: center;">No matching conversations found.</div>`;
      } else {
        resultsList.innerHTML = matches.map(m => `
          <div class="search-result-item" data-conv-id="${m.convId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <div>
              <div style="font-weight: 600; color: #172B4D;">${escapeHtml(m.title)}</div>
              <div style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(m.subtitle)}</div>
            </div>
          </div>
        `).join('');

        resultsList.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => {
            const cId = item.dataset.convId;
            resultsDropdown.classList.remove('active');
            searchInput.value = '';
            if (cId) selectConversation(cId);
          });
        });
      }

      resultsDropdown.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
        resultsDropdown.classList.remove('active');
      }
    });
  }

  /**
   * Shell Navigation, Mobile Drawer & Header Dropdowns
   */
  function initShellNavigation() {
    const triggers = [
      { btn: 'workspaceBtn', menu: 'workspaceDropdown' },
      { btn: 'notificationsBtn', menu: 'notifDropdown' },
      { btn: 'helpHeaderBtn', menu: 'helpDropdown' },
      { btn: 'profileBtn', menu: 'profileDropdown' }
    ];

    triggers.forEach(({ btn, menu }) => {
      const button = document.getElementById(btn);
      const dropdown = document.getElementById(menu);

      if (button && dropdown) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = dropdown.classList.contains('active');
          closeAllDropdowns();
          if (!isOpen) {
            dropdown.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
          }
        });
      }
    });

    // Header avatar button mirrors profile dropdown
    const headerAvatarBtn = document.getElementById('headerAvatarBtn');
    headerAvatarBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const profileDropdown = document.getElementById('profileDropdown');
      if (profileDropdown) {
        const isOpen = profileDropdown.classList.contains('active');
        closeAllDropdowns();
        if (!isOpen) profileDropdown.classList.add('active');
      }
    });

    // Workspace items
    document.querySelectorAll('#workspaceDropdown .dropdown-item[data-workspace]').forEach(item => {
      item.addEventListener('click', () => {
        const wsName = item.dataset.workspace;
        const wsLabel = document.getElementById('currentWorkspaceName');
        if (wsLabel) wsLabel.textContent = wsName;
        document.querySelectorAll('#workspaceDropdown .dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeAllDropdowns();
        showToast(`Workspace switched to: ${wsName}`);
      });
    });

    // Create Workspace option
    document.getElementById('createWorkspaceOption')?.addEventListener('click', () => {
      closeAllDropdowns();
      const name = prompt('Enter new workspace name:');
      if (name) showToast(`Workspace "${name}" created.`);
    });

    // Mark All Read
    document.getElementById('markAllReadBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.notif-item').forEach(n => n.classList.remove('unread'));
      const notifBadge = document.getElementById('notifBadge');
      if (notifBadge) notifBadge.style.display = 'none';
      showToast('All notifications marked as read.');
    });

    // Starred shortcut button
    document.getElementById('sidebarStarredBtn')?.addEventListener('click', () => {
      showToast('Viewing starred messages & conversations.');
    });

    // Sidebar bottom buttons
    document.getElementById('sidebarSettingsBtn')?.addEventListener('click', () => {
      showToast('Opening Workspace Settings.');
    });
    document.getElementById('sidebarHelpBtn')?.addEventListener('click', () => {
      showToast('Opening Help & Support documentation.');
    });

    // Help options
    document.getElementById('helpDocsOption')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDropdowns();
      alert('TaskFlow Messaging Guidelines opening soon.');
    });
    document.getElementById('helpShortcutsOption')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDropdowns();
      alert('Shortcuts: Enter to Send, Shift+Enter for New Line, Ctrl+K for Search, Esc to close modals.');
    });
    document.getElementById('helpContactOption')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllDropdowns();
      alert('Support reachable at support@taskflow.app');
    });

    // Profile menu items
    document.getElementById('menuMyProfile')?.addEventListener('click', () => {
      closeAllDropdowns();
      showToast('Navigating to user profile.');
    });
    document.getElementById('menuAccountSettings')?.addEventListener('click', () => {
      closeAllDropdowns();
      showToast('Opening account settings.');
    });
    document.getElementById('menuLogOut')?.addEventListener('click', () => {
      closeAllDropdowns();
      if (confirm('Are you sure you want to log out of TaskFlow?')) {
        window.location.href = 'login.html';
      }
    });

    // Mobile Hamburger & Backdrop Drawer
    const mobileHamburger = document.getElementById('mobileHamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const appSidebar = document.getElementById('appSidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    mobileHamburger?.addEventListener('click', () => {
      appSidebar?.classList.add('drawer-open');
      sidebarBackdrop?.classList.add('active');
    });

    const closeDrawer = () => {
      appSidebar?.classList.remove('drawer-open');
      sidebarBackdrop?.classList.remove('active');
    };

    closeSidebarBtn?.addEventListener('click', closeDrawer);
    sidebarBackdrop?.addEventListener('click', closeDrawer);

    // Global document click closes dropdowns
    document.addEventListener('click', () => {
      closeAllDropdowns();
    });
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
  }

  /**
   * Keyboard Shortcuts
   */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K for search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const globalSearch = document.getElementById('globalSearchInput');
        globalSearch?.focus();
      }

      // Escape key closes modals and dropdowns
      if (e.key === 'Escape') {
        closeAllDropdowns();
        closeComposeModal();
        if (elements.emojiPaletteDropdown) elements.emojiPaletteDropdown.style.display = 'none';
        if (elements.chatInlineSearchBar) elements.chatInlineSearchBar.style.display = 'none';
      }
    });
  }

  /**
   * Helper: Escape HTML strings
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Lightweight Toast notification feedback
   */
  function showToast(message) {
    let container = document.getElementById('taskFlowToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'taskFlowToastContainer';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background-color: #0F172A;
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: auto;
    `;
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 2800);
  }

  return {
    init,
    showToast
  };
})();
