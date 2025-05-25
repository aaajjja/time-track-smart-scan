
import { getUserByCardUID } from './userService';
import { ScanResult, User } from '../types/index';
import { determineAction } from './timeRecordService';
import { getAttendanceRecords } from './attendanceManagementService';

// Main attendance recording function
export async function recordAttendance(cardUID: string): Promise<ScanResult> {
  console.log("Recording attendance for card:", cardUID);
  
  try {
    // Get user information
    const user: User | null = await getUserByCardUID(cardUID);
    
    if (!user) {
      return {
        success: false,
        message: "RFID card not registered. Please contact the administrator to register your card."
      };
    }
    
    // Record the time entry using determineAction
    const result = await determineAction(user.id, user.name);
    return result;
    
  } catch (error) {
    console.error("Error in recordAttendance:", error);
    return {
      success: false,
      message: "System error occurred. Please try again or contact support."
    };
  }
}

// Export attendance management functions
export { getAttendanceRecords };
