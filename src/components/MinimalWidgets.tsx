import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Dieter-Rams inspired minimal analog clock card (matching reference image)
 */
export const AnalogClockWidget: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const secDeg = seconds * 6;
  const minDeg = minutes * 6;
  const hourDeg = hours * 30;

  const hourNum = now.getHours();
  const minStr = String(now.getMinutes()).padStart(2, '0');
  const timeLabel = `${String(hourNum).padStart(2, '0')}:${minStr}`;
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dateLabel = `${weekNames[now.getDay()]} · ${now.getMonth() + 1}月${now.getDate()}日`;

  return (
    <div className="glacial-card rounded-[20px] p-4 flex items-center gap-4 select-none">
      <svg viewBox="0 0 100 100" className="w-[86px] h-[86px] shrink-0" aria-label="实时时钟">
        {/* Subtle 12 tick marks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const major = i % 3 === 0;
          return (
            <line
              key={i}
              x1="50"
              y1={major ? '8' : '10'}
              x2="50"
              y2={major ? '13.5' : '12.5'}
              stroke={major ? '#141928' : '#9AA6B8'}
              strokeWidth={major ? '1.4' : '1'}
              strokeLinecap="round"
              transform={`rotate(${i * 30} 50 50)`}
            />
          );
        })}

        {/* Hour hand */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="29"
          stroke="#141928"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform={`rotate(${hourDeg} 50 50)`}
        />
        {/* Minute hand */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="18"
          stroke="#141928"
          strokeWidth="1.6"
          strokeLinecap="round"
          transform={`rotate(${minDeg} 50 50)`}
        />
        {/* Thin sweep second hand */}
        <line
          x1="50"
          y1="56"
          x2="50"
          y2="15"
          stroke="#9AA6B8"
          strokeWidth="0.9"
          strokeLinecap="round"
          transform={`rotate(${secDeg} 50 50)`}
        />
        <circle cx="50" cy="50" r="2.8" fill="#141928" />
      </svg>

      <div className="min-w-0">
        <div className="text-[22px] font-semibold tracking-tight text-[#141928] tabular leading-tight">
          {timeLabel}
        </div>
        <div className="text-xs text-[#6B7689] mt-1 tabular">{dateLabel}</div>
      </div>
    </div>
  );
};

/**
 * Swiss Minimal Monthly Calendar Card (matching reference image)
 */
export const MinimalCalendarWidget: React.FC<{
  markedDays?: number[];
  selectedDay?: number;
  onSelectDay?: (day: number) => void;
}> = ({ markedDays = [18, 22, 24, 29], selectedDay, onSelectDay }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0..11
  const [internalSelected, setInternalSelected] = useState(today.getDate());

  const activeDay = selectedDay ?? internalSelected;
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday-first grid (0 = Mon ... 6 = Sun)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true });
  }
  while (cells.length < 35) {
    cells.push({ day: cells.length - (startOffset + daysInMonth) + 1, inMonth: false });
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <span className="text-[13px] font-medium text-[#3C4659] tabular">
          {viewYear}年 {viewMonth + 1}月
        </span>
        <div className="flex items-center gap-1 text-[#6B7689]">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="上月"
            className="p-1 rounded-md hover:bg-white/60 hover:text-[#141928] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="下月"
            className="p-1 rounded-md hover:bg-white/60 hover:text-[#141928] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="glacial-card rounded-[20px] p-3.5">
        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-[#7C8799] mb-2">
          {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
            <div key={w} className="py-0.5">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {cells.map((cell, idx) => {
            const isSelected = cell.inMonth && cell.day === activeDay;
            const isMarked = cell.inMonth && markedDays.includes(cell.day);
            return (
              <button
                key={idx}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => {
                  setInternalSelected(cell.day);
                  onSelectDay?.(cell.day);
                }}
                className={`mx-auto w-7 h-7 rounded-[8px] text-[12px] tabular flex items-center justify-center transition-all ${
                  !cell.inMonth
                    ? 'text-[#B4BFCE] cursor-default'
                    : isSelected
                    ? 'bg-[#141928] text-white font-medium shadow-xs cursor-pointer'
                    : isMarked
                    ? 'bg-[#DCE4EC] text-[#1E273A] font-medium hover:bg-[#D0DBE6] cursor-pointer'
                    : 'text-[#394356] hover:bg-[#E8EFF5] cursor-pointer'
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Clean Collapsible Group Header (^ Unplanned  2)
 */
export const GroupHeader: React.FC<{
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  rightSlot?: React.ReactNode;
}> = ({ title, count, open, onToggle, rightSlot }) => (
  <div className="flex items-center justify-between py-2">
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 text-[13px] font-medium text-[#2A3346] hover:text-[#141928] cursor-pointer"
    >
      <ChevronRight
        className={`w-3.5 h-3.5 text-[#7C8799] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      />
      <span>{title}</span>
      <span className="px-1.5 py-0.5 rounded-[6px] bg-[#D6E0EA]/80 text-[11px] font-medium text-[#475368] tabular leading-none">
        {count}
      </span>
    </button>
    {rightSlot}
  </div>
);

/**
 * Precision Monochrome Switch
 */
export const MinimalSwitch: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
      checked ? 'bg-[#141928]' : 'bg-[#CBD5E1]'
    }`}
  >
    <span
      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
);

/**
 * Subtle 6px status indicator dot
 */
export const StatusDot: React.FC<{ tone: 'ok' | 'warn' | 'risk' | 'neutral' }> = ({ tone }) => {
  const map = {
    ok: 'bg-[#2E7D5B]',
    warn: 'bg-[#B47B2B]',
    risk: 'bg-[#B84A4A]',
    neutral: 'bg-[#8F9BB0]',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${map[tone]}`} />;
};
