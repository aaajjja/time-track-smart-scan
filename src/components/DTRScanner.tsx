import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Clock from './Clock';
import RFIDInput from './RFIDInput';
import StatusDisplay from './StatusDisplay';
import Instructions from './Instructions';
import { ScanResult } from '../types';
import { recordAttendance } from '../services/attendanceService';
import { useToast } from "@/components/ui/use-toast";

const DTRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const handleScan = useCallback(async (cardUID: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setScanResult(null);
    
    try {
      // Process the attendance record immediately without artificial delay
      const result = await recordAttendance(cardUID);
      setScanResult(result);
      
      // Show toast for feedback
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
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Card className="border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">MMSU Attendance Recording System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Clock className="mb-6" />
          
          <StatusDisplay scanResult={scanResult} isProcessing={isProcessing} />
          
          <Separator />
          
          <div className="grid md:grid-cols-2 gap-4">
            <RFIDInput onScan={handleScan} isProcessing={isProcessing} />
            <Instructions />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DTRScanner;
