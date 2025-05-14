
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "../types";
import { CACHE } from "./cacheUtils";

// Simulate some users with RFID cards
const simulatedUsers: Record<string, User> = {
  "12345678": { id: "user1", name: "John Doe", cardUID: "12345678", department: "IT" },
  "87654321": { id: "user2", name: "Jane Smith", cardUID: "87654321", department: "HR" },
  "11223344": { id: "user3", name: "Mike Johnson", cardUID: "11223344", department: "Finance" },
};

// Load users into cache immediately
Object.values(simulatedUsers).forEach(user => {
  CACHE.users[user.cardUID] = user;
});

export async function getUserByCardUID(cardUID: string): Promise<User | null> {
  // Direct cache lookup without async overhead
  return CACHE.users[cardUID] || null;
}

export async function registerNewUser(userData: { 
  name: string; 
  cardUID: string; 
  department?: string; 
}): Promise<{ success: boolean; message: string }> {
  try {
    // Check for duplicate card directly from cache
    if (CACHE.users[userData.cardUID]) {
      return { 
        success: false, 
        message: "This RFID card is already registered to another user."
      };
    }
    
    // Generate a unique ID for the user
    const userId = `user${Object.keys(simulatedUsers).length + 1}`;
    
    // Create user object
    const newUser: User = {
      id: userId,
      name: userData.name,
      cardUID: userData.cardUID,
      department: userData.department,
    };
    
    // Update both the simulation object and cache
    simulatedUsers[userData.cardUID] = newUser;
    CACHE.users[userData.cardUID] = newUser;
    
    // Also save to Firebase to ensure persistence
    try {
      await setDoc(doc(db, "users", userId), newUser);
      console.log("User registered and saved to Firebase:", newUser);
    } catch (e) {
      console.error("Failed to save user to Firebase:", e);
      // Continue execution since we still have it in memory
    }
    
    console.log("User registered successfully:", newUser);
    
    return { 
      success: true, 
      message: `User ${userData.name} registered successfully.`
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      success: false,
      message: "Failed to register user due to system error."
    };
  }
}
