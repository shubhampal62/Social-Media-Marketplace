"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { refreshAccessToken } from "../../../../api";
import { verifyPaymentOtp, resendPaymentOtp } from "../../../../api";

export default function VerifyPaymentPage() {
  const params = useParams();
  const itemId = params.id as string;
  const router = useRouter();

  const [otp, setOtp] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!token || !refreshToken) {
      router.push("/auth/login");
      return;
    }

    // Countdown timer for resend OTP
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, "");
    
    // Limit to 6 characters
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  const handleResendOtp = async () => {
    setCanResend(false);
    setCountdown(60);
    
    try {
      const result = await resendPaymentOtp(itemId);
      if (result.error) {
        setError(result.error);
      } else {
        // Start countdown again
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError("Failed to resend verification code");
      setCanResend(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const result = await verifyPaymentOtp(itemId, otp);
      
      if (result.error) {
        setError(result.error);
        setIsVerifying(false);
      } else {
        // Payment verification successful
        setTimeout(() => {
          router.push("/marketplace");
        }, 1000);
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar - Consistent with other pages */}
      <nav className="bg-white w-full shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between py-4 px-1">
          <h1 className="text-xl font-semibold text-gray-800">RansomHub</h1>
          <div className="space-x-6 text-gray-600">
            <Link href="/marketplace" className="hover:text-blue-600 transition">Marketplace</Link>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Home</Link>
          </div>
        </div>
      </nav>

      <div className="py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white p-8 shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Verify Your Payment</h1>
            
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-gray-600">We've sent a verification code to your email address.</p>
              <p className="text-gray-600">Please enter the 6-digit code below to complete your payment.</p>
            </div>
            
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {isVerifying && (
              <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">Payment successful! Redirecting to marketplace...</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="otp" className="block text-gray-700 text-sm font-medium mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={handleInputChange}
                  placeholder="Enter 6-digit code"
                  className="w-full text-center text-2xl tracking-widest px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isVerifying}
                  maxLength={6}
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                  disabled={isVerifying || otp.length !== 6}
                >
                  {isVerifying ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Verifying...
                    </div>
                  ) : (
                    "Verify & Complete Payment"
                  )}
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{" "}
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Resend Code
                    </button>
                  ) : (
                    <span className="text-gray-500">
                      Resend in {countdown}s
                    </span>
                  )}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}