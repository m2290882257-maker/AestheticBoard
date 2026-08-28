# PRD.md v2.1 — Capture-first Temporal Spatial Inspiration Board

> **Document Status**：Product Requirement Document v2.1  
> **Product Phase**：Inspiration Board 主体界面已形成 / 开发前同步基线  
> **Primary Goal**：固化当前已确认的产品需求、交互边界、优先级与验收标准，作为后续 Architecture、InteractionFlow、SystemPrompt 与 DevelopmentSpecs 的产品事实源。  
> **Requirement Source of Truth**：本文件中的 Requirement ID。  
> **Important**：任何 Architecture 或实现方案不得反向修改本 PRD 的产品骨架；如确需修改，必须先回到产品层更新本文件。  
> **Governance Update**：本版本吸收 `InformationArchitecture.md v0.4` 与 `ReferenceMapping.md v0.2`。自本版本起，PRD 是最高产品事实；其余文档必须与本版本同步。

---

# 0. Document Governance

## 0.1 文档职责

本 PRD 负责定义：

- 用户要解决的问题；
- 产品必须提供的能力；
- 默认状态；
- 用户行为与产品反馈；
- 核心状态转换；
- Edge Cases；
- Acceptance Criteria；
- P0 / P1 / Pro / Future / Hold 边界；
- 产品明确不做什么。

本 PRD **不负责提前锁死**：

- Electron / Tauri / 其他桌面框架；
- 本地数据库类型；
- IndexedDB / SQLite / 文件数据库；
- 图片压缩格式与具体参数；
- AI Provider；
- BYOK；
- API Gateway；
- 前端组件库；
- CSS / Canvas / WebGL 实现方式；
- 持久化具体写入策略。

以上进入后续：

- `Architecture.md`
- `InteractionFlow.md`
- `SystemPrompt.md`
- `DevelopmentSpecs.md`
- `InformationArchitecture.md`
- `ReferenceMapping.md`
- `VisualDirection.md`
- `DesignSystemRules.md`

---

# 1. Product Constitution

## PC-001｜Capture First

### Product Principle

产品第一价值是：

> **在用户灵感高速发生时，以尽可能低的注意力成本留下视觉素材，不打断当前工作心流。**

整理、分类、制作手账都可以延迟。

Capture 不能变成额外工作。

### Product Consequences

产品不得要求用户在 Capture 前完成：

- 下载；
- 命名；
- 创建文件夹；
- 选择分类；
- 选择项目；
- 填写 Note；
- 选择关键词；
- 确认导入；
- 重新排版。

---

## PC-002｜System Assists, User Organizes

系统可以自动：

- 记录 Canvas 所属日期；
- 记录真实 Capture 时间；
- AI 提取设计关键词；
- 调整新图片的舒适初始尺寸；
- 防止图片完全视觉重合；
- 自动保存。

系统不得默认：

- 自动给图片分类；
- 自动把图片归入主题；
- 自动建立项目；
- 自动重排 Day Canvas；
- 自动把素材移动到“最佳空白位置”；
- 自动改变用户形成的空间关系。

---

## PC-003｜Spatial Relationship Is Thought

Day Canvas 中以下信息属于用户思考痕迹：

- 图片位置；
- 图片尺度；
- 图片前后遮挡；
- 图片之间距离；
- 用户主动形成的聚集关系；
- Quick Note。

因此：

> **Day Canvas 的空间结构本身属于需要被永久保存的数据。**

---

## PC-004｜Time Strong / Space Free / Classification Weak / Retrieval Strong

Inspiration Board 遵循：

> **时间强｜空间自由｜分类弱｜检索强**

Day Canvas 首先记录：

> 某一天，我看到了什么，又把它们如何放在了一起。

主题归纳不属于 Capture Board 的强制职责。

---

## PC-005｜Capture and Journal Separation

> **Capture 不负责分类。**  
> **Journal 不修改 Capture。**

Day Canvas 是原始灵感现场。

Journal 是未来用户主动选择素材并重新组织的创作空间。

---

# 2. Product Definition

## PD-001｜P0｜Desktop Capture-first Inspiration Board

### User Story

作为正在浏览 Pinterest、进行设计或 Vibe Coding 的用户，我希望灵感板一直存在于工作环境旁边，使我看到视觉灵感时可以直接留下，而不是暂停当前工作去下载、命名和整理素材。

### Functional Requirement

产品主体必须是一款独立桌面视觉灵感板，而不是以浏览器 Side Panel 为主体的扩展页面。

### Acceptance Criteria

- `AC-PD-001-01` 产品可独立于浏览器运行。
- `AC-PD-001-02` 用户无需进入浏览器插件页面才能查看 Day Canvas。
- `AC-PD-001-03` Pinterest / Browser 只是 Capture 来源之一，不定义产品主窗口形态。
- `AC-PD-001-04` 产品默认进入 Inspiration Board，而不是 Journal。

---

## PD-002｜P0｜Capture Is Primary

### Functional Requirement

任何第一版设计决策如果在以下两者间冲突：

1. Capture 速度与连续性；
2. 整理、装饰或分类完整性；

默认优先保证 Capture。

### Acceptance Criteria

- `AC-PD-002-01` Capture 不要求分类。
- `AC-PD-002-02` Capture 不要求填写 Note。
- `AC-PD-002-03` AI 分析不得阻塞图片出现。
- `AC-PD-002-04` 普通 Capture 不使用阻断式 Modal。

---

# 3. Product Information Architecture

## IA-001｜P0｜Inspiration Board

默认产品空间包含：

- Day Canvas；
- Title & Temporal Identity；
- Board Global Action Bar；
- Temporal Controls；
- Image Objects；
- AI Keyword Layer；
- Image-bound Quick Note；
- Background Surface；
- System Feedback & Safety。

Inspiration Board 是产品本体。

