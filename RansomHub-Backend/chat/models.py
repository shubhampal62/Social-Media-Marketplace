from django.db import models
from users.models import CustomUser

# create a model to store the messages between users
class Message(models.Model):

    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="sender")
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="recipient")
    message = models.TextField()
    iv = models.CharField(max_length=256, null=False, blank=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.message}"

# create a model to store the group information
class Group(models.Model):
    
    username = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    members = models.ManyToManyField(CustomUser)

    def __str__(self):
        return self.username
    
class GroupMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.message}"
    
class FileMessage(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="file_sender")
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="file_recipient")
    file = models.TextField()
    filename = models.CharField(max_length=255, default="tmp.txt")
    file_type = models.CharField(max_length=255, default="text")
    iv = models.CharField(max_length=256, null=False, blank=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.file.name}"
    

class GroupFileMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    file = models.TextField()
    filename = models.CharField(max_length=255, default="tmp.txt")
    file_type = models.CharField(max_length=255, default="text")
    iv = models.CharField(max_length=256, null=False, blank=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.file.name}"
