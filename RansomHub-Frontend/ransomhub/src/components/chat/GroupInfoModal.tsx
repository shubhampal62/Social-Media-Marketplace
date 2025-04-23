
// "use client";
// import { useState } from "react";

// interface User {
//   id: string;
//   name: string;
//   username: string;
// }

// interface Chat {
//   id: string;
//   name: string;
//   lastMessage: string;
//   unread: number;
//   isGroup: boolean;
//   members?: User[];
// }

// interface GroupInfoModalProps {
//   group: Chat;
//   allUsers: User[];
//   onClose: () => void;
//   onAddMembers: (members: User[]) => void;
// }

// const MAX_GROUP_MEMBERS = 20;

// export default function GroupInfoModal({ group, allUsers, onClose, onAddMembers }: GroupInfoModalProps) {
//   const [showAddMembersSection, setShowAddMembersSection] = useState(false);
//   const [selectedNewMembers, setSelectedNewMembers] = useState<User[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [error, setError] = useState("");
//   const [isAdding, setIsAdding] = useState(false);

//   // Filter out users who are already members of the group
//   const existingMemberIds = new Set(group.members?.map(member => member.id) || []);
//   const availableUsers = allUsers.filter(user => !existingMemberIds.has(user.id));
  
//   const filteredAvailableUsers = searchQuery 
//     ? availableUsers.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
//     : availableUsers;

//   const handleToggleUser = (user: User) => {
//     if (selectedNewMembers.some(member => member.id === user.id)) {
//       setSelectedNewMembers(selectedNewMembers.filter(member => member.id !== user.id));
//     } else {
//       const currentMemberCount = group.members?.length || 0;
//       if (currentMemberCount + selectedNewMembers.length >= MAX_GROUP_MEMBERS) {
//         setError(`Maximum ${MAX_GROUP_MEMBERS} members allowed`);
//         return;
//       }
//       setSelectedNewMembers([...selectedNewMembers, user]);
//       setError("");
//     }
//   };

//   const handleAddMembers = async () => {
//     if (selectedNewMembers.length === 0) {
//       setError("Please select at least one member");
//       return;
//     }

//     setIsAdding(true);
//     try {
//       await onAddMembers(selectedNewMembers);
//       setSelectedNewMembers([]);
//       setShowAddMembersSection(false);
//       setError("");
//     } catch (error) {
//       setError("Failed to add members. Please try again.");
//     } finally {
//       setIsAdding(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
//       <div className="bg-white rounded-lg w-96 max-w-full max-h-[90vh] flex flex-col">
//         <div className="p-4 border-b">
//           <h2 className="text-xl font-bold text-black">{group.name}</h2>
//           <p className="text-sm text-gray-500">
//             {group.members?.length || 0} of {MAX_GROUP_MEMBERS} members
//           </p>
//         </div>
        
//         <div className="flex-1 overflow-y-auto">
//           {/* Current Members Section */}
//           <div className="p-4 border-b">
//             <h3 className="font-semibold mb-2 text-black">Group Members ({group.members?.length || 0})</h3>
//             <ul className="space-y-1">
//               {group.members?.map(member => (
//                 <li key={member.id} className="p-2 text-black">
//                   {member.name} (@{member.username})
//                 </li>
//               ))}
//             </ul>
//           </div>
          
//           {/* Add Members Section */}
//           {!showAddMembersSection ? (
//             <div className="p-4">
//               <button 
//                 className={`bg-blue-500 text-white px-4 py-2 rounded w-full ${
//                   (group.members?.length || 0) >= MAX_GROUP_MEMBERS ? 'opacity-50 cursor-not-allowed' : ''
//                 }`}
//                 onClick={() => setShowAddMembersSection(true)}
//                 disabled={(group.members?.length || 0) >= MAX_GROUP_MEMBERS}
//               >
//                 {(group.members?.length || 0) >= MAX_GROUP_MEMBERS ? 
//                   'Group is full' : 'Add Members'}
//               </button>
//               {(group.members?.length || 0) >= MAX_GROUP_MEMBERS && (
//                 <p className="text-sm text-gray-500 mt-2">
//                   Maximum {MAX_GROUP_MEMBERS} members reached
//                 </p>
//               )}
//             </div>
//           ) : (
//             <div className="p-4 border-t text-black">
//               <h3 className="font-semibold mb-2 text-black">Add New Members</h3>
              
//               <input
//                 type="text"
//                 placeholder="Search users..."
//                 className="w-full p-2 mb-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
              
//               {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
//               <p className="text-sm text-gray-500 mb-2">
//                 Current: {group.members?.length || 0}, Adding: {selectedNewMembers.length} (Max: {MAX_GROUP_MEMBERS})
//               </p>
              
//               {availableUsers.length === 0 ? (
//                 <p className="text-gray-500 italic">No more users available to add</p>
//               ) : (
//                 <>
//                   <ul className="space-y-2 max-h-40 overflow-y-auto">
//                     {filteredAvailableUsers.map(user => (
//                       <li key={user.id} className="flex items-center">
//                         <input
//                           type="checkbox"
//                           id={`add-user-${user.id}`}
//                           checked={selectedNewMembers.some(member => member.id === user.id)}
//                           onChange={() => handleToggleUser(user)}
//                           className="mr-2"
//                           disabled={
//                             (group.members?.length || 0) + selectedNewMembers.length >= MAX_GROUP_MEMBERS &&
//                             !selectedNewMembers.some(member => member.id === user.id)
//                           }
//                         />
//                         <label htmlFor={`add-user-${user.id}`}>
//                           {user.name} (@{user.username})
//                         </label>
//                       </li>
//                     ))}
//                   </ul>
                  
