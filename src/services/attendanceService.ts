
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp, deleteDoc } from "firebase/firestore";
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

export async function getTodayRecord(userId: string): Promise<TimeRecord | null> {
  const today = format(new Date(), "yyyy-MM-dd");
  const cacheKey = `${userId}_${today}`;
  
  // Direct cache lookup without async overhead for improved performance
  return CACHE.records[cacheKey] || null;
}

export async function determineAction(userId: string, userName: string): Promise<ScanResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const formattedTime = format(now, "hh:mm a");
  const cacheKey = `${userId}_${today}`;
  
  // Determine if it's morning or afternoon for proper labeling
  const hour = now.getHours();
  const isAM = hour < 12;
  const timeLabel = isAM ? "AM" : "PM";
  
  try {
    // Get today's record with minimal overhead
    let record = CACHE.records[cacheKey] || null;
    
    if (!record) {
      // No record today, create new with Time In (AM/PM based on time of day)
      record = {
        userId,
        userName,
        date: today,
        timeInAM: isAM ? formattedTime : undefined,
        timeInPM: isAM ? undefined : formattedTime
      };
      
      // Update Firebase immediately to ensure persistence
      try {
        await setDoc(doc(db, "attendance", cacheKey), record);
        console.log("New attendance record created in Firebase");
      } catch (err) {
        console.error("Firebase update failed:", err);
      }
      
      // Update cache immediately
      CACHE.records[cacheKey] = record;
      
      return {
        success: true,
        action: isAM ? "Time In AM" : "Time In PM",
        time: formattedTime,
        message: `Welcome ${userName}! Time In ${timeLabel} recorded at ${formattedTime}`,
        userName
      };
    }
    
    // Determine next action based on existing record and time of day
    let action: AttendanceAction = "Complete";
    let message = `${userName}, you have completed your DTR for today.`;
    let success = false;
    
    if (isAM) {
      // Morning logic
      if (!record.timeOutAM) {
        // Time Out AM
        record.timeOutAM = formattedTime;
        action = "Time Out AM";
        message = `Goodbye ${userName}! Time Out AM recorded at ${formattedTime}`;
        success = true;
      } else if (record.timeOutAM && !record.timeInPM) {
        // Special case: already timed out AM, but now it's still AM again
        // Allow a new Time In AM to override
        record.timeInAM = formattedTime;
        action = "Time In AM (Updated)";
        message = `Welcome back ${userName}! Updated Time In AM recorded at ${formattedTime}`;
        success = true;
      }
    } else {
      // Afternoon logic
      if (!record.timeInPM && record.timeInAM) {
        // Time In PM (only if they had timed in for AM)
        record.timeInPM = formattedTime;
        action = "Time In PM";
        message = `Welcome back ${userName}! Time In PM recorded at ${formattedTime}`;
        success = true;
      } else if (!record.timeInPM) {
        // First scan of the day but in afternoon
        record.timeInPM = formattedTime;
        action = "Time In PM";
        message = `Welcome ${userName}! Time In PM recorded at ${formattedTime}`;
        success = true;
      } else if (record.timeInPM && !record.timeOutPM) {
        // Time Out PM
        record.timeOutPM = formattedTime;
        action = "Time Out PM";
        message = `Goodbye ${userName}! Time Out PM recorded at ${formattedTime}. See you tomorrow!`;
        success = true;
      }
    }
    
    if (success) {
      // Update cache immediately
      CACHE.records[cacheKey] = record;
      
      // Update Firebase immediately to ensure persistence
      try {
        await setDoc(doc(db, "attendance", cacheKey), record);
        console.log("Attendance record updated in Firebase");
      } catch (err) {
        console.error("Firebase update failed:", err);
      }
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

// New functions for attendance record management

export async function getAttendanceRecords(): Promise<TimeRecord[]> {
  try {
    // Force a fresh fetch from Firebase every time to ensure up-to-date data
    const attendanceRef = collection(db, "attendance");
    const querySnapshot = await getDocs(attendanceRef);
    
    // Clear and rebuild the cache
    const records: TimeRecord[] = [];
    Object.keys(CACHE.records).forEach(key => delete CACHE.records[key]);
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as TimeRecord;
      records.push(data);
      
      // Update cache with fresh data
      CACHE.records[doc.id] = data;
    });
    
    // Update last fetch time
    CACHE.lastFetch = Date.now();
    
    console.log(`Loaded ${records.length} attendance records`);
    return records;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return [];
  }
}

export async function clearAttendanceRecords(): Promise<void> {
  try {
    // Get all attendance records from Firebase
    const attendanceRef = collection(db, "attendance");
    const querySnapshot = await getDocs(attendanceRef);
    
    // Delete each record
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach(docSnapshot => {
      deletePromises.push(deleteDoc(doc(db, "attendance", docSnapshot.id)));
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    // Clear the cache
    Object.keys(CACHE.records).forEach(key => delete CACHE.records[key]);
    
    console.log("All attendance records cleared successfully");
  } catch (error) {
    console.error("Error clearing attendance records:", error);
    throw error;
  }
}

export async function reprocessAttendanceData(): Promise<{ processedCount: number }> {
  try {
    // Get all users
    const users = Object.values(CACHE.users);
    
    // Clear existing attendance records first
    await clearAttendanceRecords();
    
    // For simulation purposes, we'll generate some attendance data
    // In a real system, this would involve analyzing raw scan data
    const today = format(new Date(), "yyyy-MM-dd");
    const randomHour = (min: number, max: number) => 
      Math.floor(Math.random() * (max - min + 1) + min);
    
    // Process each user
    for (const user of users) {
      // Generate a random attendance pattern for today
      const record: TimeRecord = {
        userId: user.id,
        userName: user.name,
        date: today,
        timeInAM: format(new Date().setHours(randomHour(7, 9), randomHour(0, 59)), "hh:mm a"),
        timeOutAM: format(new Date().setHours(randomHour(11, 12), randomHour(0, 59)), "hh:mm a"),
        timeInPM: format(new Date().setHours(randomHour(13, 14), randomHour(0, 59)), "hh:mm a"),
      };
      
      // Some users have already left for the day
      if (Math.random() > 0.3) {
        record.timeOutPM = format(new Date().setHours(randomHour(16, 18), randomHour(0, 59)), "hh:mm a");
      }
      
      // Save to Firebase
      const cacheKey = `${user.id}_${today}`;
      await setDoc(doc(db, "attendance", cacheKey), record);
      
      // Update cache
      CACHE.records[cacheKey] = record;
    }
    
    return { processedCount: users.length };
  } catch (error) {
    console.error("Error reprocessing attendance data:", error);
    throw error;
  }
}
