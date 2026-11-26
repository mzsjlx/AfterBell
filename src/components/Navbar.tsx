import React from 'react';
import { ArrowUpRight, RotateCcw, Sparkles } from 'lucide-react';
import { AIConfig, PortalRole } from '../types';
import { BrandCrest } from './EditorialDecor';

interface NavbarProps {
  role: PortalRole;
  onChangeRole: (role: PortalRole) => void;
  aiConfig: AIConfig;
  courseTitle: string;
  onResetDemo: () => void;
}

const NAV_ITEMS: { key: PortalRole; label: string; shortLabel: string }[] = [
  { key: 'home', label: '首页门户', shortLabel: '门户' },
  { key: 'student', label: '学生研学端', shortLabel: '学生端' },
  { key: 'teacher', label: '教师智控台', shortLabel: '教师端' },
  { key: 'ops', label: '运营配置端', shortLabel: '运营端' },
];

export const Navbar: React.FC<NavbarProps> = ({
  role,
  onChangeRole,
  aiConfig,
  courseTitle,
  onResetDemo,
}) => {
  const isLiveAI = aiConfig.mode === 'custom' && Boolean(aiConfig.apiKey.trim());

  return (
    <header className="sticky top-0 z-40 no-print bg-[#FAF7F2]/92 backdrop-blur-md border-b border-[#E4DCCE]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-[72px] flex items-center justify-between gap-3">
          {/* Brand Left (Image 1 Layout) */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => onChangeRole('home')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <BrandCrest className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:scale-105" />
              <div className="leading-tight">
                <div className="font-editorial text-lg sm:text-[1.22rem] font-semibold tracking-wider text-[#1E2B4A]">
                  知境学苑
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#7A7267] hidden sm:block">
                  Liminal Academy
                </div>
              </div>
            </button>
            <span className="hidden lg:inline-block h-6 w-px bg-[#DFD5C5]" />
            <span className="hidden xl:inline-block text-xs text-[#7A7267] truncate max-w-[200px]">
              {courseTitle}
            </span>
          </div>

          {/* Center Pill Navigation (Desktop) */}
          <nav
            aria-label="三端角色导航"
            className="hidden md:flex items-center gap-1.5 bg-[#F4EFE5]/70 p-1 rounded-full border border-[#E6DEC8]/80"
          >
            {NAV_ITEMS.map((item) => {
              const active = role === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChangeRole(item.key)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer ${
                    active
                      ? 'bg-[#EAE0CE] text-[#1E2B4A] font-medium shadow-xs'
                      : 'text-[#6A6258] hover:text-[#1E2B4A] hover:bg-[#FAF7F2]/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onChangeRole('ops')}
              title="配置 AI 模型引擎"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer ${
                isLiveAI
                  ? 'bg-[#4B7056]/10 border-[#4B7056]/30 text-[#3B5B45]'
                  : 'bg-[#FAF7F2] border-[#DFD5C5] text-[#7A7267] hover:border-[#B38B4D]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B38B4D]" />
              <span>{isLiveAI ? '真实 AI 已接入' : '智能体演示引擎'}</span>
            </button>

            <button
              type="button"
              onClick={onResetDemo}
              title="重置演示数据"
              className="p-2 rounded-full text-[#7A7267] hover:text-[#1E2B4A] hover:bg-[#EFE8DC]/70 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {role === 'home' ? (
              <button
                type="button"
                onClick={() => onChangeRole('student')}
                className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#1E2B4A]/45 text-xs sm:text-sm font-medium text-[#1E2B4A] hover:bg-[#1E2B4A] hover:text-[#FAF7F2] transition-colors cursor-pointer"
              >
                <span>进入研学空间</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onChangeRole(role === 'student' ? 'teacher' : 'student')}
                className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[#1E2B4A]/40 text-xs sm:text-sm font-medium text-[#1E2B4A] hover:bg-[#1E2B4A] hover:text-[#FAF7F2] transition-colors cursor-pointer"
              >
                <span>切至{role === 'student' ? '教师端' : '学生端'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Role Switcher Strip (Ergonomic & Always Accessible on Phone) */}
        <div className="md:hidden pb-2.5 -mt-0.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = role === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeRole(item.key)}
                className={`flex-1 min-w-[74px] py-1.5 px-2.5 rounded-full text-xs text-center whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1E2B4A] text-[#FAF7F2] font-medium shadow-xs'
                    : 'bg-[#F2ECE1] text-[#6A6258] border border-[#E4DCCE]'
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
