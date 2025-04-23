from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from .models import ActivityLog
from .serializers import ActivityLogSerializer
User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_users(request):
    try:
        if(not request.user.is_superuser):
            return Response(
            {"error": str("NOT a superuser")}, 
            status=status.HTTP_403_FORBIDDEN
        )
        
        # Retrieve all users, excluding superusers if desired
        users = User.objects.exclude(is_superuser=True).values(
            'id', 
            'first_name', 
            'email', 
            'phone', 
            'username', 
            'is_approved', 
            'is_suspended'
        )
        return Response(list(users))
    except Exception as e:
        print(e)
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def remove_user(request, user_id):
    """
    Remove a user (Admin-only endpoint)
    """
    
    try:
        if(not request.user.is_superuser):
            return Response(
            {"error": str("NOT a superuser")}, 
            status=status.HTTP_403_FORBIDDEN
        )
        user = User.objects.get(id=user_id)
        
        # Prevent removing superusers
        if user.is_superuser:
            return Response(
                {"error": "Cannot remove superuser"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.delete()
        return Response(
            {"message": "User removed successfully"}, 
            status=status.HTTP_200_OK
        )
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def toggle_user_suspension(request, user_id):
    """
    Toggle user suspension (Admin-only endpoint)
    """
    try:
        if(not request.user.is_superuser):
            return Response(
            {"error": str("NOT a superuser")}, 
            status=status.HTTP_403_FORBIDDEN
        )
        user = User.objects.get(id=user_id)
        
        # Prevent suspending superusers
        if user.is_superuser:
            return Response(
                {"error": "Cannot suspend superuser"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Toggle suspension status
        user.is_suspended = not user.is_suspended
        user.save()
        
        return Response({
            "id": user.id,
            "is_suspended": user.is_suspended,
            "message": f"User {'suspended' if user.is_suspended else 'unsuspended'} successfully"
        })
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_activity_logs(request):
    """
    Retrieve and filter activity logs
    Query parameters:
    - action_type: Filter by specific action type
    - start_date: Filter logs from this date
    - end_date: Filter logs up to this date
    """
    if(not request.user.is_superuser):
            return Response(
            {"error": str("NOT a superuser")}, 
            status=status.HTTP_403_FORBIDDEN
        )
    queryset = ActivityLog.objects.all()
    
    # Optional filtering
    action_type = request.query_params.get('action_type')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    if action_type:
        queryset = queryset.filter(action_type=action_type)
    
    if start_date:
        queryset = queryset.filter(timestamp__gte=start_date)
    
    if end_date:
        queryset = queryset.filter(timestamp__lte=end_date)
    
    serializer = ActivityLogSerializer(queryset, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_log_entry(request):
    """
    Create a new log entry
    """
    serializer = ActivityLogSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def view_verification_docs(request, user_id):
    """
    View user verification documents (Admin-only endpoint)
    """
    try:
        # Ensure only superusers can access this endpoint
        if not request.user.is_superuser:
            return Response(
                {"error": "Not a superuser"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Retrieve the user
        user = User.objects.get(id=user_id)
        
        # Check if verification docs exist
        if not user.verification_docs:
            return Response(
                {"error": "No verification documents found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate the document URL
        document_url = request.build_absolute_uri(user.verification_docs.url)
        document_url = document_url.replace("http://", "https://")
        
        return Response({
            "documentUrl": document_url,
            "userId": user.id,
            "username": user.username
        })
    
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def disapprove_user(request, user_id):
    """
    Disapprove user (Admin-only endpoint)
    """
    try:
        # Ensure only superusers can access this endpoint
        if not request.user.is_superuser:
            return Response(
                {"error": "Not a superuser"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Retrieve the user
        user = User.objects.get(id=user_id)
        
        # Prevent disapproving superusers
        if user.is_superuser:
            return Response(
                {"error": "Cannot disapprove superuser"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user is currently approved
        if not user.is_approved:
            user.is_approved = True
            user.save()
            return Response({
                "id": user.id,
                "is_approved": user.is_approved,
                "message": "User approved successfully"
            })
        
        # Disapprove the user
        user.is_approved = False
        user.save()
        
        return Response({
            "id": user.id,
            "is_approved": user.is_approved,
            "message": "User disapproved successfully"
        })
    
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )