"use client";

import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useState, useEffect } from "react";
import { fetchUsers } from "@/lib/api";
import { refreshAccessToken } from "../api";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<{ id: string, name: string, isGroup: boolean } | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Set isClient to true once component is mounted in the browser
    setIsClient(true);
    
    // Verify tokens exist and redirect if missing
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    
    if (!token || !refreshToken) {
      router.push("/auth/login");
      return;
    }
    
    // Get user information
    const storedUsername = typeof window !== 'undefined' ? localStorage.getItem("username") : null;
    
    if (storedUsername) {
      // Use fetchUsers to get full user details and find the full name
      fetchUsers()
        .then((usersData) => {
          const userObj = usersData.find((user: any) => user.username === storedUsername);
          if (userObj && userObj.name) {
            setLoggedInUser(userObj.name);
          } else {
            setLoggedInUser(storedUsername);
          }
        })
        .catch(async (err) => {
          console.error("Error fetching user details:", err);
          
          // Handle 401 unauthorized errors with token refresh
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
          if (errorMessage.includes('401')) {
            try {
              await refreshAccessToken();
              // Retry the fetch operation after refreshing the token
              const usersData = await fetchUsers();
              const userObj = usersData.find((user: any) => user.username === storedUsername);
              if (userObj && userObj.name) {
                setLoggedInUser(userObj.name);
              } else {
                setLoggedInUser(storedUsername);
              }
            } catch (refreshError) {
              console.error("Failed to refresh token:", refreshError);
              router.push("/auth/login");
            }
          }
        });
    }
    
    // Set up token refresh interval
    const interval = setInterval(async () => {
      try {
        await refreshAccessToken(); 
      } catch (error) {
        console.error("Failed to refresh access token:", error);
        router.push("/auth/login");
      }
    }, 600000); // 10 minutes
    
    return () => clearInterval(interval);
  }, [router]);

  const handleSelectChat = (chatId: string, chatName: string, isGroup: boolean) => {
    setSelectedChat({ id: chatId, name: chatName, isGroup });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white text-gray-800 px-6 py-3 flex justify-between items-center shadow-lg border-b border-gray-300">
        <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
          onClick={() => router.push("/")}
        >
          Home
        </button>
      </div>

      {/* Main Chat Layout */}
      <div className="flex flex-1 overflow-hidden">
        {isClient ? (
          <>
            <ChatSidebar onSelectChat={handleSelectChat} />
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <ChatWindow
                  chatId={selectedChat.id}
                  chatName={selectedChat.name}
                  isGroup={selectedChat.isGroup}
                />
              ) : (
                <div className="flex justify-center items-center h-full text-gray-500">
                  Select a chat to start messaging
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex justify-center items-center">
            <p>Loading chat application...</p>
          </div>
        )}
      </div>
    </div>
  );
}