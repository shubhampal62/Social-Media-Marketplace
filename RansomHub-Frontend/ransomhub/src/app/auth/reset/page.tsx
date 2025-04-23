"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { sendResetOtp, verifyRecaptcha } from "../../api";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";

export default function ResetPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaValue, setCaptchaValue] = useState<string | null>(null); // Added type annotation

  const router = useRouter();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMessage("");

    try {
      // Verify the captcha first
      const captchaResponse = captchaValue;
      const captchaVerificationResult = await verifyRecaptcha(captchaResponse);

      if (captchaVerificationResult.success) {
        // Captcha verification successful, proceed with reset
        const response = await sendResetOtp(data.email);

        if (response.error) {
          setErrorMessage(response.error);
        } else {
          localStorage.setItem("otpEmail", data.email);
          router.push(`/auth/identity`);
        }
      } else {
        // Captcha verification failed
        setErrorMessage(captchaVerificationResult.error || "Captcha verification failed. Please try again.");
      }
    } catch (error) {
      setErrorMessage("Something went wrong. Please try again.");
      console.error("API Error:", error);
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        width: "100vw",
      }}
    >
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center text-gray-700">Reset Password</h2>
        <p className="text-center text-gray-600 mt-2">Enter your email to receive an OTP.</p>
        
        {errorMessage && (
          <p className="text-red-500 text-sm text-center mt-2">{errorMessage}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          <label className="block">
            <span className="text-gray-700">Email</span>
            <input
              type="email"
              {...register("email", { required: "Email is required", pattern: /^\S+@\S+\.\S+$/ })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-500 text-xs">{String(errors.email.message)}</p>}
          </label>

          {/* Add the ReCAPTCHA component here */}
          <div className="mt-4">
            <ReCAPTCHA
              sitekey="6LeyqwMrAAAAAA6w1vcznR_GClUqOqBSbnwKjRvh" // Using the same site key as your login page
              onChange={(value) => setCaptchaValue(value)}
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
            disabled={loading || !captchaValue} // Disable button if captcha isn't completed
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
        <p className="mt-0 text-sm text-gray-800 text-right">
          Back to login?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}