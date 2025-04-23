// // "use client";
// // import { useState, KeyboardEvent } from "react";
// // import { sendMessage } from "../../lib/api";

// // export default function MessageInput({ onSend, chatName, loggedInUser }: { onSend: (message: string) => void, chatName: string, loggedInUser: string }) {
// //   const [message, setMessage] = useState("");

// //   const handleSend = async () => {
// //     if (message.trim()) {
// //       // Call the parent handler to update UI
// //       onSend(message);

// //       setMessage(""); // Reset message input
// //     }
// //   };

// //   const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
// //     if (e.key === "Enter" && !e.shiftKey) {
// //       e.preventDefault();
// //       handleSend();
// //     }
// //   };

// //   return (
// //     <div className="p-4 border-t flex bg-white items-center">
// //       <input
// //         type="text"
// //         className="flex-1 p-2 border rounded-md focus:outline-none text-gray-800"
// //         placeholder="Type a message..."
// //         value={message}
// //         onChange={(e) => setMessage(e.target.value)}
// //         onKeyDown={handleKeyDown}
// //       />
// //       <button className="ml-2 bg-green-500 text-white px-4 py-2 rounded-md" onClick={handleSend}>
// //         Send
// //       </button>
// //     </div>
// //   );
// // }




// "use client";
// import { useState, KeyboardEvent, useRef, ChangeEvent } from "react";
// import { sendMessage, sendFile } from "../../lib/api";

// export default function MessageInput({ onSend, chatName, loggedInUser, isGroup }: {
//     onSend: (message: string) => void,
//     chatName: string,
//     loggedInUser: string,
//     isGroup?: boolean
// }) {
//     const [message, setMessage] = useState("");
//     const fileInputRef = useRef<HTMLInputElement>(null);

//     const handleSend = async () => {
//         if (message.trim()) {
//             onSend(message);
//             setMessage("");
//         }
//     };

//     const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === "Enter" && !e.shiftKey) {
//             e.preventDefault();
//             handleSend();
//         }
//     };

//     const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files && e.target.files[0]) {
//             const file = e.target.files[0];
//             const reader = new FileReader();

//             reader.onload = async (event) => {
//                 if (event.target?.result) {
//                     const base64String = event.target.result.toString().split(',')[1];
//                     try {
//                         if (isGroup) {
//                             await sendGroupFile(loggedInUser, chatName, base64String, file.name, file.type);
//                         } else {
//                             await sendFile(loggedInUser, chatName, base64String, file.name, file.type);
//                         }
//                         // You might want to add a visual indicator that the file was sent
//                     } catch (error) {
//                         console.error("Error sending file:", error);
//                     }
//                 }
//             };

//             reader.readAsDataURL(file);
//         }
//     };

//     const triggerFileInput = () => {
//         fileInputRef.current?.click();
//     };

//     return (
//         <div className="p-4 border-t flex bg-white items-center">
//             <button
//                 onClick={triggerFileInput}
//                 className="mr-2 p-2 rounded-full hover:bg-gray-200"
//                 title="Attach file"
//             >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
//                 </svg>
//             </button>
//             <input
//                 type="file"
//                 ref={fileInputRef}
//                 onChange={handleFileChange}
//                 className="hidden"
//                 accept="image/*,video/*,.pdf,.doc,.docx,.txt"
//             />
//             <input
//                 type="text"
//                 className="flex-1 p-2 border rounded-md focus:outline-none text-gray-800"
//                 placeholder="Type a message..."
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyDown={handleKeyDown}
//             />
//             <button className="ml-2 bg-green-500 text-white px-4 py-2 rounded-md" onClick={handleSend}>
//                 Send
//             </button>
//         </div>
//     );
// }








"use client";
import { useState, KeyboardEvent, useRef, ChangeEvent } from "react";
import { sendFile, sendGroupFile } from "../../lib/api";

interface FileMessage {
    sender: string;
    text: string;
    isMe: boolean;
    type: string;
    file?: string;
    filename?: string;
    fileType?: string;
    timestamp?: string;
    group?: string;
}

export default function MessageInput({
    onSend,
    chatName,
    loggedInUser,
    isGroup,
    onFileSend
}: {
    onSend: (message: string) => void,
    chatName: string,
    loggedInUser: string,
    isGroup?: boolean,
    onFileSend: (fileMessage: FileMessage) => void
}) {
    const [message, setMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = async () => {
        if (message.trim()) {
            onSend(message);
            setMessage("");
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                if (event.target?.result) {
                    const base64String = event.target.result.toString().split(',')[1];

                    // Create temporary message for UI
                    const tempFileMessage: FileMessage = {
                        sender: loggedInUser,
                        text: `File: ${file.name}`,
                        isMe: true,
                        type: 'file',
                        file: base64String,
                        filename: file.name,
                        fileType: file.type,
                        timestamp: new Date().toISOString(),
                        ...(isGroup && { group: chatName })
                    };

                    // Show file in chat immediately
                    onFileSend(tempFileMessage);

                    try {
                        if (isGroup) {
                            await sendGroupFile(loggedInUser, chatName, base64String, file.name, file.type);
                        } else {
                            await sendFile(loggedInUser, chatName, base64String, file.name, file.type);
                        }
                    } catch (error) {
                        console.error("Error sending file:", error);
                        // You might want to show an error message in the UI
                    }
                }
            };

            reader.readAsDataURL(file);
            // Reset file input to allow selecting the same file again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="p-4 border-t flex bg-white items-center">
            <button
                onClick={triggerFileInput}
                className="mr-2 p-2 rounded-full hover:bg-gray-200"
                title="Attach file"
                type="button"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            />
            <input
                type="text"
                className="flex-1 p-2 border rounded-md focus:outline-none text-gray-800"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button className="ml-2 bg-green-500 text-white px-4 py-2 rounded-md" onClick={handleSend}>
                Send
            </button>
        </div>
    );
}