---

## IA-002｜P1｜Temporal Views

提供：

- Day；
- Week；
- Month。

其中：

> **Day 是原始本体。**

Week / Month 只提供时间尺度压缩。

---

## IA-003｜PRO｜Journal Cabinet

Journal Cabinet 是独立第二空间，包括：

- Journal Books；
- Material Inbox；
- Journal Canvas；
- Journal Export。

---

# 4. Desktop Workspace

## WIN-001｜P0｜Floating Desktop Window

### User Story

作为单屏或笔记本用户，我希望灵感板可以像 PureRef 一样自由决定窗口大小，而不是永久占据固定侧栏。

### Functional Requirement

产品窗口必须：

- 独立存在；
- 支持 Resize；
- 支持 Move；
- 支持 Always-on-top。

### Acceptance Criteria

- `AC-WIN-001-01` 用户可拖动窗口边缘改变宽高。
- `AC-WIN-001-02` 窗口尺寸不固定为某个 Side Panel 宽度。
- `AC-WIN-001-03` 用户可自由移动窗口。
- `AC-WIN-001-04` 可开启 Always-on-top。
- `AC-WIN-001-05` 窗口缩小时核心 Canvas 仍正常存在。

---

## WIN-004 ~ WIN-009｜P0｜Workspace Restore

### User Story

作为长期使用该灵感板的用户，我希望重新打开应用时工作现场仍然保持原样，不需要重新摆窗口、寻找画布或恢复视野。

### Restore Scope

必须恢复：

- Window Position；
- Window Size；
- Always-on-top 状态；
- 上一次正在查看的 Day；
- Canvas Zoom；
- Viewport Offset。

### Acceptance Criteria

- `AC-WIN-RESTORE-01` 关闭后重新启动，窗口恢复至上次位置。
- `AC-WIN-RESTORE-02` 恢复上次窗口宽高。
- `AC-WIN-RESTORE-03` 恢复置顶状态。
- `AC-WIN-RESTORE-04` 恢复关闭前正在查看的 Day。
- `AC-WIN-RESTORE-05` 恢复该 Day 的视野位置。
- `AC-WIN-RESTORE-06` 恢复 Canvas Zoom。
- `AC-WIN-RESTORE-07` 恢复过程不得改变 Day Canvas 内对象空间位置。

核心原则：

> **重新打开以后，桌子还在那里。**

---

# 5. Day Canvas

## DAY-001｜P0｜One Day, One Canvas

### Functional Requirement

每个日期对应一张独立无限二维 Canvas。

### Acceptance Criteria

- `AC-DAY-001-01` 每个日期能够打开独立 Canvas。
- `AC-DAY-001-02` 不同日期的对象状态相互独立。
- `AC-DAY-001-03` Day 不以 WeeklyBoard 的子区域形式存储或理解。

---

## DAY-002｜P0｜Infinite 2D Space

Day Canvas 不得使用：

- 瀑布流；
- 单列列表；
- 自动行列布局；
- 强制网格排列。

用户可以自由决定图片空间关系。

---

## DAY-003 / DAY-004｜P0｜Permanent Spatial Layout

### Functional Requirement

用户形成的 Day Canvas 空间布局必须长期保存。

日期结束不得自动：

- Stack；
- Reflow；
- Auto Arrange；
- 重新计算位置；
- 重建 z-order。

### Acceptance Criteria

- `AC-DAY-003-01` 用户今天移动的图片，明天重新进入该 Day 时位置一致。
- `AC-DAY-003-02` 图片尺寸一致。
- `AC-DAY-003-03` 图片遮挡关系一致。
- `AC-DAY-003-04` Note 与图片关系一致。
- `AC-DAY-003-05` Week / Month 压缩视图不得修改 Day 原布局。

---

## DAY-005｜P0｜Historical Canvas Editable

历史 Day Canvas 继续允许：

- Capture；
- Move；
- Resize；
- Add Note；
- Edit Note；
- Lock / Unlock；
- Keyword Interaction。

历史日期不是只读档案。

---

## DAY-006｜P0｜Where I Am = Where I Capture

### User Story

作为正在继续前几天某个课题灵感搜集的用户，我希望新拖入的素材进入当前正在查看的 Day，而不是被系统强行送回 Today。

### Functional Requirement

新的 Capture 归属当前 Day Canvas。

### Acceptance Criteria

- `AC-DAY-006-01` 用户位于历史 Day 时 Drag 新图，新图属于该 Day。
- `AC-DAY-006-02` Paste 同样属于当前 Day。
- `AC-DAY-006-03` 系统不得因为实际日期为 Today 而自动切走用户当前 Canvas。
- `AC-DAY-006-04` 素材仍保存真实 Capture 时间。

---

## DAY-007｜P0｜Board Date ≠ Capture Time

产品必须能够区分：

- 当前素材属于哪张 Day Canvas；
- 素材实际何时被 Capture。

字段名称和技术模型由 Architecture 决定。

---

## DAY-008 ~ DAY-011｜P0｜Optional Day Title

### Functional Requirement

Day Canvas 允许一个唯一、可选的总标题。

### Display Rules

有标题：

```text
千佛开题视觉
August 26, 2026 · Wednesday
```

无标题：

```text
August 26, 2026 · Wednesday
```

界面层级规则：

- 无自定义标题时，Date / Date Range 作为默认主标题；
- 有自定义标题时，用户标题成为主标题；
- Date / Date Range 缩小并降低视觉权重，但始终保留；
- 中文与英文标题共享同一信息结构，字体按字符脚本自动映射；
- 不提供中英文切换控件。

### Constraints

Day Canvas 不支持多个区域级标题。

### Acceptance Criteria

