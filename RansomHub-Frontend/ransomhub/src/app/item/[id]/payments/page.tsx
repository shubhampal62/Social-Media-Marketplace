"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchItemDetails, refreshAccessToken, sendPaymentOtp,normalizeImageUrl } from "../../../api";

// TypeScript interface for an item
interface ItemImage {
  id: number;
  image: string;
  is_primary: boolean;
}
interface Item {
  id: string;
  title: string;
  price: string;
  description?: string;
  category?: number;
  category_name?: string;
  seller: {
    id: number;
    username: string;
    email: string;
    profile_picture?: string;
  };
  primary_image?: ItemImage | null;
  images?: ItemImage[];
  status?: string;
}

export default function PaymentPage() {
  const params = useParams();
  const itemId = params.id as string;
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("credit");
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
    billingAddress: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!token || !refreshToken) {
      router.push("/auth/login");
      return;
    }

    const loadItemDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const itemDetails = await fetchItemDetails(itemId);
        setItem(itemDetails);
        if (itemDetails?.status === 'sold') {
        router.push("/marketplace");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setItem(null);
        
        if (errorMessage.includes('401')) {
          try {
            await refreshAccessToken();
            // Optionally, retry the fetch after refreshing token
            try {
              const retryDetails = await fetchItemDetails(itemId);
              setItem(retryDetails);
              setError(null);
            } catch (retryErr) {
              // If retry fails, redirect to login
              router.push("/auth/login");
            }
          } catch {
            router.push("/auth/login");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (itemId) {
      loadItemDetails();
    }
    
    // Refresh token every 10 minutes
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 600000);
    
    return () => clearInterval(interval);
  }, [itemId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Get the user's email from localStorage or context
      const userEmail = localStorage.getItem("otpEmail");
      console.log(userEmail);
      
      // Send OTP to user's email
      const result = await sendPaymentOtp(itemId, userEmail);
      
      if (result.error) {
        setError(result.error);
        setIsProcessing(false);
        return;
      }
      
      // If OTP was sent successfully, redirect to verification page
      router.push(`/item/${itemId}/payments/verify`);
    } catch (err) {
      setError("Payment processing failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!item) {
    return <div className="text-center mt-10">Item not found</div>;
  }

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
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Complete Your Purchase</h1>
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Item Summary */}
            <div className="w-full md:w-1/3 bg-white p-6 shadow-lg rounded-lg">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Order Summary</h2>
              <div className="flex mb-4">
                <div className="w-24 h-24 relative overflow-hidden rounded-md mr-4">
                  <img
                    src={normalizeImageUrl((item.images && item.images.length > 0) ? 
                                    item.images.find(img => img.is_primary)?.image || item.images[0].image :
                                    "/default-item.png")}
                    alt={item.title}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{item.title}</h3>
                  <p className="text-gray-600 text-sm">Seller: {item.seller.username}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Price</span>
                  <span className="text-gray-800">${item.price}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Transaction Fee</span>
                  <span className="text-gray-800">${(parseFloat(item.price) * 0.05).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-blue-600">${(parseFloat(item.price) * 1.05).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Payment Form */}
            <div className="w-full md:w-2/3 bg-white p-6 shadow-lg rounded-lg">
              <h2 className="text-xl font-semibold text-gray-700 mb-6">Payment Method</h2>
              
              {/* Payment Method Selection */}
              <div className="mb-6">
                <div className="flex space-x-4 mb-6">
                  <button
                    type="button"
                    className={`px-4 py-2 border rounded-md flex-1 ${
                      paymentMethod === "credit" 
                        ? "bg-blue-50 border-blue-500 text-blue-700" 
                        : "border-gray-300 text-gray-700"
                    }`}
                    onClick={() => handlePaymentMethodChange("credit")}
                  >
                    Credit Card
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 border rounded-md flex-1 ${
                      paymentMethod === "crypto" 
                        ? "bg-blue-50 border-blue-500 text-blue-700" 
                        : "border-gray-300 text-gray-700"
                    }`}
                    onClick={() => handlePaymentMethodChange("crypto")}
                  >
                    Cryptocurrency
                  </button>
                </div>
              </div>
              
              {paymentMethod === "credit" ? (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="block text-gray-700 text-sm font-medium mb-1">Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        placeholder="Name on card"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">Expiry Date</label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">CVV</label>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          placeholder="•••"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-gray-700 text-sm font-medium mb-1">Billing Address</label>
                      <input
                        type="text"
                        name="billingAddress"
                        value={formData.billingAddress}
                        onChange={handleInputChange}
                        placeholder="Street address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">State</label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="State"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 text-sm font-medium mb-1">ZIP Code</label>
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleInputChange}
                          placeholder="Zip code"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        `Pay $${(parseFloat(item.price) * 1.05).toFixed(2)}`
                      )}
                    </button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      You will receive an OTP on your email to confirm payment
                    </p>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
                    <h3 className="font-medium text-gray-800 mb-2">Pay with Cryptocurrency</h3>
                    <p className="text-gray-600 mb-4">Send the exact amount to the wallet address below:</p>
                    
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-1">Amount</p>
                      <p className="font-mono text-gray-700 font-medium">0.023 BTC (${(parseFloat(item.price) * 1.05).toFixed(2)} USD)</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Wallet Address</p>
                      <div className="bg-white p-3 rounded border border-gray-300">
                        <p className="font-mono text-xs sm:text-sm break-all">1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <div className="w-40 h-40 mx-auto bg-gray-200 rounded flex items-center justify-center">
                        {/* Placeholder for QR code */}
                        <span className="text-gray-500 text-sm">QR Code</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                  <button
                    type="button"
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                    onClick={async () => {
                        setIsProcessing(true);
                        try {
                        // Get the user's email from localStorage or context
                        const userEmail = localStorage.getItem("otpEmail");
                        
                        // Send OTP to user's email
                        const result = await sendPaymentOtp(itemId, userEmail);
                        
                        if (result.error) {
                            setError(result.error);
                            setIsProcessing(false);
                            return;
                        }
                        
                        // If OTP was sent successfully, redirect to verification page
                        router.push(`/item/${itemId}/payments/verify`);
                        } catch (err) {
                        setError("Failed to send verification code. Please try again.");
                        setIsProcessing(false);
                        }
                    }}
                    disabled={isProcessing}
                    >
                    {isProcessing ? (
                        <div className="flex items-center justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Processing...
                        </div>
                    ) : (
                        "I've Sent the Payment"
                    )}
                    </button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      You will receive an OTP on your email to confirm payment
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}