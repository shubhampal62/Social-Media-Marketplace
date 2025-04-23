"use client";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <div className="p-2 border-b text-black">
      <input
        type="text"
        placeholder="Search chats..."
        className="w-full p-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={searchQuery}
        onChange={handleChange}
      />
    </div>
  );
}