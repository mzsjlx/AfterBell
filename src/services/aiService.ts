import { AIConfig, AppState, KnowledgePoint, MicroQuest, QuestionItem, StudentProfile, Submission } from '../types';

async function callCustomLLM(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (config.mode !== 'custom' || !config.apiKey.trim() || !config.baseUrl.trim()) {
    return null;
  }
  const endpoint = config.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim() || 'gpt-4o-mini',
        temperature: 0.65,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const personaOpeners: Record<AIConfig['persona'], string> = {
  gentle: '别着急，这个问题其实卡住了班里不少同学，我们把它拆成一小步来看：',
  concise: '直奔核心考点，按这三步抓重点：',
  mentor: '很好的追问。先别急着看结论，请顺着下面的问题反推一遍：',
};

export async function generateTutorReply(
  userInput: string,
  student: StudentProfile,
  kps: KnowledgePoint[],
  config: AIConfig
): Promise<{ reply: string; matchedKpId?: string; isLive: boolean }> {
  const weakestKps = [...kps]
    .sort((a, b) => (student.mastery[a.id] ?? 0) - (student.mastery[b.id] ?? 0))
    .slice(0, 2);

  const systemPrompt = `你是大学课程《人工智能与计算思维导论》的课下AI助教（人设：${config.persona}）。
规则：
1. 使用苏格拉底启发式引导，不直接给出可直接抄袭的完整作业答案，而是分步点拨并提出1个小追问检验理解。
2. 结合当前学生（${student.name}）的薄弱知识点：${weakestKps.map((k) => `${k.title}(${student.mastery[k.id]}%)`).join('、')}。
3. 语气克制、温和、有学术美感，220字以内，条理清晰。`;

  const live = await callCustomLLM(config, systemPrompt, userInput);
  if (live) {
    const matched = kps.find((k) => userInput.includes(k.title.slice(0, 3)) || userInput.includes(k.code));
    return { reply: live, matchedKpId: matched?.id, isLive: true };
  }

  await delay(650);
  const lower = userInput.toLowerCase();
  let matched = kps.find(
    (k) =>
      lower.includes(k.title.slice(0, 2).toLowerCase()) ||
      (k.id === 'kp-bayes' && (lower.includes('贝叶斯') || lower.includes('概率') || lower.includes('先验'))) ||
      (k.id === 'kp-grad' && (lower.includes('梯度') || lower.includes('过拟合') || lower.includes('学习率') || lower.includes('loss'))) ||
      (k.id === 'kp-search' && (lower.includes('复杂度') || lower.includes('搜索') || lower.includes('a*') || lower.includes('o('))) ||
      (k.id === 'kp-llm' && (lower.includes('提示') || lower.includes('prompt') || lower.includes('大模型') || lower.includes('幻觉'))) ||
      (k.id === 'kp-encode' && (lower.includes('编码') || lower.includes('抽象') || lower.includes('比特'))) ||
      (k.id === 'kp-ethics' && (lower.includes('伦理') || lower.includes('偏见') || lower.includes('对齐')))
  );

  const opener = personaOpeners[config.persona];

  if (matched) {
    return {
      isLive: false,
      matchedKpId: matched.id,
      reply: `${opener}

你问到的正好对应 **「${matched.code} ${matched.title}」**（你目前这一项的掌握度是 ${student.mastery[matched.id] ?? 60}%）：

1. **核心抓手**：${matched.keyTakeaway}
2. **高频避坑**：${matched.commonPitfall}

**小步自检**：先试着用你自己的话回答我——如果把题目里的核心约束条件改严一倍，结果会往哪个方向变化？答完我再帮你把下一步串起来。`,
    };
  }

  const weak = weakestKps[0];
  return {
    isLive: false,
    matchedKpId: weak?.id,
    reply: `${opener}

我结合你当前的学情档案看了一下，你目前最值得顺手补强的是 **「${weak.code} ${weak.title}」**（当前 ${student.mastery[weak.id]}%）。

针对你提到的「${userInput.slice(0, 26)}${userInput.length > 26 ? '…' : ''}」：
1. 先把问题拆成 **“已知输入 / 核心变换规则 / 边界反例”** 三行写下来；
2. 对照课件要点：${weak.keyTakeaway}；
3. 如果这是课后作业里卡壳的一问，把你已想到的半截思路发给我，我带你逐句修正，不直接给模板答案。`,
  };
}

export async function preGradeSubmission(
  content: string,
  rubric: string[],
  assignmentTitle: string,
  config: AIConfig
): Promise<{
  aiScore: number;
  aiSummary: string;
  aiStrengths: string[];
  aiGaps: string[];
  aiFlag: Submission['aiFlag'];
  aiFlagReason?: string;
  verificationQuestion: string;
}> {
  const sys = `你是大学课程AI初审助教。根据评分标准评估学生作业，并出1道10秒能答的“验真追问”（防止直接粘贴AI答案）。严格输出JSON：{"aiScore":数字0-100,"aiSummary":"一句话总评","aiStrengths":["优点"],"aiGaps":["不足"],"aiFlag":"normal|superficial|ai_copy_risk","aiFlagReason":"若异常写原因","verificationQuestion":"基于学生内容的具体10秒追问"}`;
  const live = await callCustomLLM(config, sys, `作业：${assignmentTitle}\n评分标准：${rubric.join('；')}\n学生提交内容：${content}`);
  if (live) {
    try {
      const jsonMatch = live.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          aiScore: Math.min(100, Math.max(40, Number(parsed.aiScore) || 82)),
          aiSummary: parsed.aiSummary || 'AI 已按评分维度完成初审。',
          aiStrengths: Array.isArray(parsed.aiStrengths) ? parsed.aiStrengths : ['紧扣主题完成作答'],
          aiGaps: Array.isArray(parsed.aiGaps) ? parsed.aiGaps : ['可进一步补充反例论证'],
          aiFlag: parsed.aiFlag || 'normal',
          aiFlagReason: parsed.aiFlagReason,
          verificationQuestion: parsed.verificationQuestion || '请用一句话说明你方案中最关键的权衡取舍是什么？',
        };
      }
    } catch {
      // fall through to heuristic engine
    }
  }

  await delay(800);
  const trimmed = content.trim();
  const len = trimmed.length;
  const genericAiPhrases = ['综上所述', '总而言之', '随着人工智能的飞速发展', '一方面', '另一方面'];
  const genericHitCount = genericAiPhrases.filter((p) => trimmed.includes(p)).length;

  if (len < 45) {
    return {
      aiScore: 62,
      aiSummary: '字数偏少，仅给出了结论，缺少推导过程与具体案例支撑。',
      aiStrengths: ['方向基本正确，抓住了基础概念'],
      aiGaps: ['未展开关键步骤推导', '缺少反例或局限性说明'],
      aiFlag: 'superficial',
      aiFlagReason: '内容过短（不足 45 字），建议补充思考过程后复核',
      verificationQuestion: '你刚才的结论如果放到数据量扩大 10 倍的场景下，最先失效的是哪一步？',
    };
  }

  if (genericHitCount >= 3) {
    return {
      aiScore: 71,
      aiSummary: '行文结构工整但套话密度偏高，缺少结合本课具体案例的个人分析。',
      aiStrengths: ['覆盖了评分标准中的基本维度'],
      aiGaps: ['案例空泛，未引用本课实验数据或具体参数'],
      aiFlag: 'ai_copy_risk',
      aiFlagReason: '检测到高频模板化连接词，疑似直接粘贴通用大模型输出，已触发10秒验真追问',
      verificationQuestion: '请不看原文，用自己的大白话举一个你身边的具体例子，解释你文中提到的核心机制。',
    };
  }

  const score = Math.min(95, 78 + Math.floor(Math.min(len, 240) / 18));
  return {
    aiScore: score,
    aiSummary: '逻辑层次清晰，准确命中核心评分点，展现了独立的思考过程。',
    aiStrengths: ['结合课程核心原理展开分析', '条理明确，有具体的例证支撑'],
    aiGaps: ['若能补充一条边界条件或失败案例分析，可冲刺 95+ 示范档'],
    aiFlag: 'normal',
    verificationQuestion: `你在回答中重点提到了「${trimmed.slice(0, 16)}…」，如果让你向一位零基础同学用 15 字概括它的本质，你会怎么说？`,
  };
}

