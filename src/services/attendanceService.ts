
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { User, TimeRecord, AttendanceAction, ScanResult } from "../types";
import { format } from "date-fns";

// Simulate some users with RFID cards
const simulatedUsers: Record<string, User> = {
  "12345678": { id: "user1", name: "John Doe", cardUID: "12345678", department: "IT" },
  "87654321": { id: "user2", name: "Jane Smith", cardUID: "87654321", department: "HR" },
  "11223344": { id: "user3", name: "Mike Johnson", cardUID: "11223344", department: "Finance" },
};

// Local cache for today's records to avoid repeated Firestore calls
const recordsCache: Record<string, TimeRecord> = {};

export async function getUserByCardUID(cardUID: string): Promise<User | null> {
  // For simulation, we're using the local object directly
  // This is already fast, no need to optimize
  return simulatedUsers[cardUID] || null;
}

export async function registerNewUser(userData: { 
  name: string; 
  cardUID: string; 
  department?: string; 
}): Promise<{ success: boolean; message: string }> {
  try {
    // Check if the cardUID already exists
    if (simulatedUsers[userData.cardUID]) {
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
    
    // In a real system, we'd use Firebase:
    // await setDoc(doc(db, "users", userId), newUser);
    
    // For simulation, we'll add to our local object:
    simulatedUsers[userData.cardUID] = newUser;
    
    console.log("User registered successfully:", newUser);
    console.log("Updated simulatedUsers:", simulatedUsers);
    
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
  
  // Check cache first
  if (recordsCache[cacheKey]) {
    return recordsCache[cacheKey];
  }
  
  try {
    const recordRef = doc(db, "attendance", cacheKey);
    const recordSnap = await getDoc(recordRef);
    
    if (recordSnap.exists()) {
      // Update cache
      const record = recordSnap.data() as TimeRecord;
      recordsCache[cacheKey] = record;
      return record;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting attendance record:", error);
    return null;
  }
}

export async function determineAction(userId: string, userName: string): Promise<ScanResult> {
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const formattedTime = format(now, "hh:mm a");
  const cacheKey = `${userId}_${today}`;
  
  try {
    // Get today's record if it exists
    let record = await getTodayRecord(userId);
    
    if (!record) {
      // No record today, create new with Time In AM
      record = {
        userId,
        userName,
        date: today,
        timeInAM: formattedTime
      };
      
      // Update Firebase
      await setDoc(doc(db, "attendance", cacheKey), record);
      
      // Update cache
      recordsCache[cacheKey] = record;
      
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
      // Has Time In AM but no Time Out AM
      record.timeOutAM = formattedTime;
      action = "Time Out AM";
      message = `Goodbye ${userName}! Time Out AM recorded at ${formattedTime}`;
      success = true;
    } else if (!record.timeInPM) {
      // Has AM records but no Time In PM
      record.timeInPM = formattedTime;
      action = "Time In PM";
      message = `Welcome back ${userName}! Time In PM recorded at ${formattedTime}`;
      success = true;
    } else if (!record.timeOutPM) {
      // Has Time In PM but no Time Out PM
      record.timeOutPM = formattedTime;
      action = "Time Out PM";
      message = `Goodbye ${userName}! Time Out PM recorded at ${formattedTime}. See you tomorrow!`;
      success = true;
    }
    
    if (success) {
      // Update Firebase
      await setDoc(doc(db, "attendance", cacheKey), record);
      
      // Update cache
      recordsCache[cacheKey] = record;
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
    // Get user by card UID - this is already optimized using the local object
    const user = await getUserByCardUID(cardUID);
    
    if (!user) {
      return {
        success: false,
        message: "Unregistered RFID card. Please contact administrator."
      };
    }
    
    // Determine and execute appropriate action
    return await determineAction(user.id, user.name);
    
  } catch (error) {
    console.error("Error recording attendance:", error);
    return {
      success: false,
      message: "Failed to process scan. Please try again."
    };
  }
}
