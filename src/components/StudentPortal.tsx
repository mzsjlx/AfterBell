import React, { useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FileCheck2,
  Flame,
  Gift,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  Send,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  Zap,
} from 'lucide-react';
import { REALM_META } from '../data/initialData';
import {
  evaluateVerificationAnswer,
  generateLifesaverGuide,
  generateTutorReply,
  preGradeSubmission,
} from '../services/aiService';
import { AppState, RealmKey, Submission, TutorPersona } from '../types';
import { EditorialSectionHeading } from './EditorialDecor';

export type StudentTab = 'overview' | 'quests' | 'tutor' | 'assignments' | 'community';

interface StudentPortalProps {
  state: AppState;
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
  onCompleteQuest: (questId: string, selectedIndex: number, isCorrect: boolean) => void;
  onAddChatMessages: (userText: string, aiText: string, kpId?: string) => void;
  onChangePersona: (persona: TutorPersona) => void;
  onCreateSubmission: (sub: Submission) => void;
  onVerifySubmission: (subId: string, passed: boolean) => void;
  onUpvoteQuestion: (qId: string) => void;
  onAskQuestion: (kpId: string, content: string, isAnonymous: boolean) => void;
  onConfirmQuestionStatus: (qId: string, status: 'understood' | 'still_confused') => void;
  onRedeemPerk: (perkId: string) => void;
  showToast: (msg: string) => void;
}

const STUDENT_TABS: { key: StudentTab; label: string; short: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: '研学总览', short: '总览', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'quests', label: '3分钟微闯关', short: '微闯关', icon: <Zap className="w-4 h-4" /> },
  { key: 'tutor', label: 'AI 苏格拉底私教', short: 'AI私教', icon: <Bot className="w-4 h-4" /> },
  { key: 'assignments', label: '作业与10秒验真', short: '作业', icon: <FileCheck2 className="w-4 h-4" /> },
  { key: 'community', label: '同问墙 · 特权铺', short: '同问/券', icon: <Gift className="w-4 h-4" /> },
];

