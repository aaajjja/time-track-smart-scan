
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { registerNewUser } from "@/services/attendanceService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    cardUID: '',
    department: '',
  });

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
        <TabsList className="grid w-full">
          <TabsTrigger value="users">User Management</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
