
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, UserPlus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { registerNewUser, clearAttendanceRecords, getAttendanceRecords, reprocessAttendanceData } from "@/services/attendanceService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimeRecord } from '@/types';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  useEffect(() => {
    // Load attendance records when component mounts or refreshKey changes
    loadAttendanceRecords();
  }, [refreshKey]);

  const loadAttendanceRecords = async () => {
    try {
      setIsProcessing(true);
      const records = await getAttendanceRecords();
      setAttendanceRecords(records);
      setIsProcessing(false);
    } catch (error) {
      console.error("Error loading attendance records:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newUser.name.trim() || !newUser.cardUID.trim()) {
      toast({
        title: "Registration Error",
        description: "Name and Card UID are required fields.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call the registration service with timeout
      const registrationPromise = registerNewUser(newUser);
      
      // Add a timeout to ensure we don't hang forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Registration timed out")), 5000)
      );
      
      // Race between the registration and the timeout
      const result = await Promise.race([
        registrationPromise,
        timeoutPromise
      ]) as { success: boolean; message: string };
      
      if (result.success) {
        toast({
          title: "User Registered",
          description: `User ${newUser.name} with Card UID ${newUser.cardUID} added successfully!`,
        });
        
        // Reset the form
        setNewUser({
          name: '',
          cardUID: '',
          department: '',
        });
      } else {
        toast({
          title: "Registration Failed",
          description: result.message || "Failed to register user. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error registering user:", error);
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

  const handleReprocessData = async () => {
    setIsProcessing(true);
    try {
      const result = await reprocessAttendanceData();
      toast({
        title: "Data Reprocessed",
        description: `Successfully reprocessed ${result.processedCount} attendance records.`,
      });
      // Refresh records after reprocessing
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error reprocessing attendance data:", error);
      toast({
        title: "Processing Error",
        description: "Failed to reprocess attendance data",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDepartmentChange = (value: string) => {
    setNewUser({...newUser, department: value});
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
      
      <Tabs defaultValue="users" className="space-y-4">
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
        </TabsContent>
        
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Attendance Records Management</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReprocessData} 
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Reprocess Data
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
                      {attendanceRecords.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{record.userName}</TableCell>
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
