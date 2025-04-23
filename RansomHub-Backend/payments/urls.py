from django.urls import path
from .views import send_payment_otp, verify_payment_otp, resend_payment_otp

urlpatterns = [
    # Other URL patterns...
    
    # Payment OTP endpoints
    path('send-otp/', send_payment_otp, name='send-payment-otp'),
    path('verify-otp/', verify_payment_otp, name='verify-payment-otp'),
    path('resend-otp/', resend_payment_otp, name='resend-payment-otp'),
]