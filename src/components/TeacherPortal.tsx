import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  Copy,
  FileText,
  Grid2x2,
  GripVertical,
  Loader2,
  Lock,
  MessageSquareQuote,
  Printer,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import {
  generateClusterReplyDraft,
  generateMicroQuestsFromNotes,
  generateTeacherReport,
} from '../services/aiService';
import { AppState, MicroQuest, StudentProfile, SubmissionStatus } from '../types';
import { GroupHeader, StatusDot } from './MinimalWidgets';
import { NavItemDef } from './WorkspaceShell';

export type TeacherTab = 'review' | 'matrix' | 'clusters' | 'studio' | 'reports';

export function getTeacherNavItems(state: AppState): NavItemDef[] {
  const pending = state.submissions.filter((s) => s.status === 'pending_review').length;
  const openQs = state.questions.filter((q) => !q.officialReply || q.studentConfirmed === 'still_confused').length;
  const riskCount = state.students.filter((s) => s.riskLevel === 'high_risk').length;

  return [
    { key: 'review', label: '初审队列', short: '初审', count: pending, icon: <ClipboardCheck className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'matrix', label: '学情矩阵', short: '学情', count: riskCount, icon: <Grid2x2 className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'clusters', label: '共性答疑', short: '答疑', count: openQs, icon: <MessageSquareQuote className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'studio', label: '讲义出题', short: '出题', icon: <Wand2 className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'reports', label: '教研报告', short: '报告', icon: <FileText className="w-[17px] h-[17px] stroke-[1.6]" /> },
  ];
}

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

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  state,
  activeTab,
  onBatchApproveNormal,
  onUpdateSubmissionStatus,
  onPublishClusterReply,
  onAddStudentNote,
  onTriggerGentleNudge,
  onPublishMicroQuests,
  showToast,
}) => {
  const { students, knowledgePoints, submissions, questions, assignments, aiConfig } = state;

  // Review state
  const [openFlagged, setOpenFlagged] = useState(true);
  const [openNormal, setOpenNormal] = useState(true);
  const [openHandled, setOpenHandled] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(
    submissions.find((s) => s.aiFlag !== 'normal' && s.status === 'pending_review')?.id || null
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Matrix state
  const [riskFilter, setRiskFilter] = useState<'all' | 'risk' | 'safe'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Clusters state
  const [expandedQId, setExpandedQId] = useState<string | null>(questions[0]?.id || null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [draftingQId, setDraftingQId] = useState<string | null>(null);

  // Studio state
  const [studioKpId, setStudioKpId] = useState(knowledgePoints[1]?.id || knowledgePoints[0].id);
  const [studioNotes, setStudioNotes] = useState('');
  const [generatingQuests, setGeneratingQuests] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<MicroQuest[]>([]);

  // Reports state
  const [reportType, setReportType] = useState<'mastery' | 'support' | 'grades'>('mastery');
  const [reportContent, setReportContent] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  const avgGrade = Math.round(students.reduce((s, st) => s + st.predictedGrade, 0) / students.length);
  const highRiskCount = students.filter((s) => s.riskLevel === 'high_risk').length;

  const flaggedPending = submissions.filter((s) => s.status === 'pending_review' && s.aiFlag !== 'normal');
  const normalPending = submissions.filter((s) => s.status === 'pending_review' && s.aiFlag === 'normal');
  const handledSubs = submissions.filter((s) => s.status !== 'pending_review');

  const selectedStudent: StudentProfile | null = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    if (riskFilter === 'risk') return students.filter((s) => s.riskLevel !== 'safe');
    if (riskFilter === 'safe') return students.filter((s) => s.riskLevel === 'safe');
    return students;
  }, [students, riskFilter]);

  const kpAverages = useMemo(
    () =>
      knowledgePoints.map((kp) => ({
        kp,
        avg: Math.round(students.reduce((sum, st) => sum + (st.mastery[kp.id] ?? 0), 0) / students.length),
      })),
    [knowledgePoints, students]
  );

  const handleDraftReply = async (qId: string) => {
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

  const renderSubmissionRow = (sub: (typeof submissions)[number]) => {
    const asg = assignments.find((a) => a.id === sub.assignmentId);
    const expanded = expandedSubId === sub.id;
    const isFlagged = sub.aiFlag !== 'normal';

    return (
      <div key={sub.id} className="space-y-2">
        <button
          type="button"
          onClick={() => setExpandedSubId(expanded ? null : sub.id)}
          className={`w-full px-3 py-2.5 rounded-[12px] flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
            expanded ? 'hatched-row' : 'glacial-card-subtle'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-[#9AA6B8] shrink-0" />
            <span className="id-chip px-2 py-0.5 rounded-[7px] text-[11px] font-medium inline-flex items-center gap-1.5 shrink-0">
              <StatusDot tone={isFlagged ? 'risk' : 'ok'} />
              <span>AI {sub.aiScore}</span>
            </span>
            <span className="text-[13px] font-medium text-[#141928] shrink-0">{sub.studentName}</span>
            <span className="text-[12px] text-[#6B7689] truncate">{asg?.code} · {sub.aiSummary}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#7A869A] shrink-0">
            <span className="hidden sm:inline">{sub.verificationPassed ? '已验真' : '未验真'}</span>
            <span>{sub.submittedAt}</span>
          </div>
        </button>

        {expanded && (
          <div className="glacial-card rounded-[16px] p-4 space-y-3 text-[12.5px]">
            {isFlagged && (
              <div className="px-3 py-2 rounded-[9px] bg-[#B84A4A]/[0.07] text-[#8E3939] text-[12px]">
                {sub.aiFlagReason}
              </div>
            )}
            <div className="p-3 rounded-[11px] bg-[#F1F5F9] text-[#222B3D] leading-relaxed">{sub.content}</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#4D596E]">
              <span>亮点：{sub.aiStrengths.join('；')}</span>
              <span>待补：{sub.aiGaps.join('；')}</span>
            </div>

            {sub.status === 'pending_review' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-900/[0.06]">
                <input
                  type="text"
                  value={commentDrafts[sub.id] || ''}
                  onChange={(e) => setCommentDrafts((p) => ({ ...p, [sub.id]: e.target.value }))}
                  placeholder="选填评语…"
                  className="flex-1 rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-1.5 text-[12.5px] outline-none focus:bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubmissionStatus(sub.id, 'approved', commentDrafts[sub.id]);
                      setExpandedSubId(null);
                      showToast(`已通过 ${sub.studentName}`);
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-[9px] bg-[#141928] text-white text-[12px] font-medium cursor-pointer"
                  >
                    通过
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSubmissionStatus(sub.id, 'needs_revision', commentDrafts[sub.id] || '请补充个人实验数据');
                      setExpandedSubId(null);
                      showToast(`已退回 ${sub.studentName}`);
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-[9px] bg-[#E5EDF4] text-[#2C3649] text-[12px] font-medium hover:bg-[#DAE4EE] cursor-pointer"
                  >
                    退回
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Compact Whisper-Quiet KPI Strip (Always visible, zero noise) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: '班均', val: `${avgGrade}` },
          { label: '待审', val: `${flaggedPending.length + normalPending.length}` },
          { label: '预警', val: `${highRiskCount}`, risk: highRiskCount > 0 },
          { label: 'AI 减负', val: '78%' },
        ].map((item) => (
          <div key={item.label} className="glacial-card-subtle rounded-[13px] px-3 py-2.5">
            <div className="text-[11px] text-[#7A869A]">{item.label}</div>
            <div
              className={`text-[19px] sm:text-[21px] font-semibold tracking-tight tabular mt-0.5 ${
                item.risk ? 'text-[#A23E3E]' : 'text-[#141928]'
              }`}
            >
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {/* TAB 1: REVIEW QUEUE */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">初审队列</h1>
            <button
              type="button"
              disabled={normalPending.length === 0}
              onClick={() => {
                const n = onBatchApproveNormal();
                showToast(`已一键通过 ${n} 份常规作业`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-[#141928] disabled:bg-[#C6D1DE] text-white text-[12px] font-medium cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>批量通过常规项 ({normalPending.length})</span>
            </button>
          </div>

          <div>
            <GroupHeader title="异常待核" count={flaggedPending.length} open={openFlagged} onToggle={() => setOpenFlagged((v) => !v)} />
            {openFlagged && (
              <div className="space-y-2 mt-1">
                {flaggedPending.length === 0 ? (
                  <div className="text-[12px] text-[#7A869A] px-2 py-3">无异常作业</div>
                ) : (
                  flaggedPending.map(renderSubmissionRow)
                )}
              </div>
            )}
          </div>

          <div>
            <GroupHeader title="常规待审" count={normalPending.length} open={openNormal} onToggle={() => setOpenNormal((v) => !v)} />
            {openNormal && (
              <div className="space-y-2 mt-1">
                {normalPending.length === 0 ? (
                  <div className="text-[12px] text-[#7A869A] px-2 py-3">全部常规项已放行</div>
                ) : (
                  normalPending.map(renderSubmissionRow)
                )}
              </div>
            )}
          </div>

          <div>
            <GroupHeader title="已处理" count={handledSubs.length} open={openHandled} onToggle={() => setOpenHandled((v) => !v)} />
            {openHandled && <div className="space-y-2 mt-1">{handledSubs.map(renderSubmissionRow)}</div>}
          </div>
        </div>
      )}

      {/* TAB 2: MASTERY MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">学情矩阵</h1>
            <div className="inline-flex p-0.5 rounded-[9px] bg-[#D9E2EC]/80">
              {(
                [
                  { key: 'all', label: `全部 ${students.length}` },
                  { key: 'risk', label: `预警 ${students.filter((s) => s.riskLevel !== 'safe').length}` },
                  { key: 'safe', label: '稳健' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setRiskFilter(f.key)}
                  className={`px-2.5 py-1 rounded-[7px] text-[12px] cursor-pointer ${
                    riskFilter === f.key ? 'bg-white text-[#141928] font-medium shadow-2xs' : 'text-[#627084]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Swiss Tabular Matrix */}
          <div className="hidden md:block glacial-card rounded-[16px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900/[0.06] text-[11px] text-[#7A869A]">
                    <th className="py-3 px-4 font-medium">学生</th>
                    {kpAverages.map(({ kp, avg }) => (
                      <th key={kp.id} className="py-3 px-2 text-center font-medium tabular">
                        <div className="text-[#1C2436]">{kp.code}</div>
                        <div className={avg < 70 ? 'text-[#A23E3E]' : 'text-[#8B97AA]'}>{avg}%</div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right font-medium">预测</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/[0.05] text-[13px] tabular">
                  {filteredStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className="hover:bg-[#EDF2F7]/80 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <StatusDot tone={st.riskLevel === 'high_risk' ? 'risk' : st.riskLevel === 'watch' ? 'warn' : 'ok'} />
                          <span className="font-medium text-[#141928]">{st.name}</span>
                          {st.privateNotes.length > 0 && <Lock className="w-3 h-3 text-[#8C97AA]" />}
                        </div>
                      </td>
                      {knowledgePoints.map((kp) => {
                        const v = st.mastery[kp.id] ?? 0;
                        return (
                          <td key={kp.id} className="py-2 px-1.5 text-center">
                            <span
                              className={`inline-block w-11 py-0.5 rounded-[6px] text-[12px] ${
                                v < 60
                                  ? 'bg-[#B84A4A]/12 text-[#8E3535] font-medium'
                                  : v < 75
                                  ? 'bg-[#B47B2B]/10 text-[#7E541A]'
                                  : 'text-[#39455A]'
                              }`}
                            >
                              {v}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-4 text-right font-semibold text-[#141928]">{st.predictedGrade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Minimal Student Rows */}
          <div className="md:hidden space-y-2">
            {filteredStudents.map((st) => {
              const lowKp = [...knowledgePoints].sort((a, b) => (st.mastery[a.id] ?? 0) - (st.mastery[b.id] ?? 0))[0];
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudentId(st.id)}
                  className="w-full glacial-card-subtle rounded-[12px] px-3.5 py-3 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot tone={st.riskLevel === 'high_risk' ? 'risk' : st.riskLevel === 'watch' ? 'warn' : 'ok'} />
                      <span className="text-[13.5px] font-medium text-[#141928]">{st.name}</span>
                      <span className="text-[11px] text-[#7A869A]">{st.major}</span>
                    </div>
                    <div className="text-[11.5px] text-[#6B7689] mt-0.5 truncate">
                      薄弱 {lowKp.code} ({st.mastery[lowKp.id]}%) · {st.aiDiagnosis}
                    </div>
                  </div>
                  <span className="text-[15px] font-semibold text-[#141928] tabular shrink-0">{st.predictedGrade}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION CLUSTERS */}
      {activeTab === 'clusters' && (
        <div className="space-y-3">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">共性答疑</h1>

          <div className="space-y-2">
            {[...questions]
              .sort((a, b) => b.upvotes - a.upvotes)
              .map((q) => {
                const expanded = expandedQId === q.id;
                const draftVal = replyDrafts[q.id] ?? q.officialReply ?? '';
                const confused = q.studentConfirmed === 'still_confused';
                return (
                  <div key={q.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setExpandedQId(expanded ? null : q.id)}
                      className={`w-full px-3 py-2.5 rounded-[12px] flex items-center justify-between gap-3 text-left cursor-pointer ${
                        expanded ? 'hatched-row' : 'glacial-card-subtle'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="id-chip px-2 py-0.5 rounded-[7px] text-[11px] font-medium inline-flex items-center gap-1 shrink-0">
                          <StatusDot tone={confused ? 'risk' : q.officialReply ? 'ok' : 'warn'} />
                          <span>{q.upvotes} 同问</span>
                        </span>
                        <span className="text-[13px] font-medium text-[#141928] truncate">{q.clusterTitle}</span>
                      </div>
                      <span className="text-[11px] text-[#7A869A] shrink-0">
                        {confused ? '已回流' : q.officialReply ? '已群发' : '待答'}
                      </span>
                    </button>

                    {expanded && (
                      <div className="glacial-card rounded-[15px] p-4 space-y-3">
                        <div className="text-[12.5px] text-[#4B576C]">{q.content}</div>
                        <textarea
                          rows={3}
                          value={draftVal}
                          onChange={(e) => setReplyDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                          placeholder="输入回复或点右侧 AI 拟稿…"
                          className="w-full rounded-[10px] bg-[#F2F6FA] border border-slate-900/[0.08] p-3 text-[13px] outline-none focus:bg-white"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={draftingQId === q.id}
                            onClick={() => handleDraftReply(q.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#E5EDF4] text-[#1C2436] text-[12px] font-medium hover:bg-[#DAE4EE] cursor-pointer"
                          >
                            {draftingQId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>AI 拟稿</span>
                          </button>
                          <button
                            type="button"
                            disabled={!draftVal.trim()}
                            onClick={() => {
                              onPublishClusterReply(q.id, draftVal.trim());
                              showToast(`已群发至 ${q.upvotes} 位同问学生`);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] bg-[#141928] disabled:bg-[#C6D1DE] text-white text-[12px] font-medium cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>群发 ({q.upvotes})</span>
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

      {/* TAB 4: LECTURE NOTES TO MICRO-QUESTS */}
      {activeTab === 'studio' && (
        <div className="space-y-4">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">讲义出题</h1>

          <div className="glacial-card rounded-[16px] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={studioKpId}
                onChange={(e) => setStudioKpId(e.target.value)}
                className="rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-1.5 text-[12.5px] text-[#141928] outline-none"
              >
                {knowledgePoints.map((kp) => (
                  <option key={kp.id} value={kp.id}>
                    {kp.code} · {kp.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setStudioNotes('大模型本质为条件概率自回归预测，工程中需结合上下文检索与明确拒答边界抑制幻觉。')
                }
                className="text-[12px] text-[#5B677B] hover:text-[#141928] cursor-pointer"
              >
                填入示例要点
              </button>
            </div>

            <textarea
              rows={4}
              value={studioNotes}
              onChange={(e) => setStudioNotes(e.target.value)}
              placeholder="粘贴讲义核心要点…"
              className="w-full rounded-[11px] bg-[#F2F6FA] border border-slate-900/[0.08] p-3 text-[13px] outline-none focus:bg-white"
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={generatingQuests}
                onClick={handleGenerateQuests}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#141928] text-white text-[12.5px] font-medium cursor-pointer"
              >
                {generatingQuests ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                <span>{generatingQuests ? '生成中' : '生成 2 道微测'}</span>
              </button>
            </div>
          </div>

          {generatedPreview.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] font-medium text-[#5B677B]">预览 ({generatedPreview.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    onPublishMicroQuests(generatedPreview);
                    setGeneratedPreview([]);
                    setStudioNotes('');
                    showToast('已派发至学生端待办');
                  }}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[#141928] text-white text-[12px] font-medium cursor-pointer"
                >
                  发布至学生端
                </button>
              </div>
              {generatedPreview.map((q) => (
                <div key={q.id} className="glacial-card rounded-[14px] p-4 space-y-2 text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="id-chip px-2 py-0.5 rounded-[6px] text-[11px]">{q.code}</span>
                    <span className="font-medium text-[#141928]">{q.title}</span>
                  </div>
                  <div className="text-[#39455A]">{q.question}</div>
                  <div className="text-[11.5px] text-[#2E7D5B]">答案：{q.options[q.correctIndex]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ONE-CLICK REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">教研报告</h1>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: 'mastery', label: '01 达成度' },
                  { key: 'support', label: '02 帮扶台账' },
                  { key: 'grades', label: '03 平时分' },
                ] as const
              ).map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleGenerateReport(r.key)}
                  className={`px-3 py-1.5 rounded-[9px] text-[12px] font-medium cursor-pointer transition-all ${
                    reportType === r.key && reportContent
                      ? 'bg-[#141928] text-white'
                      : 'bg-white/75 text-[#3B475C] border border-white hover:bg-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="glacial-card rounded-[16px] overflow-hidden">
            {reportContent && (
              <div className="px-4 py-2.5 border-b border-slate-900/[0.06] flex justify-end gap-2 no-print">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(reportContent);
                    showToast('已复制全文');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#E5EDF4] text-[11.5px] text-[#1C2436] cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> 复制
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#141928] text-white text-[11.5px] cursor-pointer"
                >
                  <Printer className="w-3 h-3" /> 打印
                </button>
              </div>
            )}
            <div className="p-5 min-h-[260px]">
              {generatingReport ? (
                <div className="py-14 flex items-center justify-center gap-2 text-[12.5px] text-[#6B7689]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>生成中…</span>
                </div>
              ) : reportContent ? (
                <pre className="whitespace-pre-wrap font-sans text-[12.5px] text-[#222B3D] leading-relaxed">
                  {reportContent}
                </pre>
              ) : (
                <div className="py-16 text-center text-[12.5px] text-[#7A869A]">选择上方任一报告类型即可实时生成</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DOSSIER MODAL */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 bg-[#141928]/30 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="w-full sm:max-w-md glacial-card rounded-t-[22px] sm:rounded-[22px] max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-900/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot
                  tone={
                    selectedStudent.riskLevel === 'high_risk'
                      ? 'risk'
                      : selectedStudent.riskLevel === 'watch'
                      ? 'warn'
                      : 'ok'
                  }
                />
                <span className="text-[15px] font-semibold text-[#141928]">{selectedStudent.name}</span>
                <span className="text-[12px] text-[#7A869A]">{selectedStudent.major}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-1 rounded-[7px] text-[#6B7689] hover:bg-slate-900/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-[12.5px]">
              <div className="grid grid-cols-3 gap-2 text-center tabular">
                <div className="p-2.5 rounded-[11px] bg-[#EDF2F7]">
                  <div className="text-[10.5px] text-[#7A869A]">预测</div>
                  <div className="text-[17px] font-semibold text-[#141928]">{selectedStudent.predictedGrade}</div>
                </div>
                <div className="p-2.5 rounded-[11px] bg-[#EDF2F7]">
                  <div className="text-[10.5px] text-[#7A869A]">完成率</div>
                  <div className="text-[17px] font-semibold text-[#141928]">{selectedStudent.taskCompletionRate}%</div>
                </div>
                <div className="p-2.5 rounded-[11px] bg-[#EDF2F7]">
                  <div className="text-[10.5px] text-[#7A869A]">已提醒</div>
                  <div className="text-[17px] font-semibold text-[#141928]">{selectedStudent.nudgeCount}</div>
                </div>
              </div>

              <div className="p-3 rounded-[11px] bg-[#F1F5F9] text-[#2C3649]">{selectedStudent.aiDiagnosis}</div>

              <div className="space-y-1.5 tabular">
                {knowledgePoints.map((kp) => {
                  const val = selectedStudent.mastery[kp.id] ?? 0;
                  return (
                    <div key={kp.id} className="flex items-center gap-2.5 text-[12px]">
                      <span className="w-24 text-[#5A677C] truncate">
                        {kp.code} {kp.title}
                      </span>
                      <div className="flex-1 h-[3px] rounded-full bg-[#DCE4EC] overflow-hidden">
                        <div className="h-full bg-[#141928]" style={{ width: `${val}%` }} />
                      </div>
                      <span className="w-8 text-right font-medium text-[#141928]">{val}%</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-900/[0.06]">
                <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#5A677C]">
                  <Lock className="w-3 h-3" />
                  <span>私密备注（仅教师可见）</span>
                </div>
                {selectedStudent.privateNotes.map((n) => (
                  <div key={n.id} className="px-3 py-2 rounded-[9px] bg-[#F2F6FA] text-[12px] text-[#39455A]">
                    <span className="text-[#818D9F] mr-1.5 tabular">{n.date}</span>
                    {n.text}
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && noteInput.trim()) {
                        onAddStudentNote(selectedStudent.id, noteInput.trim());
                        setNoteInput('');
                        showToast('已记录备注');
                      }
                    }}
                    placeholder="添加备注…"
                    className="flex-1 rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-1.5 text-[12.5px] outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={!noteInput.trim()}
                    onClick={() => {
                      onAddStudentNote(selectedStudent.id, noteInput.trim());
                      setNoteInput('');
                      showToast('已记录备注');
                    }}
                    className="px-3 py-1.5 rounded-[9px] bg-[#141928] disabled:bg-[#C6D1DE] text-white text-[12px] cursor-pointer"
                  >
                    保存
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onTriggerGentleNudge(selectedStudent.id);
                  showToast(`已向 ${selectedStudent.name} 发送拆步提醒`);
                }}
                className="w-full py-2 rounded-[10px] bg-[#E5EDF4] hover:bg-[#DAE4EE] text-[#141928] text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>委托 AI 发送拆步提醒</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
