import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  CornerDownLeft,
  FileCheck2,
  Gift,
  GripVertical,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  evaluateVerificationAnswer,
  generateLifesaverGuide,
  generateTutorReply,
  preGradeSubmission,
} from '../services/aiService';
import { AppState, Submission, TutorPersona } from '../types';
import { GroupHeader, StatusDot } from './MinimalWidgets';
import { NavItemDef } from './WorkspaceShell';

export type StudentTab = 'tasks' | 'tutor' | 'assignments' | 'community';

export function getStudentNavItems(state: AppState): NavItemDef[] {
  const pendingQuests = state.microQuests.filter((q) => !q.completed).length;
  const openQs = state.questions.length;
  return [
    { key: 'tasks', label: '课后待办', short: '待办', count: pendingQuests, icon: <Inbox className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'tutor', label: 'AI 助教', short: '助教', icon: <Bot className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'assignments', label: '作业验真', short: '作业', count: state.assignments.length, icon: <FileCheck2 className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'community', label: '同问 · 积分', short: '同问', count: openQs, icon: <MessageSquare className="w-[17px] h-[17px] stroke-[1.6]" /> },
  ];
}

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

  // Tasks tab state
  const [quickQuestion, setQuickQuestion] = useState('');
  const [openPending, setOpenPending] = useState(true);
  const [openMastery, setOpenMastery] = useState(true);
  const [openDone, setOpenDone] = useState(false);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(microQuests.find((q) => !q.completed)?.id || null);
  const [draftChoice, setDraftChoice] = useState<Record<string, number>>({});
  const [lifesaverOpen, setLifesaverOpen] = useState(false);
  const [lifesaverLoading, setLifesaverLoading] = useState(false);
  const [lifesaverText, setLifesaverText] = useState('');

  // Tutor state
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Assignments state
  const [selectedAsgId, setSelectedAsgId] = useState(assignments[0]?.id || '');
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeVerifySub, setActiveVerifySub] = useState<Submission | null>(null);
  const [verifyAnswer, setVerifyAnswer] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{ passed: boolean; feedback: string } | null>(null);

  // Community state
  const [communityMode, setCommunityMode] = useState<'qa' | 'perks'>('qa');
  const [newQKpId, setNewQKpId] = useState(knowledgePoints[1]?.id || knowledgePoints[0].id);
  const [newQContent, setNewQContent] = useState('');
  const [newQAnon, setNewQAnon] = useState(true);
  const [expandedQId, setExpandedQId] = useState<string | null>(questions[0]?.id || null);

  const pendingQuests = useMemo(() => microQuests.filter((q) => !q.completed), [microQuests]);
  const doneQuests = useMemo(() => microQuests.filter((q) => q.completed), [microQuests]);
  const weakestKp = useMemo(
    () => [...knowledgePoints].sort((a, b) => (student.mastery[a.id] ?? 0) - (student.mastery[b.id] ?? 0))[0],
    [knowledgePoints, student.mastery]
  );

  const currentAsg = assignments.find((a) => a.id === selectedAsgId) || assignments[0];
  const mySubmissions = submissions.filter((s) => s.studentId === student.id);

  const handleQuickCapture = () => {
    if (!quickQuestion.trim()) return;
    onAskQuestion(weakestKp.id, quickQuestion.trim(), true);
    setQuickQuestion('');
    showToast('已匿名存入同问墙（+10 pt）');
  };

  const handleOpenLifesaver = async () => {
    setLifesaverOpen(true);
    setLifesaverLoading(true);
    const md = await generateLifesaverGuide(student, knowledgePoints, aiConfig);
    setLifesaverText(md);
    setLifesaverLoading(false);
  };

  const handleSendChat = async (preset?: string) => {
    const text = (preset ?? chatInput).trim();
    if (!text || chatSending) return;
    setChatInput('');
    setChatSending(true);
    const { reply, matchedKpId } = await generateTutorReply(text, student, knowledgePoints, aiConfig);
    onAddChatMessages(text, reply, matchedKpId);
    setChatSending(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  const handleSubmitAsg = async () => {
    if (!submissionText.trim() || !currentAsg || submitting) return;
    setSubmitting(true);
    const res = await preGradeSubmission(submissionText, currentAsg.rubric, currentAsg.title, aiConfig);
    const sub: Submission = {
      id: `sub-${Date.now()}`,
      assignmentId: currentAsg.id,
      studentId: student.id,
      studentName: student.name,
      studentNo: student.studentNo,
      content: submissionText.trim(),
      submittedAt: '刚刚',
      aiScore: res.aiScore,
      aiSummary: res.aiSummary,
      aiStrengths: res.aiStrengths,
      aiGaps: res.aiGaps,
      aiFlag: res.aiFlag,
      aiFlagReason: res.aiFlagReason,
      status: 'pending_review',
      verificationQuestion: res.verificationQuestion,
      verificationPassed: !state.opsConfig.automation.antiCopyVerify,
    };
    onCreateSubmission(sub);
    setSubmitting(false);
    setSubmissionText('');
    if (state.opsConfig.automation.antiCopyVerify) {
      setActiveVerifySub(sub);
      setVerifyAnswer('');
      setVerifyFeedback(null);
    } else {
      showToast(`已提交，AI 初评 ${sub.aiScore}`);
    }
  };

  const handleVerify = async () => {
    if (!activeVerifySub || !verifyAnswer.trim() || verifying) return;
    setVerifying(true);
    const res = await evaluateVerificationAnswer(verifyAnswer, aiConfig);
    setVerifyFeedback(res);
    setVerifying(false);
    if (res.passed) {
      onVerifySubmission(activeVerifySub.id, true);
      showToast('验真通过，+15 pt');
    }
  };

  return (
    <div className="space-y-5">
      {/* TAB 1: TASKS & MICRO-QUESTS (Matches Reference "Todo's" Aesthetics Directly) */}
      {activeTab === 'tasks' && (
        <>
          {/* Clean Header + Minimal Metric Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">课后研学</h1>
              <span className="text-[12px] text-[#7A869A]">{student.name}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[12px] tabular">
              <span className="px-2.5 py-1 rounded-[8px] bg-white/75 border border-white text-[#141928] font-medium">
                预测 {student.predictedGrade}
              </span>
              <span className="px-2.5 py-1 rounded-[8px] bg-white/55 text-[#4C586D]">
                连胜 {student.streakDays}d
              </span>
              <span className="px-2.5 py-1 rounded-[8px] bg-white/55 text-[#4C586D]">
                {student.points} pt
              </span>
              <button
                type="button"
                onClick={handleOpenLifesaver}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#141928] text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>考前急救单</span>
              </button>
            </div>
          </div>

          {/* Signature Recessed Quick-Input Bar (+ Add question, press ENTER) */}
          <div className="recessed-input rounded-[13px] px-3.5 py-2.5 flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-[#6B7689] shrink-0" />
            <input
              type="text"
              value={quickQuestion}
              onChange={(e) => setQuickQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickCapture()}
              placeholder="记一条课下疑问，匿名发至同问墙…"
              className="flex-1 bg-transparent text-[13px] text-[#141928] placeholder:text-[#7C8799] outline-none min-w-0"
            />
            <button
              type="button"
              onClick={handleQuickCapture}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-white/70 border border-slate-900/10 text-[11px] text-[#5B677B] hover:text-[#141928] cursor-pointer shrink-0"
            >
              <CornerDownLeft className="w-3 h-3" />
              <span>ENTER</span>
            </button>
          </div>

          {/* Group 1: Pending Micro-Quests */}
          <div>
            <GroupHeader
              title="待完成微测"
              count={pendingQuests.length}
              open={openPending}
              onToggle={() => setOpenPending((v) => !v)}
            />

            {openPending && (
              <div className="space-y-2 mt-1">
                {pendingQuests.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[12px] text-[#7A869A]">全部微测已完成</div>
                ) : (
                  pendingQuests.map((q) => {
                    const kp = knowledgePoints.find((k) => k.id === q.kpId);
                    const expanded = activeQuestId === q.id;
                    const picked = draftChoice[q.id];

                    return (
                      <div key={q.id} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setActiveQuestId(expanded ? null : q.id)}
                          className={`w-full px-3 py-2.5 rounded-[12px] flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                            expanded ? 'hatched-row' : 'glacial-card-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-[#9AA6B8] shrink-0" />
                            <span className="id-chip px-2 py-0.5 rounded-[7px] text-[11px] font-medium inline-flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-[#637085]" />
                              {q.code}
                            </span>
                            <span className="text-[13px] font-medium text-[#1C2436] truncate">{q.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#7A869A] shrink-0 tabular">
                            <span className="hidden sm:inline">{kp?.code}</span>
                            <span>{q.durationMin}m</span>
                            <span className="text-[#141928] font-medium">+{q.xpReward}</span>
                          </div>
                        </button>

                        {expanded && (
                          <div className="glacial-card rounded-[16px] p-4 space-y-3">
                            <p className="text-[13px] text-[#1C2436] leading-relaxed">{q.question}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, idx) => {
                                const selected = picked === idx;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setDraftChoice((p) => ({ ...p, [q.id]: idx }))}
                                    className={`px-3 py-2.5 rounded-[10px] text-left text-[12.5px] border transition-all flex items-center gap-2 cursor-pointer ${
                                      selected
                                        ? 'bg-[#141928] text-white border-[#141928]'
                                        : 'bg-white/75 text-[#2C3548] border-slate-900/[0.07] hover:border-slate-900/20'
                                    }`}
                                  >
                                    <span className="text-[11px] opacity-65 font-mono">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={picked === undefined}
                                onClick={() => {
                                  if (picked === undefined) return;
                                  const ok = picked === q.correctIndex;
                                  onCompleteQuest(q.id, picked, ok);
                                  setActiveQuestId(null);
                                  showToast(ok ? `正确 · +${q.xpReward} pt` : `已记录错点 · ${q.explanation}`);
                                }}
                                className="px-4 py-1.5 rounded-[9px] bg-[#141928] disabled:bg-[#C7D2DF] text-white text-[12px] font-medium cursor-pointer"
                              >
                                确认提交
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Group 2: Compact 6-Point Mastery */}
          <div>
            <GroupHeader
              title="知识掌握度"
              count={knowledgePoints.length}
              open={openMastery}
              onToggle={() => setOpenMastery((v) => !v)}
            />
            {openMastery && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {knowledgePoints.map((kp) => {
                  const val = student.mastery[kp.id] ?? 0;
                  const tone = val >= 80 ? 'ok' : val >= 65 ? 'warn' : 'risk';
                  return (
                    <button
                      key={kp.id}
                      type="button"
                      onClick={() => {
                        onChangeTab('tutor');
                        handleSendChat(`讲解 ${kp.code} ${kp.title} 的核心要点`);
                      }}
                      className="glacial-card-subtle rounded-[12px] px-3.5 py-2.5 text-left cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusDot tone={tone} />
                          <span className="text-[11px] font-mono text-[#7A869A]">{kp.code}</span>
                          <span className="text-[13px] font-medium text-[#1C2436] truncate">{kp.title}</span>
                        </div>
                        <span className="text-[12px] font-semibold text-[#141928] tabular">{val}%</span>
                      </div>
                      <div className="h-[3px] rounded-full bg-[#DCE4EC] overflow-hidden">
                        <div className="h-full rounded-full bg-[#141928]" style={{ width: `${val}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 3: Completed */}
          <div>
            <GroupHeader
              title="已完成"
              count={doneQuests.length}
              open={openDone}
              onToggle={() => setOpenDone((v) => !v)}
            />
            {openDone && (
              <div className="space-y-1.5 mt-1">
                {doneQuests.map((q) => (
                  <div
                    key={q.id}
                    className="px-3 py-2 rounded-[11px] bg-white/45 border border-white/70 flex items-center justify-between text-[12.5px] text-[#6B7689]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-3.5 h-3.5 text-[#2E7D5B] shrink-0" />
                      <span className="font-mono text-[11px]">{q.code}</span>
                      <span className="truncate line-through decoration-slate-400/60">{q.title}</span>
                    </div>
                    <span className="text-[11px] tabular">+{q.xpReward}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: MINIMAL AI SOCRATIC TUTOR */}
      {activeTab === 'tutor' && (
        <div className="flex flex-col h-[540px] lg:h-[640px]">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-900/[0.06]">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">AI 助教</h1>
            <div className="inline-flex p-0.5 rounded-[9px] bg-[#D9E2EC]/80">
              {(
                [
                  { key: 'gentle', label: '引导' },
                  { key: 'concise', label: '精简' },
                  { key: 'mentor', label: '反问' },
                ] as { key: TutorPersona; label: string }[]
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onChangePersona(p.key)}
                  className={`px-2.5 py-1 rounded-[7px] text-[12px] transition-all cursor-pointer ${
                    aiConfig.persona === p.key ? 'bg-white text-[#141928] font-medium shadow-2xs' : 'text-[#627084]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Topic Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
            {['区分先验与似然', '判断过拟合拐点', '降低大模型幻觉', 'A* 可采纳条件'].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendChat(prompt)}
                className="px-2.5 py-1 rounded-[8px] bg-white/70 border border-white text-[12px] text-[#3B475C] hover:bg-white whitespace-nowrap cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Clean Message Thread */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {chatHistory.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-[#141928] text-white'
                        : 'glacial-card text-[#1F2739]'
                    }`}
                  >
                    {m.content}
                    <div className={`text-[10px] mt-1 ${isUser ? 'text-white/55 text-right' : 'text-[#8B97AA]'}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}
            {chatSending && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[12px] bg-white/75 text-[12px] text-[#6B7689]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>思考中</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Recessed Prompt Bar */}
          <div className="recessed-input rounded-[13px] px-3 py-2 flex items-center gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="输入问题或思路，按 ENTER 发送…"
              className="flex-1 bg-transparent text-[13px] text-[#141928] placeholder:text-[#7C8799] outline-none"
            />
            <button
              type="button"
              disabled={chatSending || !chatInput.trim()}
              onClick={() => handleSendChat()}
              className="w-8 h-8 rounded-[9px] bg-[#141928] disabled:bg-[#C6D1DE] text-white flex items-center justify-center cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS + 10S VERIFICATION */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">作业验真</h1>
            <div className="flex gap-1.5">
              {assignments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAsgId(a.id)}
                  className={`px-2.5 py-1 rounded-[8px] text-[12px] cursor-pointer transition-all ${
                    selectedAsgId === a.id
                      ? 'bg-[#141928] text-white font-medium'
                      : 'bg-white/65 text-[#4D596E] hover:bg-white'
                  }`}
                >
                  {a.code} · {a.deadline}
                </button>
              ))}
            </div>
          </div>

          {currentAsg && (
            <div className="glacial-card rounded-[16px] p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[14px] font-semibold text-[#141928]">{currentAsg.title}</div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionText(
                        '将学习率从 0.2 调低至 0.008 后 loss 收敛平稳。第 22 轮训练准确率 96%，验证集停在 79% 且 loss 反弹，确认过拟合。加入 L2(1e-3) 与早停后，验证准确率提升至 88.6%。'
                      )
                    }
                    className="px-2 py-0.5 rounded-[6px] bg-[#E5EDF4] text-[#2D384D] hover:bg-[#DAE4EE] cursor-pointer"
                  >
                    示例作答
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSubmissionText(
                        '综上所述，随着人工智能的飞速发展，梯度下降算法意义重大。一方面学习率要适中；另一方面过拟合可通过正则化解决。总而言之，合理调参非常关键。'
                      )
                    }
                    className="px-2 py-0.5 rounded-[6px] bg-[#E5EDF4] text-[#2D384D] hover:bg-[#DAE4EE] cursor-pointer"
                  >
                    模板测试
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentAsg.rubric.map((r, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-[6px] bg-[#ECF1F6] text-[#536075]">
                    {i + 1}. {r}
                  </span>
                ))}
              </div>

              <textarea
                rows={4}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="输入实验观察、拐点数值与改进结论…"
                className="w-full rounded-[12px] bg-[#F2F6FA] border border-slate-900/[0.08] focus:border-[#141928]/35 focus:bg-white p-3 text-[13px] text-[#141928] outline-none transition-colors"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submitting || !submissionText.trim()}
                  onClick={handleSubmitAsg}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#141928] disabled:bg-[#C6D1DE] text-white text-[12.5px] font-medium cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'AI 初评中' : '提交并验真'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 10-Second Verification Panel */}
          {activeVerifySub && (
            <div className="glacial-card rounded-[16px] p-4 sm:p-5 space-y-3 border-[#141928]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#141928]">
                  <StatusDot tone={activeVerifySub.aiFlag === 'normal' ? 'ok' : 'risk'} />
                  <span>10 秒验真</span>
                </div>
                <span className="id-chip px-2 py-0.5 rounded-[6px] text-[11px] font-medium">
                  AI {activeVerifySub.aiScore}
                </span>
              </div>

              {activeVerifySub.aiFlag !== 'normal' && (
                <div className="text-[12px] text-[#8E3939] bg-[#B84A4A]/[0.07] px-3 py-2 rounded-[9px]">
                  {activeVerifySub.aiFlagReason}
                </div>
              )}

              <div className="text-[12.5px] text-[#4C586D]">{activeVerifySub.aiSummary}</div>
              <div className="text-[13px] font-medium text-[#141928] pt-1">
                追问：{activeVerifySub.verificationQuestion}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyAnswer}
                  onChange={(e) => setVerifyAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  placeholder="一句话作答…"
                  className="flex-1 rounded-[10px] bg-[#F2F6FA] border border-slate-900/10 px-3 py-2 text-[13px] outline-none focus:bg-white"
                />
                <button
                  type="button"
                  disabled={verifying || !verifyAnswer.trim()}
                  onClick={handleVerify}
                  className="px-4 py-2 rounded-[10px] bg-[#141928] disabled:bg-[#C6D1DE] text-white text-[12px] font-medium cursor-pointer shrink-0"
                >
                  {verifying ? '核验中' : '确认'}
                </button>
              </div>

              {verifyFeedback && (
                <div className={`text-[12px] ${verifyFeedback.passed ? 'text-[#2E7D5B]' : 'text-[#A66A20]'}`}>
                  {verifyFeedback.feedback}
                </div>
              )}
            </div>
          )}

          {/* My Submissions List */}
          {mySubmissions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[12px] font-medium text-[#6B7689] px-1">提交记录</div>
              {mySubmissions.map((s) => (
                <div
                  key={s.id}
                  className="glacial-card-subtle rounded-[11px] px-3 py-2.5 flex items-center justify-between text-[12.5px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="id-chip px-2 py-0.5 rounded-[6px] text-[11px] font-medium">AI {s.aiScore}</span>
                    <span className="truncate text-[#263042]">{s.aiSummary}</span>
                  </div>
                  <span className="text-[11px] text-[#6B7689] shrink-0">
                    {s.verificationPassed ? '已验真' : '待验真'} · {s.submittedAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Q&A WALL & PERKS */}
      {activeTab === 'community' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">
              {communityMode === 'qa' ? '同问墙' : '积分特权'}
            </h1>
            <div className="inline-flex p-0.5 rounded-[9px] bg-[#D9E2EC]/80">
              <button
                type="button"
                onClick={() => setCommunityMode('qa')}
                className={`px-3 py-1 rounded-[7px] text-[12px] cursor-pointer ${
                  communityMode === 'qa' ? 'bg-white text-[#141928] font-medium shadow-2xs' : 'text-[#627084]'
                }`}
              >
                同问 ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setCommunityMode('perks')}
                className={`px-3 py-1 rounded-[7px] text-[12px] cursor-pointer ${
                  communityMode === 'perks' ? 'bg-white text-[#141928] font-medium shadow-2xs' : 'text-[#627084]'
                }`}
              >
                特权 · {student.points} pt
              </button>
            </div>
          </div>

          {communityMode === 'qa' ? (
            <>
              <div className="recessed-input rounded-[13px] p-2.5 flex flex-wrap sm:flex-nowrap items-center gap-2">
                <select
                  value={newQKpId}
                  onChange={(e) => setNewQKpId(e.target.value)}
                  className="bg-white/80 rounded-[8px] px-2 py-1.5 text-[12px] text-[#2A3346] border border-slate-900/[0.08] outline-none"
                >
                  {knowledgePoints.map((kp) => (
                    <option key={kp.id} value={kp.id}>
                      {kp.code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newQContent}
                  onChange={(e) => setNewQContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newQContent.trim()) {
                      onAskQuestion(newQKpId, newQContent.trim(), newQAnon);
                      setNewQContent('');
                      showToast('已发布至同问墙 (+10 pt)');
                    }
                  }}
                  placeholder="提出具体卡点，按 ENTER 发布…"
                  className="flex-1 bg-transparent text-[13px] outline-none min-w-[160px]"
                />
                <label className="inline-flex items-center gap-1 text-[11px] text-[#6B7689] cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={newQAnon}
                    onChange={(e) => setNewQAnon(e.target.checked)}
                    className="accent-[#141928]"
                  />
                  匿名
                </label>
              </div>

              <div className="space-y-2">
                {[...questions]
                  .sort((a, b) => b.upvotes - a.upvotes)
                  .map((q) => {
                    const expanded = expandedQId === q.id;
                    return (
                      <div key={q.id} className="space-y-1.5">
                        <div
                          onClick={() => setExpandedQId(expanded ? null : q.id)}
                          className={`px-3 py-2.5 rounded-[12px] flex items-center justify-between gap-3 cursor-pointer ${
                            expanded ? 'hatched-row' : 'glacial-card-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="id-chip px-2 py-0.5 rounded-[7px] text-[11px] font-medium shrink-0">
                              {q.code}
                            </span>
                            <span className="text-[13px] font-medium text-[#1C2436] truncate">{q.clusterTitle}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpvoteQuestion(q.id);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[7px] text-[11px] tabular cursor-pointer shrink-0 ${
                              q.upvotedByMe
                                ? 'bg-[#141928] text-white'
                                : 'bg-white/80 text-[#3B475C] border border-slate-900/[0.08]'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{q.upvotes}</span>
                          </button>
                        </div>

                        {expanded && (
                          <div className="glacial-card rounded-[14px] p-4 space-y-2.5 text-[12.5px]">
                            <div className="text-[#4B576C]">{q.content}</div>
                            <div className="p-3 rounded-[10px] bg-[#EDF2F7] text-[#1F2739] leading-relaxed">
                              <span className="text-[11px] font-semibold text-[#5A677C] block mb-1">
                                {q.officialReply ? '教师统一回复' : 'AI 参考思路'}
                              </span>
                              {q.officialReply || q.aiDraftReply}
                            </div>
                            {q.officialReply && (
                              <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onConfirmQuestionStatus(q.id, 'understood');
                                    showToast('已标记已理解');
                                  }}
                                  className={`px-2.5 py-1 rounded-[7px] cursor-pointer ${
                                    q.studentConfirmed === 'understood'
                                      ? 'bg-[#141928] text-white'
                                      : 'bg-[#E5EDF4] text-[#2F3A4E]'
                                  }`}
                                >
                                  已懂
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onConfirmQuestionStatus(q.id, 'still_confused');
                                    showToast('已回流至教师待办');
                                  }}
                                  className={`px-2.5 py-1 rounded-[7px] cursor-pointer ${
                                    q.studentConfirmed === 'still_confused'
                                      ? 'bg-[#B84A4A] text-white'
                                      : 'bg-[#E5EDF4] text-[#2F3A4E]'
                                  }`}
                                >
                                  仍存疑
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {perks.map((perk) => {
                const disabled =
                  student.points < perk.costPoints || perk.redeemedByMe >= perk.limitPerTerm || perk.stockLeft <= 0;
                return (
                  <div
                    key={perk.id}
                    className="glacial-card rounded-[14px] px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="id-chip px-2 py-0.5 rounded-[6px] text-[11px] font-medium">
                          {perk.code}
                        </span>
                        <span className="text-[13.5px] font-medium text-[#141928]">{perk.title}</span>
                      </div>
                      <div className="text-[12px] text-[#6B7689] mt-1">{perk.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12.5px] font-semibold text-[#141928] tabular">{perk.costPoints} pt</span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onRedeemPerk(perk.id);
                          showToast(`已兑换 ${perk.title}`);
                        }}
                        className="px-3 py-1.5 rounded-[8px] bg-[#141928] disabled:bg-[#CBD5E1] text-white text-[12px] font-medium cursor-pointer disabled:cursor-not-allowed"
                      >
                        {perk.redeemedByMe >= perk.limitPerTerm ? '已兑' : '兑换'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Minimal Lifesaver Sheet Modal */}
      {lifesaverOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#141928]/30 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setLifesaverOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg glacial-card rounded-t-[22px] sm:rounded-[22px] max-h-[82vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-900/[0.06] flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#141928]">个人考前急救单</span>
              <button
                type="button"
                onClick={() => setLifesaverOpen(false)}
                className="p-1 rounded-[7px] text-[#6B7689] hover:bg-slate-900/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-[13px] text-[#263042] leading-relaxed whitespace-pre-line">
              {lifesaverLoading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-[#6B7689]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>生成中…</span>
                </div>
              ) : (
                lifesaverText
              )}
            </div>
            {!lifesaverLoading && (
              <div className="px-5 py-3 border-t border-slate-900/[0.06] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(lifesaverText);
                    showToast('已复制急救单');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-[#141928] text-white text-[12px] font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>复制</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
