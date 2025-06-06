
export interface User {
  id: string;
  name: string;
  cardUID: string;
  department?: string;
  email?: string;
}

export interface TimeRecord {
  userId: string;
  userName: string;
  date: string;
  timeInAM?: string;
  timeOutAM?: string;
  timeInPM?: string;
  timeOutPM?: string;
}

// Add the missing AttendanceRecord type
export interface AttendanceRecord extends TimeRecord {
  // This can be the same as TimeRecord for now
}

export type AttendanceAction = 'Time In AM' | 'Time Out AM' | 'Time In PM' | 'Time Out PM' | 'Complete' | 'Time In AM (Updated)';

export interface ScanResult {
  success: boolean;
  action?: AttendanceAction;
  time?: string;
  message: string;
  userName?: string;
}
