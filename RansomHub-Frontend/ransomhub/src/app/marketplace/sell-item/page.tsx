"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCategories, createMarketplaceItem, refreshAccessToken } from "../../api";

// Define interface for category
interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function SellItem() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    brand: "",
    price: "",
    category: "",
    primary_image: null as File | null,
    status: "available"
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch categories on component mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!token || !refreshToken) {
      router.push("/auth/login");
      return;
    }
    const loadCategories = async () => {
      try {
      const fetchedCategories = await fetchCategories();
      setCategories(fetchedCategories);
      
      // Set default category if categories exist
      if (fetchedCategories.length > 0) {
        setForm(prev => ({ ...prev, category: fetchedCategories[0].id }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      
      // If unauthorized, attempt to refresh token
      if (errorMessage.includes('401')) {
        try {
          await refreshAccessToken();
          // Retry fetching categories
          const retryCategories = await fetchCategories();
          setCategories(retryCategories);
          
          if (retryCategories.length > 0) {
            setForm(prev => ({ ...prev, category: retryCategories[0].id }));
          }
        } catch {
          router.push("/auth/login");
        }
      }
    }
  };
  loadCategories();
  const interval = setInterval(() => {
    refreshAccessToken();
  }, 600000); // Every 10 minutes

  return () => clearInterval(interval);
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setForm(prev => ({ ...prev, primary_image: files[0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create FormData to match backend expectations
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('category', form.category);
      formData.append('status', form.status);
      
      // Add image - IMPORTANT: use 'images' as the key to match backend
      if (form.primary_image) {
        formData.append('images', form.primary_image);
        formData.append('primary_image_index', '0'); // Set this image as primary
      }

      // Call API to create item
      await createMarketplaceItem(formData);

      // Redirect to marketplace
      router.push("/marketplace");
    } catch (error) {
      console.error("Error listing item:", error);
      // Optionally, add error handling UI
      alert("Failed to list item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white w-full shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between py-4 px-1">
          <h1 className="text-xl font-semibold text-gray-800">MarketPlace</h1>
          <div className="space-x-6 text-gray-600">
            <Link href="/marketplace" className="hover:text-blue-600 transition">Buy Item</Link>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Home</Link>
          </div>
        </div>
      </nav>
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-lg">
          <h2 className="text-2xl font-bold mb-4">Sell an Item</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" 
              name="title" 
              placeholder="Product Name" 
              required 
              onChange={handleChange} 
              className="border w-full p-2 rounded" 
            />
            <input 
              type="text" 
              name="brand" 
              placeholder="Brand" 
              required 
              onChange={handleChange} 
              className="border w-full p-2 rounded" 
            />
            <textarea 
              name="description" 
              placeholder="Description" 
              required 
              onChange={handleChange} 
              className="border w-full p-2 rounded"
            ></textarea>
            <input 
              type="number" 
              name="price" 
              placeholder="Price ($)" 
              required 
              onChange={handleChange} 
              className="border w-full p-2 rounded" 
            />
            <select 
              name="category" 
              onChange={handleChange} 
              value={form.category}
              className="border w-full p-2 rounded"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input 
              type="file" 
              accept="image/*" 
              required 
              onChange={handleFileChange}
              className="border w-full p-2 rounded" 
            />
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full" 
              disabled={loading}
            >
              {loading ? "Listing..." : "List Item"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}