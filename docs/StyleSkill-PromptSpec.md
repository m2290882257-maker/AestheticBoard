# StyleSkill-PromptSpec.md — Inspiration Board v0.1

> **Document Status:** v0.1 — Generative Development Protocol  
> **Current Scope:** Inspiration Board 主体开发  
> **Target Executors:** Codex / Stitch / Google AI Studio  
> **Highest Product Authority:** `PRD.md v2.1`  
> **Visual Execution Authority:** `DesignSystemRules.md v0.1`  
> **Journal Rule:** 只保留 Gateway 与未来边界，不生成 Journal 主体  
> **Purpose:** 让生成式开发读取正确依据、实现有限 slice、提供可验证证据，并避免以框架默认值补写产品。

---

## 0. 本文件是什么

本文件是后续 Style Skill 的 Prompt Contract。它目前是一份可直接交给 Codex、Stitch 或 Google AI Studio 使用的 Markdown 协议，不是已经安装的 Skill 包。

它规定：

- 开发前读取哪些文件；
- 不同任务如何选择直接依据；
- 文档冲突如何处理；
- `LOCKED / PROVISIONAL / OPEN / EXCLUDED` 如何执行；
- 每次实现应控制在什么范围；
- AI 必须返回哪些计划、截图与验证结果；
- 什么时候可以继续，什么时候必须停止猜测。

---

## 1. Agent Role

执行者的角色是：

> **为一个安静、私人、可长期使用的 Inspiration Board 实现可访问、可验证、可维护的界面。编辑秩序是骨架，Personal Voice 是少量人的痕迹。**

执行者不是：

- 品牌风格自由创作工具；
- 自动扩张产品范围的产品经理；
- 用 UI library 默认样式快速拼页面的模板生成器；
- 提前完成 Journal、Cloud Share 或未来功能的代理；
- 用装饰替代状态与交互清晰度的插画师。

---

## 2. Source-of-Truth Protocol

### 2.1 最高权威

`PRD.md v2.1` 是最高产品事实。任何文件、设计稿、旧代码、AI 建议或框架默认值都不得覆盖 PRD。

若用户作出新的产品决定：

1. 先更新 PRD；
2. 再同步受影响的领域文档；
3. 最后实现代码。

不得在代码中静默创建一个只存在于实现里的“新事实”。

### 2.2 按任务读取，不采用僵硬总顺序

每项任务先读 PRD，再按任务读取直接依据：

| Task Type | Required Direct Sources | Secondary Sources |
| --- | --- | --- |
| 页面结构、入口、显隐 | Information Architecture + Reference Mapping | Interaction Flow + Design System |
| 点击、展开、折叠、拖拽、状态时序 | Interaction Flow | PRD + Development Specs |
| 视觉组件、字体、颜色、间距、动效 | Visual Direction + Design System Rules | Reference Mapping + 专业设计工程规范 |
| 进程、数据、保存、资源、IPC | Architecture + Development Specs | Interaction Flow |
| AI Keyword 请求与输出 | SystemPrompt | Architecture + Development Specs |
| 设计稿还原 | Reference Mapping + 当前设计稿 | IA + Design System Rules |
| 视觉 QA / polish | Design System Rules + 当前真实截图 | Visual Direction + Reference Mapping |

### 2.3 文件职责

| Document | It Decides | It Does Not Decide |
| --- | --- | --- |
| PRD | 产品范围、优先级、验收事实 | 具体实现方式 |
| Information Architecture | 页面、区域、信息归属与渐进披露 | Pointer 时序、px 参数 |
| Interaction Flow | Trigger、状态变化、反馈与退出 | 数据库与最终视觉参数 |
| Reference Mapping | 设计稿中的元素是什么、哪些只是状态展示 | 新功能与完整产品范围 |
| Visual Direction | 视觉世界、情绪与边界 | 精确 token |
| Design System Rules | 可执行 tokens、组件与状态表现 | 产品优先级与领域数据 |
| Architecture | 进程、数据、安全与技术边界 | UI 风格 |
| Development Specs | 工程实现契约与验收方式 | 擅自改变产品 |
| SystemPrompt | AI Keyword 的输入输出协议 | Board UI 与用户 Personal Voice |

### 2.4 冲突处理

执行者发现冲突时必须输出：

```text
CONFLICT
- Topic:
- Higher-authority rule:
- Conflicting rule:
- Files and sections:
- Safe work that can continue:
- Decision required:
```

禁止：

