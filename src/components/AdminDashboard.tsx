
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

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<TimeRecord[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    cardUID: '',
    department: '',
  });

  useEffect(() => {
    // Load attendance records when component mounts
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      const records = await getAttendanceRecords();
      setAttendanceRecords(records);
    } catch (error) {
      console.error("Error loading attendance records:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
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
    
    // Call the registration service
    registerNewUser(newUser)
      .then((result) => {
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
      })
      .catch((error) => {
        console.error("Error registering user:", error);
        toast({
          title: "Registration Error",
          description: "An unexpected error occurred. Please try again.",
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

  const handleReprocessData = async () => {
    setIsProcessing(true);
    try {
      const result = await reprocessAttendanceData();
      toast({
        title: "Data Reprocessed",
        description: `Successfully reprocessed ${result.processedCount} attendance records.`,
      });
      // Reload records after reprocessing
      await loadAttendanceRecords();
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
              {attendanceRecords.length === 0 ? (
                <p className="text-center text-gray-500 my-8">No attendance records found.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In AM</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out AM</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In PM</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out PM</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.map((record, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">{record.userName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.timeInAM || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.timeOutAM || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.timeInPM || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{record.timeOutPM || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
