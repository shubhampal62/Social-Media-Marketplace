"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchMarketplaceItems,refreshAccessToken } from "../api";
import { useRouter } from "next/navigation";


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
  category?: number;
  category_name?: string;
  seller: {
    id: number;
    username: string;
    email: string;
    profile_picture?: string;
  };
  primary_image?: ItemImage | null;
  status?: string;
  slug?: string;
}

export default function Marketplace() {
  const [items, setItems] = useState<Item[]>([]); 
  const [searchQuery, setSearchQuery] = useState<string>(""); 
  const [currentPage, setCurrentPage] = useState<number>(1); 
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!token || !refreshToken) {
      router.push("/auth/login");
      return;
    }
    const getItems = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetchMarketplaceItems(searchQuery, currentPage);
        console.log(response);

        // Directly use the response array if it exists
        if (Array.isArray(response)) {
          setItems(response);
          setTotalPages(1); // Adjust if pagination info is different
        } else if (response.results) {
          // If response has a results property
          setItems(response.results);
          setTotalPages(response.total_pages || 1);
        } else {
          // Fallback if response structure is unexpected
          setError("Unexpected response format");
          setItems([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setItems([]);
        if (errorMessage.includes('401')) {
          try {
            await refreshAccessToken();
            // Optionally, retry the fetch
          } catch {
            router.push("/auth/login");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    getItems();
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 600000);
    return () => clearInterval(interval);
  }, [searchQuery, currentPage, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); 
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white w-full shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between py-4 px-1">
          <h1 className="text-xl font-semibold text-gray-800">MarketPlace</h1>
          <div className="space-x-6 text-gray-600">
            <Link href="/marketplace/sell-item" className="hover:text-blue-600 transition">Sell Item</Link>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Home</Link>
          </div>
        </div>
      </nav>

      {/* Error Handling */}
      {error && (
        <div className="max-w-5xl mx-auto mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-5xl mx-auto py-4">
        <div className="max-w-md mx-1 py-4 flex justify-start">
          <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded p-2 w-full"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-5xl mx-auto py-4">
        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-center">No items found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <Link 
                key={item.id} 
                href={`/item/${item.id}`} 
                className="block"
              >
                <div className="bg-white shadow-lg p-4 rounded-lg hover:shadow-xl transition cursor-pointer">
                  <img 
                    src={item.primary_image?.image || "/default-item.png"} 
                    alt={item.title} 
                    className="w-full h-40 object-cover rounded" 
                  />
                  <h3 className="text-lg font-semibold mt-2">{item.title}</h3>
                  <p className="text-gray-500">{item.category_name || 'Unknown Category'}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-blue-600 font-bold">${item.price}</p>
                    {item.status && (
                      <span 
                        className={`px-2 py-1 rounded text-xs ${
                          item.status === 'sold' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && items.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded ${
                currentPage === 1 
                  ? "bg-gray-300 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Previous
            </button>

            <p className="text-gray-700">Page {currentPage} of {totalPages}</p>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded ${
                currentPage === totalPages 
                  ? "bg-gray-300 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}