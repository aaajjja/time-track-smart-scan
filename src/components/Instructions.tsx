
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, CheckCircle, UserCheck } from 'lucide-react';

const Instructions: React.FC = () => {
  return (
    <Card className="border-0 shadow-lg bg-slate-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center text-slate-700">
          <AlertCircle className="mr-2 h-5 w-5 text-blue-600" />
          How to Use
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm text-slate-600">
              <strong className="text-slate-700">Step 1:</strong> Position your RFID card near the scanner
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-sm text-slate-600">
              <strong className="text-slate-700">Step 2:</strong> Wait for the confirmation message
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-sm text-slate-600">
              <strong className="text-slate-700">Step 3:</strong> Your attendance is automatically recorded
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-slate-700 mb-2">Important Notes:</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Scan once for Time In, once for Time Out</li>
            <li>• Morning shift: 8:00 AM - 12:00 PM</li>
            <li>• Afternoon shift: 1:00 PM - 5:00 PM</li>
            <li>• Contact IT Support for card issues</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default Instructions;
