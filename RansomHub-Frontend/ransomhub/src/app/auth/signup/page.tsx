"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { signup,verifyRecaptcha } from "../../api";
import ReCAPTCHA from "react-google-recaptcha";


export default function SignupPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaValue, setCaptchaValue] = useState<string | null>(null); // State to hold captcha value
  const router = useRouter();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMessage("");
    
    try {
      // Verify the captcha first
      const captchaResponse = captchaValue; // Use the captcha value from state
      const captchaVerificationResult = await verifyRecaptcha(captchaResponse);
  
      if (captchaVerificationResult.success) {
        // Captcha verification successful, proceed with signup
        const result = await signup(data.name, data.username, data.email, data.password, data.phone);
        console.log(result.token);
        
        if (result.email) {
          // localStorage.setItem("token", result.token);
          localStorage.setItem("otpEmail", result.email);
          router.push("/auth/otp");
        } else {
          setErrorMessage(result.error || "Signup failed. Please try again.");
        }
      } else {
        // Captcha verification failed, show the error message
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
        <h2 className="text-2xl font-bold text-center text-gray-700">Sign Up</h2>

        {errorMessage && (
          <p className="text-red-500 text-sm text-center mt-2">{errorMessage}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          <label className="block">
            <span className="text-gray-700">Full Name</span>
            <input
              type="text"
              {...register("name", { required: "Full Name is required" })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-xs">{String(errors.name.message)}</p>}
          </label>

          <label className="block mt-4">
            <span className="text-gray-700">User Name</span>
            <input
              type="text"
              {...register("username", { required: "User Name is required" })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a username"
            />
            {errors.username && <p className="text-red-500 text-xs">{String(errors.username.message)}</p>}
          </label>

          <label className="block mt-4">
            <span className="text-gray-700">E-mail</span>
            <input
              type="email"
              {...register("email", { 
                required: "Email is required", 
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" }
              })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-500 text-xs">{String(errors.email.message)}</p>}
          </label>

          <label className="block mt-4">
            <span className="text-gray-700">Mobile Number</span>
            <input
              type="text"
              {...register("phone", { 
                required: "Phone number is required",
                minLength: { value: 10, message: "Enter a valid 10-digit phone number" },
                maxLength: { value: 10, message: "Enter a valid 10-digit phone number" }
              })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-500 text-xs">{String(errors.phone.message)}</p>}
          </label>

          <label className="block mt-4">
            <span className="text-gray-700">Password</span>
            <input
              type="password"
              {...register("password", { 
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" }
              })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a strong password"
            />
            {errors.password && <p className="text-red-500 text-xs">{String(errors.password.message)}</p>}
          </label>
              {/* Add the ReCAPTCHA component here */}
          <div className="mt-4">
            <ReCAPTCHA
              sitekey="6LeyqwMrAAAAAA6w1vcznR_GClUqOqBSbnwKjRvh" // Replace with your reCAPTCHA site key
              onChange={(value: string | null) => setCaptchaValue(value)} // Set the captcha value on change
            />
          </div>
          <button
            type="submit"
            className="mt-4 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition duration-200"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-4 text-right text-sm text-gray-800">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
