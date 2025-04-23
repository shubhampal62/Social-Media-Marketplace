"use client";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyIdentity } from "../../api";

export default function VerifyIdentityPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IdentityPageContent />
    </Suspense>
  );
}

function IdentityPageContent() {
  const searchParams = useSearchParams(); // ✅ Now inside Suspense
  const router = useRouter();
  const email = searchParams.get("email") || localStorage.getItem("otpEmail");

  useEffect(() => {
    if (!email) {
      router.push("/auth/reset");
    }
  }, [router, email]);

  return <VerifyIdentityForm email={email} />;
}

function VerifyIdentityForm({ email }: { email: string | null }) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMessage("");

    try {
      await verifyIdentity(email, data.otp, data.password);
      
      alert("Password reset successful! Redirecting to login...");
      router.push("/auth/login");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
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
        <h2 className="text-2xl font-bold text-center text-gray-700">Verify Identity</h2>
        <p className="text-center text-gray-500">Enter the OTP sent to {email} and set a new password.</p>

        {errorMessage && <p className="text-red-500 text-sm text-center mt-2">{errorMessage}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          {/* OTP Field */}
          <label className="block">
            <span className="text-gray-700">OTP</span>
            <input
              type="text"
              maxLength={6}
              {...register("otp", { required: "OTP is required", minLength: 6, maxLength: 6 })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-center text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter OTP"
            />
            {errors.otp && <p className="text-red-500 text-xs">{String(errors.otp.message)}</p>}
          </label>

          {/* New Password Field */}
          <label className="block mt-4">
            <span className="text-gray-700">New Password</span>
            <input
              type="password"
              {...register("password", { required: "Password is required", minLength: 6 })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
            {errors.password && <p className="text-red-500 text-xs">{String(errors.password.message)}</p>}
          </label>

          {/* Confirm Password Field */}
          <label className="block mt-4">
            <span className="text-gray-700">Confirm Password</span>
            <input
              type="password"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === watch("password") || "Passwords do not match",
              })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs">{String(errors.confirmPassword.message)}</p>}
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}
