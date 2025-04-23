"use client";
import Link from "next/link";
import { useState } from "react";

const dummyChats = [
  { id: "1", name: "Alice", lastMessage: "Hey!", isGroup: false },
  { id: "2", name: "Study Group", lastMessage: "Meeting at 5?", isGroup: true },
];

export default function ChatList() {
  const [chats, setChats] = useState(dummyChats);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Chats</h1>
      <ul>
        {chats.map((chat) => (
          <li key={chat.id} className="border-b py-2">
            <Link href={`/chats/${chat.id}`}>
              <div className="cursor-pointer flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">{chat.name}</h2>
                  <p className="text-sm text-gray-500">{chat.lastMessage}</p>
                </div>
                {chat.isGroup && <span className="text-xs bg-gray-200 px-2 rounded">Group</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}