- `AC-DAY-TITLE-01` 用户可以不给 Day 命名。
- `AC-DAY-TITLE-02` 未命名时不得显示“Untitled”强提醒。
- `AC-DAY-TITLE-03` 标题存在时日期仍永久可见。
- `AC-DAY-TITLE-04` 一张 Day Canvas 同时只有一个总标题。
- `AC-DAY-TITLE-05` 不提供区域分组标题作为 P0/P1 能力。

---

# 6. Capture Input

## CAP-001 ~ CAP-003｜P0｜Pinterest / Browser Drag

### User Story

作为浏览 Pinterest 的用户，我希望直接把看到的图片拖进灵感板，不需要先下载图片。

### Functional Requirement

支持 Browser / Pinterest → Desktop Canvas 的图片直接 Drag。

### Drop Rule

> **Drop Position = Initial Position**

### Acceptance Criteria

- `AC-CAP-DRAG-01` Pinterest 中可拖取的图片可以进入当前 Day Canvas。
- `AC-CAP-DRAG-02` 用户不需要执行 Save As。
- `AC-CAP-DRAG-03` 图片出现位置对应 Canvas 中鼠标释放位置。
- `AC-CAP-DRAG-04` 系统不得自动移动至当前所谓最佳空白区域。
- `AC-CAP-DRAG-05` Capture 成功后图片立即可见。
- `AC-CAP-DRAG-06` AI 关键词随后异步生成。
- `AC-CAP-DRAG-07` Drag 失败不得造成整个 Canvas 不可操作。

---

## CAP-004 ~ CAP-006｜P0｜Clipboard Paste

### User Story

作为浏览网页的用户，我希望可以直接右键复制图片，再回到 Canvas Ctrl/Cmd+V，而不是下载图片。

### Functional Requirement

支持 Clipboard Image Paste。

### Spawn Rule

Paste Image 默认出现在：

> **当前 Viewport 中心附近**

连续 Paste：

> **轻微 Micro Offset**

### Acceptance Criteria

- `AC-CAP-PASTE-01` 复制有效图片后 Ctrl/Cmd+V 可以创建 Image Object。
- `AC-CAP-PASTE-02` 不要求打开 Import 页面。
- `AC-CAP-PASTE-03` 默认出现在当前视口中心附近。
- `AC-CAP-PASTE-04` 连续 Paste 多图不会完全视觉重合。
- `AC-CAP-PASTE-05` Paste Image 与 Drag Image 后续行为一致。

---

## CAP-007｜P0｜Unified Image Object

Drag 和 Paste 必须生成统一的 Image Object。

不得因输入方式不同产生两套：

- Note；
- Keyword；
- Resize；
- Save；
- Lock；

逻辑。

---

## CAP-008 ~ CAP-010｜FUTURE｜Input Expansion

第一版不要求保证：

- 本地文件拖入；
- Figma 等桌面软件直接 Drag；
- 系统截图工具深度集成。

---

# 7. Image Initialization

## IMG-001｜P0｜Image First, AI Later

### Functional Requirement

图片进入成功后优先显示 Image Object。

AI Parsing 不能成为图片出现的前置条件。

### Acceptance Criteria

- `AC-IMG-001-01` AI 响应慢时图片仍立即可使用。
- `AC-IMG-001-02` AI 失败时图片仍保留。
- `AC-IMG-001-03` AI Loading 不锁定图片 Move / Resize。

---

## IMG-002 ~ IMG-004｜P0｜Comfortable Initial Size

### Functional Requirement

所有新图片：

- 保持原始宽高比；
- 自动限制为视觉上合理的初始尺寸；
- 避免超大原图直接占满 Canvas。

### Non-goal

不得将所有图片强制变成统一固定宽高。

### Acceptance Criteria

- `AC-IMG-SIZE-01` 竖图保持竖图比例。
- `AC-IMG-SIZE-02` 横图保持横图比例。
- `AC-IMG-SIZE-03` 超高分辨率图片不会以原始像素尺寸直接铺满窗口。
- `AC-IMG-SIZE-04` 用户之后仍可通过 Handle 自由调整尺寸。

---

## IMG-005 ~ IMG-007｜P0｜Overlap & Micro Offset

### Functional Requirement

图片允许自由重叠。

当多个 Capture 高度重合时：

仅允许做极轻的 Micro Offset。

### Goal

确保：

- 下方仍可看到有其他图片；
- 后续容易从图片堆里抽出素材。

### Prohibited

不得自动：

- 整齐级联；
- 瀑布排列；
- 网格整理；
- 自动成组。

---

# 8. Canvas Navigation

## CAN-001 / CAN-002｜P0｜Wheel Zoom

### Functional Requirement

鼠标滚轮：

- 前滚 → Zoom In
- 后滚 → Zoom Out

缩放中心：

> 鼠标当前所指 Canvas 位置。

### Acceptance Criteria

- `AC-CAN-ZOOM-01` 缩放过程中用户关注区域保持在鼠标附近。
- `AC-CAN-ZOOM-02` Zoom 不改变对象世界坐标关系。
- `AC-CAN-ZOOM-03` Zoom 状态可恢复。

---

## CAN-003｜P0｜Middle Mouse Pan

按住鼠标中键并拖动：

→ Pan Canvas。

### Acceptance Criteria

- `AC-CAN-PAN-01` 在图片上方中键 Drag 时仍解释为 Canvas Pan。
- `AC-CAN-PAN-02` Pan 不移动对象。
- `AC-CAN-PAN-03` Viewport Offset 被恢复。

---

## CAN-004｜P0｜No Space-first Dependency

Space + Drag 不作为第一版主要 Pan 交互要求。

---

# 9. Selection / Move / Resize

## OBJ-001 / OBJ-002｜P0｜Selection

左键点击：

→ Selected。

点击 Canvas 空白：

→ Deselect。

---

## OBJ-003｜P0｜Free Move

未 Lock 图片支持左键直接 Drag。

---