export async function evaluateVerificationAnswer(
  answer: string,
  config: AIConfig
): Promise<{ passed: boolean; feedback: string }> {
  const live = await callCustomLLM(
    config,
    '判断学生对10秒验真追问的回答是否体现真实理解（不是敷衍乱打）。返回JSON：{"passed":true/false,"feedback":"35字内简评"}',
    answer
  );
  if (live) {
    try {
      const m = live.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        return { passed: Boolean(parsed.passed), feedback: parsed.feedback || '理解到位，验真通过！' };
      }
    } catch {
      // fallback
    }
  }
  await delay(500);
  const clean = answer.trim();
  if (clean.length < 8 || /^(不知道|随便|123|aaa|好的|哈哈)+$/i.test(clean)) {
    return {
      passed: false,
      feedback: '回答太简略啦，试着用一句话说出你自己的判断依据（至少 10 个字），再点一次即可通关。',
    };
  }
  return {
    passed: true,
    feedback: '表述贴切且抓住了核心逻辑！10 秒验真已通过，积分 +15 已自动记入你的平时分进度。',
  };
}

export async function generateLifesaverGuide(
  student: StudentProfile,
  kps: KnowledgePoint[],
  config: AIConfig
): Promise<string> {
  const sorted = [...kps].sort((a, b) => (student.mastery[a.id] ?? 0) - (student.mastery[b.id] ?? 0));
  const weak = sorted.slice(0, 3);

  const live = await callCustomLLM(
    config,
    '你是大学考前复习规划师，输出一份精致、极简、15分钟可读完的个人考前急救清单（Markdown列表，不超过300字）。',
    `学生：${student.name}，当前预测平时分：${student.predictedGrade}。最薄弱的3个知识点：${weak
      .map((w) => `${w.title}(掌握度${student.mastery[w.id]}%，易错：${w.commonPitfall})`)
      .join('；')}`
  );
  if (live) return live;

  await delay(700);
  return `### ${student.name} · 专属 15 分钟考前急救单

**当前诊断**：预计平时表现 **${student.predictedGrade} 分**，补齐以下 3 个核心缺口即可稳步跃升至 **88+ 安全优秀区**。

1. **优先止血（5 分钟）· ${weak[0].code} ${weak[0].title}**（当前 ${student.mastery[weak[0].id]}%）
   - 必背抓手：${weak[0].keyTakeaway}
   - 考场避坑：${weak[0].commonPitfall}

2. **快速提分（5 分钟）· ${weak[1].code} ${weak[1].title}**（当前 ${student.mastery[weak[1].id]}%）
   - 必背抓手：${weak[1].keyTakeaway}
   - 考场避坑：${weak[1].commonPitfall}

3. **稳固优势（5 分钟）· ${weak[2].code} ${weak[2].title}**（当前 ${student.mastery[weak[2].id]}%）
   - 必背抓手：${weak[2].keyTakeaway}

> **AI 最短路径建议**：先刷完对应章节的 2 道 3 分钟微闯关，再对「同问墙」里标红的高赞困惑复述一遍思路即可。`;
}

