import React, { useState } from 'react';
import { Bot, Copy, RefreshCw, Shield, Sliders, Sparkles, Users, Zap } from 'lucide-react';
import { AIConfig, AppState, OpsConfig, PerkItem } from '../types';
import { MinimalSwitch, StatusDot } from './MinimalWidgets';
import { NavItemDef } from './WorkspaceShell';

export type OpsTab = 'rules' | 'automation' | 'access' | 'ai';

export function getOpsNavItems(state: AppState): NavItemDef[] {
  return [
    { key: 'rules', label: '权重与准入', short: '规则', icon: <Sliders className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'automation', label: '自动巡检', short: '巡检', count: state.nudgeLogs.length, icon: <Zap className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'access', label: '协同与特权', short: '协同', icon: <Users className="w-[17px] h-[17px] stroke-[1.6]" /> },
    { key: 'ai', label: '模型直连', short: '模型', icon: <Bot className="w-[17px] h-[17px] stroke-[1.6]" /> },
  ];
}

interface OpsPortalProps {
  state: AppState;
  activeTab: OpsTab;
  onUpdateOpsConfig: (next: OpsConfig) => void;
  onUpdateAIConfig: (next: AIConfig) => void;
  onRunAutoSweep: () => number;
  onUpdatePerk: (perkId: string, patch: Partial<PerkItem>) => void;
  showToast: (msg: string) => void;
}