## OBJ-004｜P0｜No Shift Constraint Requirement

第一版不要求：

- Shift 水平约束；
- Shift 垂直约束。

---

## OBJ-005 / OBJ-006｜P0｜Corner Resize

Selected 图片显示四角 Handles。

拖任意角：

→ 默认等比 Resize。

---

## OBJ-007 / OBJ-008｜P1｜Light Selection Visual

优先视觉：

> 极淡轮廓 + 四角 Handles。

若轻量自定义选中态显著增加工程难度：

允许第一版采用更简单但清晰的 Selection。

原则：

> **功能明确优先；同成本时视觉更弱优先。**

---

# 10. Layering

## LAY-001｜P0｜Click Does Not Reorder

点击一张底层图片只改变 Selection。

不得仅因 Click：

→ Bring to Front。

---

## LAY-002｜P0｜Drag Start Raises Object

真正开始拖动底层对象时：

该对象临时升至交互最高层。

---

## LAY-003｜P0｜Drop Creates New Layer Order

Drag End 后：

对象永久成为新的最高 z-order。

### Product Logic

> **“拿起再放下”就是一次新的空间摆放。**

---

## LAY-004｜P1｜Manual Layer Adjustment

右键 Context Menu 后续可提供：

- Bring to Front
- Send to Back

---

# 11. Context Menu & Lock

## CTX-001｜P0｜Right Click Context Menu

Right Click 不直接执行 Lock。

Right Click：

→ 打开 Object Context Menu。

---

## CTX-002｜P0｜Lock First

Context Menu 第一项固定：

- Lock
- Unlock

根据对象当前状态切换。

---

## LCK-001 ~ LCK-007｜P0｜Spatial Lock

### Lock Semantics

Lock 只冻结：

- Position；
- Size。

### Lock Does Not Disable

锁定后仍允许：

- Select；
- Hover Keywords；
- Copy Keywords；
- Add Note；
- Edit Note；
- Expand Note；
- Right Click；
- Unlock。

### Resize

Lock 后不显示可执行 Resize 的 Handles。

### Acceptance Criteria

- `AC-LCK-01` 锁定对象 Drag 不改变位置。
- `AC-LCK-02` 锁定对象无法 Resize。
- `AC-LCK-03` Hover Keyword 正常。
- `AC-LCK-04` Copy Keyword 正常。
- `AC-LCK-05` Note 仍可编辑。
- `AC-LCK-06` 右键第一项变为 Unlock。

核心定义：

> **Locked ≠ Inactive**

---

# 12. AI Visual Parsing

## AI-001｜P0｜Automatic Background Parsing

每张新图片进入 Canvas 后：

系统自动开始 AI Visual Parsing。

无需用户额外点击“Analyze”。

---

## AI-002｜P0｜5–10 Design Keywords

AI 输出目标：

5–10 个专业、可用于工作和检索的设计关键词。

---

## AI-003｜P0｜Semantic Dimensions

解析重点覆盖：

- Layout；
- Component Form；
- Typography；
- Color；
- Material；
- Hierarchy；
- Visual Style。

AI Prompt 具体规范进入：

`SystemPrompt.md`

---

## AI-004｜P0｜Non-blocking Parsing

AI Parsing 期间：

图片仍然可以：

- Select；
- Move；
- Resize；
- Add Note；
- Lock。

---

## AI-005 / AI-006｜P1｜Failure & Retry

AI 失败：

- 不删除图片；
- 不阻断 Canvas；
- 提供 Retry。

错误表现形式由 UI Specs 决定。

---

# 13. Keyword Layer

## TAG-001｜P0｜Persistent First Keyword Bubble

### User Story

作为正在工作的用户，我希望每张图的一个主要关键词默认可见，而不是每次都先 Hover 图片才能发现 AI 结果。

### Functional Requirement

Day Inspiration Board 默认：

每张 AI 解析成功的图片显示一个折叠态首词 Bubble。

折叠态固定显示：

> `First Keyword +N`

其中 `N = 当前 Keyword 总数 - 1`。

### Acceptance Criteria

- `AC-TAG-001-01` Keyword Visibility 默认 ON。
- `AC-TAG-001-02` 不需要 Hover 图片才能看到首词。
- `AC-TAG-001-03` Bubble 不改变图片 Canvas bounding box。

---

## TAG-003 / TAG-004｜P0｜Pin First Keyword

默认首词：

AI 返回第一词。

用户可以：

将任意 Keyword Pin 成新的首词。

### Acceptance Criteria

- `AC-TAG-PIN-01` Pin 后折叠态显示新词。
- `AC-TAG-PIN-02` 重新进入 Day 后用户选择仍保留。
- `AC-TAG-PIN-03` 不删除其他关键词。

---

## TAG-005 ~ TAG-008｜P0｜Expand Behavior

Click 首词 Bubble：

→ 展开完整关键词列表。

默认展开方向：

→ 向下。

Hover 只提供可交互提示，不负责展开。

---

## TAG-009 ~ TAG-011｜P0｜Collapse State

当前 Expanded Group 仅在以下场景自动收起：

1. 点击 Canvas 空白；
2. 激活另一张图片的 Keyword Group。

同一时间最多一个完整 Expanded Keyword Group。

不得为 Expanded Keyword Group 额外增加 Close Button。

---

## TAG-012 / TAG-013｜P0｜Copy

展开态中，每个 Keyword 后显示 Copy Icon。点击 Keyword 或其 Copy Icon：

→ 立即 Copy 至系统剪贴板。

复制完成后：

Keyword Group 保持 Expanded。

不得强制收起。

---

## TAG-014 ~ TAG-016｜P1｜Keyword Visibility Toggle

提供全局开关：

### ON — Default

所有 Image 显示折叠首词。

### OFF

只有：

- Hover；
- Select；

图片时才显示 Keyword 入口。

