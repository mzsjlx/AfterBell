import React, { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  Gift,
  KeyRound,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { AIConfig, AppState, OpsConfig, PerkItem } from '../types';
import { EditorialSectionHeading } from './EditorialDecor';

export type OpsTab = 'rules' | 'automation' | 'access' | 'ai';

interface OpsPortalProps {
  state: AppState;
  activeTab: OpsTab;
  onChangeTab: (tab: OpsTab) => void;
  onUpdateOpsConfig: (next: OpsConfig) => void;
  onUpdateAIConfig: (next: AIConfig) => void;
  onRunAutoSweep: () => number;
  onUpdatePerk: (perkId: string, patch: Partial<PerkItem>) => void;
  showToast: (msg: string) => void;
}

const OPS_TABS: { key: OpsTab; label: string; short: string; icon: React.ReactNode }[] = [
  { key: 'rules', label: '课程与权重配置', short: '规则', icon: <Sliders className="w-4 h-4" /> },
  { key: 'automation', label: 'AI 自动催办引擎', short: '自动', icon: <Zap className="w-4 h-4" /> },
  { key: 'access', label: '助教权限与特权池', short: '协同', icon: <Users className="w-4 h-4" /> },
  { key: 'ai', label: 'AI 模型引擎直连', short: '模型', icon: <Bot className="w-4 h-4" /> },
];

export const OpsPortal: React.FC<OpsPortalProps> = ({
  state,
  activeTab,
  onChangeTab,
  onUpdateOpsConfig,
  onUpdateAIConfig,
  onRunAutoSweep,
  onUpdatePerk,
  showToast,
}) => {
  const { opsConfig, aiConfig, nudgeLogs, perks } = state;
  const [localOps, setLocalOps] = useState<OpsConfig>(opsConfig);
  const [localAI, setLocalAI] = useState<AIConfig>(aiConfig);

  const weightTotal =
    localOps.weights.microQuest +
    localOps.weights.assignment +
    localOps.weights.mastery +
    localOps.weights.qaCommunity;

  const handleSaveOps = () => {
    onUpdateOpsConfig(localOps);
    showToast('运营规则与权重配置已保存，全站已实时生效');
  };

  const handleRegenerateInvite = () => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const updated = { ...localOps, inviteCode: `LIMINAL-2026-${suffix}` };
    setLocalOps(updated);
    onUpdateOpsConfig(updated);
    showToast(`已生成全新入班邀请码：${updated.inviteCode}`);
  };

  const handleToggleAutomation = (key: keyof OpsConfig['automation']) => {
    const updated: OpsConfig = {
      ...localOps,
      automation: { ...localOps.automation, [key]: !localOps.automation[key] },
    };
    setLocalOps(updated);
    onUpdateOpsConfig(updated);
    showToast('AI 自动化策略已实时切换');
  };

  const handleSaveAI = () => {
    onUpdateAIConfig(localAI);
    showToast(
      localAI.mode === 'custom' && localAI.apiKey.trim()
        ? `已切换至真实大模型引擎（${localAI.model}），全站答疑/初审/出题/报告均实时生效！`
        : '已切换为内置零配置演示智能体'
    );
  };

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-mobile-nav md:pb-16 animate-soft-in">
      {/* Desktop Sub-Nav Pill Bar */}
      <div className="hidden md:flex items-center justify-between gap-4 mb-7 pb-4 border-b border-[#E4DCCE]">
        <div className="flex items-center gap-2">
          {OPS_TABS.map((tab) => {
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
              </button>
            );
          })}
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-[#4B7056]/12 text-[#33523D] font-medium">
          私有化自主管控 · 零第三方抽成
        </span>
      </div>

      {/* TAB 1: COURSE INFO, INVITE CODE & TRANSPARENT WEIGHTS */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 editorial-card rounded-3xl p-5 sm:p-6 space-y-4">
            <span className="micro-label">COURSE SOVEREIGNTY · 课程与准入自主控制</span>
            <h3 className="font-editorial text-2xl font-semibold text-[#1E2B4A]">基础信息与邀请码准入</h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-[#5E574D] mb-1">课程中文名称</label>
                <input
                  type="text"
                  value={localOps.courseTitle}
                  onChange={(e) => setLocalOps({ ...localOps, courseTitle: e.target.value })}
                  className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 outline-none focus:border-[#1E2B4A]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5E574D] mb-1">授课学期</label>
                  <input
                    type="text"
                    value={localOps.semester}
                    onChange={(e) => setLocalOps({ ...localOps, semester: e.target.value })}
                    className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 outline-none focus:border-[#1E2B4A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E574D] mb-1">主讲教师</label>
                  <input
                    type="text"
                    value={localOps.teacherName}
                    onChange={(e) => setLocalOps({ ...localOps, teacherName: e.target.value })}
                    className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 outline-none focus:border-[#1E2B4A]"
                  />
                </div>
              </div>

              {/* Invite Code Box */}
              <div className="rounded-2xl p-4 bg-[#F3EEE4] border border-[#E4DCCE] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1E2B4A]">学生入班邀请码（防外人乱入）</span>
                  <button
                    type="button"
                    onClick={handleRegenerateInvite}
                    className="inline-flex items-center gap-1 text-[#B38B4D] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> 重置新码
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#DFD5C5]">
                  <code className="font-mono text-sm font-semibold tracking-wider text-[#1E2B4A]">
                    {localOps.inviteCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(localOps.inviteCode);
                      showToast('入班邀请码已复制，可直接发至班级微信群');
                    }}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-[#1E2B4A] text-white cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> 复制
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Progress Weights */}
          <div className="lg:col-span-6 editorial-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="micro-label">EVALUATION WEIGHTS · 过程性权重</span>
                  <h3 className="font-editorial text-2xl font-semibold text-[#1E2B4A]">
                    透明化平时分构成比例
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    weightTotal === 100
                      ? 'bg-[#4B7056]/14 text-[#34543E]'
                      : 'bg-[#A94B44]/14 text-[#8B322C]'
                  }`}
                >
                  合计 {weightTotal}%
                </span>
              </div>

              <p className="text-xs text-[#6E665C] leading-relaxed">
                修改后学生手机端的平时分进度环、教师端自动核算表都会同步按新权重呈现，做到公开公平零争议。
              </p>

              {(
                [
                  { key: 'microQuest', label: '3 分钟课下微闯关打卡', desc: '鼓励碎片时间持续巩固' },
                  { key: 'assignment', label: '课下作业质量与 10 秒验真', desc: '强调真实思考，防止纯抄' },
                  { key: 'mastery', label: '六维核心知识点掌握度', desc: '动态追踪真实吸收深度' },
                  { key: 'qaCommunity', label: '同问墙有效提问与互助', desc: '鼓励不懂就问、分享笔记' },
                ] as const
              ).map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-[#1E2B4A]">
                      {item.label} <span className="text-[11px] font-normal text-[#7A7267]">· {item.desc}</span>
                    </span>
                    <span className="font-editorial text-lg font-semibold text-[#B38B4D]">
                      {localOps.weights[item.key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={localOps.weights[item.key]}
                    onChange={(e) =>
                      setLocalOps({
                        ...localOps,
                        weights: { ...localOps.weights, [item.key]: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-[#1E2B4A] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={weightTotal !== 100}
              onClick={handleSaveOps}
              className="w-full py-3 rounded-full bg-[#1E2B4A] disabled:bg-[#CFC7B9] text-[#FAF7F2] text-sm font-medium cursor-pointer"
            >
              {weightTotal === 100 ? '保存配置并同步全站' : `请将四项权重之和调整为 100%（当前 ${weightTotal}%）`}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: AI AUTOMATION & GENTLE NUDGE ENGINE */}
      {activeTab === 'automation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <EditorialSectionHeading
              align="left"
              english="AUTOMATED CARE ENGINE"
              title="AI 自动盯人、拆步与防抄策略"
              subtitle="把催作业、防拖延、查敷衍全部做成自动化开关，老师不必亲自在群里一遍遍 @。"
            />

            <div className="space-y-3">
              {(
                [
                  {
                    key: 'autoNudge24h',
                    title: '截止前 24 小时 AI 温柔课代表提醒',
                    desc: '自动识别未交作业同学，避开生硬说教，用温和语气发送站内提醒。',
                  },
                  {
                    key: 'autoBreakdownTask',
                    title: '大任务自动拆解为“5 分钟第一步”微卡片',
                    desc: '针对拖延症学生，AI 自动把大作业拆成极低门槛的首步小问题降低抗拒。',
                  },
                  {
                    key: 'autoBuddyPing',
                    title: '连续 3 天未上线触发“学习搭子”轻互戳',
                    desc: '同龄人轻轻提醒一把，比老师点名批评更有效且不伤和气。',
                  },
                  {
                    key: 'autoTeacherEscalate',
                    title: '连续预警自动升级至教师端红灯待办',
                    desc: 'AI 提醒两次仍无响应或核心考点低于 50%，自动附诊断摘要推送老师。',
                  },
                  {
                    key: 'antiCopyVerify',
                    title: '开启作业「AI 10 秒防糊弄验真追问」（实时联动学生端）',
                    desc: '学生提交作业后弹出 1 道基于本人内容的大白话快问，优雅挡住直接粘贴通用 AI。',
                  },
                ] as const
              ).map((item) => {
                const enabled = localOps.automation[item.key];
                return (
                  <div
                    key={item.key}
                    className="editorial-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-sm sm:text-base font-medium text-[#1E2B4A]">{item.title}</h4>
                      <p className="text-xs text-[#6E665C] mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => handleToggleAutomation(item.key)}
                      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer ${
                        enabled ? 'bg-[#1E2B4A]' : 'bg-[#D8CFC0]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-[#FAF7F2] shadow-xs transform transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Nudge Execution Log */}
          <div className="lg:col-span-5 editorial-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between bg-[#F6F1E7]/85">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="micro-label">EXECUTION TRACE</span>
                  <h3 className="font-editorial text-xl font-semibold text-[#1E2B4A]">AI 自动巡检与触达日志</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const n = onRunAutoSweep();
                    showToast(`AI 巡检完成！已为 ${n} 名预警/观察学生自动派发个性化提醒并留痕`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-xs font-medium cursor-pointer hover:bg-[#293B63]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D5B984]" />
                  <span>立即巡检一次</span>
                </button>
              </div>

              <div className="space-y-3 mt-4 max-h-[430px] overflow-y-auto pr-1">
                {nudgeLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E4DCCE] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#1E2B4A]">{log.studentName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          log.stage === 'teacher_alert'
                            ? 'bg-[#A94B44]/14 text-[#8B322C]'
                            : log.stage === 'buddy_ping'
                            ? 'bg-[#B87D3B]/15 text-[#87531A]'
                            : 'bg-[#4B7056]/14 text-[#34543E]'
                        }`}
                      >
                        {log.stage === 'teacher_alert'
                          ? '升级推老师'
                          : log.stage === 'buddy_ping'
                          ? '搭子互戳'
                          : 'AI 温柔拆步'}
                      </span>
                    </div>
                    <p className="text-[#5E574D] leading-relaxed">{log.message}</p>
                    <div className="text-[10px] text-[#9A9282]">{log.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ASSISTANTS RBAC & STUDENT PERK POOL */}
      {activeTab === 'access' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assistants Permission Matrix */}
          <div className="lg:col-span-6 space-y-4">
            <EditorialSectionHeading
              align="left"
              english="DELEGATED GOVERNANCE"
              title="助教协同与权限边界"
              subtitle="把杂活分给助教，同时锁死教师私密备注与核心导出权限。"
            />

            <div className="space-y-3">
              {localOps.assistants.map((ast) => (
                <div key={ast.id} className="editorial-card rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-editorial text-lg font-semibold text-[#1E2B4A]">{ast.name}</h4>
                      <p className="text-xs text-[#7A7267]">{ast.roleTitle}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        ast.active ? 'bg-[#4B7056]/14 text-[#34543E]' : 'bg-[#E4DCCE] text-[#7A7267]'
                      }`}
                    >
                      {ast.active ? '协作生效中' : '已停用'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = {
                          ...localOps,
                          assistants: localOps.assistants.map((a) =>
                            a.id === ast.id ? { ...a, canReviewDrafts: !a.canReviewDrafts } : a
                          ),
                        };
                        setLocalOps(next);
                        onUpdateOpsConfig(next);
                        showToast('助教作业初审权限已更新');
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer ${
                        ast.canReviewDrafts
                          ? 'bg-[#1E2B4A] text-white border-[#1E2B4A]'
                          : 'bg-[#FAF7F2] text-[#6E665C] border-[#D8CCB8]'
                      }`}
                    >
                      {ast.canReviewDrafts ? '✓ 允许协助初审作业' : '禁止查看作业初审'}
                    </button>

                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-[#EFE8DC] text-[#7A7267]">
                      <Shield className="w-3.5 h-3.5 text-[#B38B4D]" />
                      教师私密备注默认锁定不可见
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Perk Pool Control */}
          <div className="lg:col-span-6 space-y-4">
            <EditorialSectionHeading
              align="left"
              english="REWARD POOL CONTROL"
              title="学生研学特权池调控"
              subtitle="精准控制积分门槛与总库存，让学生既有盼头又绝不失控（改动实时同步学生端）。"
            />

            <div className="space-y-3">
              {perks.map((perk) => (
                <div key={perk.id} className="editorial-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[#B38B4D]" />
                      <h4 className="font-medium text-sm text-[#1E2B4A]">{perk.title}</h4>
                    </div>
                    <p className="text-[11px] text-[#7A7267] mt-0.5">{perk.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5">
                      <span className="text-[#7A7267]">积分</span>
                      <input
                        type="number"
                        step={10}
                        min={20}
                        value={perk.costPoints}
                        onChange={(e) => onUpdatePerk(perk.id, { costPoints: Math.max(20, Number(e.target.value)) })}
                        className="w-16 rounded-lg bg-white border border-[#DFD5C5] px-2 py-1 text-center font-medium text-[#1E2B4A]"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="text-[#7A7267]">库存</span>
                      <input
                        type="number"
                        min={0}
                        value={perk.stockLeft}
                        onChange={(e) => onUpdatePerk(perk.id, { stockLeft: Math.max(0, Number(e.target.value)) })}
                        className="w-14 rounded-lg bg-white border border-[#DFD5C5] px-2 py-1 text-center font-medium text-[#1E2B4A]"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REAL LLM API CONFIGURATION */}
      {activeTab === 'ai' && (
        <div className="max-w-3xl mx-auto editorial-card rounded-3xl p-6 sm:p-8 space-y-6 bg-[#FAF7F2]">
          <div>
            <span className="micro-label">AI ENGINE CONNECTION · 教育智能体底座</span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1E2B4A] mt-1">
              内置演示智能体 / 真实大模型直连
            </h3>
            <p className="text-xs sm:text-sm text-[#6A6258] mt-1.5 leading-relaxed">
              无需配置即可流畅演示全部 AI 流程；老师若填入自己的 DeepSeek / 通义千问 / OpenAI 兼容密钥（仅保存在本地浏览器，绝不上传第三方），即可让全站答疑、初审、出题、报告全部接入真实大模型。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLocalAI({ ...localAI, mode: 'builtin' })}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                localAI.mode === 'builtin'
                  ? 'bg-[#1E2B4A] text-[#FAF7F2] border-[#1E2B4A]'
                  : 'bg-white text-[#1E2B4A] border-[#E4DCCE]'
              }`}
            >
              <div className="font-medium text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D5B984]" />
                <span>内置智能体演示引擎</span>
              </div>
              <p className={`text-xs mt-1 ${localAI.mode === 'builtin' ? 'text-[#FAF7F2]/75' : 'text-[#7A7267]'}`}>
                零费用、零延迟，开箱体验全部三端联动场景。
              </p>
            </button>

            <button
              type="button"
              onClick={() => setLocalAI({ ...localAI, mode: 'custom' })}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                localAI.mode === 'custom'
                  ? 'bg-[#1E2B4A] text-[#FAF7F2] border-[#1E2B4A]'
                  : 'bg-white text-[#1E2B4A] border-[#E4DCCE]'
              }`}
            >
              <div className="font-medium text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#D5B984]" />
                <span>接入真实大模型 API</span>
              </div>
              <p className={`text-xs mt-1 ${localAI.mode === 'custom' ? 'text-[#FAF7F2]/75' : 'text-[#7A7267]'}`}>
                支持 DeepSeek / 通义千问 / OpenAI 兼容接口。
              </p>
            </button>
          </div>

          {localAI.mode === 'custom' && (
            <div className="space-y-4 p-5 rounded-2xl bg-[#F4EFE5] border border-[#E4DCCE]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#7A7267]">快捷预设：</span>
                <button
                  type="button"
                  onClick={() =>
                    setLocalAI({ ...localAI, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' })
                  }
                  className="px-3 py-1 rounded-full bg-white border border-[#D8CCB8] text-[#1E2B4A] cursor-pointer hover:border-[#B38B4D]"
                >
                  DeepSeek
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocalAI({
                      ...localAI,
                      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                      model: 'qwen-plus',
                    })
                  }
                  className="px-3 py-1 rounded-full bg-white border border-[#D8CCB8] text-[#1E2B4A] cursor-pointer hover:border-[#B38B4D]"
                >
                  通义千问 Qwen
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocalAI({ ...localAI, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })
                  }
                  className="px-3 py-1 rounded-full bg-white border border-[#D8CCB8] text-[#1E2B4A] cursor-pointer hover:border-[#B38B4D]"
                >
                  OpenAI
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-[#1E2B4A] mb-1">API Base URL</label>
                  <input
                    type="text"
                    value={localAI.baseUrl}
                    onChange={(e) => setLocalAI({ ...localAI, baseUrl: e.target.value })}
                    className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2B4A] mb-1">API Key（仅存本机浏览器）</label>
                  <input
                    type="password"
                    value={localAI.apiKey}
                    onChange={(e) => setLocalAI({ ...localAI, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2B4A] mb-1">模型名称 (Model)</label>
                  <input
                    type="text"
                    value={localAI.model}
                    onChange={(e) => setLocalAI({ ...localAI, model: e.target.value })}
                    className="w-full rounded-xl bg-white border border-[#DFD5C5] px-3.5 py-2.5 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveAI}
            className="w-full py-3 rounded-full bg-[#1E2B4A] text-[#FAF7F2] text-sm font-medium hover:bg-[#293B63] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D5B984]" />
            <span>保存 AI 引擎设置</span>
          </button>
        </div>
      )}

    </div>

      {/* MOBILE FLOATING BOTTOM NAV FOR OPS */}
      <nav
        aria-label="运营端手机底部导航"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 no-print bg-[#FAF7F2]/95 backdrop-blur-lg border-t border-[#E4DCCE] shadow-[0_-6px_24px_-12px_rgba(30,43,74,0.14)] px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-4 gap-1">
          {OPS_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChangeTab(tab.key)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-colors cursor-pointer ${
                  active ? 'text-[#1E2B4A] bg-[#EFE8DC]/90 font-medium' : 'text-[#7A7267]'
                }`}
              >
                <span className={active ? 'text-[#B38B4D]' : ''}>{tab.icon}</span>
                <span className="text-[10px] mt-0.5">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
