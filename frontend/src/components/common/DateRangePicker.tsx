import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronDown, Check, RotateCcw } from 'lucide-react';

export interface DateRangePickerProps {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
}) => {
  const today = new Date();
  const currentYear = today.getFullYear() > 2000 ? today.getFullYear() : 2026;
  const currentMonth = today.getMonth() + 1; // 1-12

  // Available Years catalog dynamically computed
  const years = Array.from({ length: 7 }, (_, i) => currentYear - i);

  const months = [
    { value: 0, label: 'Full Year (Jan – Dec)' },
    { value: 1, label: '01 - January' },
    { value: 2, label: '02 - February' },
    { value: 3, label: '03 - March' },
    { value: 4, label: '04 - April' },
    { value: 5, label: '05 - May' },
    { value: 6, label: '06 - June' },
    { value: 7, label: '07 - July' },
    { value: 8, label: '08 - August' },
    { value: 9, label: '09 - September' },
    { value: 10, label: '10 - October' },
    { value: 11, label: '11 - November' },
    { value: 12, label: '12 - December' },
  ];

  // Helper to parse YYYY-MM-DD safely
  const parseDateParts = (dStr: string) => {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      // Prevent 5-digit corruption
      if (y > 9999) y = parseInt(parts[0].slice(0, 4), 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return { year: y, month: m, day: d };
    }
    return null;
  };

  const startParts = parseDateParts(startDate);
  const endParts = parseDateParts(endDate);

  // Mode: 'HIERARCHICAL' (Year -> Month -> Date) vs 'CUSTOM_RANGE' (From Date & To Date)
  const [mode, setMode] = useState<'HIERARCHICAL' | 'CUSTOM_RANGE'>('HIERARCHICAL');

  // Hierarchical state
  const [selectedYear, setSelectedYear] = useState<number>(startParts?.year || currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(startParts?.month || currentMonth);
  const [fromDay, setFromDay] = useState<number>(startParts?.day || 1);
  const [toDay, setToDay] = useState<number>(endParts?.day || 31);

  // Sync state if props change externally
  useEffect(() => {
    if (startDate) {
      const sp = parseDateParts(startDate);
      if (sp) {
        setSelectedYear(sp.year);
        setSelectedMonth(sp.month);
        setFromDay(sp.day);
      }
    }
    if (endDate) {
      const ep = parseDateParts(endDate);
      if (ep) {
        setToDay(ep.day);
      }
    }
  }, [startDate, endDate]);

  // Helper: days in month
  const getDaysInMonth = (year: number, month: number) => {
    if (month === 0) return 31;
    return new Date(year, month, 0).getDate();
  };

  const maxDays = getDaysInMonth(selectedYear, selectedMonth);

  // Format 2-digit number
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Apply hierarchical selection
  const applyHierarchical = (yr: number, mo: number, fDay: number, tDay: number) => {
    const safeYear = Math.min(2099, Math.max(2020, yr));
    if (mo === 0) {
      // Full Year
      const s = `${safeYear}-01-01`;
      const e = `${safeYear}-12-31`;
      onChange(s, e);
    } else {
      const monthDays = getDaysInMonth(safeYear, mo);
      const clampedFrom = Math.min(Math.max(1, fDay), monthDays);
      const clampedTo = Math.min(Math.max(clampedFrom, tDay), monthDays);
      const s = `${safeYear}-${pad2(mo)}-${pad2(clampedFrom)}`;
      const e = `${safeYear}-${pad2(mo)}-${pad2(clampedTo)}`;
      onChange(s, e);
    }
  };

  // Handle year change
  const handleYearChange = (yr: number) => {
    setSelectedYear(yr);
    applyHierarchical(yr, selectedMonth, fromDay, toDay);
  };

  // Handle month change
  const handleMonthChange = (mo: number) => {
    setSelectedMonth(mo);
    const mDays = getDaysInMonth(selectedYear, mo);
    const newFrom = 1;
    const newTo = mDays;
    setFromDay(newFrom);
    setToDay(newTo);
    applyHierarchical(selectedYear, mo, newFrom, newTo);
  };

  // Handle day changes
  const handleFromDayChange = (d: number) => {
    setFromDay(d);
    const newTo = Math.max(d, toDay);
    setToDay(newTo);
    applyHierarchical(selectedYear, selectedMonth, d, newTo);
  };

  const handleToDayChange = (d: number) => {
    const validTo = Math.max(fromDay, d);
    setToDay(validTo);
    applyHierarchical(selectedYear, selectedMonth, fromDay, validTo);
  };

  // Quick Preset Helper
  const formatISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const applyPreset = (preset: 'CURRENT_MONTH' | 'LAST_30' | 'LAST_90' | 'YTD' | 'LAST_YEAR' | 'ALL_TIME') => {
    const now = new Date();
    const todayStr = formatISO(now);
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;

    if (preset === 'CURRENT_MONTH') {
      setSelectedYear(yr);
      setSelectedMonth(mo);
      const mDays = getDaysInMonth(yr, mo);
      setFromDay(1);
      setToDay(mDays);
      onChange(`${yr}-${pad2(mo)}-01`, `${yr}-${pad2(mo)}-${pad2(mDays)}`);
    } else if (preset === 'LAST_30') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      onChange(formatISO(past30), todayStr);
      setMode('CUSTOM_RANGE');
    } else if (preset === 'LAST_90') {
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      onChange(formatISO(past90), todayStr);
      setMode('CUSTOM_RANGE');
    } else if (preset === 'YTD') {
      setSelectedYear(yr);
      setSelectedMonth(0);
      onChange(`${yr}-01-01`, todayStr);
      setMode('CUSTOM_RANGE');
    } else if (preset === 'LAST_YEAR') {
      const lastYr = yr - 1;
      setSelectedYear(lastYr);
      setSelectedMonth(0);
      setFromDay(1);
      setToDay(31);
      onChange(`${lastYr}-01-01`, `${lastYr}-12-31`);
    } else if (preset === 'ALL_TIME') {
      onChange('', '');
      setMode('CUSTOM_RANGE');
    }
  };

  // Sanitizer to strictly prevent 5-digit years from native date inputs
  const sanitizeDateInput = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length >= 1 && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      return parts.join('-');
    }
    return val;
  };

  // Display human-readable range
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return null;
    const parts = parseDateParts(dStr);
    if (!parts) return dStr;
    const dateObj = new Date(parts.year, parts.month - 1, parts.day);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header controls & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('HIERARCHICAL')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              mode === 'HIERARCHICAL'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Year → Month → Date
          </button>
          <button
            type="button"
            onClick={() => setMode('CUSTOM_RANGE')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              mode === 'CUSTOM_RANGE'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Range (From / To)
          </button>
        </div>

        {/* Quick Financial Period Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 font-medium mr-1 hidden sm:inline">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('ALL_TIME')}
            className={`px-2 py-1 rounded border transition-colors ${
              !startDate && !endDate
                ? 'bg-primary-600 text-white border-primary-500 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => applyPreset('CURRENT_MONTH')}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => applyPreset('LAST_30')}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset('LAST_90')}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            Last 90 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset('YTD')}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            YTD {currentYear}
          </button>
          <button
            type="button"
            onClick={() => applyPreset('LAST_YEAR')}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            Year {currentYear - 1}
          </button>
        </div>
      </div>

      {/* MODE 1: HIERARCHICAL PICKER (YEAR -> MONTH -> DATE) */}
      {mode === 'HIERARCHICAL' && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: Choose Year */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-400 mb-1">
                1. Choose Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-primary-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} {y === currentYear ? '(Current Year)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Choose Month */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-400 mb-1">
                2. Choose Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-primary-500"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Choose Days in Month */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-400 mb-1">
                3. Day Range (Date)
              </label>
              {selectedMonth === 0 ? (
                <div className="h-9 px-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center">
                  Full Year (Jan 01 – Dec 31)
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={fromDay}
                    onChange={(e) => handleFromDayChange(parseInt(e.target.value, 10))}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-2 text-xs text-slate-100 font-mono"
                  >
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {pad2(d)}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500 text-xs font-bold">to</span>
                  <select
                    value={toDay}
                    onChange={(e) => handleToDayChange(parseInt(e.target.value, 10))}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-2 text-xs text-slate-100 font-mono"
                  >
                    {Array.from({ length: maxDays }, (_, i) => i + 1)
                      .filter((d) => d >= fromDay)
                      .map((d) => (
                        <option key={d} value={d}>
                          Day {pad2(d)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CUSTOM RANGE (FROM DATE & TO DATE - STRICTLY 4-DIGIT YEAR ENFORCED) */}
      {mode === 'CUSTOM_RANGE' && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                From Date (YYYY-MM-DD)
              </label>
              <div className="relative">
                <input
                  type="date"
                  min="2020-01-01"
                  max="2035-12-31"
                  value={startDate}
                  onChange={(e) => {
                    const clean = sanitizeDateInput(e.target.value);
                    onChange(clean, endDate);
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-primary-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">4-digit year format (2020 to 2035)</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                To Date (YYYY-MM-DD)
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={startDate || '2020-01-01'}
                  max="2035-12-31"
                  value={endDate}
                  onChange={(e) => {
                    const clean = sanitizeDateInput(e.target.value);
                    onChange(startDate, clean);
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-primary-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">4-digit year format (2020 to 2035)</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Period Indicator Badge */}
      <div className="flex flex-wrap items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4 text-primary-400 shrink-0" />
          <span>Statement Activity Window:</span>
          {startDate || endDate ? (
            <>
              <span className="font-mono font-bold text-emerald-400">
                {formatDisplayDate(startDate) || 'Inception'}
              </span>
              <span className="text-slate-500 font-bold">→</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatDisplayDate(endDate) || 'Present'}
              </span>
            </>
          ) : (
            <span className="font-mono font-bold text-emerald-400">All Recorded History (Full Archive)</span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          ISO: <span className="text-slate-200">{startDate || 'Any'}</span> to <span className="text-slate-200">{endDate || 'Any'}</span>
        </div>
      </div>
    </div>
  );
};