用户偏好必须被保存。

---

## TAG-017｜PRO｜Journal Default Hidden

Journal Canvas 默认隐藏工作型 Keyword Bubble。

---

# 14. Image-bound Quick Note

## NOTE-001 / NOTE-002｜P0｜Optional Personal Annotation

每张 Image 可拥有 Quick Note。

Note 完全 Optional。

不得因 Note 为空：

- 提醒用户补写；
- 生成未完成状态；
- 显示待办角标。

---

## NOTE-003 ~ NOTE-005｜P0｜Strong Binding

Quick Note 是 Image 的附属内容。

不是独立 Canvas Object。

图片移动：

→ Note 跟随。

图片属于哪张 Day：

→ Note 同样属于该 Image / Day。

---

## NOTE-006 / NOTE-007｜P0｜Default Position

Note 默认锚定：

> 图片下方。

Keyword Layer 默认位于：

> 图片上方 / 上方靠右工作信息区域。

两者不应在默认布局中互相重叠。

---

## NOTE-008 / NOTE-009｜P0｜Compact State

默认只显示有限内容。

中文与英文统一最多显示三行。

长内容使用省略。

Quick Note Surface 使用横线纸 PNG，并满足：

- 宽度始终与绑定 Image 当前宽度一致；
- Image Resize 后 Note Width 同步更新；
- 空 Note 不常驻显示标准输入框。

---

## NOTE-010 ~ NOTE-014｜P0｜Expanded Overlay

点击 Compact Note：

→ 展开完整内容。

展开形式：

> Overlay。

Expanded Note：

- 宽度继续与绑定 Image 一致；
- 高度按完整段落自然增长；
- 不改变 Image bounding box；
- 不改变图片尺寸；
- 不推动其他图片；
- 不触发 Auto Layout；
- 不改变用户原空间关系。

### Acceptance Criteria

- `AC-NOTE-EXP-01` 展开长 Note 时图片位置不移动。
- `AC-NOTE-EXP-02` 下方图片不自动避让。
- `AC-NOTE-EXP-03` 收起后 Canvas 恢复原视觉结构。
- `AC-NOTE-EXP-04` Lock 状态下 Note 仍可展开编辑。

---

# 15. Temporal Identity & Navigation

## TIME-001 / TIME-002｜P0｜Persistent Time Identity

当前 Canvas 的日期必须持续可见。

日期是：

> **记忆锚点。**

即使用户添加 Day Title，日期仍不能消失。

---

## TIME-003｜P0｜Previous / Next Day

提供：

- Previous Day
- Next Day

---

## TIME-004｜P0｜Today

提供快速返回：

> Today

---

## TIME-005｜P1｜Week Context

顶部时间状态可显示：

- Week Number；
- 当前 Date Range。

视觉权重必须弱于 Canvas 内容。

---

# 16. Board Chrome & Global Actions

## UI-001 / UI-002｜P0｜Title & Temporal Controls

Board Chrome 分为三个稳定区域：

- 左上 Title Area；
- 标题下方左侧 Global Action Bar；
- 右上 Temporal Controls。

右上 Temporal Controls 上层包含 Previous / Today / Next，下层包含 Day / Weekly / Monthly View Mode Selector。

视觉表现：

- 半透明；
- 低对比；
- 不抢占主画面。

---

## UI-003 ~ UI-009｜P0 / P1 / PRO｜Board Global Action Bar

Inspiration Board 是默认主体，不在操作栏中重复放置 Board / Home Icon。

Global Action Bar 固定顺序：

1. More；
2. Journal；
3. Theme / Moon；
4. Download / Share；
5. Trash。

### More

More 承载低频入口，候选分组包括 Workspace、Canvas Display、Preferences、Data & Privacy、Help & About。Theme、Journal、Download / Share 与 Trash 不在 More 内重复。

### Journal Gateway — PRO

Journal Icon 打开 Gateway，未来包含：

- Add Selected Images to Journal Inbox；
- Add Current Day to Journal Inbox；
- Open Journal Cabinet。

当前开发只实现入口边界，不提前开发 Journal 主体。任何 Add 行为建立引用，不移动 Source。

### Theme — P0

Moon Icon 打开 Background Surface Picker，至少支持内置底板、用户上传底板、Selected 状态与 Restore Default。Theme 只改变 Canvas Background，不修改用户图片。

### Download / Share — P1

入口包含 Download Current Page 与 Share Current Page。输出范围、格式、内容层和本地优先分享方式保持开放；不得默认生成公开链接。

### Trash — P1

进入 Soft-deleted Image 的查看、恢复与永久删除空间。

---

# 17. Week View

## WEEK-001｜P1｜No Full Image Explosion

Week View 不直接展开整周所有图片。

---

## WEEK-002｜P1｜Day Stack

每个 Day Canvas 在 Week View 中压缩为 Day Stack。

Stack 可以视觉露出：

- 若干图片边缘；
- 当日数量；
- 日期；
- 可选 Day Title。

具体视觉后续定义。

---

## WEEK-003｜P1｜View-only Compression

Week Stack 只是一种视觉表示。

不得修改：

- Day Canvas object coordinates；
- Image size；
- Note；
- z-order；
- Keyword state。

---

## WEEK-004｜P1｜Return to Day

点击某个 Day Stack：

→ 进入该日期的完整 Day Canvas。

---

# 18. Month View

## MONTH-001 / MONTH-002｜P1｜Higher Temporal Compression

Month 不直接显示当月所有 Image Object。

主要时间单位仍然是：

> Day。

---

## MONTH-003｜P1｜Visual Direction TBD

允许探索：

- Film；
- Contact Sheet；
- Archive Strip；
- 胶片式时间档案。

但当前 PRD 不锁定最终表现。

---

## MONTH-004｜P1｜Navigation Back

Month 中必须能进入：

