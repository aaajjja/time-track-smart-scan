import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, Timestamp, getDocs, query, where } from "firebase/firestore"; // Add these imports
import { db } from "../services/firebase"; // Make sure this path is correct
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Loader2, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast, useToast } from "../components/ui/use-toast";
import { registerNewUser } from "../services/userService";
import { getAttendanceRecords, clearAttendanceRecords } from "../services/attendanceManagementService";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { format } from "date-fns";
import { resetApplicationState, initializeAppData } from "../services/initializationService";
import { Separator } from "../components/ui/separator";
import { CACHE } from "../services/cacheUtils";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

// Import types directly from the types folder
import type { User, TimeRecord } from "../types/index";


const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<TimeRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newUser, setNewUser] = useState({
    name: '',
    cardUID: '',
    department: '',
  });
  const [isResetting, setIsResetting] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  const DEMO_CARD_UIDS = ["12345678", "87654321", "11223344"];

  useEffect(() => {
    // Load all users from Firebase and update cache/UI on mount
    const loadUsers = async () => {
      await initializeAppData();
      // Remove demo users from cache
      DEMO_CARD_UIDS.forEach(uid => { delete CACHE.users[uid]; });
      const users = Object.values(CACHE.users).filter(user => !DEMO_CARD_UIDS.includes(user.cardUID));
      setRegisteredUsers(users);
    };
    loadUsers();
    // Load attendance records when component mounts or refreshKey changes
    loadAttendanceRecords();
  }, [refreshKey]);

  const loadAttendanceRecords = async () => {
  try {
    setIsProcessing(true);
    const snapshot = await getDocs(collection(db, "attendance"));
    
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Helper function to safely parse dates
      const safeFormatDate = (dateValue: any): string => {
        try {
          // Handle Firestore Timestamp
          if (dateValue?.toDate) {
            return format(dateValue.toDate(), 'yyyy-MM-dd');
          }
          // Handle string date
          if (typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              return format(parsedDate, 'yyyy-MM-dd');
            }
          }
          // Handle invalid dates
          return 'Invalid Date';
        } catch {
          return 'Invalid Date';
        }
      };
      
      // Helper function to safely format times
      const safeFormatTime = (timeValue: any): string => {
        try {
          if (!timeValue) return '-';
          
          // Handle Firestore Timestamp
          if (timeValue?.toDate) {
            return format(timeValue.toDate(), 'hh:mm a');
          }
          // Handle string time
          if (typeof timeValue === 'string') {
            // If already in correct format, return as-is
            if (/^\d{1,2}:\d{2} [AP]M$/.test(timeValue)) {
              return timeValue;
            }
            // Try to parse other string formats
            const parsedDate = new Date(timeValue);
            if (!isNaN(parsedDate.getTime())) {
              return format(parsedDate, 'hh:mm a');
            }
          }
          return '-';
        } catch {
          return '-';
        }
      };

      return {
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || '',
        date: safeFormatDate(data.date),
        timeInAM: safeFormatTime(data.timeInAM),
        timeOutAM: safeFormatTime(data.timeOutAM),
        timeInPM: safeFormatTime(data.timeInPM),
        timeOutPM: safeFormatTime(data.timeOutPM),
      };
    });
    
    setAttendanceRecords(records);
  } catch (error) {
    console.error("Error loading attendance records:", error);
    toast({
      title: "Error",
      description: "Failed to load attendance records",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

  const handleAddUser = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!newUser.name.trim() || !newUser.cardUID.trim()) {
    toast({
      title: "Registration Error",
      description: "Name and Card UID are required fields.",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);
  const optimisticId = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const optimisticUser: User = {
    id: optimisticId,
    name: newUser.name,
    cardUID: newUser.cardUID,
    department: newUser.department
  };

  setNewUser({ name: '', cardUID: '', department: '' });

  toast({
    title: "Registering User...",
    description: `User ${optimisticUser.name} is being registered.`,
  });

  registerNewUser(optimisticUser)
    .then(async result => {
      if (result.success) {
        // ✅ Only now update the cache and UI
        CACHE.users[newUser.cardUID] = optimisticUser;
        await initializeAppData();
        DEMO_CARD_UIDS.forEach(uid => { delete CACHE.users[uid]; });
        const users = Object.values(CACHE.users).filter(user => !DEMO_CARD_UIDS.includes(user.cardUID));
        setRegisteredUsers(users);
        toast({
          title: "User Registered",
          description: `User ${optimisticUser.name} with Card UID ${optimisticUser.cardUID} added successfully!`,
        });
      } else {
        toast({
          title: "Registration Failed",
          description: result.message || "Failed to register user. Please try again.",
          variant: "destructive",
        });
      }
    })
    .catch(error => {
      toast({
        title: "Registration Error",
        description: error?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    })
    .finally(() => {
      setIsLoading(false);
    });
};

  const handleClearRecords = async () => {
    setIsProcessing(true);
    try {
      await clearAttendanceRecords();
      setAttendanceRecords([]);
      toast({
        title: "Records Cleared",
        description: "All attendance records have been removed successfully.",
      });
    } catch (error) {
      console.error("Error clearing records:", error);
      toast({
        title: "Error",
        description: "Failed to clear attendance records",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDepartmentChange = (value: string) => {
    setNewUser({...newUser, department: value});
  };

  // Auto-reload records every minute to keep the dashboard updated
// Add this helper function to convert Firestore data
const convertFirestoreRecord = (doc: any): TimeRecord => {
  const data = doc.data();
  
  // Helper to convert Timestamp to display string
  const convertTime = (time: any): string | undefined => {
    if (!time) return undefined;
    if (time instanceof Timestamp) {
      return format(time.toDate(), 'hh:mm a');
    }
    // If it's already a string, return as-is
    if (typeof time === 'string') return time;
    return undefined;
  };

  return {
    userId: data.userId,
    userName: data.userName,
    date: data.date instanceof Timestamp 
      ? format(data.date.toDate(), 'yyyy-MM-dd') 
      : data.date,
    timeInAM: convertTime(data.timeInAM),
    timeOutAM: convertTime(data.timeOutAM),
    timeInPM: convertTime(data.timeInPM),
    timeOutPM: convertTime(data.timeOutPM),
  };
};

// Update your useEffect for data fetching
// Replace your current useEffect for loading users with this:
useEffect(() => {
  // Query to exclude demo users
  const usersQuery = query(
    collection(db, "users"),
    where("cardUID", "not-in", DEMO_CARD_UIDS)
  );

  const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
    
    // Update both state and cache
    setRegisteredUsers(users);
    users.forEach(user => {
      CACHE.users[user.cardUID] = user;
    });
  });

  return () => unsubscribe();
}, []);
  const handleResetSystem = async () => {
    if (window.confirm("Are you sure you want to reset the entire system? This will delete all users and attendance records.")) {
      setIsResetting(true);
      
      try {
        await resetApplicationState();
        
        // Clear both records and users from the state
        setAttendanceRecords([]);
        setRegisteredUsers([]);
        
        toast({
          title: "System Reset Complete",
          description: "All users and attendance records have been deleted.",
        });
      } catch (error) {
        console.error("Error resetting system:", error);
        toast({
          title: "Reset Failed",
          description: "There was an error resetting the system.",
          variant: "destructive",
        });
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Instead, only load registered users if explicitly requested
  const loadRegisteredUsers = () => {
    const users = Object.values(CACHE.users);
    setRegisteredUsers(users);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scanner
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Register New RFID Card</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardUID">Card UID</Label>
                    <Input 
                      id="cardUID" 
                      value={newUser.cardUID}
                      onChange={(e) => setNewUser({...newUser, cardUID: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select 
                      value={newUser.department} 
                      onValueChange={handleDepartmentChange}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CCIS">CCIS</SelectItem>
                        <SelectItem value="COE">COE</SelectItem>
                        <SelectItem value="CAS">CAS</SelectItem>
                        <SelectItem value="CAFSD">CAFSD</SelectItem>
                        <SelectItem value="CHS">CHS</SelectItem>
                        <SelectItem value="CBEA">CBEA</SelectItem>
                        <SelectItem value="COM">COM</SelectItem>
                        <SelectItem value="CVM">CVM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="mt-4">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Register New User
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>Users currently registered in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {registeredUsers.length === 0 ? (
                <p className="text-muted-foreground">No users registered yet</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 font-semibold">
                    <div>Name</div>
                    <div>Card UID</div>
                    <div>Department</div>
                  </div>
                  <Separator />
                  {registeredUsers.map(user => (
                    <div key={user.cardUID} className="grid grid-cols-3">
                      <div>{user.name}</div>
                      <div>{user.cardUID}</div>
                      <div>{user.department || "-"}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>System Management</CardTitle>
              <CardDescription>Advanced options for system management</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                variant="destructive" 
                onClick={handleResetSystem}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset System
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Attendance Records Management</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRefreshKey(prev => prev + 1);
                  }} 
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh Data
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleClearRecords} 
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Clear Records
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isProcessing && (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              
              {!isProcessing && attendanceRecords.length === 0 ? (
                <p className="text-center text-gray-500 my-8">No attendance records found.</p>
              ) : !isProcessing && (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In AM</TableHead>
                        <TableHead>Time Out AM</TableHead>
                        <TableHead>Time In PM</TableHead>
                        <TableHead>Time Out PM</TableHead>
                      </TableRow>
                    </TableHeader>
                <TableBody>
  {attendanceRecords.map((record) => (
    <TableRow key={`${record.userId}-${record.date}`}>
      <TableCell>{record.userName}</TableCell>
      <TableCell>{record.date}</TableCell>
      <TableCell>{record.timeInAM || '-'}</TableCell>
      <TableCell>{record.timeOutAM || '-'}</TableCell>
      <TableCell>{record.timeInPM || '-'}</TableCell>
      <TableCell>{record.timeOutPM || '-'}</TableCell>
    </TableRow>
  ))}
</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
