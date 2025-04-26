
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { User, TimeRecord, AttendanceAction, ScanResult } from "../types";
import { format } from "date-fns";

// Simulate some users with RFID cards
const simulatedUsers: Record<string, User> = {
  "12345678": { id: "user1", name: "John Doe", cardUID: "12345678", department: "IT", position: "Developer" },
  "87654321": { id: "user2", name: "Jane Smith", cardUID: "87654321", department: "HR", position: "Manager" },
  "11223344": { id: "user3", name: "Mike Johnson", cardUID: "11223344", department: "Finance", position: "Accountant" },
};

export async function getUserByCardUID(cardUID: string): Promise<User | null> {
  // In a real system, we'd query Firebase
  // const userRef = collection(db, "users");
  // const q = query(userRef, where("cardUID", "==", cardUID));
  // const querySnapshot = await getDocs(q);
  
  // if (querySnapshot.empty) {
  //   return null;
  // }
  
  // const userData = querySnapshot.docs[0].data() as User;
  // return { ...userData, id: querySnapshot.docs[0].id };
  
  // For this simulation:
  return simulatedUsers[cardUID] || null;
}

export async function getTodayRecord(userId: string): Promise<TimeRecord | null> {
  const today = format(new Date(), "yyyy-MM-dd");
  
  try {
    const recordRef = doc(db, "attendance", `${userId}_${today}`);
    const recordSnap = await getDoc(recordRef);
    
    if (recordSnap.exists()) {
      return recordSnap.data() as TimeRecord;
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
      
      await setDoc(doc(db, "attendance", `${userId}_${today}`), record);
      
      return {
        success: true,
        action: "Time In AM",
        time: formattedTime,
        message: `Welcome ${userName}! Time In AM recorded at ${formattedTime}`,
        userName
      };
    }
    
    // Determine next action based on existing record
    if (!record.timeOutAM) {
      // Has Time In AM but no Time Out AM
      record.timeOutAM = formattedTime;
      await setDoc(doc(db, "attendance", `${userId}_${today}`), record);
      
      return {
        success: true,
        action: "Time Out AM",
        time: formattedTime,
        message: `Goodbye ${userName}! Time Out AM recorded at ${formattedTime}`,
        userName
      };
    }
    
    if (!record.timeInPM) {
      // Has AM records but no Time In PM
      record.timeInPM = formattedTime;
      await setDoc(doc(db, "attendance", `${userId}_${today}`), record);
      
      return {
        success: true,
        action: "Time In PM",
        time: formattedTime,
        message: `Welcome back ${userName}! Time In PM recorded at ${formattedTime}`,
        userName
      };
    }
    
    if (!record.timeOutPM) {
      // Has Time In PM but no Time Out PM
      record.timeOutPM = formattedTime;
      await setDoc(doc(db, "attendance", `${userId}_${today}`), record);
      
      return {
        success: true,
        action: "Time Out PM",
        time: formattedTime,
        message: `Goodbye ${userName}! Time Out PM recorded at ${formattedTime}. See you tomorrow!`,
        userName
      };
    }
    
    // All slots are filled for today
    return {
      success: false,
      action: "Complete",
      message: `${userName}, you have completed your DTR for today.`,
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
    // Get user by card UID
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
