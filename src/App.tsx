import React, { useEffect, useState } from 'react';
import { INITIAL_STATE } from './data/initialData';
import { OpsPortal, OpsTab, getOpsNavItems } from './components/OpsPortal';
import { StudentPortal, StudentTab, getStudentNavItems } from './components/StudentPortal';
import { TeacherPortal, TeacherTab, getTeacherNavItems } from './components/TeacherPortal';
import { WorkspaceShell } from './components/WorkspaceShell';
import {
  AIConfig,
  AppState,
  MicroQuest,
  OpsConfig,
  PerkItem,
  PortalRole,
  Submission,
  SubmissionStatus,
  TutorPersona,
} from './types';

const STORAGE_KEY = 'afterbell_minimal_state_v2';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.students && parsed.knowledgePoints && parsed.microQuests?.[0]?.code) {
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
  const [role, setRole] = useState<PortalRole>('student');
  const [studentTab, setStudentTab] = useState<StudentTab>('tasks');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('review');
  const [opsTab, setOpsTab] = useState<OpsTab>('rules');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((window as unknown as { __toastTimer?: number }).__toastTimer);
    (window as unknown as { __toastTimer?: number }).__toastTimer = window.setTimeout(() => setToast(null), 2600);
  };

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
    showToast('已重置演示数据');
  };

  // Student Actions
  const handleCompleteQuest = (questId: string, selectedIndex: number, isCorrect: boolean) => {
    setState((prev) => {
      const target = prev.microQuests.find((q) => q.id === questId);
      if (!target || target.completed) return prev;
      return {
        ...prev,
        microQuests: prev.microQuests.map((q) =>
          q.id === questId ? { ...q, completed: true, selectedIndex } : q
        ),
        students: prev.students.map((st) => {
          if (st.id !== prev.currentStudentId) return st;
          return {
            ...st,
            points: st.points + (isCorrect ? target.xpReward : 8),
            predictedGrade: Math.min(100, st.predictedGrade + (isCorrect ? 2 : 1)),
            taskCompletionRate: Math.min(100, st.taskCompletionRate + 3),
            mastery: {
              ...st.mastery,
              [target.kpId]: Math.min(100, (st.mastery[target.kpId] ?? 60) + (isCorrect ? 10 : 4)),
            },
            recentActivity: `完成 ${target.code}`,
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
    }));
  };

  const handleVerifySubmission = (subId: string, passed: boolean) => {
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) => (s.id === subId ? { ...s, verificationPassed: passed } : s)),
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
      const nextCode = `QA-0${prev.questions.length + 1}`;
      const newQ = {
        id: `q-${Date.now()}`,
        code: nextCode,
        kpId,
        clusterTitle: content.slice(0, 18) + (content.length > 18 ? '…' : ''),
        authorName: isAnonymous ? '匿名' : stu.name,
        isAnonymous,
        content,
        upvotes: 1,
        upvotedByMe: true,
        status: 'open' as const,
        aiDraftReply: kp ? `核心要点：${kp.keyTakeaway}。注意避坑：${kp.commonPitfall}` : '已记录，待教师统一回复。',
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

  // Teacher Actions
  const handleBatchApproveNormal = () => {
    const count = state.submissions.filter((s) => s.status === 'pending_review' && s.aiFlag === 'normal').length;
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.status === 'pending_review' && s.aiFlag === 'normal'
          ? { ...s, status: 'approved' as SubmissionStatus, teacherComment: '常规项批量通过' }
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
        q.id === qId ? { ...q, officialReply: reply, status: 'teacher_answered', studentConfirmed: 'pending' } : q
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
            timestamp: now,
            studentName: target.name,
            stage: 'gentle_ai',
            message: '教师触发 AI 首步拆解提醒。',
          },
          ...prev.nudgeLogs,
        ],
      };
    });
  };

  const handlePublishMicroQuests = (quests: MicroQuest[]) => {
    setState((prev) => ({ ...prev, microQuests: [...quests, ...prev.microQuests] }));
  };

  // Ops Actions
  const handleUpdateOpsConfig = (next: OpsConfig) => setState((prev) => ({ ...prev, opsConfig: next }));
  const handleUpdateAIConfig = (next: AIConfig) => setState((prev) => ({ ...prev, aiConfig: next }));

  const handleRunAutoSweep = () => {
    const atRisk = state.students.filter((s) => s.riskLevel !== 'safe');
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.riskLevel !== 'safe' ? { ...s, nudgeCount: s.nudgeCount + 1 } : s)),
      nudgeLogs: [
        ...atRisk.map((st, idx) => ({
          id: `log-${Date.now()}-${idx}`,
          timestamp: now,
          studentName: st.name,
          stage: (st.riskLevel === 'high_risk' ? 'teacher_alert' : 'gentle_ai') as 'teacher_alert' | 'gentle_ai',
          message: st.riskLevel === 'high_risk' ? `预测 ${st.predictedGrade}，已置顶预警。` : '已发送薄弱点微测提醒。',
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

  // Shell configuration per role
  const shellConfig =
    role === 'student'
      ? {
          plannerTitle: '研学计划',
          navItems: getStudentNavItems(state),
          activeTab: studentTab,
          onChangeTab: (k: string) => setStudentTab(k as StudentTab),
          markedDays: [18, 22, 24, 29],
        }
      : role === 'teacher'
      ? {
          plannerTitle: '教师工作台',
          navItems: getTeacherNavItems(state),
          activeTab: teacherTab,
          onChangeTab: (k: string) => setTeacherTab(k as TeacherTab),
          markedDays: [17, 21, 25, 29],
        }
      : {
          plannerTitle: '运行配置',
          navItems: getOpsNavItems(state),
          activeTab: opsTab,
          onChangeTab: (k: string) => setOpsTab(k as OpsTab),
          markedDays: [15, 26],
        };

  return (
    <>
      <WorkspaceShell
        role={role}
        onChangeRole={setRole}
        plannerTitle={shellConfig.plannerTitle}
        navItems={shellConfig.navItems}
        activeTab={shellConfig.activeTab}
        onChangeTab={shellConfig.onChangeTab}
        courseTitle={state.opsConfig.courseTitle}
        aiConfig={state.aiConfig}
        markedDays={shellConfig.markedDays}
        onResetDemo={handleResetDemo}
      >
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
            onUpdateOpsConfig={handleUpdateOpsConfig}
            onUpdateAIConfig={handleUpdateAIConfig}
            onRunAutoSweep={handleRunAutoSweep}
            onUpdatePerk={handleUpdatePerk}
            showToast={showToast}
          />
        )}
      </WorkspaceShell>

      {/* Whisper-quiet Obsidian Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 no-print pointer-events-none px-4">
          <div className="bg-[#141928] text-white px-4 py-2 rounded-[11px] shadow-lg text-[12.5px] font-medium">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
