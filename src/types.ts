export type PortalRole = 'home' | 'student' | 'teacher' | 'ops';

export type RealmKey = 'foundation' | 'practice' | 'synthesis';

export interface KnowledgePoint {
  id: string;
  code: string;
  title: string;
  englishSubtitle: string;
  realm: RealmKey;
  summary: string;
  keyTakeaway: string;
  commonPitfall: string;
}

export interface MicroQuest {
  id: string;
  kpId: string;
  realm: RealmKey;
  title: string;
  durationMin: number;
  xpReward: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  completed?: boolean;
  selectedIndex?: number;
  isTeacherPublished?: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  kpId: string;
  deadline: string;
  maxScore: number;
  description: string;
  rubric: string[];
}

export type SubmissionFlag = 'normal' | 'superficial' | 'ai_copy_risk';
export type SubmissionStatus = 'pending_review' | 'approved' | 'needs_revision';

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentNo: string;
  content: string;
  submittedAt: string;
  aiScore: number;
  aiSummary: string;
  aiStrengths: string[];
  aiGaps: string[];
  aiFlag: SubmissionFlag;
  aiFlagReason?: string;
  status: SubmissionStatus;
  teacherComment?: string;
  verificationQuestion: string;
  verificationPassed: boolean;
}

export interface QuestionItem {
  id: string;
  kpId: string;
  clusterTitle: string;
  authorName: string;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  upvotedByMe?: boolean;
  status: 'open' | 'ai_answered' | 'teacher_answered';
  aiDraftReply: string;
  officialReply?: string;
  studentConfirmed: 'pending' | 'understood' | 'still_confused';
  createdAt: string;
}

export interface PrivateNote {
  id: string;
  date: string;
  text: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  studentNo: string;
  major: string;
  streakDays: number;
  points: number;
  predictedGrade: number;
  taskCompletionRate: number;
  qaCount: number;
  riskLevel: 'safe' | 'watch' | 'high_risk';
  mastery: Record<string, number>; // kpId -> 0..100
  tags: string[];
  privateNotes: PrivateNote[];
  recentActivity: string;
  aiDiagnosis: string;
  nudgeCount: number;
}

export interface PerkItem {
  id: string;
  title: string;
  subtitle: string;
  costPoints: number;
  stockLeft: number;
  limitPerTerm: number;
  redeemedByMe: number;
  badgeLabel: string;
}

export type TutorPersona = 'gentle' | 'concise' | 'mentor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedKpId?: string;
}

export interface AIConfig {
  mode: 'builtin' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  persona: TutorPersona;
}

export interface OpsConfig {
  courseTitle: string;
  courseEnglish: string;
  semester: string;
  teacherName: string;
  inviteCode: string;
  weights: {
    microQuest: number;
    assignment: number;
    mastery: number;
    qaCommunity: number;
  };
  automation: {
    autoNudge24h: boolean;
    autoBreakdownTask: boolean;
    autoBuddyPing: boolean;
    autoTeacherEscalate: boolean;
    antiCopyVerify: boolean;
  };
  assistants: {
    id: string;
    name: string;
    roleTitle: string;
    canReviewDrafts: boolean;
    canViewPrivateNotes: boolean;
    active: boolean;
  }[];
}

export interface NudgeLog {
  id: string;
  timestamp: string;
  studentName: string;
  stage: 'gentle_ai' | 'buddy_ping' | 'teacher_alert';
  message: string;
}

export interface AppState {
  currentStudentId: string;
  knowledgePoints: KnowledgePoint[];
  microQuests: MicroQuest[];
  assignments: Assignment[];
  submissions: Submission[];
  questions: QuestionItem[];
  students: StudentProfile[];
  perks: PerkItem[];
  chatHistory: ChatMessage[];
  aiConfig: AIConfig;
  opsConfig: OpsConfig;
  nudgeLogs: NudgeLog[];
}
