"use client";
import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import NewGroupModal from "./NewGroupModal";
import GroupInfoModal from "./GroupInfoModal";
import { fetchUsers, fetchGroups } from "@/lib/api";
import { addGroupMembers } from "@/lib/api";

interface User {
  id: string;
  name: string;
  username: string;
  profileImage?: string; // Add profileImage field
}

interface Group {
  name: string;
  username: string;
  members: string[];
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
  isGroup: boolean;
  members?: User[];
  profileImage?: string; // Add profileImage field for chats
}

interface ChatSidebarProps {
  onSelectChat: (chatId: string, chatName: string, isGroup: boolean) => void;
}

export default function ChatSidebar({ onSelectChat }: ChatSidebarProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedInUserName, setLoggedInUserName] = useState<string | null>(null);
  const [storedUsername, setStoredUsername] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null); // Add profileImage state

  // Safely get localStorage items on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const username = localStorage.getItem("username");
      setStoredUsername(username);
      
      // Fetch logged-in username and profile image from localStorage
      const loggedInUser = localStorage.getItem("username");
      const userProfileImage = localStorage.getItem("profileImage");
      
      if (loggedInUser) {
        setLoggedInUserName(loggedInUser);
      }
      
      if (userProfileImage) {
        setProfileImage(userProfileImage);
      } else {
        setProfileImage("/default-profile.png"); // Set default profile image
      }
    }
  }, []);

  useEffect(() => {
    // Only proceed with data loading if we have the username
    if (!storedUsername) return;
    
    const loadData = async () => {
      try {
        // Fetch users and groups in parallel
        const [usersData, groupsData] = await Promise.all([
          fetchUsers(),
          fetchGroups(storedUsername)
        ]);

        // Format users
        const formattedUsers = usersData.map((user: any) => ({
          id: user.username,
          name: user.name || user.username,
          username: user.username,
          profileImage: user.profileImage || "/default-profile.png" // Add profile image with default
        }));

        setUsers(formattedUsers);
        
        const currentUser = formattedUsers.find((user: User) => user.username === storedUsername);
        if (currentUser) {
          setLoggedInUserName(currentUser.name);
          setProfileImage(currentUser.profileImage); // Set current user's profile image
        }

        // Format groups
        setGroups(groupsData);

        // Create chats array
        const userChats = formattedUsers.map((user: User) => ({
          id: user.username,
          name: user.name,
          lastMessage: "Start a conversation",
          unread: 0,
          isGroup: false,
          profileImage: user.profileImage // Add profile image to chats
        }));

        const groupChats = groupsData.map((group: Group) => ({
          id: group.username,
          name: group.name,
          lastMessage: "Group chat",
          unread: 0,
          isGroup: true,
          members: formattedUsers.filter((user: User) =>
            group.members.includes(user.username)),
          profileImage: "/group-default.png" // Default group image
        }));

        const allChats = [...userChats, ...groupChats];
        setChats(allChats);
        setFilteredChats(allChats);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [storedUsername]);

  const handleSearch = (query: string) => {
    if (!query) {
      setFilteredChats(chats);
      return;
    }

    const filtered = chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredChats(filtered);
  };

  const handleCreateGroup = (groupName: string, selectedMembers: User[]) => {
    const newGroup: Chat = {
      id: `group-${Date.now()}`,
      name: groupName,
      lastMessage: "Group created",
      unread: 0,
      isGroup: true,
      members: selectedMembers,
      profileImage: "/group-default.png" // Default group image
    };

    const updatedChats = [...chats, newGroup];
    setChats(updatedChats);
    setFilteredChats(updatedChats);
    setShowNewGroupModal(false);

    window.location.reload();
  };

  const handleSelect = (chatId: string, chatName: string, isGroup: boolean) => {
    setSelectedChat(chatId);
    onSelectChat(chatId, chatName, isGroup);
  };

  const handleViewGroupInfo = (chat: Chat) => {
    setSelectedGroupInfo(chat);
    setShowGroupInfoModal(true);
  };

  const handleAddMembers = async (newMembers: User[]) => {
    if (selectedGroupInfo) {
      const memberUsernames = newMembers.map(m => m.username);
      try {
        await addGroupMembers(selectedGroupInfo.id, memberUsernames);
        const updatedGroup = {
          ...selectedGroupInfo,
          members: [...(selectedGroupInfo.members || []), ...newMembers],
        };
        setSelectedGroupInfo(updatedGroup);
      } catch (err) {
        console.error("Failed to add members to group:", err);
      }
      setShowGroupInfoModal(false);
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="w-1/4 bg-gray-200 border-r h-full overflow-y-auto flex flex-col">
        <div className="p-4 border-b bg-white">
          <h1 className="text-xl font-semibold text-gray-900">Chats</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/4 bg-gray-200 border-r h-full overflow-y-auto flex flex-col">
      {loggedInUserName && (
        <div className="p-4 flex items-center border-b bg-white">
          {/* Display profile image */}
          <img
            src={profileImage || "/default-profile.png"}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
          />
          <span className="text-gray-800 font-semibold ml-3">{loggedInUserName}</span>
        </div>
      )}
      
      <div className="p-2 border-b bg-white">
        <button
          className="w-full bg-green-500 text-white py-2 rounded-md font-medium"
          onClick={() => setShowNewGroupModal(true)}
        >
          Create New Group
        </button>
      </div>

      <SearchBar onSearch={handleSearch} />

      <ul className="flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <li
            key={chat.id}
            className={`p-3 flex justify-between cursor-pointer border-b hover:bg-gray-300 ${
              selectedChat === chat.id ? "bg-gray-400" : ""
            }`}
          >
            <div
              className="flex-1 flex items-center"
              onClick={() => handleSelect(chat.id, chat.name, chat.isGroup)}
            >
              {/* Chat avatar */}
              <img 
                src={chat.profileImage || (chat.isGroup ? "/group-default.png" : "/default-profile.png")}
                alt={chat.name}
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
              <div>
                <h2 className="font-semibold text-gray-900">{chat.name}</h2>
                <p className="text-sm text-gray-700">{chat.lastMessage}</p>
              </div>
            </div>

            <div className="flex items-center">
              {chat.unread > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mr-2">
                  {chat.unread}
                </span>
              )}

              {chat.isGroup && (
                <button
                  className="text-xs bg-blue-500 text-white p-1 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewGroupInfo(chat);
                  }}
                >
                  Info
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showNewGroupModal && (
        <NewGroupModal
          users={users}
          onClose={() => setShowNewGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {showGroupInfoModal && selectedGroupInfo && (
        <GroupInfoModal
          group={selectedGroupInfo}
          allUsers={users}
          onClose={() => setShowGroupInfoModal(false)}
          onAddMembers={handleAddMembers}
        />
      )}
    </div>
  );
}