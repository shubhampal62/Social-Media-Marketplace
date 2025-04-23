import { group } from "console";
import { convertBase64toUint8Array, decryptWithAESGCM, encryptWithAESGCM, getCSRFTokenFromCookie, openKeyDatabase } from "../app/api"

// const API_URL = 'http://127.0.0.1:8000/api/'
const API_URL = "https://192.168.2.233/api/";
export const fetchUsers = async () => {
  try {
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    if (!token) return { error: "User is not authenticated." };
    const response = await fetch(`${API_URL}users/get_users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      credentials: "include"
    });
    if (!response.ok) {
      console.error("error:", response.json())
      throw new Error('Failed to fetch users');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const createGroup = async (groupName: string, members: string[]) => {
  try {
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    if (!token) return { error: "User is not authenticated." };
    const response = await fetch(`${API_URL}chat/create_group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({
        name: groupName,
        members: members
      }),
      credentials: "include"

    });

    if (!response.ok) {
      throw new Error('Failed to create group');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};
export const fetchGroups = async (username: string | null) => {
  try {
    // console.log("username:", username);
    if (!username) {
      return []
    }
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    if (!token) return { error: "User is not authenticated." };
    const response = await fetch(`${API_URL}chat/get_groups?user=${username}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error('Failed to fetch groups');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
};

const get_peer_public_key = async (peer_username: string) => {
  try {
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    const response = await fetch(`${API_URL}chat/get_user_public_key?username=${peer_username}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
    });
    // console.log("Response status:", response);
    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("API error:", errorDetails);
      throw new Error(`Failed to fetch public key: ${errorDetails}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

const retrievePrivateKey = async (username: string) => {

  try {
    const base64PrivateKey = sessionStorage.getItem(`${username}_private_key`)
    const privateKeyRaw = convertBase64toUint8Array(base64PrivateKey);

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyRaw,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveBits"]
    )

    return privateKey;
  } catch (error) {
    console.log("Error in Retrieve Private Key: ", error, username);
    throw error;
  }
}

const ecdhKeyExchange = async (username: string, publicKeyBase64: string) => {
  try {
    // Retrieve the stored private key
    const privateKey = await retrievePrivateKey(username);

    // Decode the base64-encoded public key
    const publicKeyBinaryString = atob(publicKeyBase64);
    const publicKeyBuffer = new Uint8Array(publicKeyBinaryString.length);
    for (let i = 0; i < publicKeyBinaryString.length; i++) {
      publicKeyBuffer[i] = publicKeyBinaryString.charCodeAt(i);
    }

    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer.buffer,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );

    // Perform ECDH key exchange
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: publicKey
      },
      privateKey,
      256
    );

    const derivedKey = await crypto.subtle.importKey(
      "raw",
      sharedSecret,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

    // console.log("Derived Shared Secret:", btoa(String.fromCharCode(...new Uint8Array(sharedSecret))));
    return derivedKey;
  } catch (error) {
    console.error("Error during ECDH key exchange:", error);
  }
};

const encryptMessage = async (sender: string, recipient: string, message: string) => {
  const peer_public_key = await get_peer_public_key(recipient);

  const sharedSecret = await ecdhKeyExchange(sender, peer_public_key.public_key);
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  const encryptedMessageRaw = await encryptWithAESGCM(sharedSecret, encodedMessage, iv);

  const encryptedMessage = btoa(String.fromCharCode(...new Uint8Array(encryptedMessageRaw)));
  const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));

  return { encryptedMessage, ivBase64 };
};

export const decryptMessage = async (username: string, sender: string, encryptedMessageBase64: string, ivBase64: string) => {
  try {
    const peer_public_key = await get_peer_public_key(sender);
    const sharedSecret = await ecdhKeyExchange(username, peer_public_key.public_key);

    const ivBytes = convertBase64toUint8Array(ivBase64);
    const encryptedMessageRaw = convertBase64toUint8Array(encryptedMessageBase64);

    const decryptedMessageRaw = await decryptWithAESGCM(sharedSecret, encryptedMessageRaw, ivBytes);
    const decodedMessage = new TextDecoder().decode(decryptedMessageRaw);

    return decodedMessage;
  } catch (error) {
    console.log("Error in decrypt message: ", error);
    throw (error);
  }
};


export const sendMessage = async (sender: string, recipient: string, message: string) => {
  try {

    const { encryptedMessage, ivBase64 } = await encryptMessage(sender, recipient, message);

    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    const response = await fetch(`${API_URL}chat/send_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        sender: sender,
        recipient: recipient,
        message: encryptedMessage,
        iv: ivBase64,
      }),

    });
    // console.log("Response status:", response);
    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("API error:", errorDetails);
      throw new Error("Failed to send message");
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

