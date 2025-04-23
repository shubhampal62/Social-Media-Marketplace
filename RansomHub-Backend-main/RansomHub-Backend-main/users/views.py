from django.contrib.auth import authenticate, login, logout
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.db import models
from .models import CustomUser, Post
from django.core.mail import send_mail
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from admins.models import create_activity_log
from django_recaptcha.fields import ReCaptchaField
from django_recaptcha.widgets import ReCaptchaV2Checkbox
from django.http import JsonResponse
from backend.settings import RECAPTCHA_PRIVATE_KEY
from django.middleware.csrf import get_token
from django.utils import timezone
from datetime import timedelta
from chat.models import Message, FileMessage
from django.utils import timezone

import random
import os
import requests

User = get_user_model()

@api_view(['GET'])
@permission_classes([AllowAny])
def set_csrf_cookie(request):
    csrf_token = get_token(request)
    response = Response({"message": "CSRF cookie set", "csrfToken": csrf_token})
    response["X-CSRFToken"] = csrf_token
    return response

@api_view(['POST'])
@permission_classes([AllowAny])  # Since captcha verification should be available to anyone
def verify_captcha(request):
    try:
        # Extract the reCAPTCHA response token sent from the frontend
        captcha_response = request.data.get('captcha')
        
        if not captcha_response:
            return Response({'success': False, 'error': 'Captcha response is required'}, status=400)

        # Your Google reCAPTCHA secret key
        secret_key = RECAPTCHA_PRIVATE_KEY

        # Verify the CAPTCHA response by making a request to Google reCAPTCHA API
        verify_url = "https://www.google.com/recaptcha/api/siteverify"
        payload = {
            'secret': secret_key,
            'response': captcha_response,
        }

        # Make the API request to Google
        response = requests.post(verify_url, data=payload)
        result = response.json()
        print(result)
        # Check if the CAPTCHA verification was successful
        if result.get('success'):
            return Response({'success': True})
        else:
            return Response({'success': False, 'error': 'Captcha verification failed'}, status=400)

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    """
    Signup View: Creates a new user and sends OTP.
    """
    name=request.data.get("name")
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    phone = request.data.get("phone")
    public_key = request.data.get("public_key")
    encrypted_private_key = request.data.get("encrypted_private_key")
    private_key_salt = request.data.get("private_key_salt")

    if not public_key or not encrypted_private_key or not private_key_salt:
        return Response({"error": "All fields (public_key, encrypted_private_key, private_key_salt) are required."}, status=status.HTTP_400_BAD_REQUEST)

    if not username or not email or not password or not name:
        return Response({"error": "All fields (username, email, password) are required."}, status=status.HTTP_400_BAD_REQUEST)

    if CustomUser.objects.filter(email=email).exists():
        return Response({"error": "Email already exists"}, status=status.HTTP_409_CONFLICT)
    if CustomUser.objects.filter(username=username).exists():
        return Response({"error": "Username not available"}, status=status.HTTP_409_CONFLICT)

    print(name,username,password, email,phone)
    user = CustomUser.objects.create_user(
        username=username, 
        first_name=name, 
        email=email, 
        password=password, 
        public_key=public_key,
        encrypted_private_key=encrypted_private_key,
        private_key_salt=private_key_salt,
    )
    create_activity_log(
        user=user, 
        action_type='USER_REGISTRATION', 
        description='New user registered',
        ip_address=request.META.get('REMOTE_ADDR')
    )
    user.generate_otp()
    send_otp_email(user.email, user.otp)

    return Response({
        "message": "Signup successful. OTP sent to email.",
        "email": user.email
    }, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get("email")
    otp = request.data.get("otp")
    user = CustomUser.objects.filter(email=email).first()
    if(user.is_verified == True):
        return Response({"error": "User already verified"}, status=400)
    if not user:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if user.otp == otp:
        user.is_verified = True
        user.otp = None
        user.save()
        return Response({
            "message": "OTP verified. You can now login.",
            "email": user.email,
            "username": user.username
        }, status=status.HTTP_201_CREATED)
    else:
        return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def resendotp(request):
    """
    Resend OTP View: Generates and resends OTP.
    """
    email = request.data.get("email")
    user = CustomUser.objects.filter(email=email).first()

    if not user:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user.generate_otp()
    send_otp_email(user.email, user.otp)
    print("okay darling")
    return Response({
        "message": "OTP Resent.",
        "email": user.email
    }, status=status.HTTP_201_CREATED)


def send_otp_email(email, otp):
    """
    Function to send OTP via email.
    """
    subject = "Your OTP for Account Verification"
    message = f"Your OTP is: {otp}. Please enter it in the app to verify your account."
    sender_email = "ecesoclabs@iiitd.ac.in"  
    send_mail(subject, message, sender_email, [email])

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow any user to try to log in
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")
    user = CustomUser.objects.filter(email=email).first()
    if user and user.check_password(password):
        if not user.is_verified:
            return Response({"error": "User is not verified. Please verify OTP."}, status=403)

        # Generate JWT token for the user
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        encrypted_private_key = user.encrypted_private_key
        private_key_salt = user.private_key_salt
        return Response({
            "message": "Login successful",
            "access_token": str(access_token),  # Send access token as response
            "refresh_token": str(refresh),  # Optional: Send refresh token as well
            "email": user.email,
            "username": user.username,
            "encrypted_private_key": encrypted_private_key,
            "private_key_salt": private_key_salt,
        }, status=200)
    else:
        return Response({"error": "Invalid email or password"}, status=401)
    
@api_view(['POST'])
@permission_classes([AllowAny])  # Allow any user to try to log in
def reset_password(request):
    email = request.data.get("email")
    user = CustomUser.objects.filter(email=email).first()
    # Generate JWT token for the user
    refresh = RefreshToken.for_user(user)   
    access_token = refresh.access_token
    return Response({
        "message": "Login successful",
        "access_token": str(access_token),  # Send access token as response
        "refresh_token": str(refresh),  # Optional: Send refresh token as well
        "email": user.email,
        "username": user.username
    }, status=200)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        # Token Authentication
        if hasattr(request.user, 'auth_token'):
            request.user.auth_token.delete()

        # JWT Refresh Token Blacklisting
        refresh_token = request.data.get('refresh_token', None)
        if refresh_token:
            try:

                RefreshToken(refresh_token).blacklist()
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Session Logout (for session-based authentication)
        logout(request)

        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """
    Returns user profile data (username, email, profileImage, followRequests).
    """

    user = request.user
    if user.profile_picture:
        image_url = request.build_absolute_uri(user.profile_picture.url)
        image_url = image_url.replace("http://", "https://")
    else:
        image_url = "/default-profile.png"

    # Prepare follow requests data
    follow_requests_data = []
    for follower in user.follow_requests.all():
        follower_data = {
            "first_name": follower.first_name,  # Assuming you have a first_name field in your CustomUser model
            "username": follower.username,
            "profile_picture": request.build_absolute_uri(follower.profile_picture.url) if follower.profile_picture else "/default-profile.png"
        }
        follow_requests_data.append(follower_data)

    data = {
        "username": user.username,
        "email": user.email,
        "profileImage": image_url,
        "is_admin": user.is_superuser,
        "is_approved": user.is_approved,
        "followRequests": follow_requests_data  # Add follow requests data to the response
    }
    return Response(data)


@api_view(['POST'])
def refresh_token(request):
    try:
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Decode refresh token to get the user
        try:
            token = RefreshToken(refresh_token)
            user_id = token.payload.get("user_id")  # Extract user ID from token payload
            user = User.objects.get(id=user_id)  # Fetch user from DB
        except TokenError:
            return Response({"error": "Invalid refresh token."}, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_403_FORBIDDEN)

        # Generate a new refresh token for the user
        new_refresh = RefreshToken.for_user(user)

        # Blacklist the old refresh token *after* issuing a new one
        try:
            token.blacklist()
        except AttributeError:
            pass  # If token blacklisting is not enabled, skip this step

        return Response({
            "access_token": str(new_refresh.access_token),
            "refresh_token": str(new_refresh)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def reset_password_confirm(request):
    email = request.data.get("email")
    otp = request.data.get("otp")
    new_password = request.data.get("new_password")
    public_key = request.data.get("public_key")
    encrypted_private_key = request.data.get("encrypted_private_key")
    private_key_salt = request.data.get("private_key_salt")

    if not email or not otp or not new_password or not public_key or not encrypted_private_key or not private_key_salt:
        return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)

        # Check if OTP matches
        if str(user.otp) != str(otp):
            return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Reset password
        user.password = make_password(new_password)
        user.public_key = public_key
        user.encrypted_private_key = encrypted_private_key
        user.private_key_salt = private_key_salt
        
        # delete all the Messages and files sent or received by the user
        Message.objects.filter(sender=user).delete()
        Message.objects.filter(recipient=user).delete()
        FileMessage.objects.filter(sender=user).delete()
        FileMessage.objects.filter(recipient=user).delete()

        user.reset_otp = None  # Clear OTP after use
        user.save()
        create_activity_log(
            user=user, 
            action_type='PASSWORD_CHANGE', 
            description='Password Change',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
    
@api_view(['POST'])
def send_reset_otp(request):
    email = request.data.get("email")

    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)

    # Generate OTP (6-digit random number)
    otp = random.randint(100000, 999999)

    # Store OTP in the user model or a separate OTP table
    user.otp = otp
    user.save()

    # Send OTP via email
    send_mail(
        "Password Reset OTP",
        f"Your OTP for password reset is: {otp}",
        "noreply@yourdomain.com",
        [email],
        fail_silently=False,
    )

    return Response({"message": "OTP sent to your email."}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_username(request):
    user = request.user
    new_username = request.data.get("username")

    if not new_username:
        return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=new_username).exists():
        return Response({"error": "This username is already taken."}, status=status.HTTP_409_CONFLICT)

    user.username = new_username
    user.save()

    return Response({"message": "Username updated successfully.", "username": user.username}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_image(request):
    user = request.user
    profile_image = request.FILES.get('profile_image')

    if not profile_image:
        return Response({"error": "Profile image is required."}, status=status.HTTP_400_BAD_REQUEST)

    valid_extensions = ['.jpg', '.jpeg', '.png']
    file_extension = os.path.splitext(profile_image.name)[1].lower()

    if file_extension not in valid_extensions:
        return Response({"error": "Invalid file type. Only JPEG, JPG, and PNG are allowed."}, status=status.HTTP_400_BAD_REQUEST)

    if profile_image.size > 1 * 1024 * 1024:
        return Response({"error": "File size exceeds 1MB. "}, status=status.HTTP_400_BAD_REQUEST)

    user.profile_picture = profile_image
    user.save()
    image_url = request.build_absolute_uri(user.profile_picture.url)
    image_url = image_url.replace("http://", "https://")
    return Response({"message": "Profile image uploaded successfully.", "profileImage": image_url}, status=status.HTTP_200_OK)

# In Django views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_identity(request):
    user = request.user
    if(user.is_approved):
        return Response({'error': 'User Already Verified'}, status=400)
    
    identity_proof = request.FILES.get('identity_proof')
        
    if not identity_proof:
        return Response({'error': 'No file uploaded'}, status=400)
    
    # Validate file type and size
    allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
    max_size = 1 * 1024 * 1024  # 1MB
    
    if identity_proof.content_type not in allowed_types:
        return Response({'error': 'Invalid file type'}, status=400)
    
    if identity_proof.size > max_size:
        return Response({'error': 'File too large'}, status=400)
    
    user.is_approved=True
    user.verification_docs=identity_proof
    user.save()
    
    return Response({
        'message': 'Verification request submitted',
        'is_approved': True
    }, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):

    users = CustomUser.objects.filter(is_verified=True).exclude(is_superuser=True).exclude(is_suspended=True)
    if not users.exists():
        return Response({"message": "No users found"}, status=status.HTTP_404_NOT_FOUND)

    user_list = []
    for user in users:
        user_list.append({
            "name": user.first_name,
            "email": user.email,
            "contact": user.phone,
            "username": user.username
        })

    return Response(user_list, status=status.HTTP_200_OK)


@api_view(['POST'])
# @permission_classes([IsAuthenticated])
@permission_classes([AllowAny])
def followUser(request):
    print("check")
    current_user = request.user
    username_to_follow = request.data.get('username')
    
    if not username_to_follow:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user_to_follow = CustomUser.objects.get(username=username_to_follow)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is trying to follow themselves
    if current_user == user_to_follow:
        return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user is already following
    if user_to_follow in current_user.following.all():
        return Response({"error": "You are already following this user"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user has blocked the current user
    if current_user in user_to_follow.blocked_users.all():
        return Response({"error": "You cannot follow this user"}, status=status.HTTP_403_FORBIDDEN)
    
    # Add to following list
    user_to_follow.follow_requests.add(current_user)
    
    return Response({"message": f"forllow request sent to {username_to_follow}"}, status=status.HTTP_200_OK)

BLOCK_COOLDOWN_TIME = 600 
MAX_BLOCKS_PER_HOUR = 5
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reportUser(request):
    current_user = request.user
    username_to_report = request.data.get('username')
    reason = request.data.get('reason', 'No reason provided')
    
    if not username_to_report:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user_to_report = CustomUser.objects.get(username=username_to_report)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is trying to report themselves
    if current_user == user_to_report:
        return Response({"error": "You cannot report yourself"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Block the user as part of reporting
    if user_to_report not in current_user.blocked_users.all():
        current_user.blocked_users.add(user_to_report)
        
        # Remove from followers/following if exists
        if user_to_report in current_user.followers.all():
            current_user.followers.remove(user_to_report)
        if user_to_report in current_user.following.all():
            current_user.following.remove(user_to_report)
        if current_user in user_to_report.followers.all():
            user_to_report.followers.remove(current_user)
        if current_user in user_to_report.following.all():
            user_to_report.following.remove(current_user)
    
    # Here you would typically save the report to a database
    # For this example, we're just returning success
    create_activity_log(
        user=current_user, 
        action_type='USER_REPORT', 
        description=f'Reported user: {username_to_report} for: {reason}',
        ip_address=request.META.get('REMOTE_ADDR')
    )
    
    return Response({
        "message": f"User {username_to_report} has been reported and blocked",
        "reason": reason
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def blockUser(request):
    current_user = request.user
    username_to_block = request.data.get('username')
    
    if not username_to_block:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user_to_block = CustomUser.objects.get(username=username_to_block)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is trying to block themselves
    if current_user == user_to_block:
        return Response({"error": "You cannot block yourself"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check cooldown period
    now = timezone.now()
    if current_user.last_block_time and (now - current_user.last_block_time).total_seconds() < BLOCK_COOLDOWN_TIME:
        return Response({"error": "You need to wait before blocking/unblocking again."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Check if user has exceeded the maximum number of blocks in the last hour
    if current_user.block_action_count >= MAX_BLOCKS_PER_HOUR:
        return Response({"error": "You have reached the maximum number of blocks allowed per hour."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Add to blocked list if not already blocked
    if user_to_block not in current_user.blocked_users.all():
        current_user.blocked_users.add(user_to_block)
        
        # Remove from followers/following if exists
        if user_to_block in current_user.followers.all():
            current_user.followers.remove(user_to_block)
        if user_to_block in current_user.following.all():
            current_user.following.remove(user_to_block)
        if current_user in user_to_block.followers.all():
            user_to_block.followers.remove(current_user)
        if current_user in user_to_block.following.all():
            user_to_block.following.remove(current_user)

        # Update block action count and last block time
        current_user.block_action_count += 1
        current_user.last_block_time = now
        current_user.save()

        return Response({"message": f"User {username_to_block} has been blocked"}, status=status.HTTP_200_OK)
    else:
        return Response({"message": f"User {username_to_block} is already blocked"}, status=status.HTTP_200_OK)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unblockUser(request):
    current_user = request.user
    username_to_unblock = request.data.get('username')
    
    if not username_to_unblock:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user_to_unblock = CustomUser.objects.get(username=username_to_unblock)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if user is trying to unblock themselves
    if current_user == user_to_unblock:
        return Response({"error": "You cannot unblock yourself"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check cooldown period
    now = timezone.now()
    if current_user.last_block_time and (now - current_user.last_block_time).total_seconds() < BLOCK_COOLDOWN_TIME:
        return Response({"error": "You need to wait before blocking/unblocking again."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Remove from blocked list if currently blocked
    if user_to_unblock in current_user.blocked_users.all():
        current_user.blocked_users.remove(user_to_unblock)

        # Update last block time and reset action count
        current_user.last_block_time = now
        current_user.block_action_count = max(0, current_user.block_action_count - 1)  # Decrease count if needed
        current_user.save()

        return Response({"message": f"User {username_to_unblock} has been unblocked"}, status=status.HTTP_200_OK)
    else:
        return Response({"message": f"User {username_to_unblock} is not blocked"}, status=status.HTTP_200_OK)
    


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def acceptFollowRequest(request):
    """
    Accept a follow request from another user.
    """
    current_user = request.user
    username = request.data.get('username')
    
    if not username:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        requester = CustomUser.objects.get(username=username)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if there is a pending follow request
    if requester not in current_user.follow_requests.all():
        return Response({"error": "No follow request from this user"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Remove from follow requests
    current_user.follow_requests.remove(requester)
    
    # Add to followers
    current_user.followers.add(requester)
    
    # Add to following of the requester
    requester.following.add(current_user)
    
    return Response({
        "message": f"Follow request from {username} has been accepted",
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rejectFollowRequest(request):
    """
    Reject a follow request from another user.
    """
    current_user = request.user
    username = request.data.get('username')
    
    if not username:
        return Response({"error": "Username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        requester = CustomUser.objects.get(username=username)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if there is a pending follow request
    if requester not in current_user.follow_requests.all():
        return Response({"error": "No follow request from this user"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Remove from follow requests
    current_user.follow_requests.remove(requester)
    
    return Response({
        "message": f"Follow request from {username} has been rejected",
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_post(request):
    user = request.user
    one_liner = request.data.get('one_liner')
    image = request.FILES.get('image')


    # Validate input
    if not one_liner:
        return Response({"error": "One-liner is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not image:
        return Response({"error": "Profile image is required."}, status=status.HTTP_400_BAD_REQUEST)


    valid_extensions = ['.jpg', '.jpeg', '.png']
    file_extension = os.path.splitext(image.name)[1].lower()


    if file_extension not in valid_extensions:
        return Response({"error": "Invalid file type. Only JPEG, JPG, and PNG are allowed."}, status=status.HTTP_400_BAD_REQUEST)


    if image.size > 1 * 1024 * 1024:
        return Response({"error": "File size exceeds 1MB. "}, status=status.HTTP_400_BAD_REQUEST)


    today = timezone.now().date()
    post_count = Post.objects.filter(user=user, created_at__date=today).count()
   
    if post_count >= 2:
        return Response({"error": "You can only create 2 posts per day."}, status=status.HTTP_403_FORBIDDEN)


    # Create the post
    post = Post(user=user, one_liner=one_liner, image=image)
    post.save()


    return Response({"message": "Post created successfully.", "post_id": post.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_posts(request):
    """
    Get posts from the current user and users they follow,
    created within the last 2 days.
    """
    user = request.user
   
    # Calculate the date 2 days ago from now
    two_days_ago = timezone.now() - timedelta(days=2)
   
    # Get IDs of users the current user is following
    following_users = user.following.all()
   
    # Query posts from current user AND users they follow
    # that were created in the last 2 days
    posts = Post.objects.filter(
        models.Q(user=user) | models.Q(user__in=following_users),
        created_at__gte=two_days_ago
    ).order_by('-created_at')  # Most recent first
   
    if not posts.exists():
        return Response({"message": "No posts found in the last 2 days."}, status=status.HTTP_200_OK)
   
    post_list = []
    for post in posts:
        image_url = request.build_absolute_uri(post.image.url) if post.image else None
        if image_url:
            image_url = image_url.replace("http://", "https://")
           
        profile_pic = request.build_absolute_uri(post.user.profile_picture.url) if post.user.profile_picture else "/default-profile.png"
        if profile_pic.startswith("http://"):
            profile_pic = profile_pic.replace("http://", "https://")
       
        is_liked = post.likes.filter(id=user.id).exists()
       
        post_list.append({
            "id": post.id,
            "username": post.user.username,
            "user_fullname": post.user.first_name,
            "one_liner": post.one_liner,
            "created_at": post.created_at,
            "image": image_url,
            "profile_picture": profile_pic,
            "like_count": post.likes.count(),
            "is_liked": is_liked
        })
   
    return Response(post_list, status=status.HTTP_200_OK)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like(request):
    """
    Toggle like status on a post.
    """
    user = request.user
    post_id = request.data.get('post_id')
   
    if not post_id:
        return Response({"error": "Post ID is required."}, status=status.HTTP_400_BAD_REQUEST)
   
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({"error": "Post not found."}, status=status.HTTP_404_NOT_FOUND)
   
    if user in post.user.blocked_users.all():
        return Response({"error": "You cannot interact with this post."}, status=status.HTTP_403_FORBIDDEN)
   
    if post.likes.filter(id=user.id).exists():
        post.likes.remove(user)
        action = "unliked"
    else:
        post.likes.add(user)
        action = "liked"
   
    return Response({
        "message": f"Post successfully {action}.",
        "post_id": post.id,
        "like_count": post.likes.count(),
        "is_liked": action == "liked"
    }, status=status.HTTP_200_OK)