- 自行取平均值；
- 选择更容易编码的版本；
- 以设计稿像素覆盖产品行为；
- 以旧代码事实覆盖新文档；
- 把 `OPEN` 当作自由发挥许可。

---

## 3. Decision Status Protocol

### 3.1 `LOCKED`

- 必须原样执行其语义；
- 不能因 library 限制、实现方便或审美偏好而替换；
- 若技术上无法实现，报告 blocker，不做近似成功。

### 3.2 `PROVISIONAL`

- 可以并且应当实现；
- 必须通过 token / config 集中管理；
- 输出截图时标出使用的候选值；
- 用户反馈后只修改 token 或明确组件映射；
- 不得在文档、代码或交付说明中称其为最终值。

### 3.3 `OPEN`

- 不得永久锁定；
- 若任务不依赖它，使用安全 fallback 并继续；
- 若它会显著改变结构、数据或用户体验，停止并请求决定；
- 任何 fallback 都必须列入 `Open Decisions`。

### 3.4 `EXCLUDED`

- 禁止实现；
- 不得以“只是视觉占位”重新引入。

---

## 4. Locked Product & Style Facts

每次 Board UI 任务都必须继承以下事实：

### 4.1 Scope

- Inspiration Board 是默认主体；
- 当前只开发 Board 主体；
- Journal 只实现 Gateway / boundary；
- Day 是 P0 可编辑本体；Week / Month 是后续只读投影；
- Windows 11 + Chrome / Edge 是 P0 环境。

### 4.2 Board Chrome

- Inspiration Board 不显示独立 Home / Board Icon；
- 左侧 Action Bar 顺序：More / Journal / Theme / Download-Share / Trash；
- 右上：Previous / Today / Next；其下为 Day / Weekly / Monthly；
- Title 位于左上，Action Bar 位于其下；
- Theme 只改变 Background Surface；
- Download / Share 与 Journal Export 是不同上下文。

### 4.3 Typography

| Voice | English | Chinese |
| --- | --- | --- |
| System | Segoe UI | PingFang SC |
| Personal | Chenyuluoyan | momozhuanji |

- Title、Quick Note 与其他非系统文字使用 Personal Voice；
- Keyword、导航、按钮、菜单、状态和 metadata 使用 System Voice；
- 混排按字符脚本自动分段；
- 不提供语言切换 UI。

### 4.4 Keyword

- Folded = `First Keyword +N`；
- N = 总数 - 1；
- 默认常显；
- Hover 只提示，Click 才展开；
- 同时最多一个 Expanded Group；
- 打开新组或点击 Canvas 空白时折叠旧组；
- 不提供 Group Close Button；
- 每个展开词提供 Copy；Copy 后保持展开。

### 4.5 Quick Note

- 与一个 Image 绑定；
- 默认在图片下方；
- 宽度始终与图片一致；
- 横线纸 PNG；
- Compact 中英文最多三行；
- Expanded 同宽自然增高；
- Image Move / Resize 时跟随；
- Lock 不阻止编辑。

### 4.6 Visual Direction

- Personal Editorial Archive；
- Quiet Field + Vivid Human Marks；
- System speaks in typeset；User speaks by hand；
- Controlled Irregularity；
- Time-softened, not retro；
- System actions may feel like glass；personal traces feel like paper / ink / photograph。

---

## 5. Asset Protocol

### 5.1 Required Asset Registry

代码不得在组件中散落文件路径。所有外部视觉资源登记为稳定 ID：

```ts
type UiAsset = {
  id: string
  kind: 'font' | 'icon' | 'background' | 'note-surface'
  sourcePath: string
  status: 'locked' | 'provisional' | 'experimental'
  fallback?: string
}
```

### 5.2 Font Assets

```text
segoeui(1).ttf
PingFang.ttc
辰宇落雁體ChenYuluoyan.ttf
默陌专辑手写体momozhuanji.ttf
```

开发时必须：

- 使用明确 `@font-face` alias；
- 验证内部 family；
- 记录授权状态；
- 为加载失败提供 fallback；
- 不从网络 CDN 临时替换用户选定字体。

### 5.3 Background, Icon & Quick Note Assets

- 用户已在本地整理 Background 候选与 Icon Set；
- Quick Note 使用用户提供的横线纸 PNG；
- 若任务环境中未出现准确路径，使用显式 placeholder registry，不生成风格不同的替代资产；
- 不以 Emoji 替代最终 icon；
- 不以 CSS 横线永久替代已指定 PNG；
- 资产接入前可使用 fallback surface 验证结构，但必须标记 `ASSET PENDING`。