export const StudentPortal: React.FC<StudentPortalProps> = ({
  state,
  activeTab,
  onChangeTab,
  onCompleteQuest,
  onAddChatMessages,
  onChangePersona,
  onCreateSubmission,
  onVerifySubmission,
  onUpvoteQuestion,
  onAskQuestion,
  onConfirmQuestionStatus,
  onRedeemPerk,
  showToast,
}) => {
  const student = state.students.find((s) => s.id === state.currentStudentId) || state.students[0];
  const { knowledgePoints, microQuests, assignments, submissions, questions, perks, chatHistory, aiConfig } = state;

  // Overview state: Lifesaver Cheat Sheet
  const [lifesaverOpen, setLifesaverOpen] = useState(false);
  const [lifesaverLoading, setLifesaverLoading] = useState(false);
  const [lifesaverText, setLifesaverText] = useState('');

  // Quests state
  const [realmFilter, setRealmFilter] = useState<'all' | RealmKey>('all');
  const [draftChoice, setDraftChoice] = useState<Record<string, number>>({});

  // Tutor state
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Assignment + 10s Verification state
  const [selectedAsgId, setSelectedAsgId] = useState(assignments[0]?.id || '');
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeVerificationSub, setActiveVerificationSub] = useState<Submission | null>(null);
  const [verifyAnswer, setVerifyAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{ passed: boolean; feedback: string } | null>(null);

  // Community state
  const [communitySection, setCommunitySection] = useState<'qa' | 'perks'>('qa');
  const [newQKpId, setNewQKpId] = useState(knowledgePoints[1]?.id || knowledgePoints[0].id);
  const [newQContent, setNewQContent] = useState('');
  const [newQAnon, setNewQAnon] = useState(true);

  const weakestKps = useMemo(
    () => [...knowledgePoints].sort((a, b) => (student.mastery[a.id] ?? 0) - (student.mastery[b.id] ?? 0)),
    [knowledgePoints, student.mastery]
  );

  const pendingQuests = microQuests.filter((q) => !q.completed);
  const filteredQuests =
    realmFilter === 'all' ? microQuests : microQuests.filter((q) => q.realm === realmFilter);

  const mySubmissions = submissions.filter((s) => s.studentId === student.id);
  const currentAssignment = assignments.find((a) => a.id === selectedAsgId) || assignments[0];

  // Progress Ring Math
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(100, student.predictedGrade) / 100);

  const handleGenerateLifesaver = async () => {
    setLifesaverOpen(true);
    setLifesaverLoading(true);
    const md = await generateLifesaverGuide(student, knowledgePoints, aiConfig);
    setLifesaverText(md);
    setLifesaverLoading(false);
  };

  const handleSendChat = async (presetText?: string) => {
    const text = (presetText ?? chatInput).trim();
    if (!text || chatSending) return;
    setChatInput('');
    setChatSending(true);
    const { reply, matchedKpId } = await generateTutorReply(text, student, knowledgePoints, aiConfig);
    onAddChatMessages(text, reply, matchedKpId);
    setChatSending(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const handleSubmitAssignment = async () => {
    if (!submissionText.trim() || !currentAssignment || submitting) return;
    setSubmitting(true);
    const result = await preGradeSubmission(
      submissionText,
      currentAssignment.rubric,
      currentAssignment.title,
      aiConfig
    );
    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      assignmentId: currentAssignment.id,
      studentId: student.id,
      studentName: student.name,
      studentNo: student.studentNo,
      content: submissionText.trim(),
      submittedAt: '刚刚',
      aiScore: result.aiScore,
      aiSummary: result.aiSummary,
      aiStrengths: result.aiStrengths,
      aiGaps: result.aiGaps,
      aiFlag: result.aiFlag,
      aiFlagReason: result.aiFlagReason,
      status: 'pending_review',
      verificationQuestion: result.verificationQuestion,
      verificationPassed: !state.opsConfig.automation.antiCopyVerify,
    };
    onCreateSubmission(newSub);
    setSubmitting(false);
    setSubmissionText('');
    if (state.opsConfig.automation.antiCopyVerify) {
      setActiveVerificationSub(newSub);
      setVerifyAnswer('');
      setVerifyFeedback(null);
    } else {
      showToast('作业已提交并完成 AI 初评！');
    }
  };

  const handleRunVerification = async () => {
    if (!activeVerificationSub || !verifyAnswer.trim() || verifying) return;
    setVerifying(true);
    const res = await evaluateVerificationAnswer(verifyAnswer, aiConfig);
    setVerifyFeedback(res);
    setVerifying(false);
    if (res.passed) {
      onVerifySubmission(activeVerificationSub.id, true);
      showToast('10 秒验真通关！+15 研学积分已入账');
    }
  };

  const handlePostQuestion = () => {
    if (!newQContent.trim()) return;
    onAskQuestion(newQKpId, newQContent.trim(), newQAnon);
    setNewQContent('');
    showToast('已发布至同问墙，AI 已生成参考思路并通知老师聚类');
  };

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-mobile-nav md:pb-16 animate-soft-in">
      {/* Desktop Sub-Nav Pill Bar */}
      <div className="hidden md:flex items-center justify-between gap-4 mb-7 pb-4 border-b border-[#E4DCCE]">
        <div className="flex items-center gap-2">
          {STUDENT_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChangeTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1E2B4A] text-[#FAF7F2] font-medium shadow-xs'
                    : 'bg-[#F3EEE4] text-[#686055] hover:bg-[#EAE1D0] hover:text-[#1E2B4A]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.key === 'quests' && pendingQuests.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#B38B4D] text-[#FAF7F2]">
                    {pendingQuests.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Compact Student Badge */}
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EFE8DC] text-[#1E2B4A]">
            <Flame className="w-3.5 h-3.5 text-[#B87D3B]" />
            连胜 <strong>{student.streakDays}</strong> 天
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1E2B4A]/8 text-[#1E2B4A]">
            <Award className="w-3.5 h-3.5 text-[#B38B4D]" />
            积分 <strong>{student.points}</strong> pt
          </span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW — Progress Ring + AI Shortest Path + Mastery Map */}
      {activeTab === 'overview' && (
        <div className="space-y-7">
          {/* Top Editorial Split Banner (Image 2 Midnight Navy + Ivory Contrast) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Progress & Grade Radar Card */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-[#E4DCCE] bg-[#FAF7F2] shadow-sm flex flex-col sm:flex-row">
              {/* Left Ivory Content */}
              <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="micro-label truncate">PERSONAL PROGRESS · 平时表现透明盘</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#4B7056]/12 text-[#3B5B45] font-medium whitespace-nowrap shrink-0">
                      已过安全线
                    </span>
                  </div>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1E2B4A]">
                    {student.name}，课下静思一刻
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6E665C] mt-1">
                    {student.major} · 学号 {student.studentNo}
                  </p>
                </div>

                {/* Progress Ring + Breakdown */}
                <div className="mt-5 flex items-center gap-5 sm:gap-7">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
                      <circle cx="56" cy="56" r={ringRadius} stroke="#E9E1D2" strokeWidth="7" fill="none" />
                      <circle
                        cx="56"
                        cy="56"
                        r={ringRadius}
                        stroke="#1E2B4A"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        fill="none"
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="issue-numeral text-3xl font-semibold text-[#1E2B4A]">
                        {student.predictedGrade}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase text-[#7A7267]">预测平时分</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6E665C]">安全及格线</span>
                      <span className="font-medium text-[#4B7056]">60 分 · 已稳过</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6E665C]">距优秀线（85分）</span>
                      <span className="font-semibold text-[#B38B4D]">
                        {student.predictedGrade >= 85 ? '已达成优秀档' : `仅差 ${85 - student.predictedGrade} 分`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6E665C]">可用研学积分</span>
                      <span className="font-semibold text-[#1E2B4A]">{student.points} pt</span>
                    </div>
                    <div className="pt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateLifesaver}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EFE8DC] hover:bg-[#E4D8C3] text-xs font-medium text-[#1E2B4A] transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#B38B4D]" />
                        <span>生成 15 分钟考前急救包</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Image 2 Signature Vertical Navy Band */}
              <div className="navy-editorial-band sm:w-28 p-4 sm:py-6 flex sm:flex-col items-center justify-between text-center">
                <div className="flex sm:flex-col items-center gap-2 sm:gap-1">
                  <Flame className="w-5 h-5 text-[#D5B984]" />
                  <span className="font-editorial text-2xl font-semibold">{student.streakDays}</span>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-[#FAF7F2]/70">连胜天</span>
                </div>
                <div className="hidden sm:block w-8 h-px bg-[#D5B984]/40" />
                <div className="text-right sm:text-center">
                  <div className="text-xs text-[#D5B984] font-medium">任务达成</div>
                  <div className="font-editorial text-xl">{student.taskCompletionRate}%</div>
                </div>
              </div>
            </div>

            {/* AI Shortest Path Card */}
            <div className="lg:col-span-5 editorial-card rounded-3xl p-5 sm:p-6 bg-[#F6F1E7]/90 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="micro-label text-[#9E7B42] truncate">AI SHORTEST PATH · 今日省力提分</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#7A7267] whitespace-nowrap shrink-0">
                    <Clock className="w-3 h-3" /> 约 8 分钟
                  </span>
                </div>
                <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[#1E2B4A]">
                  不盲目刷题，先补最值钱的两步
                </h3>
                <p className="text-xs sm:text-sm text-[#6A6258] mt-1.5 leading-relaxed">
                  AI 扫描了你的六维掌握度，目前最快见效的突破口在{' '}
                  <strong className="text-[#1E2B4A]">
                    「{weakestKps[0].code} {weakestKps[0].title}」
                  </strong>{' '}
                  与{' '}
                  <strong className="text-[#1E2B4A]">
                    「{weakestKps[1].code} {weakestKps[1].title}」
                  </strong>
                  ：
                </p>

                <div className="mt-4 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => onChangeTab('quests')}
                    className="w-full p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E4DCCE] hover:border-[#B38B4D] flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#1E2B4A]">
                        ① 完成「{pendingQuests[0]?.title || '贝叶斯微闯关'}」
                      </div>
                      <div className="text-xs text-[#7A7267] mt-0.5">
                        2 分钟碎片题 · 掌握度立涨 &amp; 积 +20 pt
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#B38B4D] shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTab('assignments')}
                    className="w-full p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E4DCCE] hover:border-[#B38B4D] flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#1E2B4A]">
                        ② 提交实验思考 03 并通过 10 秒验真
                      </div>
                      <div className="text-xs text-[#7A7267] mt-0.5">
                        AI 即时初评给修改建议 · 预计平时分 +5
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#B38B4D] shrink-0" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChangeTab('tutor')}
                className="mt-4 w-full py-2.5 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-sm font-medium hover:bg-[#293B63] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4 text-[#D5B984]" />
                <span>有地方卡壳？先问 24h AI 私教</span>
              </button>
            </div>
          </div>

          {/* 6 Knowledge Points Mastery Grid */}
          <div>
            <EditorialSectionHeading
              align="left"
              english="KNOWLEDGE ATLAS"
              title="我的六维知识掌握图谱"
              subtitle="点击任意薄弱卡片，直接找 AI 私教用 1 分钟顺清思路。"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {knowledgePoints.map((kp) => {
                const score = student.mastery[kp.id] ?? 0;
                const realm = REALM_META[kp.realm];
                const barColor =
                  score >= 80 ? 'bg-[#4B7056]' : score >= 65 ? 'bg-[#B87D3B]' : 'bg-[#A94B44]';
                const statusText = score >= 80 ? '已熟练' : score >= 65 ? '可巩固' : '建议优先补';

                return (
                  <div key={kp.id} className="editorial-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] tracking-[0.16em] uppercase text-[#7A7267]">
                          {kp.code} · {realm.title}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            score >= 80
                              ? 'bg-[#4B7056]/12 text-[#3B5B45]'
                              : score >= 65
                              ? 'bg-[#B87D3B]/14 text-[#936027]'
                              : 'bg-[#A94B44]/12 text-[#8D3832]'
                          }`}
                        >
                          {statusText} · {score}%
                        </span>
                      </div>

                      <h4 className="font-editorial text-lg font-semibold text-[#1E2B4A]">{kp.title}</h4>
                      <p className="text-xs text-[#6E665C] mt-1 leading-relaxed">{kp.keyTakeaway}</p>

                      <div className="mt-3.5 h-1.5 rounded-full bg-[#ECE4D6] overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EFE8DC] flex items-center justify-between text-xs">
                      <span className="text-[#8E6B35] truncate max-w-[65%]">避坑：{kp.commonPitfall.slice(0, 16)}…</span>
                      <button
                        type="button"
                        onClick={() => {
                          onChangeTab('tutor');
                          handleSendChat(`请帮我用最通俗的例子讲讲「${kp.code} ${kp.title}」，特别是我容易踩的坑。`);
                        }}
                        className="text-[#1E2B4A] font-medium hover:text-[#B38B4D] cursor-pointer shrink-0"
                      >
                        AI 点拨 →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 3-MINUTE MICRO-QUESTS */}
      {activeTab === 'quests' && (
        <div className="space-y-6">
          <EditorialSectionHeading
            align="left"
            english="DAILY MICRO-QUESTS"
            title="3 分钟碎片微闯关"
            subtitle="坐电梯、排队买咖啡时顺手划两道，即时出解析，自动累积平时分与积分。"
            action={
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'foundation', 'practice', 'synthesis'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRealmFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                      realmFilter === key
                        ? 'bg-[#1E2B4A] text-[#FAF7F2]'
                        : 'bg-[#F3EEE4] text-[#6E665C] hover:bg-[#E8DEC8]'
                    }`}
                  >
                    {key === 'all' ? '全部境域' : REALM_META[key].title}
                  </button>
                ))}
              </div>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredQuests.map((quest) => {
              const kp = knowledgePoints.find((k) => k.id === quest.kpId);
              const picked = quest.completed ? quest.selectedIndex : draftChoice[quest.id];
              const isAnswered = Boolean(quest.completed);
              const isCorrect = isAnswered && quest.selectedIndex === quest.correctIndex;

              return (
                <div key={quest.id} className="editorial-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#EFE8DC] text-[#1E2B4A] font-medium">
                          {kp?.code} {kp?.title}
                        </span>
                        {quest.isTeacherPublished && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#B38B4D]/18 text-[#8A672F] font-medium">
                            老师刚发布
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#7A7267] flex items-center gap-2">
                        <span>⏱ {quest.durationMin} 分钟</span>
                        <span className="text-[#B38B4D] font-medium">+{quest.xpReward} pt</span>
                      </span>
                    </div>

                    <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">{quest.title}</h3>
                    <p className="text-sm text-[#3B3732] mt-2.5 leading-relaxed bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#ECE4D6]">
                      {quest.question}
                    </p>

                    <div className="mt-4 space-y-2">
                      {quest.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        let style = 'bg-[#FAF7F2] border-[#E4DCCE] text-[#2F2C27] hover:border-[#B38B4D]';
                        if (isAnswered) {
                          if (idx === quest.correctIndex) {
                            style = 'bg-[#4B7056]/12 border-[#4B7056] text-[#2B4634] font-medium';
                          } else if (idx === quest.selectedIndex) {
                            style = 'bg-[#A94B44]/10 border-[#A94B44] text-[#83322C]';
                          } else {
                            style = 'bg-[#FAF7F2]/60 border-[#EBE4D8] text-[#8F877C]';
                          }
                        } else if (picked === idx) {
                          style = 'bg-[#1E2B4A] border-[#1E2B4A] text-[#FAF7F2]';
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => setDraftChoice((prev) => ({ ...prev, [quest.id]: idx }))}
                            className={`w-full text-left px-4 py-3 rounded-2xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${style} ${
                              isAnswered ? 'cursor-default' : 'cursor-pointer'
                            }`}
                          >
                            <span className="font-editorial font-semibold shrink-0">{letter}.</span>
                            <span className="leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#EFE8DC]">
                    {!isAnswered ? (
                      <button
                        type="button"
                        disabled={picked === undefined}
                        onClick={() => {
                          if (picked === undefined) return;
                          const correct = picked === quest.correctIndex;
                          onCompleteQuest(quest.id, picked, correct);
                          showToast(
                            correct
                              ? `回答精准！获得 +${quest.xpReward} 积分，对应知识点掌握度提升`
                              : '已记录易错点，看完下方 15 秒解析同样获得 +8 研学鼓励分'
                          );
                        }}
                        className="w-full py-2.5 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        提交并查看即时解析
                      </button>
                    ) : (
                      <div
                        className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          isCorrect
                            ? 'bg-[#4B7056]/10 text-[#2E4A37] border border-[#4B7056]/25'
                            : 'bg-[#B87D3B]/10 text-[#6F481B] border border-[#B87D3B]/25'
                        }`}
                      >
                        <div className="font-semibold mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{isCorrect ? '通关成功 · 掌握度已点亮' : '已为你精准排雷 · 建议收藏此解析'}</span>
                        </div>
                        <p>{quest.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AI SOCRATIC TUTOR */}
      {activeTab === 'tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Settings & Quick Prompts */}
          <div className="lg:col-span-4 space-y-4">
            <div className="editorial-card rounded-3xl p-5 bg-[#F6F1E7]/80">
              <span className="micro-label">TUTOR PERSONA · 选择私教风格</span>
              <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A] mt-1">
                零压力课下苏格拉底私教
              </h3>
              <p className="text-xs text-[#6E665C] mt-1 leading-relaxed">
                严格围绕本课大纲分步点拨，不给直接抄袭模板；遇到真难题可一键汇总给老师。
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'gentle', label: '温柔学姐', desc: '耐心拆步' },
                    { key: 'concise', label: '干练考神', desc: '直击考点' },
                    { key: 'mentor', label: '严谨导师', desc: '启发反问' },
                  ] as { key: TutorPersona; label: string; desc: string }[]
                ).map((p) => {
                  const active = aiConfig.persona === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => onChangePersona(p.key)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        active
                          ? 'bg-[#1E2B4A] text-[#FAF7F2] border-[#1E2B4A]'
                          : 'bg-[#FAF7F2] text-[#1E2B4A] border-[#E4DCCE] hover:border-[#B38B4D]'
                      }`}
                    >
                      <div className="text-xs font-medium">{p.label}</div>
                      <div className={`text-[10px] mt-0.5 ${active ? 'text-[#D5B984]' : 'text-[#7A7267]'}`}>
                        {p.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="editorial-card rounded-3xl p-5">
              <span className="micro-label">SUGGESTED PROMPTS · 猜你想问</span>
              <div className="mt-3 space-y-2">
                {[
                  '贝叶斯公式里先验和似然总是代反怎么办？',
                  '实验03 过拟合拐点怎么判断，能不能给我个检查清单？',
                  '大模型写文献综述怎么防止它胡编引用？',
                  'A* 算法为什么宁可低估也不能高估？',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendChat(prompt)}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E4DCCE] hover:border-[#B38B4D] text-xs text-[#2F2C27] transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#B38B4D] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Chat Window */}
          <div className="lg:col-span-8 editorial-card rounded-3xl flex flex-col h-[540px] sm:h-[600px] overflow-hidden bg-[#FAF7F2]">
            <div className="px-5 py-3.5 border-b border-[#E4DCCE] bg-[#F4EFE5]/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1E2B4A] text-[#D5B984] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#1E2B4A]">知境 AI 研学助教</div>
                  <div className="text-[11px] text-[#7A7267]">
                    {aiConfig.mode === 'custom' && aiConfig.apiKey
                      ? `已直连 ${aiConfig.model}`
                      : '已挂载《人工智能与计算思维导论》全学期讲义'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeTab('community');
                  setCommunitySection('qa');
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-[#D8CCB8] text-[#1E2B4A] hover:bg-[#EFE8DC] cursor-pointer"
              >
                转交老师同问墙 →
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {chatHistory.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                        isUser
                          ? 'bg-[#1E2B4A] text-[#FAF7F2] rounded-br-sm'
                          : 'bg-[#FFFFFF] border border-[#E4DCCE] text-[#2A2622] rounded-bl-sm shadow-2xs'
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-[10px] mt-1.5 ${isUser ? 'text-[#FAF7F2]/60 text-right' : 'text-[#9A9282]'}`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
              {chatSending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E4DCCE] rounded-2xl px-4 py-3 text-xs text-[#7A7267] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B38B4D]" />
                    <span>正在结合课程讲义与你的薄弱点整理引导思路…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 sm:p-4 border-t border-[#E4DCCE] bg-[#F7F2E9]/90 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="输入课下困惑、半截思路或概念辨析…"
                className="flex-1 bg-white border border-[#DFD5C5] focus:border-[#1E2B4A] rounded-full px-4 py-2.5 text-sm outline-none text-[#1E2B4A] placeholder:text-[#9A9282]"
              />
              <button
                type="button"
                disabled={chatSending || !chatInput.trim()}
                onClick={() => handleSendChat()}
                className="w-10 h-10 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] flex items-center justify-center shrink-0 hover:bg-[#293B63] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ASSIGNMENTS + AI PRE-GRADING + 10-SECOND VERIFICATION */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <EditorialSectionHeading
              align="left"
              english="ASSIGNMENT STUDIO"
              title="课下作业提交与 AI 即时反馈"
              subtitle="交完立刻看到 AI 按评分标准的优化建议，并通过 10 秒验真追问锁定平时分。"
            />

            {/* Assignment Selector */}
            <div className="flex flex-wrap gap-2">
              {assignments.map((asg) => (
                <button
                  key={asg.id}
                  type="button"
                  onClick={() => setSelectedAsgId(asg.id)}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm border text-left transition-all cursor-pointer ${
                    selectedAsgId === asg.id
                      ? 'bg-[#1E2B4A] text-[#FAF7F2] border-[#1E2B4A]'
                      : 'bg-[#FAF7F2] text-[#1E2B4A] border-[#E4DCCE] hover:border-[#B38B4D]'
                  }`}
                >
                  <div className="font-medium">{asg.title}</div>
                  <div className={`text-[11px] mt-0.5 ${selectedAsgId === asg.id ? 'text-[#D5B984]' : 'text-[#7A7267]'}`}>
                    截止：{asg.deadline}
                  </div>
                </button>
              ))}
            </div>

            {currentAssignment && (
              <div className="editorial-card rounded-3xl p-5 sm:p-6 space-y-4">
                <div>
                  <span className="micro-label">TASK BRIEF · 作业要求与公开评分点</span>
                  <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A] mt-1">
                    {currentAssignment.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5E574D] mt-2 leading-relaxed">
                    {currentAssignment.description}
                  </p>
                </div>

                <div className="bg-[#F5F0E6] rounded-2xl p-3.5 border border-[#E4DCCE]">
                  <div className="text-xs font-semibold text-[#1E2B4A] mb-1.5">AI 初审与老师将重点看这 3 条：</div>
                  <ul className="space-y-1 text-xs text-[#645C52]">
                    {currentAssignment.rubric.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#B38B4D] font-editorial font-bold">0{i + 1}</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick Demo Fillers so the Teacher can test normal vs AI-copy detection in 1 click! */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#7A7267]">演示快捷填入：</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionText(
                        '本次实验我将学习率从 0.2 调低至 0.008 后，loss 停止震荡并平滑收敛。到第 22 轮时训练准确率升至 96%，但验证准确率卡在 79% 且验证 loss 回升，确认发生过拟合。我增加了 L2 权重衰减（1e-3）并开启早停，最终验证集提升至 88.6%，明显改善泛化能力。'
                      )
                    }
                    className="px-2.5 py-1 rounded-full bg-[#4B7056]/12 text-[#365640] hover:bg-[#4B7056]/20 cursor-pointer"
                  >
                    填入认真作答示例
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionText(
                        '综上所述，随着人工智能的飞速发展，梯度下降算法具有重要意义。一方面学习率不能太大也不能太小；另一方面过拟合可以通过正则化解决。总而言之，合理调参非常关键。'
                      )
                    }
                    className="px-2.5 py-1 rounded-full bg-[#B87D3B]/14 text-[#8A5922] hover:bg-[#B87D3B]/22 cursor-pointer"
                  >
                    填入疑似抄AI模板（测试拦截）
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="在这里写下你的真实实验观察、思考步骤或方案要点…"
                  className="w-full rounded-2xl bg-white border border-[#DFD5C5] focus:border-[#1E2B4A] p-4 text-sm text-[#1E2B4A] outline-none leading-relaxed"
                />

                <button
                  type="button"
                  disabled={submitting || !submissionText.trim()}
                  onClick={handleSubmitAssignment}
                  className="w-full py-3 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] text-sm font-medium hover:bg-[#293B63] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI 正在按评分标准初审并生成 10 秒验真题…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#D5B984]" />
                      <span>提交作业 · 获取 AI 即时诊断与 10 秒验真</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: 10-Second Verification Gate + My Submission History */}
          <div className="lg:col-span-5 space-y-5">
            {activeVerificationSub ? (
              <div className="rounded-3xl p-5 sm:p-6 border-2 border-[#B38B4D] bg-[#FAF7F2] shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <span className="micro-label text-[#9E7B42]">10-SECOND VERIFICATION · 防糊弄轻验真</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#1E2B4A] text-[#FAF7F2]">
                    AI 初评 {activeVerificationSub.aiScore} 分
                  </span>
                </div>

                {activeVerificationSub.aiFlag !== 'normal' && (
                  <div className="rounded-2xl p-3 bg-[#A94B44]/10 border border-[#A94B44]/30 text-xs text-[#85322C] flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>AI 温馨提醒：</strong>
                      {activeVerificationSub.aiFlagReason}
                    </div>
                  </div>
                )}

                <div className="text-xs text-[#5E574D] bg-[#F4EFE5] p-3.5 rounded-2xl space-y-1">
                  <div>
                    <strong className="text-[#1E2B4A]">AI 一句话诊断：</strong>
                    {activeVerificationSub.aiSummary}
                  </div>
                  <div className="text-[#4B7056]">✓ 亮点：{activeVerificationSub.aiStrengths.join('；')}</div>
                  <div className="text-[#936027]">△ 可优化：{activeVerificationSub.aiGaps.join('；')}</div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#E4DCCE]">
                  <div className="text-xs font-semibold text-[#1E2B4A] mb-1">
                    只需 10 秒回答这句追问，即可锁定验真通关与 +15 积分：
                  </div>
                  <p className="font-editorial text-base text-[#1E2B4A] leading-relaxed">
                    “{activeVerificationSub.verificationQuestion}”
                  </p>
                  <input
                    type="text"
                    value={verifyAnswer}
                    onChange={(e) => setVerifyAnswer(e.target.value)}
                    placeholder="用自己的一句大白话回答即可…"
                    className="mt-3 w-full rounded-xl bg-[#FAF7F2] border border-[#DFD5C5] px-3.5 py-2.5 text-sm outline-none focus:border-[#1E2B4A]"
                  />
                  <button
                    type="button"
                    disabled={verifying || !verifyAnswer.trim()}
                    onClick={handleRunVerification}
                    className="mt-3 w-full py-2.5 rounded-full bg-[#B38B4D] hover:bg-[#9C763B] disabled:bg-[#D5CCBE] text-[#FAF7F2] text-sm font-medium transition-colors cursor-pointer"
                  >
                    {verifying ? '正在核验理解度…' : '提交 10 秒验真答案'}
                  </button>
                </div>

                {verifyFeedback && (
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      verifyFeedback.passed
                        ? 'bg-[#4B7056]/12 text-[#2E4D38]'
                        : 'bg-[#B87D3B]/14 text-[#7D4F1B]'
                    }`}
                  >
                    {verifyFeedback.feedback}
                  </div>
                )}
              </div>
            ) : (
              <div className="editorial-card rounded-3xl p-5 sm:p-6 bg-[#F6F1E7]/70">
                <span className="micro-label">HOW IT WORKS</span>
                <h4 className="font-editorial text-xl font-semibold text-[#1E2B4A] mt-1">
                  为什么多一道“10 秒验真”？
                </h4>
                <p className="text-xs sm:text-sm text-[#6A6258] mt-2 leading-relaxed">
                  与其严防死守不让用工具，不如用一道 10 秒钟的大白话追问，确认你真的读懂了自己交上去的内容。验真通过后，老师在后台一眼放行，还能直接领额外积分。
                </p>
              </div>
            )}

            {/* My Submitted History */}
            <div className="editorial-card rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-editorial text-lg font-semibold text-[#1E2B4A]">我的提交记录</h4>
                <span className="text-xs text-[#7A7267]">共 {mySubmissions.length} 份</span>
              </div>
              {mySubmissions.length === 0 ? (
                <p className="text-xs text-[#7A7267] py-4 text-center">
                  本学期尚未提交作业，点击左侧试试提交并体验 AI 初审 + 10 秒验真吧！
                </p>
              ) : (
                <div className="space-y-2.5">
                  {mySubmissions.map((sub) => (
                    <div key={sub.id} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E4DCCE] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#1E2B4A]">AI 初评 {sub.aiScore} 分</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            sub.status === 'approved'
                              ? 'bg-[#4B7056]/15 text-[#365640]'
                              : 'bg-[#B38B4D]/15 text-[#8A652D]'
                          }`}
                        >
                          {sub.status === 'approved' ? '老师已确认' : '已推送教师队列'}
                        </span>
                      </div>
                      <p className="text-[#6E665C] line-clamp-2">{sub.aiSummary}</p>
                      <div className="text-[11px] text-[#7A7267]">
                        10 秒验真：{sub.verificationPassed ? '✓ 已通关' : '待完成'} · {sub.submittedAt}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANONYMOUS Q&A UPVOTE WALL + PERKS SHOP */}
      {activeTab === 'community' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-full bg-[#EFE8DC] border border-[#E4DCCE]">
              <button
                type="button"
                onClick={() => setCommunitySection('qa')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                  communitySection === 'qa' ? 'bg-[#1E2B4A] text-[#FAF7F2] font-medium' : 'text-[#6A6258]'
                }`}
              >
                匿名同问热力墙（{questions.length}）
              </button>
              <button
                type="button"
                onClick={() => setCommunitySection('perks')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                  communitySection === 'perks' ? 'bg-[#1E2B4A] text-[#FAF7F2] font-medium' : 'text-[#6A6258]'
                }`}
              >
                研学特权兑换铺（余额 {student.points} pt）
              </button>
            </div>
          </div>

          {communitySection === 'qa' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Post New Anonymous Question */}
              <div className="lg:col-span-4 editorial-card rounded-3xl p-5 h-fit bg-[#F6F1E7]/80 space-y-3.5">
                <span className="micro-label">ASK SAFELY · 零社死提问</span>
                <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">
                  把卡壳抛出来，同学一起点 +1
                </h3>
                <select
                  value={newQKpId}
                  onChange={(e) => setNewQKpId(e.target.value)}
                  className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3 py-2 text-xs sm:text-sm text-[#1E2B4A] outline-none"
                >
                  {knowledgePoints.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      绑定考点：{kp.code} {kp.title}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={newQContent}
                  onChange={(e) => setNewQContent(e.target.value)}
                  placeholder="描述你具体卡在哪一步、哪个概念绕不过弯…"
                  className="w-full rounded-2xl bg-white border border-[#DFD5C5] p-3 text-sm outline-none focus:border-[#1E2B4A]"
                />
                <label className="flex items-center gap-2 text-xs text-[#5E574D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newQAnon}
                    onChange={(e) => setNewQAnon(e.target.checked)}
                    className="accent-[#1E2B4A]"
                  />
                  <span>对同学匿名展示（仅系统留痕，大胆提问不尴尬）</span>
                </label>
                <button
                  type="button"
                  disabled={!newQContent.trim()}
                  onClick={handlePostQuestion}
                  className="w-full py-2.5 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] text-sm font-medium cursor-pointer"
                >
                  发布到同问墙（+10 研学积分）
                </button>
              </div>

              {/* Upvoted Question Cards */}
              <div className="lg:col-span-8 space-y-4">
                {[...questions]
                  .sort((a, b) => b.upvotes - a.upvotes)
                  .map((q) => {
                    const kp = knowledgePoints.find((k) => k.id === q.kpId);
                    return (
                      <div key={q.id} className="editorial-card rounded-3xl p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EFE8DC] text-[#1E2B4A] font-medium">
                              {kp?.code} {kp?.title}
                            </span>
                            <span className="text-[#7A7267]">
                              {q.isAnonymous ? '匿名研学者' : q.authorName} · {q.createdAt}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUpvoteQuestion(q.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                              q.upvotedByMe
                                ? 'bg-[#1E2B4A] text-[#FAF7F2] border-[#1E2B4A]'
                                : 'bg-[#FAF7F2] text-[#1E2B4A] border-[#D8CCB8] hover:border-[#B38B4D]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>同问 +1 ({q.upvotes})</span>
                          </button>
                        </div>

                        <h4 className="font-editorial text-lg font-semibold text-[#1E2B4A]">{q.clusterTitle}</h4>
                        <p className="text-xs sm:text-sm text-[#4F4840] leading-relaxed">{q.content}</p>

                        {q.officialReply ? (
                          <div className="rounded-2xl bg-[#4B7056]/8 border border-[#4B7056]/25 p-3.5 space-y-2.5">
                            <div className="text-xs font-semibold text-[#33523D] flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>老师统一答复（已推送全部 {q.upvotes} 位同问同学）</span>
                            </div>
                            <p className="text-xs sm:text-sm text-[#2C3E32] leading-relaxed">{q.officialReply}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[11px] text-[#5C6E61]">看完答复后是否真懂了？</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onConfirmQuestionStatus(q.id, 'understood');
                                  showToast('太棒了！已记录为“彻底懂了”');
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer ${
                                  q.studentConfirmed === 'understood'
                                    ? 'bg-[#4B7056] text-white'
                                    : 'bg-white border border-[#C9D6CC] text-[#365640]'
                                }`}
                              >
                                ✓ 彻底懂了
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onConfirmQuestionStatus(q.id, 'still_confused');
                                  showToast('已标红回流到老师待办，下阶段重点为你补充拆解');
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer ${
                                  q.studentConfirmed === 'still_confused'
                                    ? 'bg-[#A94B44] text-white'
                                    : 'bg-white border border-[#E2C9C6] text-[#8E3933]'
                                }`}
                              >
                                还是有点懵（回流老师）
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-[#F5F0E6] border border-[#E4DCCE] p-3.5 text-xs text-[#5D564C]">
                            <div className="font-semibold text-[#8E6B35] mb-1 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> AI 助教先行思路（老师统一答复前可参考）：
                            </div>
                            <p className="leading-relaxed">{q.aiDraftReply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* PERKS EXCHANGE SHOP */
            <div className="space-y-5">
              <div className="rounded-3xl navy-editorial-band p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] tracking-[0.22em] uppercase text-[#D5B984]">
                    SCHOLARLY REWARDS · 实在好用的课下小特权
                  </div>
                  <h3 className="font-editorial text-2xl font-semibold mt-1">
                    平时踏实研学攒积分，关键时刻真的能救急
                  </h3>
                  <p className="text-xs text-[#FAF7F2]/75 mt-1">
                    所有特权均在老师运营端设定限额与规则，既提升学生主动性，又保证课程公平严谨。
                  </p>
                </div>
                <div className="px-5 py-3 rounded-2xl bg-[#FAF7F2]/10 border border-[#D5B984]/40 text-center shrink-0">
                  <div className="text-[11px] text-[#D5B984]">当前可用积分</div>
                  <div className="font-editorial text-3xl font-semibold">{student.points} pt</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {perks.map((perk) => {
                  const canAfford = student.points >= perk.costPoints;
                  const reachedLimit = perk.redeemedByMe >= perk.limitPerTerm;
                  return (
                    <div key={perk.id} className="editorial-card rounded-3xl p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#EFE8DC] text-[#8A652D] font-medium">
                            {perk.badgeLabel}
                          </span>
                          <span className="text-xs text-[#7A7267]">
                            余 {perk.stockLeft} 份 · 每人限兑 {perk.limitPerTerm} 次
                          </span>
                        </div>
                        <h4 className="font-editorial text-xl font-semibold text-[#1E2B4A]">{perk.title}</h4>
                        <p className="text-xs sm:text-sm text-[#6A6258] mt-1.5 leading-relaxed">{perk.subtitle}</p>
                      </div>
                      <div className="mt-4 pt-3.5 border-t border-[#EFE8DC] flex items-center justify-between">
                        <div className="font-editorial text-2xl font-semibold text-[#B38B4D]">
                          {perk.costPoints} <span className="text-xs font-sans font-normal text-[#7A7267]">pt</span>
                        </div>
                        <button
                          type="button"
                          disabled={!canAfford || reachedLimit || perk.stockLeft <= 0}
                          onClick={() => {
                            onRedeemPerk(perk.id);
                            showToast(`已成功兑换「${perk.title}」，凭证已同步至教师端档案`);
                          }}
                          className="px-4 py-2 rounded-full bg-[#1E2B4A] disabled:bg-[#D2C9BA] text-[#FAF7F2] text-xs sm:text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                          {reachedLimit
                            ? '已达本学期限额'
                            : !canAfford
                            ? `还差 ${perk.costPoints - student.points} pt`
                            : '立即兑换'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIFESAVER CHEAT SHEET MODAL */}
      {lifesaverOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1E2B4A]/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setLifesaverOpen(false)}
        >
          <div
            className="w-full sm:max-w-xl bg-[#FAF7F2] rounded-t-3xl sm:rounded-3xl border border-[#E4DCCE] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E4DCCE] flex items-center justify-between bg-[#F4EFE5]">
              <div>
                <div className="micro-label text-[#9E7B42]">AI LIFESAVER PACK</div>
                <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">
                  专属 15 分钟考前急救包
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLifesaverOpen(false)}
                className="text-xs px-3 py-1 rounded-full border border-[#D8CCB8] text-[#6E665C] cursor-pointer"
              >
                关闭
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-[#2E2A25] leading-relaxed whitespace-pre-line">
              {lifesaverLoading ? (
                <div className="py-12 flex flex-col items-center gap-3 text-[#7A7267]">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B38B4D]" />
                  <span>AI 正在汇总你的薄弱知识点与避坑清单…</span>
                </div>
              ) : (
                lifesaverText
              )}
            </div>
            {!lifesaverLoading && (
              <div className="px-6 py-3.5 border-t border-[#E4DCCE] flex justify-end gap-2 bg-[#F4EFE5]/70">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(lifesaverText);
                    showToast('已复制考前急救单，可直接发到手机备忘录');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-xs font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制急救笔记</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>

      {/* MOBILE FLOATING EDITORIAL BOTTOM NAV BAR */}
      <nav
        aria-label="学生端手机底部导航"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 no-print bg-[#FAF7F2]/95 backdrop-blur-lg border-t border-[#E4DCCE] shadow-[0_-6px_24px_-12px_rgba(30,43,74,0.14)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 gap-1">
          {STUDENT_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChangeTab(tab.key)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors cursor-pointer ${
                  active ? 'text-[#1E2B4A] bg-[#EFE8DC]/90 font-medium' : 'text-[#7A7267]'
                }`}
              >
                <span className={active ? 'text-[#B38B4D]' : ''}>{tab.icon}</span>
                <span className="text-[10px] mt-0.5">{tab.short}</span>
                {tab.key === 'quests' && pendingQuests.length > 0 && (
                  <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[#B38B4D]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
