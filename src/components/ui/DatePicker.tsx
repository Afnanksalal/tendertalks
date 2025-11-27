import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const handleSelect = (date: Date) => {
    const formatted = date.toISOString().split('T')[0];
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));

  const formatDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(viewDate);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800 border rounded-lg text-sm transition-colors ${
          isOpen ? 'border-neon-cyan/50 ring-1 ring-neon-cyan/20' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <Calendar size={16} className="text-slate-400 flex-shrink-0" />
        <span className={`flex-1 text-left ${value ? 'text-white' : 'text-slate-500'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden p-3 w-72"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-white font-medium">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-xs text-slate-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(({ date, isCurrentMonth }, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(date)}
                  className={`
                    w-8 h-8 rounded-lg text-sm transition-colors flex items-center justify-center
                    ${!isCurrentMonth ? 'text-slate-600' : 'text-slate-300 hover:bg-white/10'}
                    ${isToday(date) && !isSelected(date) ? 'border border-neon-cyan/50' : ''}
                    ${isSelected(date) ? 'bg-neon-cyan text-slate-900 font-medium' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => handleSelect(new Date())}
                className="flex-1 py-1.5 text-xs text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="flex-1 py-1.5 text-xs text-slate-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
