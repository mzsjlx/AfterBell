import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { INITIAL_STATE } from './data/initialData';
import { HomePortal } from './components/HomePortal';
import { Navbar } from './components/Navbar';
import { OpsPortal, OpsTab } from './components/OpsPortal';
import { StudentPortal, StudentTab } from './components/StudentPortal';
import { TeacherPortal, TeacherTab } from './components/TeacherPortal';
import { AIConfig, AppState, MicroQuest, OpsConfig, PerkItem, PortalRole, Submission, SubmissionStatus, TutorPersona } from './types';

const STORAGE_KEY = 'liminal_academy_ai_state_v1';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.students && parsed.knowledgePoints) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_STATE;
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [role, setRole] = useState<PortalRole>('home');
  const [studentTab, setStudentTab] = useState<StudentTab>('overview');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('matrix');
  const [opsTab, setOpsTab] = useState<OpsTab>('rules');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((window as unknown as { __toastTimer?: number }).__toastTimer);
    (window as unknown as { __toastTimer?: number }).__toastTimer = window.setTimeout(() => {
      setToast(null);
    }, 3400);
  };

  const handleNavigate = (nextRole: PortalRole, subTab?: string) => {
    setRole(nextRole);
    if (nextRole === 'student' && subTab) setStudentTab(subTab as StudentTab);
    if (nextRole === 'teacher' && subTab) setTeacherTab(subTab as TeacherTab);
    if (nextRole === 'ops' && subTab) setOpsTab(subTab as OpsTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    showToast('已恢复初始演示数据');
  };

  // --- Student Actions ---
  const handleCompleteQuest = (questId: string, selectedIndex: number, isCorrect: boolean) => {
    setState((prev) => {
      const target = prev.microQuests.find((q) => q.id === questId);
      if (!target || target.completed) return prev;
      const gainPoints = isCorrect ? target.xpReward : 8;
      const gainMastery = isCorrect ? 10 : 4;
      const gainGrade = isCorrect ? 2 : 1;

      return {
        ...prev,
        microQuests: prev.microQuests.map((q) =>
          q.id === questId ? { ...q, completed: true, selectedIndex } : q
        ),
        students: prev.students.map((st) => {
          if (st.id !== prev.currentStudentId) return st;
          const nextMasteryVal = Math.min(100, (st.mastery[target.kpId] ?? 60) + gainMastery);
          return {
            ...st,
            points: st.points + gainPoints,
            predictedGrade: Math.min(100, st.predictedGrade + gainGrade),
            taskCompletionRate: Math.min(100, st.taskCompletionRate + 3),
            mastery: { ...st.mastery, [target.kpId]: nextMasteryVal },
            recentActivity: `刚刚完成了微闯关「${target.title}」`,
          };
        }),
      };
    });
  };

  const handleAddChatMessages = (userText: string, aiText: string, kpId?: string) => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setState((prev) => ({
      ...prev,
      chatHistory: [
        ...prev.chatHistory,
        { id: `u-${Date.now()}`, role: 'user', content: userText, timestamp: now },
        { id: `a-${Date.now() + 1}`, role: 'assistant', content: aiText, timestamp: now, suggestedKpId: kpId },
      ],
    }));
  };

  const handleChangePersona = (persona: TutorPersona) => {
    setState((prev) => ({ ...prev, aiConfig: { ...prev.aiConfig, persona } }));
  };

  const handleCreateSubmission = (sub: Submission) => {
    setState((prev) => ({
      ...prev,
      submissions: [sub, ...prev.submissions],
      students: prev.students.map((st) =>
        st.id === sub.studentId
          ? {
              ...st,
              recentActivity: `刚刚提交了课下作业（AI 初评 ${sub.aiScore} 分）`,
            }
          : st
      ),
    }));
  };

  const handleVerifySubmission = (subId: string, passed: boolean) => {
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === subId ? { ...s, verificationPassed: passed } : s
      ),
      students: passed
        ? prev.students.map((st) =>
            st.id === prev.currentStudentId
              ? {
                  ...st,
                  points: st.points + 15,
                  predictedGrade: Math.min(100, st.predictedGrade + 3),
                  mastery: { ...st.mastery, 'kp-grad': Math.min(100, (st.mastery['kp-grad'] ?? 60) + 8) },
                }
              : st
          )
        : prev.students,
    }));
  };

  const handleUpvoteQuestion = (qId: string) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qId) return q;
        const already = Boolean(q.upvotedByMe);
        return { ...q, upvotedByMe: !already, upvotes: already ? Math.max(0, q.upvotes - 1) : q.upvotes + 1 };
      }),
    }));
  };

  const handleAskQuestion = (kpId: string, content: string, isAnonymous: boolean) => {
    setState((prev) => {
      const stu = prev.students.find((s) => s.id === prev.currentStudentId) || prev.students[0];
      const kp = prev.knowledgePoints.find((k) => k.id === kpId);
      const newQ = {
        id: `q-${Date.now()}`,
        kpId,
        clusterTitle: content.slice(0, 22) + (content.length > 22 ? '…' : ''),
        authorName: isAnonymous ? '匿名研学者' : stu.name,
        isAnonymous,
        content,
        upvotes: 1,
        upvotedByMe: true,
        status: 'open' as const,
        aiDraftReply: `围绕「${kp?.title || '本节重点'}」，建议先抓核心前提：${kp?.keyTakeaway || '梳理输入输出边界'}，并对照避坑点：${kp?.commonPitfall || '避免机械套用公式'}。老师稍后将统一补充讲解。`,
        studentConfirmed: 'pending' as const,
        createdAt: '刚刚',
      };
      return {
        ...prev,
        questions: [newQ, ...prev.questions],
        students: prev.students.map((s) =>
          s.id === prev.currentStudentId ? { ...s, points: s.points + 10, qaCount: s.qaCount + 1 } : s
        ),
      };
    });
  };

  const handleConfirmQuestionStatus = (qId: string, status: 'understood' | 'still_confused') => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qId ? { ...q, studentConfirmed: status } : q)),
    }));
  };

  const handleRedeemPerk = (perkId: string) => {
    setState((prev) => {
      const perk = prev.perks.find((p) => p.id === perkId);
      const stu = prev.students.find((s) => s.id === prev.currentStudentId);
      if (!perk || !stu || stu.points < perk.costPoints || perk.stockLeft <= 0) return prev;
      return {
        ...prev,
        perks: prev.perks.map((p) =>
          p.id === perkId ? { ...p, stockLeft: p.stockLeft - 1, redeemedByMe: p.redeemedByMe + 1 } : p
        ),
        students: prev.students.map((s) =>
          s.id === prev.currentStudentId
            ? {
                ...s,
                points: s.points - perk.costPoints,
                predictedGrade: perkId === 'perk-4' ? Math.min(100, s.predictedGrade + 2) : s.predictedGrade,
              }
            : s
        ),
      };
    });
  };

  // --- Teacher Actions ---
  const handleBatchApproveNormal = () => {
    const count = state.submissions.filter(
      (s) => s.status === 'pending_review' && s.aiFlag === 'normal'
    ).length;
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.status === 'pending_review' && s.aiFlag === 'normal'
          ? { ...s, status: 'approved' as SubmissionStatus, teacherComment: 'AI 初审通过，教师已批量确认' }
          : s
      ),
    }));
    return count;
  };

  const handleUpdateSubmissionStatus = (subId: string, status: SubmissionStatus, comment?: string) => {
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === subId ? { ...s, status, teacherComment: comment || s.teacherComment } : s
      ),
    }));
  };

  const handlePublishClusterReply = (qId: string, reply: string) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qId
          ? { ...q, officialReply: reply, status: 'teacher_answered', studentConfirmed: 'pending' }
          : q
      ),
    }));
  };

  const handleAddStudentNote = (studentId: string, text: string) => {
    const today = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('/', '-');
    setState((prev) => ({
      ...prev,
      students: prev.students.map((st) =>
        st.id === studentId
          ? { ...st, privateNotes: [{ id: `n-${Date.now()}`, date: today, text }, ...st.privateNotes] }
          : st
      ),
    }));
  };

  const handleTriggerGentleNudge = (studentId: string) => {
    setState((prev) => {
      const target = prev.students.find((s) => s.id === studentId);
      if (!target) return prev;
      const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return {
        ...prev,
        students: prev.students.map((s) => (s.id === studentId ? { ...s, nudgeCount: s.nudgeCount + 1 } : s)),
        nudgeLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: `今天 ${now}`,
            studentName: target.name,
            stage: 'gentle_ai',
            message: '教师手动触发 AI 温柔拆步卡片，已生成 5 分钟极简首步引导发送至该生手机端。',
          },
          ...prev.nudgeLogs,
        ],
      };
    });
  };

  const handlePublishMicroQuests = (quests: MicroQuest[]) => {
    setState((prev) => ({
      ...prev,
      microQuests: [...quests, ...prev.microQuests],
    }));
  };

  // --- Ops Actions ---
  const handleUpdateOpsConfig = (next: OpsConfig) => {
    setState((prev) => ({ ...prev, opsConfig: next }));
  };

  const handleUpdateAIConfig = (next: AIConfig) => {
    setState((prev) => ({ ...prev, aiConfig: next }));
  };

  const handleRunAutoSweep = () => {
    const atRisk = state.students.filter((s) => s.riskLevel !== 'safe');
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.riskLevel !== 'safe' ? { ...s, nudgeCount: s.nudgeCount + 1 } : s
      ),
      nudgeLogs: [
        ...atRisk.map((st, idx) => ({
          id: `log-${Date.now()}-${idx}`,
          timestamp: `今天 ${now}`,
          studentName: st.name,
          stage: (st.riskLevel === 'high_risk' ? 'teacher_alert' : 'gentle_ai') as 'teacher_alert' | 'gentle_ai',
          message:
            st.riskLevel === 'high_risk'
              ? `自动巡检触发：当前预测 ${st.predictedGrade} 分，已同步派发 3 分钟微任务并将帮扶卡片置顶于教师端。`
              : `自动巡检温和触达：已推送对应薄弱考点的 2 分钟自测与 AI 引导入口。`,
        })),
        ...prev.nudgeLogs,
      ],
    }));
    return atRisk.length;
  };

  const handleUpdatePerk = (perkId: string, patch: Partial<PerkItem>) => {
    setState((prev) => ({
      ...prev,
      perks: prev.perks.map((p) => (p.id === perkId ? { ...p, ...patch } : p)),
    }));
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1E2B4A] flex flex-col">
      <Navbar
        role={role}
        onChangeRole={(r) => handleNavigate(r)}
        aiConfig={state.aiConfig}
        courseTitle={state.opsConfig.courseTitle}
        onResetDemo={handleResetDemo}
      />

      <main className="flex-1">
        {role === 'home' && <HomePortal state={state} onNavigate={handleNavigate} />}

        {role === 'student' && (
          <StudentPortal
            state={state}
            activeTab={studentTab}
            onChangeTab={setStudentTab}
            onCompleteQuest={handleCompleteQuest}
            onAddChatMessages={handleAddChatMessages}
            onChangePersona={handleChangePersona}
            onCreateSubmission={handleCreateSubmission}
            onVerifySubmission={handleVerifySubmission}
            onUpvoteQuestion={handleUpvoteQuestion}
            onAskQuestion={handleAskQuestion}
            onConfirmQuestionStatus={handleConfirmQuestionStatus}
            onRedeemPerk={handleRedeemPerk}
            showToast={showToast}
          />
        )}

        {role === 'teacher' && (
          <TeacherPortal
            state={state}
            activeTab={teacherTab}
            onChangeTab={setTeacherTab}
            onBatchApproveNormal={handleBatchApproveNormal}
            onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
            onPublishClusterReply={handlePublishClusterReply}
            onAddStudentNote={handleAddStudentNote}
            onTriggerGentleNudge={handleTriggerGentleNudge}
            onPublishMicroQuests={handlePublishMicroQuests}
            showToast={showToast}
          />
        )}

        {role === 'ops' && (
          <OpsPortal
            state={state}
            activeTab={opsTab}
            onChangeTab={setOpsTab}
            onUpdateOpsConfig={handleUpdateOpsConfig}
            onUpdateAIConfig={handleUpdateAIConfig}
            onRunAutoSweep={handleRunAutoSweep}
            onUpdatePerk={handleUpdatePerk}
            showToast={showToast}
          />
        )}
      </main>

      {/* Editorial Floating Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 no-print px-4 w-full max-w-md pointer-events-none">
          <div className="bg-[#1E2B4A] text-[#FAF7F2] px-4 py-3 rounded-2xl shadow-xl border border-[#D5B984]/40 text-xs sm:text-sm flex items-center gap-2.5 animate-soft-in">
            <CheckCircle2 className="w-4 h-4 text-[#D5B984] shrink-0" />
            <span className="leading-snug">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