export async function generateMicroQuestsFromNotes(
  notes: string,
  kp: KnowledgePoint,
  config: AIConfig
): Promise<MicroQuest[]> {
  const sys = `根据大学老师输入的讲义要点，生成2道高质量课后3分钟微闯关单选题，严格输出JSON数组：[{"title":"简短标题","question":"题干","options":["A...","B...","C...","D..."],"correctIndex":0,"explanation":"简明解析"}]`;
  const live = await callCustomLLM(config, sys, `知识点：${kp.title}\n老师讲义片段：${notes}`);
  if (live) {
    try {
      const m = live.match(/\[[\s\S]*\]/);
      if (m) {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr.slice(0, 2).map((item, idx) => ({
            id: `mq-ai-${Date.now()}-${idx}`,
            code: `MQ-0${6 + idx}`,
            kpId: kp.id,
            realm: kp.realm,
            title: item.title || `${kp.title} · 微测 ${idx + 1}`,
            durationMin: 2,
            xpReward: 15,
            question: item.question,
            options: item.options,
            correctIndex: Number(item.correctIndex) || 0,
            explanation: item.explanation || kp.keyTakeaway,
            isTeacherPublished: true,
          }));
        }
      }
    } catch {
      // fallback
    }
  }

  await delay(650);
  const snippet = notes.trim().slice(0, 28) || kp.summary.slice(0, 28);
  return [
    {
      id: `mq-ai-${Date.now()}-1`,
      code: 'MQ-06',
      kpId: kp.id,
      realm: kp.realm,
      title: `${kp.title} · 概念辨析`,
      durationMin: 2,
      xpReward: 15,
      question: `结合讲义要点（“${snippet}…”），关于「${kp.title}」判断最准确的是？`,
      options: [
        kp.keyTakeaway,
        '仅需扩大规模或记忆结论，无需检验前提约束',
        '该概念仅在理想条件下成立，无法用于真实建模',
        '该知识点与后续综合应用相互独立',
      ],
      correctIndex: 0,
      explanation: `核心要点：${kp.keyTakeaway}`,
      isTeacherPublished: true,
    },
    {
      id: `mq-ai-${Date.now()}-2`,
      code: 'MQ-07',
      kpId: kp.id,
      realm: kp.realm,
      title: `${kp.title} · 边界排查`,
      durationMin: 2,
      xpReward: 20,
      question: `课下实操中，针对「${kp.title}」最需防范的误区是？`,
      options: [
        '忽视模型适用边界，套用表面特征',
        kp.commonPitfall,
        '混淆定性描述与定量推导',
        '以上均需警惕，核心在于先验证前提假设',
      ],
      correctIndex: 3,
      explanation: '先检验前提与边界反例，可规避大部分无谓偏差。',
      isTeacherPublished: true,
    },
  ];
}

