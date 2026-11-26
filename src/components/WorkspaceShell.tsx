import React from 'react';
import {
  ChevronRight,
  Cpu,
  GraduationCap,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { AIConfig, PortalRole } from '../types';
import { AnalogClockWidget, MinimalCalendarWidget, StatusDot } from './MinimalWidgets';

export interface NavItemDef {
  key: string;
  label: string;
  short: string;
  count?: number;
  icon: React.ReactNode;
}

interface WorkspaceShellProps {
  role: PortalRole;
  onChangeRole: (role: PortalRole) => void;
  plannerTitle: string;
  navItems: NavItemDef[];
  activeTab: string;
  onChangeTab: (key: string) => void;
  courseTitle: string;
  aiConfig: AIConfig;
  markedDays?: number[];
  onResetDemo: () => void;
  children: React.ReactNode;
}

const ROLES: { key: PortalRole; label: string; icon: React.ReactNode }[] = [
  { key: 'student', label: '学生', icon: <GraduationCap className="w-[18px] h-[18px] stroke-[1.6]" /> },
  { key: 'teacher', label: '教师', icon: <UserCheck className="w-[18px] h-[18px] stroke-[1.6]" /> },
  { key: 'ops', label: '运营', icon: <SlidersHorizontal className="w-[18px] h-[18px] stroke-[1.6]" /> },
];

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  role,
  onChangeRole,
  plannerTitle,
  navItems,
  activeTab,
  onChangeTab,
  courseTitle,
  aiConfig,
  markedDays,
  onResetDemo,
  children,
}) => {
  const isLiveAI = aiConfig.mode === 'custom' && Boolean(aiConfig.apiKey.trim());

  return (
    <div className="relative min-h-screen lg:py-6 lg:px-6 flex flex-col items-center">
      {/* Single GPU-promoted static gradient light field (zero live blur() shaders) */}
      <div className="fixed inset-0 pointer-events-none ambient-field -z-10" aria-hidden="true" />

      {/* Main Frosted Application Window */}
      <div className="w-full max-w-[1380px] flex-1 lg:min-h-[calc(100vh-3rem)] app-shell lg:rounded-[26px] flex overflow-hidden">
        {/* DESKTOP FAR-LEFT SLIM ICON RAIL (Exact Reference Image Layout) */}
        <aside className="relative z-10 hidden lg:flex flex-col items-center justify-between w-[64px] shrink-0 glass-rail py-3.5 no-print">
          <div className="flex flex-col items-center gap-2.5">
            {/* Deep Obsidian Brand Mark Squircle */}
            <button
              type="button"
              onClick={() => onChangeRole('student')}
              title="AfterBell"
              className="w-10 h-10 rounded-[12px] bg-[#141928] text-white flex items-center justify-center shadow-sm hover:opacity-92 transition-opacity cursor-pointer mb-2"
            >
              <Layers className="w-[18px] h-[18px] stroke-[1.75]" />
            </button>

            {/* Current Role View Icons */}
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  onClick={() => onChangeTab(item.key)}
                  className={`relative w-10 h-10 rounded-[11px] flex items-center justify-center transition-all cursor-pointer ${
                    active
                      ? 'bg-[#E5ECF3] text-[#141928]'
                      : 'text-[#6A768A] hover:text-[#141928] hover:bg-[#EDF2F7]'
                  }`}
                >
                  {item.icon}
                  {item.count !== undefined && item.count > 0 && !active && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#141928]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Rail: Role Switch + Reset */}
          <div className="flex flex-col items-center gap-2 pt-3 border-t border-slate-900/[0.06]">
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  title={`${r.label}端`}
                  onClick={() => onChangeRole(r.key)}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors cursor-pointer ${
                    active ? 'bg-[#141928] text-white' : 'text-[#7A869A] hover:text-[#141928] hover:bg-[#EDF2F7]'
                  }`}
                >
                  {r.icon}
                </button>
              );
            })}
            <button
              type="button"
              title="重置演示状态"
              onClick={onResetDemo}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#8C97AA] hover:text-[#141928] hover:bg-[#EDF2F7] transition-colors cursor-pointer mt-1"
            >
              <RotateCcw className="w-4 h-4 stroke-[1.6]" />
            </button>
          </div>
        </aside>

        {/* MAIN RIGHT INTERIOR */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0">
          {/* ULTRA-CLEAN TOP BAR (Matches "Floor Main" simplicity) */}
          <header className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Brand Squircle */}
              <div className="lg:hidden w-8 h-8 rounded-[9px] bg-[#141928] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Layers className="w-4 h-4 stroke-[1.75]" />
              </div>

              <div className="flex items-center gap-2 text-[13px] min-w-0">
                <span className="text-[#6E7C91] hidden sm:inline">AfterBell</span>
                <span className="font-semibold text-[#141928] truncate">{courseTitle}</span>
              </div>

              {/* Minimal Frosted Glass Segmented Role Switcher */}
              <div className="ml-1 sm:ml-3 inline-flex items-center p-0.5 rounded-[11px] glass-track">
                {ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => onChangeRole(r.key)}
                      className={`px-2.5 sm:px-3 py-1 rounded-[8px] text-[12px] font-medium transition-all cursor-pointer ${
                        active
                          ? 'bg-white/85 text-[#141928] shadow-[0_2px_8px_-2px_rgba(24,48,78,0.16)] border border-white'
                          : 'text-[#59687E] hover:text-[#141928] border border-transparent'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onChangeRole('ops')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] bg-white/60 border border-white/80 text-[12px] text-[#4C586D] hover:bg-white/90 transition-colors cursor-pointer"
              >
                <StatusDot tone={isLiveAI ? 'ok' : 'neutral'} />
                <Cpu className="w-3.5 h-3.5 text-[#647287]" />
                <span>{isLiveAI ? aiConfig.model : 'AI 引擎'}</span>
              </button>

              <button
                type="button"
                onClick={onResetDemo}
                title="重置演示数据"
                className="lg:hidden p-2 rounded-[9px] text-[#647287] hover:bg-white/70 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 stroke-[1.6]" />
              </button>
            </div>
          </header>

          {/* SPLIT TWO-COLUMN FROSTED PANE WORKSPACE */}
          <div className="flex-1 px-3 sm:px-5 pb-mobile-dock lg:pb-5 grid grid-cols-1 lg:grid-cols-[308px_1fr] gap-4 min-h-0">
            {/* LEFT PLANNER PANE (Desktop) */}
            <section className="hidden lg:flex flex-col justify-between gap-5 mist-pane rounded-[20px] p-4 overflow-y-auto no-print">
              <div>
                <h2 className="text-[16px] font-semibold tracking-tight text-[#141928] px-1.5 mb-3">
                  {plannerTitle}
                </h2>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onChangeTab(item.key)}
                        className={`w-full px-3.5 py-2.5 rounded-[13px] flex items-center justify-between text-[13.5px] transition-all cursor-pointer ${
                          active
                            ? 'glacial-card text-[#141928] font-medium'
                            : 'text-[#4D596E] hover:bg-white/45 hover:text-[#141928]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={active ? 'text-[#141928]' : 'text-[#6A768A]'}>{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {item.count !== undefined && (
                            <span
                              className={`px-1.5 py-0.5 rounded-[6px] text-[11px] tabular leading-none ${
                                active
                                  ? 'bg-[#E2E9F1] text-[#2A3447] font-medium'
                                  : 'text-[#818D9F]'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                          {active && <ChevronRight className="w-3.5 h-3.5 text-[#7A869A]" />}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Signature Tactile Clock + Swiss Calendar Stack */}
              <div className="space-y-4 pt-2">
                <AnalogClockWidget />
                <MinimalCalendarWidget markedDays={markedDays} />
              </div>
            </section>

            {/* RIGHT MAIN WORKSPACE PANE */}
            <main className="mist-pane rounded-[20px] p-4 sm:p-6 overflow-y-auto overscroll-contain min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* MOBILE PINNED FROSTED LIQUID-GLASS BOTTOM DOCK */}
      <nav
        aria-label="移动端视图导航"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 no-print mobile-glass-dock px-2.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeTab(item.key)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-[13px] transition-all cursor-pointer ${
                  active
                    ? 'bg-white/75 text-[#141928] font-medium shadow-[0_4px_12px_-4px_rgba(24,48,78,0.15)] border border-white/90'
                    : 'text-[#637288] border border-transparent'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-[10px] mt-0.5 leading-tight">{item.short}</span>
                {item.count !== undefined && item.count > 0 && !active && (
                  <span className="absolute top-1.5 right-3.5 w-1 h-1 rounded-full bg-[#5C6C82]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
