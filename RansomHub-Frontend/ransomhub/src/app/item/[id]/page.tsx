"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchItemDetails, refreshAccessToken,normalizeImageUrl } from "../../api";

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

export default function ItemDetailPage() {
  const params = useParams();
  const itemId = params.id as string;
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
        console.log(itemDetails)
        setItem(itemDetails);
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
      {/* Navbar - Made consistent with Marketplace component */}
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
        <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="w-full md:w-1/2 p-6">
            <img
              src={normalizeImageUrl((item.images && item.images.length > 0) ? 
                item.images.find(img => img.is_primary)?.image || item.images[0].image :
                "/default-item.png")} 
              alt={item.title}
              width={500}
              height={500}
              className="w-full h-96 object-cover rounded-lg"
            />
            {/* Optional: Additional image gallery can be added here */}
          </div>

          {/* Item Details Section */}
          <div className="w-full md:w-1/2 p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{item.title}</h1>
            
            <div className="flex justify-between items-center mb-4">
              <p className="text-2xl font-bold text-blue-600">${item.price}</p>
              {item.status && (
                <span 
                  className={`px-3 py-1 rounded text-sm ${
                    item.status === 'sold' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {item.status}
                </span>
              )}
            </div>

            <div className="mb-4">
              <p className="text-gray-600">Category: {item.category_name || 'Uncategorized'}</p>
            </div>

            {item.description && (
              <div className="mb-6">
                <h2 className="text-xl text-gray-500 font-semibold mb-2">Description</h2>
                <p className="text-gray-700">{item.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl text-gray-500 font-semibold mb-2">Seller Information</h2>
              <div className="flex items-center">
                {item.seller.profile_picture && (
                  <Image 
                    src={item.seller.profile_picture} 
                    alt={item.seller.username}
                    width={50}
                    height={50}
                    className="text-gray-500 rounded-full mr-4"
                  />
                )}
                <div>
                  <p className="text-gray-500 font-medium">{item.seller.username}</p>
                  <p className="text-gray-500">{item.seller.email}</p>
                </div>
              </div>
            </div>

            {/* Single "Buy Now" button instead of the previous two buttons */}
            <div>
              {item.status !== 'sold'&&<button 
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-semibold w-full"
              onClick={() => router.push(`/item/${itemId}/payments`)}
            >
              Buy Now
            </button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}