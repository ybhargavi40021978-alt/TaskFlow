/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Unified API Client Module
 * File: api.js
 */

const TaskFlowAPI = (() => {
  // Configurable API base URL: defaults to local Django server at port 8000
  const BASE_URL =
    window.TASKFLOW_API_BASE ||
    localStorage.getItem("TASKFLOW_API_BASE") ||
    (window.location.port === "8000"
      ? `${window.location.origin}/api`
      : "http://localhost:8000/api");

  // Storage Keys
  const TOKEN_KEY = "taskflow_auth_token";
  const USER_KEY = "taskflow_user_data";

  // Auth Helpers
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function requireAuth(redirectUrl = "login.html") {
    if (!isAuthenticated()) {
      const current = window.location.pathname.split("/").pop();
      if (current && current !== "login.html" && current !== "register.html" && current !== "index.html") {
        window.location.href = `${redirectUrl}?next=${encodeURIComponent(current)}`;
      }
      return false;
    }
    return true;
  }

  // Generic HTTP Fetcher
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const token = getToken();

    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }

    // If body is NOT FormData, set JSON content-type
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      if (typeof options.body === "object") {
        options.body = JSON.stringify(options.body);
      }
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized (session expired or invalid token)
      if (response.status === 401) {
        // If not already on auth page, redirect
        const currentPage = window.location.pathname.split("/").pop();
        if (
          currentPage &&
          !["login.html", "register.html", "index.html"].includes(currentPage)
        ) {
          clearAuth();
          window.location.href = "login.html";
          return null;
        }
      }

      // 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errorMsg = "An error occurred with the request.";
        if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const val = data.errors[firstKey];
          errorMsg = Array.isArray(val) ? val[0] : String(val);
        } else if (data.error) {
          errorMsg = data.error;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (typeof data === "string") {
          errorMsg = data;
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        console.warn("Network or connection error:", err);
        const netErr = new Error("Unable to connect to TaskFlow backend server. Ensure backend is running at http://localhost:8000.");
        netErr.status = 0;
        throw netErr;
      }
      throw err;
    }
  }

  // ==========================================
  // Authentication Endpoints
  // ==========================================
  async function register({ fullName, email, password, confirmPassword }) {
    const payload = {
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    };
    const res = await request("/auth/register/", {
      method: "POST",
      body: payload,
    });
    if (res && res.token) {
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }

  async function login({ email, password }) {
    const res = await request("/auth/login/", {
      method: "POST",
      body: { email, password },
    });
    if (res && res.token) {
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }

  async function logout() {
    try {
      await request("/auth/logout/", { method: "POST" });
    } catch {
      // Ignored if network issue during logout
    } finally {
      clearAuth();
      window.location.href = "login.html";
    }
  }

  async function getMe() {
    const res = await request("/auth/me/");
    if (res && res.user) {
      setUser(res.user);
    }
    return res;
  }

  // ==========================================
  // Workspace Users
  // ==========================================
  async function getUsers(search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return await request(`/users/${query}`);
  }

  // ==========================================
  // Projects
  // ==========================================
  async function getProjects(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const query = qs ? `?${qs}` : "";
    return await request(`/projects/${query}`);
  }

  async function getProject(id) {
    return await request(`/projects/${id}/`);
  }

  async function createProject(data) {
    return await request("/projects/", {
      method: "POST",
      body: data,
    });
  }

  async function updateProject(id, data) {
    return await request(`/projects/${id}/`, {
      method: "PATCH",
      body: data,
    });
  }

  async function deleteProject(id) {
    return await request(`/projects/${id}/`, {
      method: "DELETE",
    });
  }

  async function getProjectMembers(projectId) {
    return await request(`/projects/${projectId}/members/`);
  }

  async function addProjectMember(projectId, memberData) {
    return await request(`/projects/${projectId}/members/`, {
      method: "POST",
      body: memberData,
    });
  }

  async function removeProjectMember(projectId, userId) {
    return await request(`/projects/${projectId}/members/${userId}/`, {
      method: "DELETE",
    });
  }

  // ==========================================
  // Tasks
  // ==========================================
  async function getTasks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const query = qs ? `?${qs}` : "";
    return await request(`/tasks/${query}`);
  }

  async function getTask(id) {
    return await request(`/tasks/${id}/`);
  }

  async function createTask(data) {
    return await request("/tasks/", {
      method: "POST",
      body: data,
    });
  }

  async function updateTask(id, data) {
    return await request(`/tasks/${id}/`, {
      method: "PATCH",
      body: data,
    });
  }

  async function deleteTask(id) {
    return await request(`/tasks/${id}/`, {
      method: "DELETE",
    });
  }

  async function getTaskComments(taskId) {
    return await request(`/tasks/${taskId}/comments/`);
  }

  async function createTaskComment(taskId, content) {
    return await request(`/tasks/${taskId}/comments/`, {
      method: "POST",
      body: { content },
    });
  }

  async function updateComment(commentId, content) {
    return await request(`/comments/${commentId}/`, {
      method: "PATCH",
      body: { content },
    });
  }

  async function deleteComment(commentId) {
    return await request(`/comments/${commentId}/`, {
      method: "DELETE",
    });
  }

  async function createSubtask(taskId, title) {
    return await request(`/tasks/${taskId}/subtasks/`, {
      method: "POST",
      body: { title },
    });
  }

  async function updateSubtask(subtaskId, data) {
    return await request(`/subtasks/${subtaskId}/`, {
      method: "PATCH",
      body: data,
    });
  }

  async function deleteSubtask(subtaskId) {
    return await request(`/subtasks/${subtaskId}/`, {
      method: "DELETE",
    });
  }

  // ==========================================
  // Notifications
  // ==========================================
  async function getNotifications() {
    return await request("/notifications/");
  }

  async function markNotificationRead(id) {
    return await request(`/notifications/${id}/read/`, {
      method: "POST",
    });
  }

  async function deleteNotification(id) {
    return await request(`/notifications/${id}/`, {
      method: "DELETE",
    });
  }

  async function markAllNotificationsRead() {
    return await request("/notifications/read-all/", {
      method: "POST",
    });
  }

  // ==========================================
  // Dashboard Metrics & Activity
  // ==========================================
  async function getDashboardSummary() {
    return await request("/dashboard/summary/");
  }

  async function getDashboardActivity() {
    return await request("/dashboard/recent-activity/");
  }

  // ==========================================
  // Profile & User Settings
  // ==========================================
  async function getProfile() {
    return await request("/profile/");
  }

  async function updateProfile(data) {
    return await request("/profile/", {
      method: "PATCH",
      body: data,
    });
  }

  async function changePassword(oldPassword, newPassword, confirmPassword) {
    return await request("/profile/password/", {
      method: "POST",
      body: {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      },
    });
  }

  async function getSettings() {
    return await request("/settings/");
  }

  async function updateSettings(data) {
    return await request("/settings/", {
      method: "PATCH",
      body: data,
    });
  }

  // ==========================================
  // Team Chat / Conversations
  // ==========================================
  async function getConversations() {
    return await request("/conversations/");
  }

  async function createConversation(data) {
    return await request("/conversations/", {
      method: "POST",
      body: data,
    });
  }

  async function getMessages(conversationId) {
    return await request(`/conversations/${conversationId}/messages/`);
  }

  async function sendMessage(conversationId, content) {
    return await request(`/conversations/${conversationId}/messages/`, {
      method: "POST",
      body: { content },
    });
  }

  return {
    BASE_URL,
    getToken,
    setToken,
    getUser,
    setUser,
    clearAuth,
    isAuthenticated,
    requireAuth,
    request,

    // Auth
    register,
    login,
    logout,
    getMe,

    // Users
    getUsers,

    // Projects
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectMembers,
    addProjectMember,
    removeProjectMember,

    // Tasks
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    getTaskComments,
    createTaskComment,
    updateComment,
    deleteComment,
    createSubtask,
    updateSubtask,
    deleteSubtask,

    // Notifications
    getNotifications,
    markNotificationRead,
    deleteNotification,
    markAllNotificationsRead,

    // Dashboard
    getDashboardSummary,
    getDashboardActivity,

    // Profile & Settings
    getProfile,
    updateProfile,
    changePassword,
    getSettings,
    updateSettings,

    // Chat
    getConversations,
    createConversation,
    getMessages,
    sendMessage,
  };
})();

// Expose globally
window.TaskFlowAPI = TaskFlowAPI;
