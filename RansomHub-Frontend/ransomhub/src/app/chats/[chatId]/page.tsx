"use client";
import ChatWindow from "@/components/chat/ChatWindow";
import { useParams } from "next/navigation";

export default function ChatDetailPage() {
  const { chatId } = useParams();

  // Ensure chatId is a string
  if (typeof chatId !== 'string') {
    return <div>Error: Invalid chat ID</div>; // Handle the error case
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatWindow chatId={chatId} chatName={chatId} isGroup={false} />
    </div>
  );
}