---

## 6. Work Unit Protocol

一次任务只实现一个可独立验收的 vertical slice。

### 6.1 推荐切分

1. Board Shell；
2. Title Area；
3. Global Action Bar；
4. Temporal Controls；
5. Background Surface Picker；
6. Image Object；
7. Keyword Folded / Expanded / Copy；
8. Quick Note Compact / Expanded / Edit；
9. Context Menu / Lock；
10. Dense Board / responsive / accessibility polish。

### 6.2 首条 Vertical Slice

```text
Board Shell
→ Title Area
→ Global Action Bar
→ Temporal Controls
→ Static Canvas
→ 1 Image Object
→ First Keyword +N
→ Single-group Expand / Copy
→ Three-line Quick Note
```

暂不实现：

- Journal 主体；
- Week / Month 数据投影；
- 正式 Download / Share；
- 完整 Trash；
- Cloud Link；
- 所有最终动效；
- 大型主题系统。

---

## 7. Required Execution Workflow

### Phase 0 — Read

执行者先输出：

```text
READ SET
- PRD sections:
- Task-direct sources:
- Locked facts:
- Provisional tokens:
- Open items:
- Excluded items:
```

不得只说“已阅读文档”。必须列出与当前 slice 直接相关的事实。

### Phase 1 — Inspect

若已有代码：

- 检查 repository / component / token / asset 结构；
- 识别用户已有修改；
- 识别可复用 primitive；
- 不重写无关模块；
- 不用大范围 refactor 掩盖一个局部视觉任务。

若尚无代码：

- 先建立最小 token、font、asset registry 与 Board Shell；
- 不提前搭建 Journal、账户、Cloud Sync 或完整 design-system package。

### Phase 2 — Plan

实施前输出：

```text
SLICE PLAN
- User-visible outcome:
- Components touched:
- Tokens used or added:
- Assets required:
- States implemented:
- Tests / screenshots:
- Explicitly out of scope:
```

### Phase 3 — Implement

- 先实现结构和状态，再做视觉 polish；
- 每个视觉值来自 token；
- 每个 icon-only control 有 accessible name；
- 每个 Popover / Menu 有 focus 与 Escape 行为；
- 不让动画拥有领域坐标；
- 不让视觉容器改变 Image Geometry；
- 不让 AI Loading 阻塞 Capture 或画布。

### Phase 4 — Verify

最少验证：

- expected states；
- keyboard path；
- reduced motion；
- 960×640、1280×800、1440×900；
- Windows 100% / 125% / 150% scale；
- 中文、英文与 mixed-script；
- pure canvas、light image、dark image、busy image；
- Sparse 与 Working Board；涉及性能时增加 Dense Board。

### Phase 5 — Report

完成后严格使用 §11 输出格式。不得只回复“完成”。

---

## 8. Visual Generation Rules

### 8.1 Structure Before Decoration

生成界面时按以下顺序判断：

1. 页面区域是否正确；
2. 信息层级是否正确；
3. 状态与交互是否正确；
4. 字体角色是否正确；
5. spacing / size 是否可读；
6. 最后才调整纹理、透明度、阴影和微动效。

### 8.2 Controlled Irregularity

允许不规则的来源只有：

- 用户位置与尺寸；
- 图片自身比例；
- 用户输入的 Personal Voice；
- 明确的编辑节奏；
- 状态和时间痕迹。

禁止 AI 添加：

- random rotation；
- random offset；
- 随机不同手写字体；
- 胶带、纸屑、贴纸与图章；
- 与功能无关的涂鸦；
- 自动生成的“杂志构图”。

### 8.3 Quietness Test

每次视觉输出必须自问：

- 系统是否比用户图片更抢眼？
- 是否把所有元素做成了 pill / card？
- 是否因“私人感”堆叠装饰？
- 空画布是否温和，而不是初始化 SaaS？
- Dense Board 中系统是否仍然退后？

任一为“是”，先减法，再交付。

---

## 9. Tool-specific Routing

### 9.1 Codex

Codex 负责：

- 读取完整文档与现有代码；
- 建立 tokens、components、states 与 asset registry；
- 实现交互、键盘、响应式、性能和测试；
- 运行应用并提供真实截图；
- 根据截图修正，而不是只根据代码宣称视觉完成。

Codex 不得：

- 用占位组件库风格交付最终视觉；
- 只实现静态截图而忽略状态；
- 未见真实 asset 时猜测文件路径；
- 修改 PRD 以迁就代码。

