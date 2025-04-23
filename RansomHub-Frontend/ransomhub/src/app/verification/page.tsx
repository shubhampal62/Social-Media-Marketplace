"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MdCloudUpload } from "react-icons/md";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { Identity } from "../api";

export default function VerificationPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 1024 * 1024; // 1MB

      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload JPEG, PNG, or PDF.");
        return;
      }

      if (file.size > maxSize) {
        setError("File is too large. Maximum size is 1 MB.");
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please upload a government identity proof.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await Identity(selectedFile);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Optionally redirect after a delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Navbar */}
      <nav className="bg-white w-full shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between py-4 px-1">
          <h1 className="text-xl font-semibold text-gray-800">Account Verification</h1>
          <div className="space-x-6 text-gray-600">
            <button 
              onClick={() => router.push('/')}
              className="hover:text-blue-500 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Verification Content */}
      <div className="bg-white mt-10 p-8 rounded-xl shadow-lg max-w-lg w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Verify Your Identity</h2>
          <p className="text-gray-500 mt-2">
            Upload a government-issued identity proof to verify your account
          </p>
        </div>

        {/* Error Handling */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4 flex items-center">
            <FiAlertCircle className="mr-2 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-4 flex items-center">
            <FiCheckCircle className="mr-2 text-green-500" />
            <span>Verification submitted successfully! Redirecting...</span>
          </div>
        )}

        {/* File Upload Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div 
            onClick={triggerFileInput}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
            />
            {previewUrl ? (
              <div className="flex justify-center">
                {selectedFile?.type.startsWith('image/') ? (
                  <img 
                    src={previewUrl} 
                    alt="Identity Proof Preview" 
                    className="max-h-64 object-contain rounded-md"
                  />
                ) : (
                  <div className="text-gray-600 flex items-center justify-center">
                    <MdCloudUpload size={48} className="mr-2" />
                    PDF Uploaded
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <MdCloudUpload size={48} className="text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Drag and drop or click to upload your identity proof
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Accepted formats: JPEG, PNG, PDF (Max 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Supported Documents */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold text-gray-700 mb-2">Accepted Documents:</h3>
            <ul className="list-disc list-inside text-gray-600 text-sm">
              <li>Passport</li>
              <li>Driver's License</li>
              <li>National ID Card</li>
              <li>Government-issued Photo ID</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className={`w-full py-3 rounded-md text-white font-semibold transition ${
              selectedFile
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}