- Week；
- Day。

---

# 19. Empty Canvas

## EMPTY-001 / EMPTY-002｜P0｜Normal Empty State

没有任何素材的 Day Canvas：

仍然就是正常 Canvas。

禁止使用大型任务化空状态：

- “今天还没有灵感”
- “开始创建吧”
- 大按钮 CTA
- Onboarding 强引导块

---

## EMPTY-003｜P1｜Light Affordance Only

如需要操作提示：

只能采用极轻、非干扰方式。

---

# 20. Save & Data Safety

## SAVE-001 / SAVE-002｜P0｜Auto Save First

### Product Principle

用户不应该依赖记得按 Ctrl+S 才能保证灵感安全。

产品默认持续自动保存。

---

## SAVE-003｜P0｜Persist User Thought

必须可靠保存：

- Day Canvas；
- Image；
- Position；
- Size；
- z-order；
- Lock State；
- Pinned First Keyword；
- Quick Note；
- Day Title；
- Workspace State。

具体存储技术进入 Architecture。

---

## SAVE-004｜P1｜Manual Save

支持：

`Ctrl/Cmd + S`

作用：

> 立即请求保存当前状态。

它是额外保险，而不是唯一保存机制。

---

## SAVE-005｜P0｜Clean Close

若所有变化已安全保存：

→ 直接关闭。

不弹多余确认。

---

## SAVE-006｜P0｜Unsaved Close Guard

若仍存在未保存变化：

必须弹出最后安全警戒：

- **Save & Close**
- **Close Without Saving**
- **Cancel**

### Acceptance Criteria

- `AC-SAVE-CLOSE-01` 已完全保存时不出现无意义警告。
- `AC-SAVE-CLOSE-02` 未保存变化不得无提示直接丢失。
- `AC-SAVE-CLOSE-03` Cancel 回到原工作现场。
- `AC-SAVE-CLOSE-04` Save & Close 成功后关闭。
- `AC-SAVE-CLOSE-05` Close Without Saving 必须是用户主动选择。

---

# 21. Trash & Forgiving Delete

## TRASH-001｜P1｜No Confirmation for Normal Delete

普通删除图片：

不弹二次确认 Modal。

---

## TRASH-002 / TRASH-003｜P1｜Soft Delete & Restore

Image 删除后：

→ 进入 Trash。

Trash：

→ 支持 Restore。

---

## TRASH-004｜P1｜Permanent Delete

Trash 内允许用户主动永久删除。

---

## TRASH-005｜P1｜Keyword Undo

单个 Keyword 删除：

采用无阻断 Undo。

具体 Undo 时长后续确定。

---

## TRASH-006｜HOLD｜TTL

垃圾箱自动 TTL 清理：

当前不进入确认需求。

---

# 22. Non-blocking Feedback

## FDBK-001｜P0｜No Modal During Flow

普通场景禁止使用 Modal 阻断：

- Capture；
- Move；
- Resize；
- AI Parsing；
- Note；
- Keyword Copy；
- Delete。

关闭未保存状态属于数据安全例外。

---

## FDBK-002 / FDBK-003｜P1｜Light Errors

普通错误使用轻量反馈。

例如：

- 图片处理失败；
- AI Parsing 失败；
- Copy 失败。

错误反馈不得让整个 Canvas 失去操作能力。

---

# 23. Journal Cabinet — PRO

> 本节描述已确认的产品关系，不代表第一版实现范围。

## JRN-001 / JRN-002｜PRO｜Separate Cabinet

Journal Cabinet 是独立于 Inspiration Board 的第二空间。

产品隐喻：

> 手账柜 / 图书柜。

---

## JRN-003 / JRN-004｜PRO｜Custom Journal Books

用户可以创建多个自定义 Journal Book。

例如：

- PPT Layout；
- 穿搭；
- 插画；
- 摄影；
- 诗性复古；
- 任意自定义主题。

主题分类主要发生在这里。

---

## JRN-005｜PRO｜Select Day Sources

用户可以为某一本 Journal 选择：

- 一个 Day Canvas；
- 多个 Day Canvas；

作为素材来源。

---

## JRN-006 ~ JRN-008｜PRO｜Material Inbox

选中的 Day Canvas 素材进入：

> Journal Material Inbox。

关键规则：

- Material Inbox 不移动原 Capture；
- 同一 Image 可以被多个 Journal 使用；
- Journal 获取的是使用实例 / 引用关系。

---

## JRN-009 ~ JRN-013｜PRO｜Journal Creation

Journal Canvas 未来支持：

- 自由 Move；
- Resize；
- 拼贴；
- Cutout；
- 主体 Outline；
- Materialize；
- Sticker；
- Paper；
- Text；
- Scrapbook-like Composition。

---

## JRN-014｜PRO｜Source Immutability

Journal 中任何操作：

- Move；
- Resize；
- Delete；
- Cutout；
- Recompose；

都不得反向修改 Source Day Canvas。

### Acceptance Criteria

- `AC-JRN-SOURCE-01` Journal 删除实例，Source Image 仍存在。
- `AC-JRN-SOURCE-02` Journal Resize 不改变 Day Image Size。
- `AC-JRN-SOURCE-03` Cutout 不替换 Day 原图。
- `AC-JRN-SOURCE-04` 同一 Source 可存在于多个 Journal。

---

## JRN-015 / JRN-016｜PRO｜Poetic Archive Export

Journal 完成后支持导出：

> 本地诗性审美档案 / 手账页面。

具体：

- 图片格式；
- 页面尺寸；
- 单页 / 多页；
- 手机 / 平板同步；

后续单独定义。

---

# 24. Visual Language Boundary

## VIS-001｜P0｜Content First

画板必须保持：

> 素材优先。

系统 UI 不能长期抢占视觉。

---

## VIS-002｜P0｜Light Physical Metaphor

