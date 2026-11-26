import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  Grid2x2,
  Loader2,
  Lock,
  MessageSquareQuote,
  Printer,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Wand2,
  X,
} from 'lucide-react';
import {
  generateClusterReplyDraft,
  generateMicroQuestsFromNotes,
  generateTeacherReport,
} from '../services/aiService';
import { AppState, MicroQuest, StudentProfile, SubmissionStatus } from '../types';
import { EditorialSectionHeading } from './EditorialDecor';

export type TeacherTab = 'matrix' | 'review' | 'clusters' | 'studio' | 'reports';

interface TeacherPortalProps {
  state: AppState;
  activeTab: TeacherTab;
  onChangeTab: (tab: TeacherTab) => void;
  onBatchApproveNormal: () => number;
  onUpdateSubmissionStatus: (subId: string, status: SubmissionStatus, comment?: string) => void;
  onPublishClusterReply: (qId: string, reply: string) => void;
  onAddStudentNote: (studentId: string, text: string) => void;
  onTriggerGentleNudge: (studentId: string) => void;
  onPublishMicroQuests: (quests: MicroQuest[]) => void;
  showToast: (msg: string) => void;
}

const TEACHER_TABS: { key: TeacherTab; label: string; short: string; icon: React.ReactNode }[] = [
  { key: 'matrix', label: '学情热力矩阵', short: '学情', icon: <Grid2x2 className="w-4 h-4" /> },
  { key: 'review', label: 'AI 作业初审台', short: '批改', icon: <ClipboardCheck className="w-4 h-4" /> },
  { key: 'clusters', label: '共性同问聚类', short: '答疑', icon: <MessageSquareQuote className="w-4 h-4" /> },
  { key: 'studio', label: '讲义一键出题', short: '出题', icon: <Wand2 className="w-4 h-4" /> },
  { key: 'reports', label: '一键考核材料', short: '报告', icon: <FileText className="w-4 h-4" /> },
];

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  state,
  activeTab,
  onChangeTab,
  onBatchApproveNormal,
  onUpdateSubmissionStatus,
  onPublishClusterReply,
  onAddStudentNote,
  onTriggerGentleNudge,
  onPublishMicroQuests,
  showToast,
}) => {
  const { students, knowledgePoints, submissions, questions, assignments, aiConfig } = state;

  // Matrix filter & student inspector modal
  const [riskFilter, setRiskFilter] = useState<'all' | 'risk' | 'safe'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newPrivateNote, setNewPrivateNote] = useState('');

  // Review state
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Clusters reply state
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [draftingQId, setDraftingQId] = useState<string | null>(null);

  // Studio AI quest generator state
  const [studioKpId, setStudioKpId] = useState(knowledgePoints[1]?.id || knowledgePoints[0].id);
  const [studioNotes, setStudioNotes] = useState('');
  const [generatingQuests, setGeneratingQuests] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<MicroQuest[]>([]);

  // Reports state
  const [reportType, setReportType] = useState<'mastery' | 'support' | 'grades'>('mastery');
  const [reportContent, setReportContent] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  const selectedStudent: StudentProfile | null = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    if (riskFilter === 'risk') return students.filter((s) => s.riskLevel !== 'safe');
    if (riskFilter === 'safe') return students.filter((s) => s.riskLevel === 'safe');
    return students;
  }, [students, riskFilter]);

  const kpAverages = useMemo(() => {
    return knowledgePoints.map((kp) => ({
      kp,
      avg: Math.round(students.reduce((sum, st) => sum + (st.mastery[kp.id] ?? 0), 0) / students.length),
    }));
  }, [knowledgePoints, students]);

  const avgClassGrade = Math.round(students.reduce((s, st) => s + st.predictedGrade, 0) / students.length);
  const highRiskCount = students.filter((s) => s.riskLevel === 'high_risk').length;
  const pendingSubs = submissions.filter((s) => s.status === 'pending_review');
  const normalPendingCount = pendingSubs.filter((s) => s.aiFlag === 'normal').length;
  const openQuestions = questions.filter((q) => !q.officialReply || q.studentConfirmed === 'still_confused');

  const cellStyle = (score: number) => {
    if (score >= 82) return 'bg-[#4B7056]/16 text-[#2C4B36] border-[#4B7056]/25';
    if (score >= 65) return 'bg-[#B87D3B]/16 text-[#7D4F1B] border-[#B87D3B]/25';
    return 'bg-[#A94B44]/16 text-[#852E28] border-[#A94B44]/30 font-semibold';
  };

  const handleAIDraftReply = async (qId: string) => {
    const q = questions.find((item) => item.id === qId);
    if (!q) return;
    setDraftingQId(qId);
    const kp = knowledgePoints.find((k) => k.id === q.kpId);
    const draft = await generateClusterReplyDraft(q, kp, aiConfig);
    setReplyDrafts((prev) => ({ ...prev, [qId]: draft }));
    setDraftingQId(null);
  };

  const handleGenerateQuests = async () => {
    const kp = knowledgePoints.find((k) => k.id === studioKpId);
    if (!kp) return;
    setGeneratingQuests(true);
    const res = await generateMicroQuestsFromNotes(studioNotes || kp.summary, kp, aiConfig);
    setGeneratedPreview(res);
    setGeneratingQuests(false);
  };

  const handleGenerateReport = async (type: 'mastery' | 'support' | 'grades') => {
    setReportType(type);
    setGeneratingReport(true);
    const text = await generateTeacherReport(type, state);
    setReportContent(text);
    setGeneratingReport(false);
  };

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-mobile-nav md:pb-16 animate-soft-in">
      {/* Top Compact AI Relief Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="editorial-card rounded-2xl p-4 bg-[#FAF7F2]">
          <div className="micro-label">CLASS PULSE · 全班均势</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="issue-numeral text-3xl font-semibold text-[#1E2B4A]">{avgClassGrade}</span>
            <span className="text-xs text-[#4B7056] font-medium">
              达标 {students.filter((s) => s.predictedGrade >= 60).length}/{students.length}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChangeTab('review')}
          className="editorial-card rounded-2xl p-4 bg-[#FAF7F2] text-left cursor-pointer"
        >
          <div className="micro-label">AI PRE-GRADED · 待复核初审</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="issue-numeral text-3xl font-semibold text-[#B38B4D]">{pendingSubs.length}</span>
            <span className="text-xs text-[#7A7267]">其中 {normalPendingCount} 份可一键放行</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onChangeTab('matrix');
            setRiskFilter('risk');
          }}
          className="editorial-card rounded-2xl p-4 bg-[#FAF7F2] text-left cursor-pointer"
        >
          <div className="micro-label">EARLY ALERT · 需关注学生</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="issue-numeral text-3xl font-semibold text-[#A94B44]">{highRiskCount}</span>
            <span className="text-xs text-[#8D3832]">红灯预警 · 点此聚焦</span>
          </div>
        </button>

        <div className="rounded-2xl p-4 navy-editorial-band flex flex-col justify-between">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#D5B984]">AI TIME SAVED · 本周减负</div>
          <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <span className="font-editorial text-3xl font-semibold text-[#FAF7F2]">78%</span>
            <span className="text-[11px] sm:text-xs text-[#FAF7F2]/80">重复答疑与初批已托管</span>
          </div>
        </div>
      </div>

      {/* Desktop Sub-Nav Pill Bar */}
      <div className="hidden md:flex items-center justify-between gap-4 mb-7 pb-4 border-b border-[#E4DCCE]">
        <div className="flex items-center gap-2">
          {TEACHER_TABS.map((tab) => {
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
                {tab.key === 'review' && pendingSubs.length > 0 && (
                  <span className="px-1.5 rounded-full text-[10px] bg-[#B38B4D] text-[#FAF7F2]">
                    {pendingSubs.length}
                  </span>
                )}
                {tab.key === 'clusters' && openQuestions.length > 0 && (
                  <span className="px-1.5 rounded-full text-[10px] bg-[#A94B44] text-[#FAF7F2]">
                    {openQuestions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-[#7A7267]">主讲：{state.opsConfig.teacherName}</div>
      </div>

      {/* TAB 1: KNOWLEDGE MATRIX + STUDENT PANORAMA INSPECTOR */}
      {activeTab === 'matrix' && (
        <div className="space-y-5">
          <EditorialSectionHeading
            align="left"
            english="MASTERY HEATMAP"
            title="全班「知识点 × 学生」学情透视矩阵"
            subtitle="竖看哪列偏红知全班难点，横看哪行偏红定帮扶名单；点击任意学生查看私密备注与 AI 诊断。"
            action={
              <div className="flex gap-1.5">
                {(
                  [
                    { key: 'all', label: `全部 (${students.length})` },
                    { key: 'risk', label: `预警与观察 (${students.filter((s) => s.riskLevel !== 'safe').length})` },
                    { key: 'safe', label: '稳健达标' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setRiskFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                      riskFilter === f.key
                        ? 'bg-[#1E2B4A] text-[#FAF7F2]'
                        : 'bg-[#F3EEE4] text-[#6E665C] hover:bg-[#E7DDC9]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            }
          />

          {/* Desktop Heatmap Table */}
          <div className="hidden md:block editorial-card rounded-3xl overflow-hidden bg-[#FAF7F2]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F3EEE4]/90 border-b border-[#E4DCCE] text-xs text-[#5E574D]">
                    <th className="py-3.5 px-4 font-semibold min-w-[180px]">学生 / 状态</th>
                    {kpAverages.map(({ kp, avg }) => (
                      <th key={kp.id} className="py-3 px-2.5 text-center min-w-[105px]">
                        <div className="font-editorial text-sm font-semibold text-[#1E2B4A]">
                          {kp.code} {kp.title.slice(0, 4)}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 font-medium ${
                            avg < 70 ? 'text-[#A94B44]' : avg >= 80 ? 'text-[#4B7056]' : 'text-[#936027]'
                          }`}
                        >
                          班均 {avg}%
                        </div>
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-right min-w-[120px]">预测 / 操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE6D9] text-sm">
                  {filteredStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className="hover:bg-[#F5EFE3]/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              st.riskLevel === 'high_risk'
                                ? 'bg-[#A94B44]'
                                : st.riskLevel === 'watch'
                                ? 'bg-[#B87D3B]'
                                : 'bg-[#4B7056]'
                            }`}
                          />
                          <div>
                            <div className="font-medium text-[#1E2B4A] flex items-center gap-1.5">
                              <span>{st.name}</span>
                              {st.privateNotes.length > 0 && (
                                <Lock className="w-3 h-3 text-[#B38B4D]" aria-label="含私密备注" />
                              )}
                            </div>
                            <div className="text-[11px] text-[#7A7267]">{st.major}</div>
                          </div>
                        </div>
                      </td>
                      {knowledgePoints.map((kp) => {
                        const score = st.mastery[kp.id] ?? 0;
                        return (
                          <td key={kp.id} className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block w-14 py-1 rounded-xl border text-xs ${cellStyle(score)}`}
                            >
                              {score}%
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-editorial text-lg font-semibold text-[#1E2B4A]">
                          {st.predictedGrade} 分
                        </div>
                        <div className="text-[11px] text-[#B38B4D]">查看全景档案 →</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive Student Insight Cards (No Squished Tables on Phones!) */}
          <div className="md:hidden space-y-3">
            {filteredStudents.map((st) => {
              const lowestKp = [...knowledgePoints].sort(
                (a, b) => (st.mastery[a.id] ?? 0) - (st.mastery[b.id] ?? 0)
              )[0];
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className="editorial-card rounded-2xl p-4 space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          st.riskLevel === 'high_risk'
                            ? 'bg-[#A94B44]'
                            : st.riskLevel === 'watch'
                            ? 'bg-[#B87D3B]'
                            : 'bg-[#4B7056]'
                        }`}
                      />
                      <span className="font-editorial text-lg font-semibold text-[#1E2B4A]">{st.name}</span>
                      <span className="text-[11px] text-[#7A7267]">{st.major}</span>
                    </div>
                    <span className="font-editorial text-xl font-semibold text-[#1E2B4A]">
                      {st.predictedGrade} 分
                    </span>
                  </div>
                  <p className="text-xs text-[#5E574D] leading-relaxed">{st.aiDiagnosis}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#EFE8DC]">
                    <span className="text-[#8D3832]">
                      最弱：{lowestKp.code} {lowestKp.title} ({st.mastery[lowestKp.id]}%)
                    </span>
                    <span className="text-[#B38B4D] font-medium">点开档案与备注 →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AI BATCH ASSIGNMENT REVIEW WORKBENCH */}
      {activeTab === 'review' && (
        <div className="space-y-5">
          <EditorialSectionHeading
            align="left"
            english="AI PRE-REVIEW BENCH"
            title="AI 作业初审与异常拦截台"
            subtitle="正常且过 10 秒验真的作业，老师一键批量放行；精力只留给 AI 标黄的异常卷。"
            action={
              <button
                type="button"
                disabled={normalPendingCount === 0}
                onClick={() => {
                  const count = onBatchApproveNormal();
                  showToast(`已一键放行 ${count} 份 AI 正常且通过验真的作业！省下约 ${count * 6} 分钟`);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] text-xs sm:text-sm font-medium shadow-xs hover:bg-[#293B63] transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-4 h-4 text-[#D5B984]" />
                <span>一键批量放行全部 AI 正常项（{normalPendingCount} 份）</span>
              </button>
            }
          />

          <div className="space-y-4">
            {submissions.map((sub) => {
              const asg = assignments.find((a) => a.id === sub.assignmentId);
              const isFlagged = sub.aiFlag !== 'normal';

              return (
                <div
                  key={sub.id}
                  className={`editorial-card rounded-3xl p-5 sm:p-6 space-y-4 ${
                    isFlagged && sub.status === 'pending_review'
                      ? 'border-[#A94B44]/50 bg-[#FDF8F6]'
                      : 'bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-editorial text-xl font-semibold text-[#1E2B4A]">
                          {sub.studentName}
                        </span>
                        <span className="text-xs text-[#7A7267]">
                          {sub.studentNo} · {sub.submittedAt}
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                            sub.verificationPassed
                              ? 'bg-[#4B7056]/14 text-[#34543E]'
                              : 'bg-[#A94B44]/12 text-[#87322C]'
                          }`}
                        >
                          {sub.verificationPassed ? '✓ 10秒验真已过' : '⚠ 未过10秒验真'}
                        </span>
                      </div>
                      <div className="text-xs text-[#7A7267] mt-0.5">{asg?.title}</div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-[#7A7267]">AI 建议分</div>
                        <div className="font-editorial text-2xl font-semibold text-[#1E2B4A]">
                          {sub.aiScore} <span className="text-xs font-sans font-normal">/100</span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          sub.status === 'approved'
                            ? 'bg-[#4B7056] text-white'
                            : sub.status === 'needs_revision'
                            ? 'bg-[#B87D3B] text-white'
                            : 'bg-[#EFE8DC] text-[#1E2B4A]'
                        }`}
                      >
                        {sub.status === 'approved'
                          ? '已确认通过'
                          : sub.status === 'needs_revision'
                          ? '已退回补充'
                          : '待教师确认'}
                      </span>
                    </div>
                  </div>

                  {isFlagged && (
                    <div className="rounded-2xl p-3 bg-[#A94B44]/10 border border-[#A94B44]/30 text-xs text-[#832E28] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>AI 风险拦截：</strong>
                        {sub.aiFlagReason}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-[#E4DCCE]">
                      <div className="text-[11px] uppercase tracking-widest text-[#7A7267] mb-1.5">
                        学生提交原文
                      </div>
                      <p className="text-xs sm:text-sm text-[#2F2B26] leading-relaxed">{sub.content}</p>
                    </div>

                    <div className="lg:col-span-5 bg-[#F4EFE5] rounded-2xl p-4 border border-[#E4DCCE] text-xs space-y-2">
                      <div className="font-semibold text-[#1E2B4A] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#B38B4D]" />
                        <span>AI 按评分标准拆解摘要</span>
                      </div>
                      <p className="text-[#4F4840] leading-relaxed">{sub.aiSummary}</p>
                      <div className="text-[#34543E]">✓ 亮点：{sub.aiStrengths.join('；')}</div>
                      <div className="text-[#8B5921]">△ 不足：{sub.aiGaps.join('；')}</div>
                    </div>
                  </div>

                  {sub.status === 'pending_review' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-[#EFE8DC]">
                      <input
                        type="text"
                        value={commentDrafts[sub.id] || ''}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="选填一句教师评语（不填将直接附带 AI 摘要发给学生）…"
                        className="flex-1 rounded-full bg-white border border-[#DFD5C5] px-4 py-2 text-xs sm:text-sm outline-none focus:border-[#1E2B4A]"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSubmissionStatus(sub.id, 'approved', commentDrafts[sub.id]);
                            showToast(`已通过 ${sub.studentName} 的作业（${sub.aiScore}分）`);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-full bg-[#4B7056] text-white text-xs sm:text-sm font-medium hover:bg-[#3E5E47] cursor-pointer"
                        >
                          采纳 AI 分通过
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateSubmissionStatus(
                              sub.id,
                              'needs_revision',
                              commentDrafts[sub.id] || '请结合自己真实实验数据补充细节后重交'
                            );
                            showToast(`已退回 ${sub.studentName} 并自动附带 AI 修改指南`);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-full border border-[#A94B44] text-[#8D3832] text-xs sm:text-sm font-medium hover:bg-[#A94B44]/10 cursor-pointer"
                        >
                          退回补充细节
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AI QUESTION CLUSTERS (REPLY ONCE -> BROADCAST TO ALL) */}
      {activeTab === 'clusters' && (
        <div className="space-y-5">
          <EditorialSectionHeading
            align="left"
            english="AI QUESTION CLUSTERS"
            title="课下共性同问聚类台"
            subtitle="AI 把零散私信合并为高热同问主题；点一下拟定初稿，写一次即可精准推送全部同问学生。"
          />

          <div className="space-y-4">
            {[...questions]
              .sort((a, b) => b.upvotes - a.upvotes)
              .map((q) => {
                const kp = knowledgePoints.find((k) => k.id === q.kpId);
                const draftVal = replyDrafts[q.id] ?? q.officialReply ?? '';
                const isConfusedBack = q.studentConfirmed === 'still_confused';

                return (
                  <div
                    key={q.id}
                    className={`editorial-card rounded-3xl p-5 sm:p-6 space-y-3.5 ${
                      isConfusedBack ? 'border-[#A94B44]/60 bg-[#FDF8F6]' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#1E2B4A] text-[#FAF7F2] font-medium">
                          {q.upvotes} 人同问
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#EFE8DC] text-[#1E2B4A]">
                          {kp?.code} {kp?.title}
                        </span>
                        {isConfusedBack && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#A94B44] text-white font-medium">
                            有学生点“还是有点懵”已回流
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#7A7267]">
                        {q.officialReply ? '✓ 已统一群发回复' : '待统一回复'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-editorial text-xl font-semibold text-[#1E2B4A]">{q.clusterTitle}</h4>
                      <p className="text-xs sm:text-sm text-[#5E574D] mt-1 leading-relaxed">
                        典型原问：“{q.content}”
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#1E2B4A]">统一回复内容（可直采 AI 初稿微调）：</span>
                        <button
                          type="button"
                          disabled={draftingQId === q.id}
                          onClick={() => handleAIDraftReply(q.id)}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#EFE8DC] hover:bg-[#E4D7C1] text-[#1E2B4A] cursor-pointer"
                        >
                          {draftingQId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#B38B4D]" />
                          )}
                          <span>AI 拟定回复初稿</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={draftVal}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="点击右上角「AI 拟定回复初稿」或直接输入回复…"
                        className="w-full rounded-2xl bg-white border border-[#DFD5C5] p-3.5 text-xs sm:text-sm outline-none focus:border-[#1E2B4A]"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!draftVal.trim()}
                          onClick={() => {
                            onPublishClusterReply(q.id, draftVal.trim());
                            showToast(`已一键群发至全部 ${q.upvotes} 位同问学生的手机端！`);
                          }}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] text-xs sm:text-sm font-medium cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-[#D5B984]" />
                          <span>一键群发给全部 {q.upvotes} 位同问同学</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: AI STUDIO — LECTURE NOTES -> INSTANT STUDENT MICRO-QUESTS */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 editorial-card rounded-3xl p-5 sm:p-6 space-y-4 h-fit">
            <div>
              <span className="micro-label">AI QUEST FORGE · 讲义秒变碎片练习</span>
              <h3 className="font-editorial text-2xl font-semibold text-[#1E2B4A] mt-1">
                粘贴讲义要点，一键派发课下闯关
              </h3>
              <p className="text-xs sm:text-sm text-[#6A6258] mt-1.5 leading-relaxed">
                老师不用手工编题库。丢进本周 PPT 提纲，AI 自动生成 2 道 3 分钟易错微闯关；确认后立刻同步到所有学生手机端。
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1E2B4A] mb-1.5">归属核心知识点</label>
              <select
                value={studioKpId}
                onChange={(e) => setStudioKpId(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 text-sm outline-none"
              >
                {knowledgePoints.map((kp) => (
                  <option key={kp.id} value={kp.id}>
                    {kp.code} {kp.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#1E2B4A]">讲义/PPT 核心段落</label>
                <button
                  type="button"
                  onClick={() =>
                    setStudioNotes(
                      '本周重点：大模型本质是基于上下文的概率自回归预测，容易在冷门事实上产生自信的幻觉。因此工程实践中需结合检索增强（RAG）、明确输出格式约束与允许模型拒答，而非单靠提高参数量解决可信度问题。'
                    )
                  }
                  className="text-[11px] text-[#B38B4D] hover:underline cursor-pointer"
                >
                  填入示例讲义片段
                </button>
              </div>
              <textarea
                rows={5}
                value={studioNotes}
                onChange={(e) => setStudioNotes(e.target.value)}
                placeholder="粘贴本节课的 PPT 要点、公式说明或常见易错案例…"
                className="w-full rounded-2xl bg-white border border-[#DFD5C5] p-3.5 text-sm outline-none focus:border-[#1E2B4A]"
              />
            </div>

            <button
              type="button"
              disabled={generatingQuests}
              onClick={handleGenerateQuests}
              className="w-full py-3 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-sm font-medium hover:bg-[#293B63] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {generatingQuests ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 正在提炼易错点并生成微闯关…</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-[#D5B984]" />
                  <span>AI 自动生成 2 道 3 分钟微闯关</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {generatedPreview.length === 0 ? (
              <div className="editorial-card rounded-3xl p-10 text-center bg-[#F6F1E7]/60">
                <Sparkles className="w-8 h-8 text-[#B38B4D] mx-auto mb-3 opacity-80" />
                <h4 className="font-editorial text-xl font-semibold text-[#1E2B4A]">
                  生成的微闯关将在此预览
                </h4>
                <p className="text-xs sm:text-sm text-[#7A7267] mt-1.5 max-w-md mx-auto">
                  点击左侧「AI 自动生成」，即可现场体验“从讲义到学生手机闯关卡片”的实时联动发布。
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[#1E2B4A]">
                    AI 已生成 {generatedPreview.length} 道候选微闯关（确认无误可一键发布）：
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPublishMicroQuests(generatedPreview);
                      setGeneratedPreview([]);
                      setStudioNotes('');
                      showToast('已同步发布至学生端「3 分钟微闯关」！切回学生端即可立刻作答');
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#4B7056] text-white text-xs sm:text-sm font-medium hover:bg-[#3D5E47] cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>一键派发至全班学生端</span>
                  </button>
                </div>

                {generatedPreview.map((q, idx) => (
                  <div key={q.id} className="editorial-card rounded-3xl p-5 space-y-2.5 bg-[#FAF7F2]">
                    <div className="flex items-center justify-between text-xs text-[#7A7267]">
                      <span className="font-semibold text-[#B38B4D]">候选微题 0{idx + 1}</span>
                      <span>⏱ {q.durationMin} 分钟 · +{q.xpReward} pt</span>
                    </div>
                    <h4 className="font-editorial text-lg font-semibold text-[#1E2B4A]">{q.title}</h4>
                    <p className="text-sm text-[#36322C]">{q.question}</p>
                    <ul className="space-y-1 text-xs">
                      {q.options.map((opt, oi) => (
                        <li
                          key={oi}
                          className={`px-3 py-1.5 rounded-xl ${
                            oi === q.correctIndex
                              ? 'bg-[#4B7056]/12 text-[#2E4E38] font-medium'
                              : 'bg-[#F4EFE5] text-[#645C52]'
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt} {oi === q.correctIndex ? '（正确答案）' : ''}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-[#6E665C] pt-1">
                      <strong>解析：</strong>
                      {q.explanation}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ONE-CLICK SCHOOL COMPLIANCE & SUMMARY REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <EditorialSectionHeading
            align="left"
            english="ONE-CLICK DOSSIERS"
            title="一键生成教研分析与留痕台账"
            subtitle="学生日常课下研学自动静默留痕，期末/督导检查前点一下即出带真实数据的完整文档。"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                {
                  key: 'mastery',
                  num: '01',
                  title: '班级学情达成度分析报告',
                  desc: '自动统计各知识点均分、优秀率、AI 减负成效与下阶段教学建议。',
                },
                {
                  key: 'support',
                  num: '02',
                  title: '学困生精准帮扶过程台账',
                  desc: '自动整理红黄灯学生卡点、AI 提醒轨迹与老师私密跟进记录。',
                },
                {
                  key: 'grades',
                  num: '03',
                  title: '过程性评价与平时分明细表',
                  desc: '按运营端设定权重透明核算每位学生的任务率、打卡与平时表现分。',
                },
              ] as const
            ).map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => handleGenerateReport(card.key)}
                className={`editorial-card rounded-3xl p-5 text-left transition-all cursor-pointer ${
                  reportType === card.key && reportContent
                    ? 'border-[#1E2B4A] bg-[#F3EEE4]'
                    : 'bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="issue-numeral text-2xl text-[#B38B4D]">{card.num}</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EFE8DC] text-[#1E2B4A]">
                    一键生成
                  </span>
                </div>
                <h4 className="font-editorial text-lg font-semibold text-[#1E2B4A]">{card.title}</h4>
                <p className="text-xs text-[#6E665C] mt-1.5 leading-relaxed">{card.desc}</p>
              </button>
            ))}
          </div>

          <div className="editorial-card rounded-3xl overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-[#F4EFE5] border-b border-[#E4DCCE] flex flex-wrap items-center justify-between gap-2 no-print">
              <span className="text-xs font-medium text-[#1E2B4A]">文档预览区（可直接复制粘贴至 Word 或打印存 PDF）</span>
              {reportContent && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(reportContent);
                      showToast('报告内容已复制到剪贴板！');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#D8CCB8] text-xs text-[#1E2B4A] hover:bg-[#EFE8DC] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>复制全文</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1E2B4A] text-white text-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#D5B984]" />
                    <span>打印 / 导出 PDF</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 sm:p-8 min-h-[260px]">
              {generatingReport ? (
                <div className="py-14 flex flex-col items-center gap-3 text-[#7A7267] text-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-[#B38B4D]" />
                  <span>正在汇总全班最新研学数据并撰写规范报告…</span>
                </div>
              ) : reportContent ? (
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#2A2622] leading-relaxed">
                  {reportContent}
                </pre>
              ) : (
                <div className="py-12 text-center text-sm text-[#7A7267]">
                  点击上方任意一张材料卡片，AI 将基于当前最新实时数据自动生成完整文档。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PANORAMA INSPECTOR DRAWER / MODAL */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 bg-[#1E2B4A]/45 backdrop-blur-xs flex items-end sm:items-center justify-end p-0 sm:p-4"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-[#FAF7F2] rounded-t-3xl sm:rounded-3xl border border-[#E4DCCE] shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 navy-editorial-band flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#D5B984]">
                  STUDENT DOSSIER · 单生全景档案
                </div>
                <h3 className="font-editorial text-2xl font-semibold mt-0.5">
                  {selectedStudent.name}{' '}
                  <span className="text-sm font-sans font-normal text-[#FAF7F2]/75">
                    {selectedStudent.major} · {selectedStudent.studentNo}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* AI Diagnosis */}
              <div className="rounded-2xl p-4 bg-[#F3EEE4] border border-[#E4DCCE] text-xs sm:text-sm space-y-1.5">
                <div className="font-semibold text-[#1E2B4A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#B38B4D]" />
                  <span>AI 一句话学情诊断</span>
                </div>
                <p className="text-[#4F4840] leading-relaxed">{selectedStudent.aiDiagnosis}</p>
                <div className="text-[11px] text-[#7A7267] pt-1">最近动态：{selectedStudent.recentActivity}</div>
              </div>

              {/* Quick Stats & Tags */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-white border border-[#E4DCCE]">
                  <div className="text-[10px] text-[#7A7267]">预测平时分</div>
                  <div className="font-editorial text-2xl font-semibold text-[#1E2B4A]">
                    {selectedStudent.predictedGrade}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#E4DCCE]">
                  <div className="text-[10px] text-[#7A7267]">任务完成率</div>
                  <div className="font-editorial text-2xl font-semibold text-[#4B7056]">
                    {selectedStudent.taskCompletionRate}%
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#E4DCCE]">
                  <div className="text-[10px] text-[#7A7267]">AI 温和提醒</div>
                  <div className="font-editorial text-2xl font-semibold text-[#B38B4D]">
                    {selectedStudent.nudgeCount} 次
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedStudent.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full text-xs bg-[#EFE8DC] text-[#1E2B4A]">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 6 KP Bars */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#1E2B4A]">六维知识点掌握明细</div>
                {knowledgePoints.map((kp) => {
                  const val = selectedStudent.mastery[kp.id] ?? 0;
                  return (
                    <div key={kp.id} className="flex items-center gap-3 text-xs">
                      <span className="w-36 truncate text-[#5E574D]">
                        {kp.code} {kp.title}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#ECE4D6] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            val >= 80 ? 'bg-[#4B7056]' : val >= 65 ? 'bg-[#B87D3B]' : 'bg-[#A94B44]'
                          }`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-medium text-[#1E2B4A]">{val}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Teacher Private Notes (Hidden from Students & Assistants) */}
              <div className="space-y-2.5 pt-2 border-t border-[#E4DCCE]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1E2B4A] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#B38B4D]" />
                    <span>教师私密备注与谈话纪要（学生不可见）</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedStudent.privateNotes.length === 0 ? (
                    <p className="text-xs text-[#9A9282]">暂无备注，可随手记下该生特点或课后沟通情况。</p>
                  ) : (
                    selectedStudent.privateNotes.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-white border border-[#E4DCCE] text-xs text-[#4F4840]">
                        <span className="text-[#B38B4D] font-medium mr-2">[{n.date}]</span>
                        {n.text}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPrivateNote}
                    onChange={(e) => setNewPrivateNote(e.target.value)}
                    placeholder="随手记一句（如：基础弱但认真，下周课后鼓励）…"
                    className="flex-1 rounded-full bg-white border border-[#DFD5C5] px-3.5 py-2 text-xs outline-none focus:border-[#1E2B4A]"
                  />
                  <button
                    type="button"
                    disabled={!newPrivateNote.trim()}
                    onClick={() => {
                      onAddStudentNote(selectedStudent.id, newPrivateNote.trim());
                      setNewPrivateNote('');
                      showToast('已保存教师私密备注');
                    }}
                    className="px-4 py-2 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-white text-xs cursor-pointer"
                  >
                    记录
                  </button>
                </div>
              </div>

              {/* Action: Trigger Gentle AI Nudge */}
              <button
                type="button"
                onClick={() => {
                  onTriggerGentleNudge(selectedStudent.id);
                  showToast(`已委托 AI 课代表向 ${selectedStudent.name} 发送个性化 5 分钟拆解提醒，并同步至运营触达日志`);
                }}
                className="w-full py-2.5 rounded-full border border-[#B38B4D] text-[#8A652D] hover:bg-[#B38B4D] hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4" />
                <span>让 AI 课代表向该生发送一次“温柔拆步提醒”</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

      {/* MOBILE FLOATING BOTTOM NAV FOR TEACHER */}
      <nav
        aria-label="教师端手机底部导航"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 no-print bg-[#FAF7F2]/95 backdrop-blur-lg border-t border-[#E4DCCE] shadow-[0_-6px_24px_-12px_rgba(30,43,74,0.14)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 gap-1">
          {TEACHER_TABS.map((tab) => {
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
                {tab.key === 'review' && pendingSubs.length > 0 && (
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
