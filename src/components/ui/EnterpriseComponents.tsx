import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  MoreVertical,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileCode2,
  Printer,
  ChevronDown,
  Inbox,
  Search,
} from 'lucide-react';
import { exportDataToFormat, ExportFormat } from '../../lib/exportUtils';

/* ============================================================================
   KPI CARD (Apple Minimalist styling: hairline border, refined typography)
   ============================================================================ */
export interface KPICardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  icon?: React.ReactNode;
  accent?: 'primary' | 'secondary' | 'neutral';
  onClick?: () => void;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  delta,
  deltaType = 'neutral',
  subtext,
  icon,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-4 sm:p-5 transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-[#1D1D1F] dark:hover:border-[#F5F5F7] active:scale-[0.99]'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-medium tracking-tight text-[#6E6E73] dark:text-[#A1A1A6] uppercase">
          {label}
        </span>
        {icon && <div className="text-[#86868B] dark:text-[#6E6E73] shrink-0">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] font-mono">
          {value}
        </span>
        {delta && (
          <span className="text-xs font-mono font-medium text-[#6E6E73] dark:text-[#A1A1A6]">
            {delta}
          </span>
        )}
      </div>
      {subtext && (
        <p className="mt-1.5 text-xs text-[#86868B] dark:text-[#6E6E73] leading-snug line-clamp-1">
          {subtext}
        </p>
      )}
    </div>
  );
};

/* ============================================================================
   STATUS BADGE (Apple Monochrome High-Contrast Minimalist)
   ============================================================================ */
export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const paddingClass = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  const s = status ? status.toUpperCase().trim() : '';

  let label = status || '—';
  if (s === 'PENDING_MANAGER' || s === 'PENDING_HR') {
    label = 'Pending';
  } else if (s === 'CONFIRMED PERMANENT') {
    label = 'Permanent';
  } else if (s === 'ON_LEAVE') {
    label = 'On Leave';
  } else if (s === 'ON_NOTICE') {
    label = 'On Notice';
  }

  // Semantic styles for HRMS statuses
  if (s === 'PRESENT' || s === 'APPROVED' || s === 'CONFIRMED' || s === 'ACTIVE' || s === 'DISBURSED' || s === 'PERMANENT' || s === 'COMPLETED') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s === 'LATE' || s.includes('LATE')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s === 'ABSENT' || s === 'REJECTED' || s === 'FAILED') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s === 'LEAVE' || s === 'ON LEAVE' || s === 'ON_LEAVE') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s.includes('MISSING') || s.includes('MISSED') || s === 'INCOMPLETE') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/80 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-orange-400 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s === 'ON NOTICE' || s === 'ON_NOTICE') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s === 'EXITED' || s === 'INACTIVE' || s === 'DEACTIVATED' || s === 'ARCHIVED' || s === 'SUSPENDED') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }

  if (s === 'MANUAL' || s === 'MANUAL CORRECTION') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ${paddingClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>Manual</span>
      </span>
    );
  }

  // Pending / Probation / Draft / Default
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-[#F0F0F2] text-[#1D1D1F] dark:bg-[#2C2C2E] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#3A3A3C] ${paddingClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#8E8E93] shrink-0" />
      <span>{label}</span>
    </span>
  );
};

export const StatusIndicator = StatusBadge;

/* ============================================================================
   APPLE-STYLE SEGMENTED CONTROL (Filters / Tabs)
   ============================================================================ */
