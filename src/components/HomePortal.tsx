import React from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Compass,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { REALM_META } from '../data/initialData';
import { AppState, PortalRole } from '../types';
import { ArchIconBadge, CurvedArcOverlay, EditorialIssueStamp, EditorialSectionHeading } from './EditorialDecor';

interface HomePortalProps {
  state: AppState;
  onNavigate: (role: PortalRole, subTab?: string) => void;
}

export const HomePortal: React.FC<HomePortalProps> = ({ state, onNavigate }) => {
  const { students, submissions, questions, opsConfig, knowledgePoints } = state;
  const avgGrade = Math.round(students.reduce((s, st) => s + st.predictedGrade, 0) / students.length);
  const pendingCount = submissions.filter((s) => s.status === 'pending_review').length;
  const highRiskCount = students.filter((s) => s.riskLevel === 'high_risk').length;

  const realmCards = (['foundation', 'practice', 'synthesis'] as const).map((key) => {
    const meta = REALM_META[key];
    const kps = knowledgePoints.filter((k) => k.realm === key);
    const avgMastery = Math.round(
      kps.reduce(
        (acc, kp) => acc + students.reduce((s, st) => s + (st.mastery[kp.id] ?? 0), 0) / students.length,
        0
      ) / Math.max(1, kps.length)
    );
    return { ...meta, kpCount: kps.length, avgMastery };
  });

  return (
    <div className="animate-soft-in">
      {/* HERO SECTION: Fuses Image 1 (Ivory Mist Castle Sanctuary) + Image 2 (Midnight Navy Vertical Architectural Band) */}
      <section className="relative overflow-hidden bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto relative">
          {/* Desktop Atmospheric Illustration Background */}
          <div className="relative min-h-[500px] sm:min-h-[560px] lg:min-h-[610px] flex items-center">
            <img
              src="/images/hero-sanctuary.jpg"
              alt="知境学苑建筑插画"
              className="absolute inset-0 w-full h-full object-cover object-right opacity-95 pointer-events-none select-none"
            />
            {/* Smooth Ivory Left & Bottom Editorial Scrim so text is effortlessly legible on every screen */}
            <div className="absolute inset-0 bg-[#FAF7F2]/68 sm:bg-transparent pointer-events-none" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, #FAF7F2 0%, rgba(250,247,242,0.96) 38%, rgba(250,247,242,0.62) 60%, rgba(250,247,242,0.08) 84%, rgba(250,247,242,0) 100%)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, #FAF7F2 0%, rgba(250,247,242,0.75) 45%, rgba(250,247,242,0) 100%)',
              }}
            />

            {/* Image 2 Signature: Right Vertical Midnight-Navy Architectural Marginalia Band */}
            <div className="hidden lg:flex flex-col justify-between items-center w-20 xl:w-24 navy-editorial-band absolute top-0 bottom-0 right-0 z-20 py-10 px-3 text-center">
              <div className="space-y-1 text-[10px] tracking-[0.22em] uppercase text-[#FAF7F2]/80 leading-relaxed">
                <div>QUIET</div>
                <div>STUDY</div>
                <div className="w-4 h-px bg-[#D5B984]/60 mx-auto my-2" />
                <div>CLEAR</div>
                <div>INSIGHT</div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="font-editorial text-xl text-[#D5B984]">01</span>
                <span className="w-px h-8 bg-[#FAF7F2]/30" />
                <span className="font-editorial text-xl text-[#FAF7F2]/60">03</span>
              </div>
              <div className="space-y-1 text-[9px] tracking-[0.2em] uppercase text-[#FAF7F2]/65">
                <div>AI</div>
                <div>MENTOR</div>
                <div className="w-4 h-px bg-[#D5B984]/50 mx-auto my-1.5" />
                <div>2026</div>
              </div>
            </div>

            {/* Hero Foreground Copy (Image 1 Proportions) */}
            <div className="relative z-10 w-full px-5 sm:px-8 lg:px-12 lg:pr-32 py-12 sm:py-16">
              <div className="max-w-xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="micro-label text-[#7A7267]">AFTER-CLASS AI SANCTUARY</span>
                  <span className="h-px w-12 bg-[#C9AA71]" />
                </div>

                <h1 className="font-editorial leading-[1.08] tracking-tight">
                  <span className="block text-4xl sm:text-5xl lg:text-[3.75rem] font-semibold text-[#1E2B4A]">
                    知境学苑
                  </span>
                  <span className="relative inline-flex items-center gap-2 text-3xl sm:text-4xl lg:text-[3.2rem] font-flourish text-[#B38B4D] mt-1">
                    Liminal Study
                    <svg
                      viewBox="0 0 80 28"
                      className="w-14 sm:w-16 h-6 -ml-1 -mt-2 text-[#B38B4D] opacity-85"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M2 20 C 26 2, 54 2, 70 12" stroke="currentColor" strokeWidth="1.2" />
                      <path
                        d="M71 7 L72.4 10.6 L76 12 L72.4 13.4 L71 17 L69.6 13.4 L66 12 L69.6 10.6 Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                </h1>

                <p className="font-flourish text-base sm:text-lg text-[#564F46] mt-4 leading-relaxed max-w-md">
                  专为大学课下研学打造的智能体空间——去掉冗重视频与课上干扰，以 AI 替教师消解批改、答疑与留痕重负，以 3 分钟微闯关与私人助教激发学生主动求知。
                </p>

                {/* Dual Editorial Pill CTAs */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('student')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-sm font-medium shadow-md hover:bg-[#293B63] transition-all cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-[#D5B984]" />
                    <span>学生研学端体验</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('teacher')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FAF7F2]/85 border border-[#1E2B4A]/45 text-[#1E2B4A] text-sm font-medium hover:bg-[#EFE8DC] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#B38B4D]" />
                    <span>打开教师 AI 智控台</span>
                  </button>
                </div>

                {/* Compact Live Pulse Strip */}
                <div className="mt-8 pt-5 border-t border-[#E4DCCE]/90 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6E665C]">
                  <span>
                    当前课程：<strong className="text-[#1E2B4A] font-medium">{opsConfig.courseTitle}</strong>
                  </span>
                  <span>
                    全班均势：<strong className="text-[#4B7056] font-semibold">{avgGrade} 分</strong>
                  </span>
                  <span>
                    待复核初审：<strong className="text-[#B38B4D] font-semibold">{pendingCount} 份</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gentle Wave Arc Separator matching Image 1 */}
        <svg
          viewBox="0 0 1440 54"
          className="w-full h-7 sm:h-11 -mt-6 relative z-10 fill-[#FAF7F2]"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,36 C320,2 620,2 960,28 C1180,44 1340,40 1440,24 L1440,54 L0,54 Z" />
        </svg>
      </section>

      {/* SECTION 2: THE FOUR ARCH PILLARS (Direct homage to Image 1's THE REALMS 4-column arches) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <EditorialSectionHeading
          english="THE FOUR PILLARS"
          title="课 下 四 境 引 擎"
          subtitle="把重复教务交给智能体，把好奇心与掌控感还给师生。"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E4DCCE]/80 bg-[#FAF7F2]">
          <ArchIconBadge
            icon={<Compass className="w-8 h-8 stroke-[1.35]" />}
            title="3 分钟微闯关"
            subtitle="碎片闯关 + 平时分透明进度环，让学生愿意主动打开"
            metric="学生端 · 轻启动"
            onClick={() => onNavigate('student', 'quests')}
          />
          <ArchIconBadge
            icon={<Bot className="w-8 h-8 stroke-[1.35]" />}
            title="AI 苏格拉底私教"
            subtitle="只依课程讲义引导，零社死 24h 答疑与考前急救包"
            metric="不直接给抄袭答案"
            onClick={() => onNavigate('student', 'tutor')}
          />
          <ArchIconBadge
            icon={<BookOpenCheck className="w-8 h-8 stroke-[1.35]" />}
            title="AI 初审与聚类"
            subtitle="自动按标准打分标险、10秒验真、聚类同问一次群回"
            metric={`待复核 ${pendingCount} 份`}
            onClick={() => onNavigate('teacher', 'review')}
          />
          <ArchIconBadge
            icon={<FileSpreadsheet className="w-8 h-8 stroke-[1.35]" />}
            title="学情雷达与台账"
            subtitle="知识点热力矩阵 + 一键导出达成度与帮扶留痕报告"
            metric={`预警 ${highRiskCount} 人`}
            onClick={() => onNavigate('teacher', 'matrix')}
          />
        </div>
      </section>

      {/* SECTION 3: FEATURED LEARNING REALMS (Direct homage to Image 1's FEATURED LOCATIONS 3 atmospheric cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <EditorialSectionHeading
          align="left"
          english="FEATURED REALMS"
          title="课程三大知识境域"
          subtitle="将整学期晦涩章节重构为三处可探索的知境，每次课下练习自动点亮掌握度。"
          action={
            <button
              type="button"
              onClick={() => onNavigate('student', 'overview')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1E2B4A] hover:text-[#B38B4D] transition-colors cursor-pointer"
            >
              <span>查看完整学情地图</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {realmCards.map((card) => (
            <div
              key={card.key}
              onClick={() => onNavigate('student', 'quests')}
              className="group relative rounded-2xl overflow-hidden editorial-card cursor-pointer min-h-[275px] sm:min-h-[300px] flex flex-col justify-end"
            >
              <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 realm-card-fade" />

              {/* Top numeral & mastery pill */}
              <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between z-10">
                <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F2]/88 backdrop-blur-xs text-[11px] font-editorial font-semibold tracking-widest text-[#1E2B4A] border border-[#E4DCCE]">
                  REALM {card.numeral}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1E2B4A]/85 backdrop-blur-xs text-[11px] text-[#FAF7F2]">
                  全班掌握 {card.avgMastery}%
                </span>
              </div>

              {/* Bottom caption + circular arrow button (Image 1 Signature) */}
              <div className="relative z-10 p-5 pt-16 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#7A7267] mb-0.5">
                    {card.english}
                  </p>
                  <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[#1E2B4A]">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#655E54] mt-1 line-clamp-2">
                    {card.tagline} · 含 {card.kpCount} 个核心考点
                  </p>
                </div>
                <span className="shrink-0 w-9 h-9 rounded-full border border-[#B38B4D]/60 bg-[#FAF7F2]/80 flex items-center justify-center text-[#1E2B4A] group-hover:bg-[#1E2B4A] group-hover:text-[#FAF7F2] group-hover:border-[#1E2B4A] transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: EDITORIAL THREE-PORTAL DIRECTORY (Image 2 Liminal Layout Homage) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="relative rounded-3xl overflow-hidden border border-[#E4DCCE] bg-[#F3EEE4]/75 p-6 sm:p-10">
          <CurvedArcOverlay className="absolute inset-0 w-full h-full opacity-70" />

          <div className="relative z-10 flex flex-col xl:flex-row gap-8 items-start">
            <EditorialIssueStamp
              current="03"
              total="03"
              captionLines={['THREE', 'PORTALS', 'ONE', 'SANCTUARY']}
            />

            <div className="flex-1 w-full">
              <div className="mb-6">
                <span className="micro-label">ROLE WORKSPACES · 三端协同架构</span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1E2B4A] mt-1">
                  一套底座，三方各自轻盈顺手
                </h2>
                <p className="text-sm text-[#6E665C] mt-1.5">
                  可直接点击下方任一入口切换视角，所有数据在三端间实时联动（例如在教师端用 AI 发布新微闯关，学生端立刻可刷）。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Student Card */}
                <div className="editorial-card rounded-2xl p-5 flex flex-col justify-between bg-[#FAF7F2]/95">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="issue-numeral text-2xl text-[#B38B4D]">01</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#EFE8DC] text-[#1E2B4A]">
                        手机端极致适配
                      </span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">学生研学端</h3>
                    <p className="text-xs sm:text-sm text-[#6E665C] mt-2 leading-relaxed">
                      透明平时分进度环、3 分钟碎片微闯关、苏格拉底 AI 私教、作业 10 秒验真、个人考前急救包与积分特权兑换。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('student')}
                    className="mt-5 w-full py-2.5 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-xs sm:text-sm font-medium hover:bg-[#293B63] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>进入学生端</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Teacher Card */}
                <div className="editorial-card rounded-2xl p-5 flex flex-col justify-between bg-[#FAF7F2]/95">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="issue-numeral text-2xl text-[#1E2B4A]">02</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#1E2B4A]/10 text-[#1E2B4A]">
                        AI 替干重复苦力
                      </span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">教师智控台</h3>
                    <p className="text-xs sm:text-sm text-[#6E665C] mt-2 leading-relaxed">
                      全班知识点热力矩阵、学生全景档案与私密备注、AI 作业批量初审与抄袭标黄、共性同问一键群回、讲义秒出题与自动生成报告。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('teacher')}
                    className="mt-5 w-full py-2.5 rounded-full border border-[#1E2B4A] text-[#1E2B4A] text-xs sm:text-sm font-medium hover:bg-[#1E2B4A] hover:text-[#FAF7F2] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>进入教师端</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Ops Card */}
                <div className="editorial-card rounded-2xl p-5 flex flex-col justify-between bg-[#FAF7F2]/95">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="issue-numeral text-2xl text-[#4B7056]">03</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#4B7056]/12 text-[#3B5B45]">
                        全权自主掌控
                      </span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">运营配置端</h3>
                    <p className="text-xs sm:text-sm text-[#6E665C] mt-2 leading-relaxed">
                      自定义过程权重、AI 温柔催办与升级策略、助教分权与邀请码入班、特权池调控，并支持直连 DeepSeek/OpenAI 真实大模型。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('ops')}
                    className="mt-5 w-full py-2.5 rounded-full border border-[#B38B4D] text-[#8E6B35] text-xs sm:text-sm font-medium hover:bg-[#B38B4D] hover:text-[#FAF7F2] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>进入运营端</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="border-t border-[#E4DCCE] py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7A7267]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#B38B4D]" />
            <span>
              {opsConfig.courseTitle} · {opsConfig.teacherName} 自主管控空间
            </span>
          </div>
          <div className="font-flourish text-sm">
            Softer days, brighter thoughts · 课下静思，学有所成
          </div>
        </div>
      </footer>
    </div>
  );
};
