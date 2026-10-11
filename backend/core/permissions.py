from rest_framework import permissions
from core.models import ProjectMembership


class IsProjectMember(permissions.BasePermission):
    """
    Object-level permission to only allow members of a project to access it.
    """
    def has_object_permission(self, request, view, obj):
        # obj can be Project, Task, or Comment
        project = getattr(obj, "project", obj)
        if hasattr(project, "memberships"):
            return project.memberships.filter(user=request.user).exists()
        return False


class IsProjectOwnerOrManager(permissions.BasePermission):
    """
    Allows only project owner or managers to perform modifying operations.
    """
    def has_object_permission(self, request, view, obj):
        project = getattr(obj, "project", obj)
        return ProjectMembership.objects.filter(
            project=project,
            user=request.user,
            role__in=["owner", "manager"]
        ).exists()


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow authors of a comment or task to edit/delete it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        author = getattr(obj, "author", getattr(obj, "creator", None))
        return author == request.user