### 9.2 Stitch

Stitch 适合：

- 在已给定页面结构和 tokens 下生成页面视觉候选；
- 比较少数高风险视觉轴；
- 生成 Sparse / Working / Dense 参考状态。

Stitch Prompt 必须包含：

- 当前 slice；
- 固定页面区域；
- LOCKED 行为；
- 使用的字体与 assets；
- 只允许变化的 1 个高风险轴；
- Anti-patterns；
- 输出窗口尺寸。

Stitch 输出是视觉候选，不是产品或交互事实。

### 9.3 Google AI Studio

Google AI Studio 主要用于：

- 验证 `SystemPrompt.md` 的 Visual Keyword 协议；
- 使用合法 Golden Set 检查关键词质量；
- 比较 Prompt / Schema 输出稳定性。

它不负责决定 Board Chrome、字体、交互和布局。图片解析 Prompt 不得读取 Quick Note、Title、Geometry 或相邻图片。

---

## 10. Prompt Templates

### 10.1 Codex — Implement Slice

```text
You are implementing one bounded Inspiration Board slice.

Read PRD.md first. Then read the task-direct sources selected by
StyleSkill-PromptSpec.md. Use DesignSystemRules.md for executable visual tokens.

Task:
{{TASK}}

Required output before coding:
1. READ SET
2. SLICE PLAN
3. Locked facts
4. Provisional tokens
5. Explicitly out of scope

Implementation rules:
- Preserve existing user changes.
- Use semantic/component tokens; no scattered visual literals.
- Do not add pages or capabilities absent from PRD / IA.
- Do not implement Journal body.
- Do not convert OPEN into LOCKED.
- Use the registered fonts and assets; report missing asset paths.
- Implement states, keyboard access, reduced motion and responsive behavior.

After implementation, run relevant tests and provide real screenshots at the
required viewport/state matrix. Report with the DELIVERY REPORT format.
```

### 10.2 Stitch — Generate One Visual Axis

```text
Create a full-size Inspiration Board visual candidate for:
{{SLICE_OR_SCREEN}}

Fixed facts:
{{LOCKED_FACTS}}

Use:
- Personal Editorial Archive
- quiet low-saturation field
- Segoe UI / PingFang SC for system text
- Chenyuluoyan / momozhuanji for personal text
- controlled irregularity from content, never random decoration

Only vary this axis:
{{ONE_HIGH_RISK_AXIS}}

Keep all other parameters unchanged.

Show these states:
{{STATE_LIST}}

Viewport:
{{VIEWPORT}}

Do not add scrapbook stickers, tape, random rotation, pill-everything UI,
Journal pages, language switching, or unrequested navigation.
```

### 10.3 Codex — Screenshot Review

```text
Review the attached running-product screenshots against:
1. PRD product facts
2. Reference Mapping
3. Visual Direction
4. Design System Rules

For each issue output:
- Severity: BLOCK / MAJOR / MINOR
- Before: observable current result
- Expected: exact rule
- Why: usability, hierarchy, visual direction, accessibility or performance
- Fix: token/component-level change
- Evidence needed after fix

Do not praise generally. Approve only when the acceptance matrix passes.
```

### 10.4 Codex — Tune Provisional Tokens

```text
Tune only the following PROVISIONAL token axis:
{{TOKEN_AXIS}}

Use the same content, viewport, component states and background for every
variant. Produce 2–3 meaningfully different candidates, list exact token values,
and recommend one based on readability, quietness, density and Windows rendering.
Do not alter LOCKED behavior or unrelated tokens.
```

---

## 11. Required Delivery Report

每次生成式开发交付必须输出：

```text
DELIVERY REPORT

1. Outcome
- What is now visibly usable:

2. Scope
- Implemented:
- Explicitly not implemented:

3. Source compliance
- PRD facts used:
- IA / Interaction facts used:
- Design System tokens used:

4. Components and states
- Component:
- States verified:

5. Assets
- Fonts:
- Icons:
- Background:
- Quick Note surface:
- Missing / fallback:

6. Verification
- Automated tests:
- Manual flows:
- Viewports:
- Windows scale:
- Keyboard / focus:
- Reduced motion:

7. Visual evidence
- Screenshot paths:
- State represented by each screenshot:

8. Differences
- BLOCK:
- MAJOR:
- MINOR:

9. Provisional decisions
- Token:
- Current value:
- Why chosen:
- Evidence still needed:

10. Open decisions
- Decision:
- Why it cannot be inferred:
- Safe work that can continue:
```

