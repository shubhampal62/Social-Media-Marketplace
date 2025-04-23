from django.shortcuts import render

# Create your views here.
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt
import random
import string
from .models import Payment, Item
from users.models import CustomUser

# Function to generate a 6-digit OTP
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

# Function to send OTP via email for payments
def send_payment_otp_email(email, otp, item_title):
    """
    Function to send payment verification OTP via email.
    """
    subject = "Payment Verification OTP for RansomHub"
    message = f"""
    Your OTP for verifying payment on RansomHub is: {otp}
    
    This code is required to complete your purchase of item: {item_title}
    
    If you did not request this code, please ignore this email.
    
    Thank you,
    RansomHub Team
    """
    sender_email = "ecesoclabs@iiitd.ac.in"  
    send_mail(subject, message, sender_email, [email])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_payment_otp(request):
    """
    Send OTP for payment verification.
    """
    item_id = request.data.get("itemId")
    email = request.data.get("email")
    print(item_id,email)
    if not item_id or not email:
        return Response(
            {"error": "Item ID and email are required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Find the item
        item = Item.objects.get(id=item_id)
        
        # Get or create a payment record
        payment, created = Payment.objects.get_or_create(
            item=item,
            buyer=request.user,
            defaults={'status': 'pending'}
        )
        
        # Generate OTP
        otp = generate_otp()
        payment.otp = otp
        payment.save()
        
        # Send OTP to user's email
        send_payment_otp_email(email, otp, item.title)
        
        return Response({
            "message": "Verification code sent to your email",
            "payment_id": payment.id
        }, status=status.HTTP_200_OK)
        
    except Item.DoesNotExist:
        return Response(
            {"error": "Item not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to send verification code: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment_otp(request):
    """
    Verify the OTP entered for payment confirmation.
    """
    item_id = request.data.get("itemId")
    otp = request.data.get("otp")
    
    if not item_id or not otp:
        return Response(
            {"error": "Item ID and verification code are required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Find the item
        item = Item.objects.get(id=item_id)
        
        # Find the pending payment
        payment = Payment.objects.filter(
            item=item,
            buyer=request.user,
            status='pending'
        ).first()
        
        if not payment:
            return Response(
                {"error": "No pending payment found for this item"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify OTP
        if payment.otp == otp:
            # Update payment status
            payment.status = 'completed'
            payment.otp = None  # Clear OTP after successful verification
            payment.save()
            
            # Update item status if needed
            item.status = 'sold'
            item.save()
            
            # Create activity log
            # create_activity_log(
            #     user=request.user, 
            #     action_type='PAYMENT_COMPLETED', 
            #     description=f'Payment completed for item {item.title}',
            #     ip_address=request.META.get('REMOTE_ADDR')
            # )
            
            return Response({
                "message": "Payment verified successfully",
                "status": "completed",
                "item_id": item.id,
                "item_title": item.title
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": "Invalid verification code"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Item.DoesNotExist:
        return Response(
            {"error": "Item not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Verification failed: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resend_payment_otp(request):
    """
    Resend OTP for payment verification.
    """
    item_id = request.data.get("itemId")
    
    if not item_id:
        return Response(
            {"error": "Item ID is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Find the item
        item = Item.objects.get(id=item_id)
        
        # Find the pending payment
        payment = Payment.objects.filter(
            item=item,
            buyer=request.user,
            status='pending'
        ).first()
        
        if not payment:
            return Response(
                {"error": "No pending payment found for this item"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate new OTP
        otp = generate_otp()
        payment.otp = otp
        payment.save()
        
        # Send OTP to user's email
        send_payment_otp_email(request.user.email, otp, item.title)
        
        return Response({
            "message": "Verification code resent to your email",
            "payment_id": payment.id
        }, status=status.HTTP_200_OK)
        
    except Item.DoesNotExist:
        return Response(
            {"error": "Item not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to resend verification code: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )