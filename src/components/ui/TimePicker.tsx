import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

interface TimePickerProps {
  value: string; // 'HH:mm' format (e.g. '09:30' or '18:30')
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  format?: '12h' | '24h';
}

const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES_5 = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  placeholder = 'Select time',
  className = '',
  format = '12h',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parseTime = (val: string) => {
    if (!val || !val.includes(':')) {
      return { hour24: 9, minute: 30, hour12: '09', ampm: 'AM' as 'AM' | 'PM' };
    }
    const [hStr, mStr] = val.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const h12Num = h % 12 === 0 ? 12 : h % 12;
    const hour12 = String(h12Num).padStart(2, '0');
    return { hour24: h, minute: m, hour12, ampm };
  };

  const parsed = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(parsed.hour12);
  const [selectedMinute, setSelectedMinute] = useState(String(parsed.minute).padStart(2, '0'));
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.ampm);

  useEffect(() => {
    const p = parseTime(value);
    setSelectedHour(p.hour12);
    setSelectedMinute(String(p.minute).padStart(2, '0'));
    setSelectedPeriod(p.ampm);
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const commitTime = (h12: string, mStr: string, period: 'AM' | 'PM') => {
    let h = parseInt(h12, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const time24 = `${String(h).padStart(2, '0')}:${mStr.padStart(2, '0')}`;
    onChange(time24);
  };

  const handleHourSelect = (h: string) => {
    setSelectedHour(h);
    commitTime(h, selectedMinute, selectedPeriod);
  };

  const handleMinuteSelect = (m: string) => {
    setSelectedMinute(m);
    commitTime(selectedHour, m, selectedPeriod);
  };

  const handlePeriodToggle = (p: 'AM' | 'PM') => {
    setSelectedPeriod(p);
    commitTime(selectedHour, selectedMinute, p);
  };

  const displayTime = value
    ? `${parsed.hour12}:${String(parsed.minute).padStart(2, '0')} ${parsed.ampm}`
    : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
          {label} {required && <span className="text-[#FF3B30]">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all text-left font-mono ${
          isOpen
            ? 'border-[#1D1D1F] dark:border-[#F5F5F7] ring-1 ring-[#1D1D1F]/20 dark:ring-white/20'
            : 'border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#8E8E93]'
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[#F5F5F7] dark:bg-[#1C1C1E]'
            : 'bg-white dark:bg-[#1C1C1E] cursor-pointer'
        } text-[#1D1D1F] dark:text-[#F5F5F7]`}
      >
        <span className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
          {displayTime ? (
            <span className="font-semibold">{displayTime}</span>
          ) : (
            <span className="text-[#8E8E93]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8E8E93] transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-72 p-3 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl shadow-xl space-y-3">
          {/* Header Preview & AM/PM Toggle */}
          <div className="flex items-center justify-between border-b border-[#E5E5EA] dark:border-[#2C2C2E] pb-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-[#1D1D1F] dark:text-[#F5F5F7]">
                {selectedHour}:{selectedMinute}
              </span>
              <span className="text-xs font-bold text-[#8E8E93]">{selectedPeriod}</span>
            </div>

            <div className="flex items-center rounded-lg bg-[#F5F5F7] dark:bg-[#2C2C2E] p-0.5 border border-[#E5E5EA] dark:border-[#3A3A3C]">
              <button
                type="button"
                onClick={() => handlePeriodToggle('AM')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  selectedPeriod === 'AM'
                    ? 'bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]'
                    : 'text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handlePeriodToggle('PM')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  selectedPeriod === 'PM'
                    ? 'bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]'
                    : 'text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: '09:30 AM', h: '09', m: '30', p: 'AM' as const },
              { label: '10:00 AM', h: '10', m: '00', p: 'AM' as const },
              { label: '01:30 PM', h: '01', m: '30', p: 'PM' as const },
              { label: '06:30 PM', h: '06', m: '30', p: 'PM' as const },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSelectedHour(preset.h);
                  setSelectedMinute(preset.m);
                  setSelectedPeriod(preset.p);
                  commitTime(preset.h, preset.m, preset.p);
                }}
                className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Hours & Minutes Columns */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Hours */}
            <div>
              <span className="block text-[10px] font-bold uppercase text-[#8E8E93] mb-1">
                Hour
              </span>
              <div className="h-36 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
                {HOURS_12.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourSelect(h)}
                    className={`w-full text-left px-2.5 py-1 rounded-lg font-mono font-medium flex items-center justify-between text-xs transition-colors ${
                      selectedHour === h
                        ? 'bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]'
                        : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <span>{h}</span>
                    {selectedHour === h && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <span className="block text-[10px] font-bold uppercase text-[#8E8E93] mb-1">
                Minute
              </span>
              <div className="h-36 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
                {MINUTES_5.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={`w-full text-left px-2.5 py-1 rounded-lg font-mono font-medium flex items-center justify-between text-xs transition-colors ${
                      selectedMinute === m
                        ? 'bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]'
                        : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]'
                    }`}
                  >
                    <span>:{m}</span>
                    {selectedMinute === m && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 text-xs font-semibold rounded-xl bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F] hover:opacity-90 transition-opacity cursor-pointer text-center"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
