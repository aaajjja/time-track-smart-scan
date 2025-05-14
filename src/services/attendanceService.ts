
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { User, TimeRecord, AttendanceAction, ScanResult } from "../types";
import { format } from "date-fns";

// Enhanced in-memory caching system
const CACHE = {
  // Cache users by cardUID for faster lookups
  users: {} as Record<string, User>,
  // Cache today's records by userId_date for faster lookups
  records: {} as Record<string, TimeRecord>,
  // Track last fetch time to implement cache invalidation
  lastFetch: 0
};

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

export async function getTodayRecord(userId: string): Promise<TimeRecord | null> {
  const today = format(new Date(), "yyyy-MM-dd");
  const cacheKey = `${userId}_${today}`;
  
  // Direct cache lookup without async overhead for improved performance
  return CACHE.records[cacheKey] || null;
}

export async function determineAction(userId: string, userName: string): Promise<ScanResult> {
  // Remove timing for better performance
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const formattedTime = format(now, "hh:mm a");
  const cacheKey = `${userId}_${today}`;
  
  try {
    // Get today's record with minimal overhead
    let record = CACHE.records[cacheKey] || null;
    
    if (!record) {
      // No record today, create new with Time In AM
      record = {
        userId,
        userName,
        date: today,
        timeInAM: formattedTime
      };
      
      // Update Firebase in the background without waiting
      setDoc(doc(db, "attendance", cacheKey), record)
        .catch(err => console.error("Background Firebase update failed:", err));
      
      // Update cache immediately
      CACHE.records[cacheKey] = record;
      
      return {
        success: true,
        action: "Time In AM",
        time: formattedTime,
        message: `Welcome ${userName}! Time In AM recorded at ${formattedTime}`,
        userName
      };
    }
    
    // Determine next action based on existing record
    let action: AttendanceAction = "Complete";
    let message = `${userName}, you have completed your DTR for today.`;
    let success = false;
    
    if (!record.timeOutAM) {
      // Time Out AM
      record.timeOutAM = formattedTime;
      action = "Time Out AM";
      message = `Goodbye ${userName}! Time Out AM recorded at ${formattedTime}`;
      success = true;
    } else if (!record.timeInPM) {
      // Time In PM
      record.timeInPM = formattedTime;
      action = "Time In PM";
      message = `Welcome back ${userName}! Time In PM recorded at ${formattedTime}`;
      success = true;
    } else if (!record.timeOutPM) {
      // Time Out PM
      record.timeOutPM = formattedTime;
      action = "Time Out PM";
      message = `Goodbye ${userName}! Time Out PM recorded at ${formattedTime}. See you tomorrow!`;
      success = true;
    }
    
    if (success) {
      // Update cache immediately
      CACHE.records[cacheKey] = record;
      
      // Update Firebase in the background without awaiting
      setDoc(doc(db, "attendance", cacheKey), record)
        .catch(err => console.error("Background Firebase update failed:", err));
    }
    
    return {
      success,
      action,
      time: success ? formattedTime : undefined,
      message,
      userName
    };
    
  } catch (error) {
    console.error("Error determining action:", error);
    return {
      success: false,
      message: "System error. Please try again or contact administrator."
    };
  }
}

export async function recordAttendance(cardUID: string): Promise<ScanResult> {
  try {
    // Direct cache lookup for maximum speed
    const user = CACHE.users[cardUID];
    
    if (!user) {
      return {
        success: false,
        message: "Unregistered RFID card. Please contact administrator."
      };
    }
    
    // Determine and execute appropriate action with optimized function
    const result = await determineAction(user.id, user.name);
    return result;
    
  } catch (error) {
    console.error("Error recording attendance:", error);
    return {
      success: false,
      message: "Failed to process scan. Please try again."
    };
  }
}
