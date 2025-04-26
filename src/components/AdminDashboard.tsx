
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, FileDown, UserPlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Simulated attendance records
const attendanceRecords = [
  {
    id: '1',
    userId: 'user1',
    userName: 'John Doe',
    department: 'IT',
    date: '2025-04-26',
    timeInAM: '08:05 AM',
    timeOutAM: '12:00 PM',
    timeInPM: '01:02 PM',
    timeOutPM: '05:01 PM',
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Jane Smith',
    department: 'HR',
    date: '2025-04-26',
    timeInAM: '07:58 AM',
    timeOutAM: '11:55 AM',
    timeInPM: '01:00 PM',
    timeOutPM: '05:00 PM',
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Mike Johnson',
    department: 'Finance',
    date: '2025-04-26',
    timeInAM: '08:10 AM',
    timeOutAM: '12:05 PM',
    timeInPM: '01:15 PM',
    timeOutPM: null,
  },
  {
    id: '4',
    userId: 'user1',
    userName: 'John Doe',
    department: 'IT',
    date: '2025-04-25',
    timeInAM: '08:02 AM',
    timeOutAM: '12:00 PM',
    timeInPM: '01:05 PM',
    timeOutPM: '05:03 PM',
  },
];

const AdminDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    cardUID: '',
    department: '',
    position: '',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate search delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    alert('In a real system, this would export records to CSV');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsLoading(false);
      alert(`User ${newUser.name} with Card UID ${newUser.cardUID} added successfully!`);
      setNewUser({
        name: '',
        cardUID: '',
        department: '',
        position: '',
      });
    }, 1500);
  };

  const filteredRecords = attendanceRecords.filter(record => 
    record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.date.includes(searchTerm) ||
    record.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Records</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex space-x-2">
                <div className="grid flex-1">
                  <Input
                    placeholder="Search by name, date (YYYY-MM-DD), or department"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleExport}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Time In AM</TableHead>
                      <TableHead>Time Out AM</TableHead>
                      <TableHead>Time In PM</TableHead>
                      <TableHead>Time Out PM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map(record => (
                        <TableRow key={`${record.id}_${record.date}`}>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.userName}</TableCell>
                          <TableCell>{record.department}</TableCell>
                          <TableCell>{record.timeInAM}</TableCell>
                          <TableCell>{record.timeOutAM}</TableCell>
                          <TableCell>{record.timeInPM}</TableCell>
                          <TableCell>{record.timeOutPM || '—'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No records found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
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
                    <Input 
                      id="department" 
                      value={newUser.department}
                      onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input 
                      id="position" 
                      value={newUser.position}
                      onChange={(e) => setNewUser({...newUser, position: e.target.value})}
                    />
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
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
