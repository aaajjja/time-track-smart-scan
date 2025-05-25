
import { getUserByCardUID } from './userService';
import { ScanResult, AttendanceRecord, User } from '../types/index';
import { recordTimeEntry, getCurrentTimeRecord } from './timeRecordService';
import { getAllAttendanceRecords } from './attendanceManagementService';

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
    
    // Record the time entry
    const result = await recordTimeEntry(user);
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
export { getAllAttendanceRecords, getCurrentTimeRecord };