可以使用轻微：

- 实体照片感；
- 纸张感；
- 半透明气泡；
- 轻阴影；
- 物理层级。

但拟物不能增加 Capture 摩擦。

---

## VIS-003 ~ VIS-008｜HOLD｜Not Yet Locked

以下视觉方案不进入产品层硬约束：

- 固定 Amber 色系；
- 所有图片默认拍立得；
- 默认胶带；
- 默认图钉；
- 默认随机倾斜；
- Dark Mode。

后续根据 Reference Images 更新：

`DevelopmentSpecs.md`

---

## VIS-009 ~ VIS-014｜P0｜Typography Role Mapping

系统／信息声音 Voice A：

- 英文：Segoe UI；
- 简体中文：PingFang SC；
- 用于 Keyword、导航、菜单、状态、按钮与元数据。

私人／手写声音 Voice B：

- 用于 Custom Title 与 Quick Note；
- 已登记字体资源：`Chenyuluoyan` 与 `momozhuanji`；
- 英文／中文的最终角色映射仍需用户确认后写入 `DesignSystemRules.md`；
- 不提供语言切换控件；
- 系统按字符脚本与 fallback 规则自动选用字体。

字体授权、打包格式、fallback、混排与 Windows 11 渲染验收进入 `DesignSystemRules.md` / `DevelopmentSpecs.md`。

---

# 25. Current Non-goals

## NG-001

Inspiration Board 不是 Project Management Tool。

---

## NG-002

Capture 时不要求用户完成分类。

---

## NG-003

系统不根据 AI 关键词自动建立主题 Folder。

---

## NG-004

系统不自动修改历史 Day Canvas 空间结构。

---

## NG-005

产品不以：

> “每天完成整理”

作为使用目标。

---

## NG-006

用户不需要每天制作 Journal。

---

## NG-007

Week / Month 不是原始编辑数据本体。

---

## NG-008

第一版不追求支持所有桌面输入来源。

第一优先验证：

- Pinterest Browser Drag；
- Clipboard Paste。

---

# 26. Legacy Requirement Hold Pool

以下旧需求暂不删除，但不得默认继承到当前 P0。

## LEG-001｜HOLD

Weekly Keyword Frequency。

## LEG-002｜HOLD

Weekly Summary。

## LEG-003｜HOLD

Weekly Best Visual Style Prompt。

## LEG-004｜HOLD

单周一键下载。

## LEG-005｜HOLD

独立 Sticky Note Canvas Object。

## LEG-006｜HOLD

BYOK。

## LEG-007｜HOLD

具体 AI Provider：

- OpenAI；
- Gemini；
- Claude。

---

# 27. Architecture Re-evaluation Queue

以下问题在下一阶段进入 `Architecture.md`。

## ARCH-Q001｜Desktop Framework

重新评估：

- Electron；
- Tauri；
- 其他 Desktop Framework。

---

## ARCH-Q002｜Persistence

重新确定本地数据持久化方案。

不得默认继承：

- IndexedDB；
- localforage。

---

## ARCH-Q003｜Media Storage

确定：

- 原图；
- 工作图；
- Thumbnail；
- Cache；

之间的关系。

---

## ARCH-Q004｜Image Compression

重新评估：

- 格式；
- 分辨率；
- Quality；
- 文件体积目标。

不得默认继承旧版：

- WebP；
- 1080px；
- 500KB。

---

## ARCH-Q005｜AI Access

重新评估：

- BYOK；
- Product API；
- Gateway；
- Local Model。

---

## ARCH-Q006｜Browser → Desktop Drag

第一技术验证优先项：

> Pinterest / Browser → Desktop Floating Canvas 的稳定图片 Drag。

---

# 28. DO NOT INHERIT

以下属于已废止的旧上下文。

任何 Agent、Architecture 或实现不得默认使用：

- Chrome / Edge Side Panel 是产品主体；
- Manifest V3 是产品核心架构；
- WeeklyBoard 是核心实体；
- `weekId` 是核心数据单位；
- WeeklyCanvas 是主容器；
- 单列瀑布流；
- Day 自动 Stack；
- Day 结束自动整理；
- Note 默认是独立 StickyNote；
- Keyword 默认只在 Hover 图片后出现；
- Right Click 直接执行 Lock；
- 图片自动分类到项目；
- 自动主题 Folder；
- 拍立得是所有图片强制外观；
- 胶带 / 图钉是 P0 必需；
- IndexedDB 已确定；
- localforage 已确定；
- WebP 1080px / 500KB 已确定；
- BYOK 已确定；
- Weekly Summary 属于 P0；
- Journal 是 Capture 后必须完成的下一步骤。

---

# 29. Product Priority

## P0 — Core Capture Experience

### Workspace
- Desktop floating window
- Resize / Move
- Always-on-top
- Workspace restore

### Day
- Infinite Day Canvas
- Historical editing
- Spatial persistence
- Current Day Capture routing
- Optional Custom Title + Persistent Date

### Board Chrome
- Global Action Bar Shell
- More Entry
- Journal Gateway Boundary
- Theme / Background Surface Picker
- Temporal Controls

### Capture
- Pinterest / Browser Drag
- Clipboard Paste
- Drop Position
- Paste Viewport Center
- Micro Offset

### Objects
- Comfortable Initial Size
- Select
- Move
- Resize
- Zoom
- Pan
- Layering
- Lock

### AI
- Auto Visual Parsing
- 5–10 Design Keywords

### Semantic Work Layer
- First Keyword +N Bubble
- Click Expand
- Single Active Keyword Group
- Copy
- Pin First Keyword

### Personal Thought Layer
- Image-bound Quick Note
- Lined Paper Surface
- Image-width Binding
- Three-line Compact / Expanded Overlay

### Safety
- Auto Save
- Unsaved Close Guard

---

