/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Real-time WebSocket Client Module (Event Bus, Reconnect, Deduplication)
 * File: websocket.js
 */

const TaskFlowWS = (() => {
  let socket = null;
  let isConnecting = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;

  // Event listener maps
  const eventListeners = new Map(); // eventType -> Set of callbacks
  const reconnectListeners = new Set();
  const seenEventKeys = new Set(); // LRU/deduplication cache

  function recordEventKey(key) {
    if (!key) return false;
    if (seenEventKeys.has(key)) return true;
    seenEventKeys.add(key);
    if (seenEventKeys.size > 200) {
      const first = seenEventKeys.values().next().value;
      seenEventKeys.delete(first);
    }
    return false;
  }

  function getWsBaseUrl() {
    const apiBase = TaskFlowAPI.BASE_URL;
    let wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let wsHost = "localhost:8000";

    try {
      const parsed = new URL(apiBase);
      wsHost = parsed.host;
      wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    } catch {
      // fallback
    }
    return `${wsProtocol}//${wsHost}`;
  }

  function connectNotifications() {
    if (!TaskFlowAPI.isAuthenticated()) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = TaskFlowAPI.getToken();
    const wsUrl = `${getWsBaseUrl()}/ws/notifications/?token=${encodeURIComponent(token)}`;

    try {
      isConnecting = true;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        const wasReconnecting = reconnectAttempts > 0;
        isConnecting = false;
        reconnectAttempts = 0;
        console.log("⚡ TaskFlow WebSocket: Connected to real-time notification stream.");

        // If reconnected, notify pages to refresh active data safely
        if (wasReconnecting) {
          reconnectListeners.forEach((cb) => {
            try { cb(); } catch (err) { console.error("Reconnect handler error:", err); }
          });
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleIncomingMessage(payload);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onclose = (event) => {
        isConnecting = false;
        socket = null;
        if (event.code !== 4001 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
          setTimeout(connectNotifications, timeout);
        }
      };

      socket.onerror = (err) => {
        console.warn("WebSocket encounter:", err);
      };
    } catch (e) {
      console.warn("WebSocket connection failure:", e);
    }
  }

  function handleIncomingMessage(payload) {
    if (!payload || !payload.type) return;

    // Deduplicate identical event payloads
    const eventKey = `${payload.type}_${payload.data?.id || ''}_${payload.data?.created_at || payload.data?.action || ''}`;
    if (payload.data?.id && recordEventKey(eventKey)) {
      return;
    }

    const eventType = payload.type;
    const data = payload.data || {};

    // 1. Notification
    if (eventType === "notification") {
      updateHeaderNotifBadge();
      if (typeof window.showToast === "function" && data.message) {
        window.showToast(`🔔 ${data.message}`);
      }
    }

    // 2. Dispatch to specific type listeners
    if (eventListeners.has(eventType)) {
      eventListeners.get(eventType).forEach((cb) => {
        try { cb(data); } catch (e) { console.error(`Error in listener for ${eventType}:`, e); }
      });
    }

    // 3. Dispatch to wildcard listeners
    if (eventListeners.has("*")) {
      eventListeners.get("*").forEach((cb) => {
        try { cb(eventType, data); } catch (e) { console.error("Error in wildcard listener:", e); }
      });
    }
  }

  function updateHeaderNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (badge) {
      let count = parseInt(badge.textContent || "0", 10);
      count = isNaN(count) ? 1 : count + 1;
      badge.textContent = count;
      badge.style.display = "flex";
    }
  }

  function on(eventType, callback) {
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, new Set());
    }
    eventListeners.get(eventType).add(callback);
    return () => {
      eventListeners.get(eventType)?.delete(callback);
    };
  }

  function onNotification(callback) {
    return on("notification", callback);
  }

  function onTaskUpdate(callback) {
    return on("task_update", callback);
  }

  function onProjectUpdate(callback) {
    return on("project_update", callback);
  }

  function onComment(callback) {
    return on("comment_added", callback);
  }

  function onChatMessage(callback) {
    return on("chat_message", callback);
  }

  function onReconnect(callback) {
    reconnectListeners.add(callback);
    return () => reconnectListeners.delete(callback);
  }

  // Conversation Chat WebSocket Connection
  function connectChat(conversationId, onMessage) {
    if (!TaskFlowAPI.isAuthenticated()) return null;
    const token = TaskFlowAPI.getToken();
    const wsUrl = `${getWsBaseUrl()}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;

    let chatSocket = null;
    try {
      chatSocket = new WebSocket(wsUrl);

      chatSocket.onopen = () => {
        console.log(`💬 Connected to chat #${conversationId}`);
      };

      chatSocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "chat_message" && typeof onMessage === "function") {
            const msgKey = `chat_${conversationId}_${payload.data?.id}`;
            if (!recordEventKey(msgKey)) {
              onMessage(payload.data);
            }
          }
        } catch (err) {
          console.error("Chat message parse error:", err);
        }
      };
    } catch (e) {
      console.warn("Failed to open chat socket:", e);
    }

    return {
      send: (message) => {
        if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
          chatSocket.send(JSON.stringify({ message }));
        }
      },
      close: () => {
        if (chatSocket) chatSocket.close();
      },
    };
  }

  // Auto-connect if token exists on load
  if (TaskFlowAPI.isAuthenticated()) {
    setTimeout(connectNotifications, 500);
  }

  return {
    connectNotifications,
    on,
    onNotification,
    onTaskUpdate,
    onProjectUpdate,
    onComment,
    onChatMessage,
    onReconnect,
    connectChat,
  };
})();

window.TaskFlowWS = TaskFlowWS;
