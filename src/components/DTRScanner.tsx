
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Clock from './Clock';
import RFIDInput from './RFIDInput';
import StatusDisplay from './StatusDisplay';
import Instructions from './Instructions';
import { ScanResult } from '../types/index';
import { recordAttendance } from '../services/attendanceService';
import { useToast } from "@/components/ui/use-toast";

const DTRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Using a more optimized scan handler with debouncing protection
  const handleScan = useCallback(async (cardUID: string) => {
    if (isProcessing) {
      console.log("Scan already in progress, ignoring request");
      return;
    }
    
    // Update UI immediately to show processing
    setIsProcessing(true);
    
    try {
      console.time('scan-processing');
      // Process attendance directly without setState in between to reduce render cycles
      const result = await recordAttendance(cardUID);
      console.timeEnd('scan-processing');
      
      // Update UI with result
      setScanResult(result);
      
      // Show toast notification
      toast({
        title: result.success ? "Scan Successful" : "Scan Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult({
        success: false,
        message: "System error occurred. Please try again."
      });
      
      toast({
        title: "System Error",
        description: "Failed to process scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Release the processing lock
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">MMSU Attendance System</h1>
          <p className="text-slate-600 text-lg">Daily Time Record - Faculty & Staff</p>
        </div>

        {/* Main Scanner Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <Clock className="mb-6" />
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Status Display - More prominent */}
            <div className="flex justify-center">
              <StatusDisplay scanResult={scanResult} isProcessing={isProcessing} />
            </div>
            
            <Separator className="my-8" />
            
            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* RFID Input Section - Takes 2 columns on large screens */}
              <div className="lg:col-span-2">
                <RFIDInput onScan={handleScan} isProcessing={isProcessing} />
              </div>
              
              {/* Instructions Section */}
              <div className="lg:col-span-1">
                <Instructions />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Cards - Moved below the main scanner */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg bg-blue-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-2">Time In</div>
              <div className="text-blue-100">Morning: 8:00 AM</div>
              <div className="text-blue-100">Afternoon: 1:00 PM</div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-emerald-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-2">Time Out</div>
              <div className="text-emerald-100">Morning: 12:00 PM</div>
              <div className="text-emerald-100">Afternoon: 5:00 PM</div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-slate-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold mb-2">Support</div>
              <div className="text-slate-100">Need help?</div>
              <div className="text-slate-100">Contact IT Support</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DTRScanner;