---

## 12. Visual Evidence Matrix

### 12.1 Minimum screenshots per component slice

| Slice | Required Evidence |
| --- | --- |
| Board Shell | 960×640 + 1440×900；empty / sparse |
| Title | default date / English title / Chinese title / long title |
| Action Bar | default / hover / focus / popover / disabled future action |
| Temporal | today / previous-next focus / mode popover |
| Keyword | folded / hover / expanded / copy / processing / error |
| Quick Note | 1 line / 3 lines / expanded / edit / mixed script |
| Image | default / selected / dragging / locked |
| Theme | picker / selected / fallback asset / restart restore |
| Dense Board | 50+ images / zoomed-out / selected object |

### 12.2 Comparison discipline

- 比较版本使用同一内容与同一窗口；
- 每轮只改变一个轴；
- 命名必须描述变量，如 `ChromeOpacity-72`，不使用 `A / B / C`；
- 截图必须来自真实运行界面或明确标记为 Visual Candidate；
- 不以局部裁切代替全屏比例判断。

---

## 13. Stop Conditions

遇到以下情况必须停止相关部分并报告：

- PRD 与低层文件的产品事实冲突；
- 所需字体、Icon、Background 或 Quick Note PNG 缺失且任务要求最终视觉；
- 字体授权不允许进入分发构建；
- 设计稿状态与运行行为无法对应；
- `OPEN` 决策会改变数据所有权、导航或持久化；
- 实现需要提前开发 Journal 主体；
- UI library 无法满足键盘、focus 或无样式覆盖要求；
- 只能通过破坏用户 Geometry 才能实现视觉效果；
- 无法取得真实截图却需要宣称视觉完成。

停止不等于整个任务失败。执行者应继续完成不依赖冲突的安全部分，并明确边界。

---

## 14. Block / Approve Gate

### 14.1 BLOCK

任一出现即不通过：

- 错误页面层级或新增未批准页面；
- Journal 主体提前进入；
- Keyword Hover 展开或多组同时展开；
- Quick Note 不与 Image 等宽或超过三行仍不截断；
- System / Personal Voice 使用反了；
- 中英 Personal Voice 映射错误；
- 语言切换 UI 回归；
- 视觉值散落硬编码；
- 无 focus-visible / accessible name；
- 通过随机装饰制造手作感；
- 伪造 Share / Journal / Save 成功；
- 未提供真实验证证据却声称完成。

### 14.2 APPROVE

只有同时满足以下条件才可批准：

- 当前 slice 的 LOCKED 产品与行为事实全部通过；
- `PROVISIONAL` 参数集中、可调整、有截图证据；
- 没有把 `OPEN` 静默锁死；
- 可访问性与键盘路径通过；
- Window / density / script 状态覆盖；
- 视觉仍是安静的编辑系统，人的痕迹小而鲜活；
- Delivery Report 完整。

---

## 15. Maintenance

### 15.1 文档同步

发生以下变化时必须更新本文件：

- PRD 改变 Board 主体范围；
- IA 改变页面区域或入口；
- Interaction Flow 改变 Trigger / state；
- Design System token 升级为 LOCKED；
- 新 asset 成为正式资源；
- Journal 正式进入设计与开发；
- Codex / Stitch 的输出格式或验收流程发生变化。

### 15.2 转为真实 Skill 包前

未来若将本文件制作成可安装 Skill，需要另行：

- 使用正式 Skill Creator；
- 写入 `SKILL.md` 与必要 references / templates；
- 把文件路由、执行流程、Stop Conditions 与 Delivery Report 保留为主指令；
- 将产品文档保留为外部 source of truth，不复制整份进入 Skill；
- 通过至少一次 Board Shell 与一次 Component Slice 试运行验证 Skill 行为。

---

## 16. Version Notes

### v0.1

- 建立 PRD 最高权威与按任务读取协议；
- 建立 LOCKED / PROVISIONAL / OPEN / EXCLUDED 的执行规则；
- 固化 Board、Typography、Keyword、Quick Note 与 Asset 事实；
- 建立 Codex / Stitch / Google AI Studio 的任务边界；
- 提供四类可复用 Prompt Template；
- 建立 Delivery Report、Visual Evidence Matrix、Stop Conditions 与 Block / Approve Gate；
- 明确当前文档不是已安装 Skill，未来需经 Skill Creator 转换。

---

# End of StyleSkill-PromptSpec.md v0.1
