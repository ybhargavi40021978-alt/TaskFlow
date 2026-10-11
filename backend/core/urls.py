from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core import views

router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="project")
router.register(r"tasks", views.TaskViewSet, basename="task")
router.register(r"conversations", views.ConversationViewSet, basename="conversation")

urlpatterns = [
    # Auth
    path("auth/register/", views.register_view, name="auth-register"),
    path("auth/login/", views.login_view, name="auth-login"),
    path("auth/logout/", views.logout_view, name="auth-logout"),
    path("auth/me/", views.me_view, name="auth-me"),

    # Users
    path("users/", views.users_list_view, name="users-list"),

    # Subtasks & Comments individual actions
    path("subtasks/<int:pk>/", views.subtask_detail_view, name="subtask-detail"),
    path("comments/<int:pk>/", views.comment_detail_view, name="comment-detail"),

    # Notifications
    path("notifications/", views.notifications_list_view, name="notifications-list"),
    path("notifications/<int:pk>/read/", views.mark_notification_read_view, name="notification-read"),
    path("notifications/<int:pk>/", views.delete_notification_view, name="notification-delete"),
    path("notifications/<int:pk>/delete/", views.delete_notification_view, name="notification-delete-alt"),
    path("notifications/read-all/", views.mark_all_notifications_read_view, name="notifications-read-all"),

    # Dashboard
    path("dashboard/summary/", views.dashboard_summary_view, name="dashboard-summary"),
    path("dashboard/recent-activity/", views.dashboard_activity_view, name="dashboard-activity"),

    # Profile & Settings
    path("profile/", views.profile_view, name="profile"),
    path("profile/password/", views.change_password_view, name="profile-change-password"),
    path("settings/", views.settings_view, name="settings"),

    # Router endpoints (projects, tasks, conversations)
    path("", include(router.urls)),
]