const encryptGroupMessage = async (sender: string, group: string, message: string) => {
  const groupMembers = await fetchGroups(sender);
  const groupMemberUsernames = groupMembers.find((g: any) => g.username === group)?.members || [];
  const groupMemberKeys = await Promise.all(
    groupMemberUsernames.map(async (member: string) => {
      const peer_public_key = await get_peer_public_key(member);
      return { username: member, publicKey: peer_public_key.public_key };
    })
  );
  const sharedSecretPromises = groupMemberKeys.map((member: any) =>
    ecdhKeyExchange(sender, member.publicKey)
  );
  const sharedSecrets = await Promise.all(sharedSecretPromises);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  const encryptedMessages = await Promise.all(
    sharedSecrets.map((sharedSecret: any) =>
      encryptWithAESGCM(sharedSecret, encodedMessage, iv)
    )
  );
  const encryptedMessagesBase64 = encryptedMessages.map((encryptedMessage: any) =>
    btoa(String.fromCharCode(...new Uint8Array(encryptedMessage)))
  );
  const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
  return { encryptedMessagesBase64, ivBase64 };
};

export const decryptGroupMessage = async (username: string, sender: string, encryptedMessagesBase64: string[], ivBase64: string) => {
  try {
    const groupMembers = await fetchGroups(username);
    const groupMemberUsernames = groupMembers.find((g: any) => g.username === sender)?.members || [];

    const groupMemberKeys = await Promise.all(
      groupMemberUsernames.map(async (member: string) => {
        const peer_public_key = await get_peer_public_key(member);
        return { username: member, publicKey: peer_public_key.public_key };
      })
    );
    const sharedSecretPromises = groupMemberKeys.map((member: any) =>
      ecdhKeyExchange(username, member.publicKey)
    );
    const sharedSecrets = await Promise.all(sharedSecretPromises);
    const ivBytes = convertBase64toUint8Array(ivBase64);
    const encryptedMessagesRaw = encryptedMessagesBase64.map((encryptedMessageBase64: string) =>
      convertBase64toUint8Array(encryptedMessageBase64)
    );
    const decryptedMessages = await Promise.all(
      encryptedMessagesRaw.map((encryptedMessageRaw: any, index: number) =>
        decryptWithAESGCM(sharedSecrets[index], encryptedMessageRaw, ivBytes)
      )
    );
    const decodedMessages = decryptedMessages.map((decryptedMessage: any) =>
      new TextDecoder().decode(decryptedMessage)
    );
    return decodedMessages;
  } catch (error) {
    console.log("Error in decrypt group message: ", error);
    throw error;
  }
};

export const sendGroupMessage = async (sender: string, group: string, message: string) => {
  try {
    // console.log("Sender in api:", sender);
    // console.log("group:", group);
    // console.log("Message:", message);
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();

    const { encryptedMessagesBase64, ivBase64 } = await encryptGroupMessage(sender, group, message);

    const response = await fetch(`${API_URL}chat/send_group_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({
        sender: sender,
        group: group,
        message: message,
      }),
      credentials: "include",
    });
    // console.log("Response status:", response);
    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("API error:", errorDetails);
      throw new Error("Failed to send message");
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};
export const addGroupMembers = async (groupUsername: string, memberUsernames: string[]) => {
  try {
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    const response = await fetch(`${API_URL}chat/add_group_members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({
        group_username: groupUsername,
        members_usernames: memberUsernames,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to add group members");
    }

    return await response.json();
  } catch (error) {
    console.error("API error adding group members:", error);
    throw error;
  }
};

export const sendFile = async (sender: string, recipient: string, file: string, fileName: string, fileType: string) => {
  try {

    // const {encryptedMessage, ivBase64} = await encryptMessage(sender, recipient, file);
    const ivBase64 = crypto.getRandomValues(new Uint8Array(16));

    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    const response = await fetch(`${API_URL}chat/send_file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        sender: sender,
        recipient: recipient,
        file: file,
        file_name: fileName,
        file_type: fileType,
        iv: ivBase64, // You might want to add encryption for files too
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("API error:", errorDetails);
      throw new Error("Failed to send file");
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending file:", error);
    throw error;
  }
};

export const sendGroupFile = async (sender: string, group: string, file: string, fileName: string, fileType: string) => {
  try {
    const token = localStorage.getItem("access_token");
    const csrfToken = getCSRFTokenFromCookie();
    const response = await fetch(`${API_URL}chat/send_group_file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        sender: sender,
        group: group,
        file: file,
        file_name: fileName,
        file_type: fileType,
        iv: "", // You might want to add encryption for files too
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("API error:", errorDetails);
      throw new Error("Failed to send file");
    }
    return await response.json();
  } catch (error) {
    console.error("Error sending file:", error);
    throw error;
  }
};