export const OpsPortal: React.FC<OpsPortalProps> = ({
  state,
  activeTab,
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

  const toggleAuto = (key: keyof OpsConfig['automation']) => {
    const next: OpsConfig = {
      ...localOps,
      automation: { ...localOps.automation, [key]: !localOps.automation[key] },
    };
    setLocalOps(next);
    onUpdateOpsConfig(next);
    showToast('已更新策略');
  };

  return (
    <div className="space-y-5">
      {/* TAB 1: RULES & WEIGHTS */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">权重与准入</h1>

          <div className="glacial-card rounded-[16px] p-4 sm:p-5 space-y-3.5 text-[13px]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#7A869A] mb-1">课程名称</label>
                <input
                  type="text"
                  value={localOps.courseTitle}
                  onChange={(e) => setLocalOps({ ...localOps, courseTitle: e.target.value })}
                  className="w-full rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-2 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#7A869A] mb-1">学期</label>
                <input
                  type="text"
                  value={localOps.semester}
                  onChange={(e) => setLocalOps({ ...localOps, semester: e.target.value })}
                  className="w-full rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-2 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#7A869A] mb-1">主讲教师</label>
                <input
                  type="text"
                  value={localOps.teacherName}
                  onChange={(e) => setLocalOps({ ...localOps, teacherName: e.target.value })}
                  className="w-full rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-2 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#7A869A]">入班码</span>
                <code className="id-chip px-2.5 py-1 rounded-[7px] text-[12px] font-mono font-medium">
                  {localOps.inviteCode}
                </code>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(localOps.inviteCode);
                    showToast('已复制入班码');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#E5EDF4] text-[11.5px] text-[#1C2436] cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> 复制
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const code = `AB-2026-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
                    const next = { ...localOps, inviteCode: code };
                    setLocalOps(next);
                    onUpdateOpsConfig(next);
                    showToast(`新入班码：${code}`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#E5EDF4] text-[11.5px] text-[#1C2436] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> 刷新
                </button>
              </div>
            </div>
          </div>

          <div className="glacial-card rounded-[16px] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-semibold text-[#141928]">平时分权重</span>
              <span
                className={`text-[12px] font-medium tabular ${
                  weightTotal === 100 ? 'text-[#2E7D5B]' : 'text-[#A23E3E]'
                }`}
              >
                {weightTotal}%
              </span>
            </div>

            {(
              [
                { key: 'microQuest', label: '课后微测' },
                { key: 'assignment', label: '作业验真' },
                { key: 'mastery', label: '知识掌握' },
                { key: 'qaCommunity', label: '同问互助' },
              ] as const
            ).map((w) => (
              <div key={w.key} className="flex items-center gap-4">
                <span className="w-20 text-[12.5px] text-[#4C586D]">{w.label}</span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={localOps.weights[w.key]}
                  onChange={(e) =>
                    setLocalOps({
                      ...localOps,
                      weights: { ...localOps.weights, [w.key]: Number(e.target.value) },
                    })
                  }
                  className="flex-1 swiss-range"
                />
                <span className="w-10 text-right text-[12.5px] font-medium text-[#141928] tabular">
                  {localOps.weights[w.key]}%
                </span>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={weightTotal !== 100}
                onClick={() => {
                  onUpdateOpsConfig(localOps);
                  showToast('配置已同步全站');
                }}
                className="px-4 py-1.5 rounded-[9px] bg-[#141928] disabled:bg-[#C6D1DE] text-white text-[12px] font-medium cursor-pointer"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATION ENGINE */}
      {activeTab === 'automation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">自动巡检</h1>
            <button
              type="button"
              onClick={() => {
                const n = onRunAutoSweep();
                showToast(`已巡检并触达 ${n} 位预警学生`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-[#141928] text-white text-[12px] font-medium cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>立即巡检</span>
            </button>
          </div>

          <div className="glacial-card rounded-[16px] divide-y divide-slate-900/[0.06]">
            {(
              [
                { key: 'autoNudge24h', title: '截止前 24h 自动提醒' },
                { key: 'autoBreakdownTask', title: '拖延任务自动拆解首步卡' },
                { key: 'autoBuddyPing', title: '3 日未上线触发搭子提醒' },
                { key: 'autoTeacherEscalate', title: '高危学生自动推送教师待办' },
                { key: 'antiCopyVerify', title: '作业提交强制 10 秒验真' },
              ] as const
            ).map((item) => (
              <div key={item.key} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#1C2436]">{item.title}</span>
                <MinimalSwitch
                  checked={localOps.automation[item.key]}
                  onChange={() => toggleAuto(item.key)}
                  label={item.title}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-[12px] font-medium text-[#7A869A] px-1">触达日志</div>
            {nudgeLogs.map((log) => (
              <div
                key={log.id}
                className="glacial-card-subtle rounded-[11px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12.5px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot
                    tone={log.stage === 'teacher_alert' ? 'risk' : log.stage === 'buddy_ping' ? 'warn' : 'ok'}
                  />
                  <span className="font-medium text-[#141928] shrink-0">{log.studentName}</span>
                  <span className="text-[#5B677B] truncate">{log.message}</span>
                </div>
                <span className="text-[11px] text-[#8B97AA] tabular shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ASSISTANTS & PERK POOL */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">协同与特权</h1>

          <div className="glacial-card rounded-[16px] divide-y divide-slate-900/[0.06]">
            {localOps.assistants.map((ast) => (
              <div key={ast.id} className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13.5px] font-medium text-[#141928]">{ast.name}</div>
                  <div className="text-[11.5px] text-[#7A869A]">{ast.roleTitle}</div>
                </div>
                <div className="flex items-center gap-2 text-[11.5px]">
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
                      showToast('已更新助教权限');
                    }}
                    className={`px-2.5 py-1 rounded-[7px] cursor-pointer ${
                      ast.canReviewDrafts ? 'bg-[#141928] text-white' : 'bg-[#E5EDF4] text-[#4C586D]'
                    }`}
                  >
                    {ast.canReviewDrafts ? '可初审作业' : '仅查看'}
                  </button>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#EDF2F7] text-[#6B7689]">
                    <Shield className="w-3 h-3" /> 备注锁定
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="text-[12px] font-medium text-[#7A869A] px-1">特权池参数</div>
            {perks.map((perk) => (
              <div
                key={perk.id}
                className="glacial-card-subtle rounded-[12px] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12.5px]"
              >
                <div className="flex items-center gap-2">
                  <span className="id-chip px-2 py-0.5 rounded-[6px] text-[11px]">{perk.code}</span>
                  <span className="font-medium text-[#141928]">{perk.title}</span>
                </div>
                <div className="flex items-center gap-3 tabular text-[12px]">
                  <label className="flex items-center gap-1.5 text-[#6B7689]">
                    积分
                    <input
                      type="number"
                      step={10}
                      min={20}
                      value={perk.costPoints}
                      onChange={(e) => onUpdatePerk(perk.id, { costPoints: Math.max(20, Number(e.target.value)) })}
                      className="w-14 rounded-[7px] bg-white border border-slate-900/10 px-1.5 py-0.5 text-center text-[#141928]"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[#6B7689]">
                    库存
                    <input
                      type="number"
                      min={0}
                      value={perk.stockLeft}
                      onChange={(e) => onUpdatePerk(perk.id, { stockLeft: Math.max(0, Number(e.target.value)) })}
                      className="w-12 rounded-[7px] bg-white border border-slate-900/10 px-1.5 py-0.5 text-center text-[#141928]"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AI MODEL CONNECTION */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <h1 className="text-[18px] font-semibold tracking-tight text-[#141928]">模型直连</h1>

          <div className="glacial-card rounded-[16px] p-4 sm:p-5 space-y-4">
            <div className="inline-flex p-0.5 rounded-[10px] glass-track">
              <button
                type="button"
                onClick={() => setLocalAI({ ...localAI, mode: 'builtin' })}
                className={`px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer ${
                  localAI.mode === 'builtin' ? 'bg-white text-[#141928] font-medium shadow-2xs' : 'text-[#627084]'
                }`}
              >
                内置演示引擎
              </button>
              <button
                type="button"
                onClick={() => setLocalAI({ ...localAI, mode: 'custom' })}
                className={`px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer ${
                  localAI.mode === 'custom' ? 'bg-white text-[#141928] font-medium shadow-2xs' : 'text-[#627084]'
                }`}
              >
                OpenAI 兼容 API
              </button>
            </div>

            {localAI.mode === 'custom' && (
              <div className="space-y-3 text-[13px]">
                <div className="flex gap-1.5 text-[11.5px]">
                  {[
                    { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
                    { name: 'Qwen', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
                    { name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setLocalAI({ ...localAI, baseUrl: p.url, model: p.model })}
                      className="px-2.5 py-1 rounded-[7px] bg-[#E5EDF4] text-[#1C2436] hover:bg-[#DAE4EE] cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] text-[#7A869A] mb-1">Base URL</label>
                  <input
                    type="text"
                    value={localAI.baseUrl}
                    onChange={(e) => setLocalAI({ ...localAI, baseUrl: e.target.value })}
                    className="w-full rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-2 outline-none focus:bg-white font-mono text-[12px]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#7A869A] mb-1">API Key（仅存本机）</label>
                    <input
                      type="password"
                      value={localAI.apiKey}
                      onChange={(e) => setLocalAI({ ...localAI, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-2 outline-none focus:bg-white font-mono text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#7A869A] mb-1">Model</label>
                    <input
                      type="text"
                      value={localAI.model}
                      onChange={(e) => setLocalAI({ ...localAI, model: e.target.value })}
                      className="w-full rounded-[9px] bg-[#F2F6FA] border border-slate-900/[0.08] px-3 py-2 outline-none focus:bg-white font-mono text-[12px]"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onUpdateAIConfig(localAI);
                  showToast(localAI.mode === 'custom' && localAI.apiKey ? `已连接 ${localAI.model}` : '已切换内置引擎');
                }}
                className="px-4 py-1.5 rounded-[9px] bg-[#141928] text-white text-[12px] font-medium cursor-pointer"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
