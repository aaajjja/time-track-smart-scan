
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ClockProps {
  className?: string;
}

const Clock: React.FC<ClockProps> = ({ className }) => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  return (
    <div className={`text-center ${className}`}>
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-0">
        <div className="text-lg font-medium text-slate-600 mb-2">
          {format(dateTime, 'EEEE, MMMM d, yyyy')}
        </div>
        <div className="text-5xl font-bold clock-display text-slate-800 tracking-tight">
          {format(dateTime, 'hh:mm:ss a')}
        </div>
        <div className="text-sm text-slate-500 mt-2">
          Current Time
        </div>
      </div>
    </div>
  );
};

export default Clock;