//                   <div className="mt-4 flex space-x-2">
//                     <button 
//                       className="bg-gray-300 px-3 py-1 rounded"
//                       onClick={() => {
//                         setShowAddMembersSection(false);
//                         setSelectedNewMembers([]);
//                         setError("");
//                       }}
//                       disabled={isAdding}
//                     >
//                       Cancel
//                     </button>
//                     <button 
//                       className={`px-3 py-1 rounded ${selectedNewMembers.length > 0 
//                         ? 'bg-green-500 text-white' 
//                         : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
//                       onClick={handleAddMembers}
//                       disabled={selectedNewMembers.length === 0 || isAdding}
//                     >
//                       {isAdding ? 'Adding...' : 'Add Selected'}
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           )}
//         </div>
        
//         <div className="p-4 border-t text-black">
//           <button 
//             className="bg-gray-300 px-4 py-2 rounded w-full"
//             onClick={onClose}
//             disabled={isAdding}
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  username: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  unread: number;
  isGroup: boolean;
  members?: User[];
}

interface GroupInfoModalProps {
  group: Chat;
  allUsers: User[];
  onClose: () => void;
  onAddMembers: (members: User[]) => void;
}

const MAX_GROUP_MEMBERS = 20;

export default function GroupInfoModal({ group, allUsers, onClose, onAddMembers }: GroupInfoModalProps) {
  const [showAddMembersSection, setShowAddMembersSection] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState("");
    const [isAdding, setIsAdding] = useState(false);
  
    // Filter out users who are already members of the group
    const existingMemberIds = new Set(group.members?.map(member => member.id) || []);
    const availableUsers = allUsers.filter(user => !existingMemberIds.has(user.id));
    
    const filteredAvailableUsers = searchQuery 
      ? availableUsers.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : availableUsers;
  
    const handleToggleUser = (user: User) => {
      if (selectedNewMembers.some(member => member.id === user.id)) {
        setSelectedNewMembers(selectedNewMembers.filter(member => member.id !== user.id));
      } else {
        const currentMemberCount = group.members?.length || 0;
        if (currentMemberCount + selectedNewMembers.length >= MAX_GROUP_MEMBERS) {
          setError(`Maximum ${MAX_GROUP_MEMBERS} members allowed`);
          return;
        }
        setSelectedNewMembers([...selectedNewMembers, user]);
        setError("");
      }
    };
  
    const handleAddMembers = async () => {
      if (selectedNewMembers.length === 0) {
        setError("Please select at least one member");
        return;
      }
  
      setIsAdding(true);
      try {
        await onAddMembers(selectedNewMembers);
        setSelectedNewMembers([]);
        setShowAddMembersSection(false);
        setError("");
      } catch (error) {
        setError("Failed to add members. Please try again.");
      } finally {
        setIsAdding(false);
      }
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-96 max-w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-black">{group.name}</h2>
          <p className="text-sm text-gray-500">
            {group.members?.length || 0} of {MAX_GROUP_MEMBERS} members
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Current Members Section */}
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2 text-black">Group Members ({group.members?.length || 0})</h3>
            <ul className="space-y-1">
              {group.members?.map(member => (
                <li key={member.id} className="p-2 text-black">
                  {member.name} (@{member.username})
                </li>
              ))}
            </ul>
          </div>
          
          {/* Add Members Section */}
          {!showAddMembersSection ? (
            <div className="p-4">
              <button 
                className={`bg-blue-500 text-white px-4 py-2 rounded w-full ${
                  (group.members?.length || 0) >= MAX_GROUP_MEMBERS ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => setShowAddMembersSection(true)}
                disabled={(group.members?.length || 0) >= MAX_GROUP_MEMBERS}
              >
                {(group.members?.length || 0) >= MAX_GROUP_MEMBERS ? 
                  'Group is full' : 'Add Members'}
              </button>
              {(group.members?.length || 0) >= MAX_GROUP_MEMBERS && (
                <p className="text-sm text-gray-500 mt-2">
                  Maximum {MAX_GROUP_MEMBERS} members reached
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 border-t text-black">
              <h3 className="font-semibold mb-2 text-black">Add New Members</h3>
              
              <input
                type="text"
                placeholder="Search users..."
                className="w-full p-2 mb-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <p className="text-sm text-gray-500 mb-2">
                Current: {group.members?.length || 0}, Adding: {selectedNewMembers.length} (Max: {MAX_GROUP_MEMBERS})
              </p>
              
              {availableUsers.length === 0 ? (
                <p className="text-gray-500 italic">No more users available to add</p>
              ) : (
                <>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {filteredAvailableUsers.map(user => (
                      <li key={user.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`add-user-${user.id}`}
                          checked={selectedNewMembers.some(member => member.id === user.id)}
                          onChange={() => handleToggleUser(user)}
                          className="mr-2"
                          disabled={
                            (group.members?.length || 0) + selectedNewMembers.length >= MAX_GROUP_MEMBERS &&
                            !selectedNewMembers.some(member => member.id === user.id)
                          }
                        />
                        <label htmlFor={`add-user-${user.id}`}>
                          {user.name} (@{user.username})
                        </label>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-4 flex space-x-2">
                    <button 
                      className="bg-gray-300 px-3 py-1 rounded"
                      onClick={() => {
                        setShowAddMembersSection(false);
                        setSelectedNewMembers([]);
                        setError("");
                      }}
                      disabled={isAdding}
                    >
                      Cancel
                    </button>
                    <button 
                      className={`px-3 py-1 rounded ${selectedNewMembers.length > 0 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                      onClick={handleAddMembers}
                      disabled={selectedNewMembers.length === 0 || isAdding}
                    >
                      {isAdding ? 'Adding...' : 'Add Selected'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t text-black">
          <button 
            className="bg-gray-300 px-4 py-2 rounded w-full"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}