## P1 — Temporal Browsing / Safety / Workspace Management

- Week View
- Month View
- Keyword Visibility Toggle
- Download / Share
- Trash
- Manual Save
- AI Retry
- Non-blocking Error Feedback

---

## PRO — Journal Creation

- Journal Cabinet
- Custom Books
- Multi-Day Material Inbox
- Cutout
- Outline
- Materialize
- Collage
- Poetic Archive Export

---

# 30. Core Acceptance Journey

第一版 P0 被认为完成，至少需要跑通以下完整真实场景：

## Journey A｜Pinterest Fast Capture

1. 用户正在 Pinterest 浏览。
2. Desktop Inspiration Board 悬浮在旁边。
3. 用户将一张 Pinterest 图片直接拖到 Canvas 某位置。
4. 图片立即出现在松手位置。
5. 图片自动采用舒适初始尺寸。
6. 若与现有图片高度重合，产生轻微错位。
7. 用户继续浏览 Pinterest，无 Modal 阻断。
8. AI 后台完成 Visual Parsing。
9. 图片上方出现 `First Keyword +N` Bubble。
10. 用户 Click 首词。
11. 展开完整关键词。
12. 点击一个关键词。
13. 关键词进入剪贴板。
14. 用户返回设计 / Vibe Coding 工作继续使用。

### PASS Condition

整个过程不要求：

- 下载；
- 分类；
- 保存文件；
- 命名；
- 确认；
- 写 Note。

---

## Journey B｜Clipboard Capture

1. 浏览器右键复制图片。
2. 用户回到 Canvas。
3. Ctrl/Cmd+V。
4. 图片出现在当前 Viewport 中心附近。
5. 连续 Paste 多张时轻微错位。
6. 后续行为与 Drag Image 一致。

---

## Journey C｜Spatial Thinking

1. 用户连续 Capture 多张图片。
2. 图片产生自然重叠。
3. 用户把相近灵感主动拖到一起。
4. 用户缩放部分图片。
5. 用户给某张图写一句 Note。
6. 用户 Lock 已完成排布图片。
7. 关闭并重新打开应用。
8. 当前 Day 的：
   - 位置；
   - 大小；
   - 遮挡；
   - Note；
   - Lock；
   - Keywords；
   - Viewport；
   全部恢复。

---

## Journey D｜Historical Continuation

1. 用户进入三天前的 Day Canvas。
2. 该 Day 完整恢复原布局。
3. 用户继续从 Pinterest 拖入新图。
4. 新图属于该历史 Day。
5. 系统同时保留真实 Capture 时间。
6. 不自动切回 Today。

---

## Journey E｜Keyword Work

1. Day Canvas 中所有图片默认显示 `First Keyword +N`。
2. Click 某首词展开完整 Keywords。
3. 每个展开 Keyword 后显示 Copy Icon。
4. 点击 Keyword / Copy Icon → Copy。
5. 当前组继续展开。
6. Click 另一张图的首词。
7. 第一组折叠，第二组展开。
8. 点击 Canvas 空白。
9. 当前组折叠。
10. 用户将某个 Keyword Pin 为首词。
11. 重新打开 Day 后 Pin 结果仍存在。

---

## Journey F｜Quick Note

1. 用户选择一张图片。
2. 创建 Quick Note。
3. 默认显示在图片下方。
4. Note 使用横线纸 PNG，宽度与图片一致。
5. Compact 状态中文／英文均最多显示三行。
6. 点击展开长 Note。
7. 完整 Note 高度按段落自然增长。
8. 其他图片不被推开。
9. 收起 Note。
10. 原空间布局完全不变。
11. 用户移动或缩放图片。
12. Note 跟随图片并保持等宽。
13. Lock 图片后仍能编辑 Note。

---

# 31. Success Definition

产品第一版成功的判断，不是：

> 用户整理了多少 Folder。

也不是：

> 用户做了多少手账。

而是：

### Capture Efficiency

用户看到一张视觉素材后，可以非常快地把它留下。

### Flow Preservation

Capture 本身不会迫使用户退出正在进行的思考流程。

### Semantic Reuse

留下来的图片自动拥有可快速复制、可重新搜索的设计语言。

### Spatial Memory

用户形成的图片空间关系不会被系统破坏。

### Temporal Memory

用户可以通过 Day / Week / Month 回到当时的视觉积累。

---

# 32. One-sentence Product Definition

> **一个始终悬浮在工作环境旁边、以每日无限画板保存视觉灵感，通过 AI 关键词增强检索与复用，并允许用户在未来跨时间重新取材制作个人审美档案的 Capture-first 视觉工具。**

---

# 33. Product Essence

如果后续任何需求、Architecture 或 UI 方案需要判断是否适配，应依次检查：

1. 它是否让 Capture 更慢？
2. 它是否要求用户过早分类？
3. 它是否改变用户已经形成的空间关系？
4. 它是否让系统视觉压过图片本身？
5. 它是否削弱关键词作为工作入口的效率？
6. 它是否把 Journal 的整理负担提前强加给 Capture？
7. 它是否把时间锚点从产品中弱化掉？

只要任一答案为“是”，该设计需要重新审查。

---

# 34. v2.1 Sync Notes

- 吸收 `InformationArchitecture.md v0.4` 与 `ReferenceMapping.md v0.2`；
- PRD 确认为最高产品事实；
- Day Title 提升为 P0 主体界面能力；
- Control Capsule 被左侧 Global Action Bar 与右上 Temporal Controls 替代；
- 增加 Theme、Journal Gateway、Download / Share 与 More 的产品边界；
- Keyword 改为 `First Keyword +N`、Click 展开、单一 Active Group；
- Quick Note 改为横线纸、Image 等宽、Compact 三行；
- 删除中英文切换 UI，建立自动字体脚本映射边界。

---

# End of PRD.md v2.1