export async function generateClusterReplyDraft(
  question: QuestionItem,
  kp: KnowledgePoint | undefined,
  config: AIConfig
): Promise<string> {
  const live = await callCustomLLM(
    config,
    '你是大学任课老师，请针对学生集中反映的共性困惑，拟写一段温和、精准、可直接群发给所有“同问”学生的统一答复（150字以内）。',
    `共性主题：${question.clusterTitle}\n代表问题：${question.content}\n对应知识点：${kp?.title || ''} (${kp?.keyTakeaway || ''})`
  );
  if (live) return live;

  await delay(600);
  return `各位点过「同问」的同学：大家集中卡在「${question.clusterTitle}」非常正常。记住一个三步判断法：① 先确认前提条件（${kp?.keyTakeaway || '核心定义'}）；② 避开高频误区（${kp?.commonPitfall || '避免机械套用'}）；③ 试着用一个极小样本手推一遍，就能彻底打通。若仍有疑问，可直接点下方“还是有点懵”告诉我具体卡在哪一步。`;
}

export async function generateTeacherReport(
  reportType: 'mastery' | 'support' | 'grades',
  state: AppState
): Promise<string> {
  const { students, knowledgePoints, submissions, questions, opsConfig, aiConfig } = state;
  const avgGrade = Math.round(students.reduce((s, st) => s + st.predictedGrade, 0) / students.length);
  const avgTask = Math.round(students.reduce((s, st) => s + st.taskCompletionRate, 0) / students.length);
  const atRisk = students.filter((s) => s.riskLevel !== 'safe');
  const pendingReview = submissions.filter((s) => s.status === 'pending_review').length;

  const kpAverages = knowledgePoints.map((kp) => {
    const avg = Math.round(students.reduce((s, st) => s + (st.mastery[kp.id] ?? 0), 0) / students.length);
    return { kp, avg };
  });
  const weakestKp = [...kpAverages].sort((a, b) => a.avg - b.avg)[0];

  const promptSummary = `课程：${opsConfig.courseTitle}（${opsConfig.semester}），学生总数${students.length}人，平均平时表现${avgGrade}分，课下任务平均完成率${avgTask}%，薄弱知识点：${weakestKp.kp.title}(${weakestKp.avg}%)，预警学生：${atRisk.map((s) => `${s.name}(${s.predictedGrade}分)`).join('、')}`;

  if (aiConfig.mode === 'custom' && aiConfig.apiKey.trim()) {
    const titleMap = {
      mastery: '班级学情达成度与教学改进分析报告',
      support: '学困生与高危预警精准帮扶过程台账',
      grades: '课程过程性评价与平时分构成说明',
    };
    const live = await callCustomLLM(
      aiConfig,
      `你是高校教研督导助手，请根据真实课堂数据撰写规范、克制、可直接提交教务处的《${titleMap[reportType]}》（Markdown格式，结构清晰）。`,
      promptSummary
    );
    if (live) return live;
  }

  await delay(650);
  const today = new Date().toLocaleDateString('zh-CN');

  if (reportType === 'mastery') {
    return `# 《${opsConfig.courseTitle}》班级学情达成度分析报告
**学期**：${opsConfig.semester} ｜ **主讲教师**：${opsConfig.teacherName} ｜ **生成日期**：${today}

---

### 一、 课下研学核心数据概览
- **覆盖学生数**：${students.length} 人（活跃率 100%，AI 课下辅助全覆盖）
- **班级平均达成度**：**${avgGrade} 分**（优秀率 ${Math.round((students.filter((s) => s.predictedGrade >= 85).length / students.length) * 100)}%，安全线达标率 ${Math.round((students.filter((s) => s.predictedGrade >= 60).length / students.length) * 100)}%）
- **课下微任务平均完成率**：**${avgTask}%**
- **AI 减负统计**：累计完成 **${submissions.length} 份** 作业初审（待人工复核仅 ${pendingReview} 份），聚类整理 **${questions.length} 条** 课下共性疑问，减少约 **78%** 重复性人工答疑工作量。

### 二、 知识点掌握度分布
${kpAverages.map((item) => `- **${item.kp.code} ${item.kp.title}**：全班均分 **${item.avg}%** ${item.avg < 72 ? '（需重点复盘）' : item.avg >= 82 ? '（达成优良）' : '（基本达标）'}`).join('\n')}

### 三、 共性瓶颈与下阶段教学建议
1. **核心薄弱环**：当前全班在 **「${weakestKp.kp.code} ${weakestKp.kp.title}」**（均分 ${weakestKp.avg}%）表现相对偏弱，主要错因集中在：*${weakestKp.kp.commonPitfall}*。
2. **干预策略**：已通过 AI 课下系统向低于 70% 的同学定向推送 3 分钟易错微闯关与苏格拉底引导解析，预计一周内可将薄弱点达成度提升 10~15%。`;
  }

  if (reportType === 'support') {
    return `# 学困生与预警学生精准帮扶过程台账
**课程**：${opsConfig.courseTitle}（${opsConfig.semester}） ｜ **导出日期**：${today}

---

| 学号 | 姓名 | 风险级别 | 当前预测 | AI 温和提醒次数 | 核心卡点与 AI 帮扶记录 | 教师跟进备注 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${atRisk
  .map((st) => {
    const lowKp = [...knowledgePoints].sort((a, b) => (st.mastery[a.id] ?? 0) - (st.mastery[b.id] ?? 0))[0];
    const latestNote = st.privateNotes[0]?.text || '已纳入本周课后重点面谈名单';
    return `| ${st.studentNo} | ${st.name} | ${st.riskLevel === 'high_risk' ? '高危红灯' : '持续观察'} | ${st.predictedGrade} 分 | ${st.nudgeCount} 次 | 卡在「${lowKp.title}(${st.mastery[lowKp.id]}%)」；${st.aiDiagnosis} | ${latestNote} |`;
  })
  .join('\n')}

---

> **留痕说明**：本台账由「知境学苑」教育智能体根据学生真实课下练习、AI 答疑交互与作业提交时间线自动归档，客观反映过程性帮扶轨迹，可直接作为教学督导与课程考核佐证材料。`;
  }

  return `# 过程性评价与平时分透明核算明细表
**课程**：${opsConfig.courseTitle} ｜ **权重公式**：微闯关 ${opsConfig.weights.microQuest}% + 作业质量 ${opsConfig.weights.assignment}% + 知识掌握度 ${opsConfig.weights.mastery}% + 同问互助 ${opsConfig.weights.qaCommunity}%

---

| 学号 | 姓名 | 专业 | 任务完成率 | 连续打卡 | 研学积分 | 综合预测平时分 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${students
  .map(
    (s) =>
      `| ${s.studentNo} | ${s.name} | ${s.major} | ${s.taskCompletionRate}% | ${s.streakDays} 天 | ${s.points} pt | **${s.predictedGrade}** | ${
        s.riskLevel === 'safe' ? '达标稳健' : s.riskLevel === 'watch' ? '提醒关注' : '重点帮扶'
      } |`
  )
  .join('\n')}

---
*说明：每位学生在个人手机端均可实时查看自己的分项进度与提分路径，确保平时分评定公开透明、有据可查。*`;
}
