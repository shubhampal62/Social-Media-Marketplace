from django.db import models
from users.models import CustomUser
from django.contrib.auth import get_user_model
from django.utils import timezone

class Admin(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    is_super_admin = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username




User = get_user_model()

def create_activity_log(user, action_type, description, ip_address=None, additional_metadata=None):
    """Helper function to create activity log entries"""
    return ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        description=description,
        ip_address=ip_address,
        additional_metadata=additional_metadata or {}
    )

class ActivityLog(models.Model):
    ACTION_TYPES = [
        ('USER_REGISTRATION', 'User Registration'),
        ('PASSWORD_CHANGE', 'Password Change'),
        ('ADMIN_MODERATION', 'Admin Moderation'),
        ('CONTENT_FLAG', 'Suspicious Content Flag'),
        ('LOGIN', 'User Login'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    additional_metadata = models.JSONField(null=True, blank=True)
    @property
    def username(self):
        return self.user.username if self.user else 'System'

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Activity Logs'