export interface SegmentedControlItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export function SegmentedControl<T extends string = string>({
  items,
  value,
  onChange,
  className = '',
}: {
  items: SegmentedControlItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex p-1 bg-[#F0F0F2] dark:bg-[#202022] rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] overflow-x-auto max-w-full ${className}`}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs font-semibold'
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? 'bg-[#1D1D1F]/10 dark:bg-white/20 text-[#1D1D1F] dark:text-[#F5F5F7]'
                    : 'bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93]'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
   SECTION CARD
   ============================================================================ */
export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}> = ({ title, subtitle, action, children, className = '', noPadding = false }) => {
  return (
    <div
      className={`bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl overflow-hidden ${className}`}
    >
      <div className="px-5 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
};

/* ============================================================================
   SECTION HEADER
   ============================================================================ */
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#A1A1A6] mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};

/* ============================================================================
   AVATAR INITIALS (Apple Monochrome styling)
   ============================================================================ */
export const AvatarInitials: React.FC<{
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'green' | 'burgundy' | 'dark';
}> = ({ name, size = 'md' }) => {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }[size];

  return (
    <div
      className={`${sizeClasses} bg-[#F0F0F2] dark:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#3A3A3C] rounded-full font-mono font-semibold inline-flex items-center justify-center shrink-0 select-none tracking-tight`}
    >
      {initials || '—'}
    </div>
  );
};

/* ============================================================================
   EMPLOYEE AVATAR (Image fallback to AvatarInitials)
   ============================================================================ */
export const EmployeeAvatar: React.FC<{
  name: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'green' | 'burgundy' | 'dark';
}> = ({ name, avatarUrl, size = 'md', variant = 'dark' }) => {
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    const sizeClasses = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    }[size];
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border border-[#E5E5EA] dark:border-[#2C2C2E] shrink-0`}
      />
    );
  }
  return <AvatarInitials name={name} size={size} variant={variant} />;
};

/* ============================================================================
   SEARCH INPUT (Apple iOS/macOS search styling)
   ============================================================================ */
