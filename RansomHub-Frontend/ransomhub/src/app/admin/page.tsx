"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiTrash2, FiUserCheck, FiEye } from "react-icons/fi";
import { MdBlock, MdCancel } from "react-icons/md";
import { useRouter } from "next/navigation";
import { fetchUsers, removeUser, toggleUserSuspension,refreshAccessToken, viewVerificationDocs, disapproveUser  } from "../api";

// Define User interface
interface User {
  id: number;
  first_name: string;
  email: string;
  phone: string;
  username: string;
  is_approved: boolean;
  is_suspended: boolean;
  verification_docs: string | File;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const router = useRouter();

  // Fetch users on component mount
  useEffect(() => {
  const token = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!token || !refreshToken) {
    router.push("/auth/login");
    return;
  }
    const loadUsers = async () => {
      try {
        const response = await fetchUsers();
        
        if (response.error) {
          setError(response.error);
        } else {
          setUsers(response as User[]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        if (errorMessage.includes('401')) {
          try {
            await refreshAccessToken();
            // Retry fetching users
            const retryResponse = await fetchUsers();
            
            if (retryResponse.error) {
              setError(retryResponse.error);
            } else {
              setUsers(retryResponse as User[]);
            }
          } catch {
            router.push("/auth/login");
          }
        } else {
          setError(errorMessage);
        }
        
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 600000); // Every 10 minutes

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [router]);

  // Function to remove user
  const handleRemoveUser = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (confirmed) {
      const response = await removeUser(id);
      
      if (response.error) {
        alert(response.error);
      } else {
        setUsers(users.filter(user => user.id !== id));
      }
    }
  };

  // Function to suspend/unsuspend user
  const handleToggleSuspendUser = async (id: number, currentSuspendStatus: boolean) => {
    const response = await toggleUserSuspension(id, currentSuspendStatus);
    
    if (response.error) {
      alert(response.error);
    } else {
      setUsers(users.map(user => 
        user.id === id ? { ...user, is_suspended: !currentSuspendStatus } : user
      ));
    }
  };
  const handleViewVerificationDocs = async (userId: number) => {
    try {
      const response = await viewVerificationDocs(userId);
      
      if (response.error) {
        alert(response.error);
      } else {
        // Assuming the response contains a URL or base64 string of the document
        setSelectedDocument(response.documentUrl);
        // console.log(response.documentUrl)
        
        // Open the document in a new window or modal
        if (response.documentUrl) {
          window.open(response.documentUrl, '_blank');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while viewing documents";
      alert(errorMessage);
    }
  };

  // Function to disapprove user
  const handleDisapproveUser = async (id: number, currentStatus: boolean) => {
    const confirmed = window.confirm(currentStatus 
      ? "Are you sure you want to disapprove this user?" 
      : "Are you sure you want to approve this user?"
    );
    if (confirmed) {
      try {
        const response = await disapproveUser(id);
        
        if (response.error) {
          alert(response.error);
        } else {
          
          setUsers(users.map(user => 
            user.id === id ? { ...user, is_approved: !currentStatus } : user
          ));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred while changing approval status";
        alert(errorMessage);
      }
    }
  };
  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading users...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          <div className="space-x-6 text-gray-600">
            <Link href="/admin/sales" className="hover:text-blue-500 transition">View Sales</Link>
            <Link href="/admin/logs" className="hover:text-blue-500 transition">View Logs</Link>
            <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">Home</Link>
          </div>
        </div>
      </nav>

      {/* User Table */}
      <div className="max-w-6xl mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">All Users</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Email</th>
                <th className="py-3 px-6 text-left">Phone</th>
                <th className="py-3 px-6 text-left">Username</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-medium">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">No users found</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100 transition">
                    <td className="py-3 px-6 flex items-center gap-2">
                      {user.first_name}
                      {user.is_approved && <FiUserCheck size={18} className="text-blue-500" />}
                    </td>
                    <td className="py-3 px-6">{user.email}</td>
                    <td className="py-3 px-6">{user.phone}</td>
                    <td className="py-3 px-6">@{user.username}</td>
                    <td className="py-3 px-6 text-center flex justify-center gap-4">
                    <button
                        onClick={() => handleViewVerificationDocs(user.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded-md flex items-center gap-2 hover:bg-blue-600 transition"
                        // disabled={!user.verification_docs}
                      >
                        <FiEye size={16} />
                        View
                      </button>

                      {/* Disapprove Button */}
                      {/* {user.is_approved && ( */}
                      {(
                        <button
                          onClick={() => handleDisapproveUser(user.id,user.is_approved)}
                          className="bg-red-500 text-white px-3 py-1 rounded-md flex items-center gap-2 hover:bg-red-600 transition"
                        >
                          {user.is_approved ? "Disapprove":"Approve"}
                        </button>
                      )}
                      {/* Suspend Button */}
                      <button
                        onClick={() => handleToggleSuspendUser(user.id, user.is_suspended)}
                        className={`px-3 py-1 rounded-md flex items-center gap-2 transition ${
                          user.is_suspended ? "bg-yellow-500 text-white hover:bg-yellow-600" : "bg-gray-500 text-white hover:bg-gray-600"
                        }`}
                      >
                        <MdBlock size={16} />
                        {user.is_suspended ? "Unsuspend" : "Suspend"}
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-md flex items-center gap-2 hover:bg-red-600 transition"
                      >
                        <FiTrash2 size={16} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}