export const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className = '' }) => {
  return (
    <div className={`relative min-w-[200px] ${className}`}>
      <Search className="w-3.5 h-3.5 text-[#86868B] dark:text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#6E6E73] focus:bg-white dark:focus:bg-[#161618] focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7] transition-all outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] p-0.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/* ============================================================================
   EXPORT DROPDOWN
   ============================================================================ */
export interface ExportDropdownProps {
  data?: any[];
  filename?: string;
  title?: string;
  buttonLabel?: string;
  className?: string;
  onExport?: (format: ExportFormat) => void;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  data,
  filename,
  title = 'HRMS Export',
  buttonLabel = 'Export',
  className = '',
  onExport,
  onExportCSV,
  onExportJSON,
}) => {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [align, setAlign] = useState<'right' | 'left'>('right');
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 640);
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceRight = window.innerWidth - rect.right;

        // If less than 240px below, flip above
        setPlacement(spaceBelow < 240 && rect.top > 240 ? 'top' : 'bottom');
        // If less than 200px to the right, align right, otherwise align left
        setAlign(spaceRight < 200 ? 'right' : 'left');
      }
    };

    if (open) {
      checkViewport();
      window.addEventListener('resize', checkViewport);
      window.addEventListener('scroll', checkViewport, true);
    }
    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('scroll', checkViewport, true);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleExport = (format: ExportFormat) => {
    setOpen(false);
    if (onExport) {
      onExport(format);
      return;
    }
    if (format === 'CSV' && onExportCSV) {
      onExportCSV();
      return;
    }
    if (format === 'JSON' && onExportJSON) {
      onExportJSON();
      return;
    }
    if (data && filename) {
      exportDataToFormat(data, filename, format, title);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#1D1D1F] dark:hover:border-[#F5F5F7] text-[#1D1D1F] dark:text-[#F5F5F7] text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#A1A1A6]" />
        <span>{buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#6E6E73] dark:text-[#A1A1A6] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Mobile Responsive Bottom Sheet */}
      {open && isMobile && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-t-2xl p-5 border-t border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#0051D5]" />
                <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  Export Report Options
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6]">
              Select your desired file format for <strong>{filename || title}</strong>:
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleExport('XLSX')}
                className="w-full p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0051D5] dark:text-[#3B82F6] font-semibold text-xs flex items-center justify-between cursor-pointer border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Microsoft Excel Workbook (.xlsx)</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-blue-200/60 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                  Recommended
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('CSV')}
                className="w-full p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium text-xs flex items-center gap-2.5 cursor-pointer hover:bg-[#E5E5EA]"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#6E6E73]" />
                <span>Comma Separated Values (.csv)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('EXCEL_TSV')}
                className="w-full p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium text-xs flex items-center gap-2.5 cursor-pointer hover:bg-[#E5E5EA]"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#6E6E73]" />
                <span>Tab Separated Excel (.tsv / .xls)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('JSON')}
                className="w-full p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium text-xs flex items-center gap-2.5 cursor-pointer hover:bg-[#E5E5EA]"
              >
                <FileCode2 className="w-4 h-4 text-[#6E6E73]" />
                <span>Structured Raw JSON (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('PRINT_PDF')}
                className="w-full p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-medium text-xs flex items-center gap-2.5 border-t border-[#E5E5EA] dark:border-[#2C2C2E] cursor-pointer hover:bg-[#E5E5EA]"
              >
                <Printer className="w-3.5 h-3.5 text-[#6E6E73]" />
                <span>Print View / PDF Document</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 mt-2 rounded-xl text-xs font-semibold text-[#6E6E73] bg-[#E5E5EA] dark:bg-[#2C2C2E] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Tablet Positioned Popover */}
      {open && !isMobile && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-56 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl shadow-2xl z-[9999] py-1.5 overflow-hidden animate-in fade-in duration-100 ring-1 ring-black/5`}
        >
          <div className="px-3 py-1.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">
            Export Format
          </div>
          <button
            type="button"
            onClick={() => handleExport('XLSX')}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#0051D5] dark:text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0051D5] dark:text-[#3B82F6]" />
              <span>Excel Workbook (.xlsx)</span>
            </div>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              XLSX
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('CSV')}
            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Comma Separated (.csv)</span>
            </div>
            <span className="text-[9px] font-mono text-[#6E6E73]">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('EXCEL_TSV')}
            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Excel TSV (.xls)</span>
            </div>
            <span className="text-[9px] font-mono text-[#6E6E73]">TSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('JSON')}
            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Raw JSON (.json)</span>
            </div>
            <span className="text-[9px] font-mono text-[#6E6E73]">JSON</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('PRINT_PDF')}
            className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] flex items-center justify-between cursor-pointer transition-colors border-t border-[#E5E5EA] dark:border-[#2C2C2E]"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Print / PDF Document</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   REUSABLE DETAIL DRAWER (Apple-inspired Slide-Over Detail Panel)
   ============================================================================ */
export const SlideOverDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children, width = 'max-w-lg', footer }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Responsive Drawer */}
      <div
        className={`relative w-full ${width} bg-white dark:bg-[#141416] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-2xl z-10 flex flex-col h-full border-l border-[#E5E5EA] dark:border-[#2C2C2E] animate-in slide-in-from-right duration-200`}
      >
        <div className="px-6 py-5 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1A1A1C] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-2 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">{children}</div>
        {footer && (
          <div className="p-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1A1A1C]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const DetailDrawer = SlideOverDrawer;

/* ============================================================================
   REUSABLE MODAL SHELL (Apple Dialog style)
   ============================================================================ */
export const ModalShell: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen = true, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`bg-white dark:bg-[#161618] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl w-full ${maxWidth} overflow-hidden shadow-2xl my-auto animate-in zoom-in-95 duration-150`}
      >
        <div className="px-6 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-[#FAFAFC] dark:bg-[#1C1C1E] flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">{subtitle}</p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

/* ============================================================================
   CONFIRMATION DIALOG FOR DELETE / DESTRUCTIVE ACTIONS
   ============================================================================ */
export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Delete',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#F0F0F2] dark:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E5E5EA] dark:border-[#2C2C2E]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{title}</h3>
              <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] rounded-xl hover:bg-[#F0F0F2] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   THREE-DOT ACTION MENU FOR TABLE ROWS & CARDS
   ============================================================================ */
export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

export const ActionMenu: React.FC<{ items: ActionMenuItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const visibleItems = items.filter((i) => !i.disabled);
  if (visibleItems.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-[#F0F0F2] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer"
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl shadow-xl z-40 py-1 overflow-hidden"
        >
          {visibleItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]"
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   EMPTY STATE COMPONENT
   ============================================================================ */
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => {
  return (
    <div className="text-center py-12 px-4 bg-white dark:bg-[#161618] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl my-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-[#F0F0F2] dark:bg-[#242426] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#6E6E73] dark:text-[#A1A1A6] mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{title}</h3>
      {description && (
        <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export { TimePicker } from './TimePicker';
