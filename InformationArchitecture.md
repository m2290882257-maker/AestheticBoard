# InformationArchitecture.md — Aesthetic Inspiration Board / Journal

> **文档状态：** v0.4 — Development-synchronized Information Architecture Baseline  
> **产品范围：** Inspiration Board 主体 + Pro Journal 信息空间边界  
> **默认入口：** Inspiration Board / 当前 Day Canvas  
> **产品事实来源：** `PRD.md v2.1 — Capture-first Temporal Spatial Inspiration Board.md`  
> **关联文档：** `InteractionFlow.md v2.1`、`Architecture.md v2.1`、`ReferenceMapping.md v0.2`、`VisualDirection.md`、`专业设计工程规范.md`  
> **核心原则：** 时间强｜空间自由｜分类弱｜检索强

---

## 0. 文档目的

本文档定义产品中“什么信息存在、位于哪里、彼此如何归属、何时被看见”。它用于持续检查 Inspiration Board 与 Pro Journal 的页面层级、信息对象、控件入口、渐进披露和跨空间关系。

本文档主要回答：

- 产品由哪些一级空间组成；
- 用户打开产品后首先进入哪里、看见什么；
- Inspiration Board 内有哪些页面层级、内容层与系统层；
- Journal 作为 Pro 第二主体包含哪些信息空间；
- Board 素材如何进入 Journal，而不改变原始 Capture；
- 哪些信息持续可见，哪些只在上下文中出现；
- 哪些部分属于 P0、P1、Pro，哪些仍然开放；
- 后续 IA 架构图应以哪些节点和关系为准。

本文档不是视觉稿，也不是组件尺寸规范。它不决定字体、色值、间距、圆角、透明度和动效参数。

---

## 1. 与 `InteractionFlow.md` 的边界

Information Architecture 与 Interaction Flow 彼此关联，但职责不同。

| 文档 | 核心问题 | 典型内容 |
| --- | --- | --- |
| `InformationArchitecture.md` | 产品里有什么、放在哪里、属于谁、何时可见 | 一级空间、页面层级、内容对象、控件分组、信息显隐、跨空间引用 |
| `InteractionFlow.md` | 用户做了什么之后，系统按什么顺序回应 | Trigger、即时反馈、状态变化、异步任务、持久化、失败与退出 |

本文件可以说明“用户选择图片后，Selection Controls 与 Quick Note Entry 出现”，但不重复定义 Pointer Down、Move Threshold、Mutation Queue、Durable ACK 等完整时序。

若两份文档发生冲突：

1. 功能范围和产品关系以 PRD 为准；
2. 页面、信息归属和入口层级以本文件为准；
3. 操作优先级、状态机与反馈时序以 `InteractionFlow.md` 为准；
4. 技术数据结构和持久化实现以 `Architecture.md` 为准。

---

## 2. IA 决策状态

| 标记 | 含义 |
| --- | --- |
| `P0` | Inspiration Board 主体首版必须存在 |
| `P1` | 已确认方向，但不进入主体首版 |
| `PRO` | Journal 创作空间及其专属能力 |
| `OPEN` | 信息关系尚未获得足够产品或原型证据 |
| `EXCLUDED` | 当前产品明确不采用 |

任何 `OPEN` 项不得由 Codex、Stitch 或实现者自行固化为最终导航或数据关系。

### 2.1 v0.2 界面证据

本版新增决策基于三张真实 Board 页面：

| 页面 | 提供的 IA 证据 |
| --- | --- |
| `默认英文界面.png` | 默认时间标题、左侧 Action Bar、右上时间控制、`First Keyword +N`、Keyword 展开状态样例、Quick Note、Context Menu |
| `英文标题键入界面.png` | 英文自定义标题升为主标题，日期／范围缩小并降级 |
| `中文标题键入.png` | 中文标题与英文标题共享结构，但采用不同字体映射 |

设计稿负责证明页面中需要哪些信息与相对层级；像素、字体、透明度、阴影和精确坐标仍由 Design System 决定。

注：默认英文页面同时绘制多组关键词，是为了展示组件状态，不代表运行时允许多组同时展开；运行时规则以 6.4 节的单一 Active Group 为准。

---

## 3. 产品级信息架构总览

产品由两个可独立进入的一级工作空间，以及一组共享系统能力组成。

### 3.1 一级空间

- **Inspiration Board — `P0` 默认空间**
  - Day Canvas — `P0` 原始、可编辑的 Capture 空间
  - Week View — `P1` Day 数据的只读时间压缩
  - Month View — `P1` Day 数据的更高阶只读时间压缩
- **Journal Cabinet — `PRO` 主动进入的第二空间**
  - Journal Books
  - Material Inbox
  - Journal Canvas / Composition Space
  - Export
- **Shared System Layer — 分阶段提供**
  - Workspace / Window Controls — `P0`
  - Save Safety 与局部状态反馈 — `P0`
  - Board Global Action Bar — `P0 / P1 / PRO` 混合入口
  - Background Theme / Surface Picker — `P0 / PROVISIONAL`
  - Download & Share — `P1 / OPEN`
  - Trash — `P1`
  - Preferences — More Menu 内的低频管理入口，`P1 / OPEN`

### 3.2 关键关系

| 关系 | 定义 |
| --- | --- |
| 默认关系 | 应用启动默认进入 Inspiration Board，而非 Journal |
| 数据本体 | Day Canvas 是 Capture 的原始、可编辑数据本体 |
| 时间投影 | Week / Month 读取 Day 数据，但不拥有可回写的空间布局 |
| Journal 关系 | Journal 是独立工作空间，不是 Capture 后必须完成的下一步 |
| 素材关系 | Journal 使用 Board Image 的引用／实例，不移动或修改原素材 |
| 多重使用 | 同一 Source Image 可以进入多个 Journal Book |
| 视觉关系 | Board 与 Journal 属于同一个 Personal Editorial Archive 世界，但信息密度和表达权限不同 |

---

## 4. 产品导航层级

### 4.1 Board Global Action Bar

Inspiration Board 本身就是应用默认主体，因此不在操作栏中重复放置一个 Board Icon 或 Home Button。用户处于 Board 时，画布本身就是当前位置。

设计稿中的左侧轻量操作栏承担“从当前 Board 发起全局动作”的职责，而不是在多个一级页面之间逐项切换。其固定顺序为：

| 顺序 | 入口 | 信息意图 | 目标／内容 | 状态 |
| ---: | --- | --- | --- | --- |
| 1 | More | 打开低频功能与偏好 | Workspace、显示、辅助功能、数据与帮助等分组 | `P0 shell / P1 content` |
| 2 | Journal | 将当前素材送往 Journal，或进入 Journal | Journal Gateway Popover | `PRO` |
| 3 | Theme / Moon | 更换 Board 背景底板 | Background Surface Picker | `P0 / PROVISIONAL` |
| 4 | Download / Share | 输出或分享当前页面 | Export & Share Menu | `P1 / OPEN` |
| 5 | Trash | 查看并恢复已删除素材 | Trash | `P1` |

操作栏应保持轻量、单层和稳定顺序。它不包含：

- Inspiration Board Icon；
- Day / Week / Month 切换；
- Previous / Today / Next；
- 中英文切换；
- 常驻搜索框；
- Journal 内部的 Book 导航。

#### More Menu 的建议分组

More 只容纳低频、无法获得独立入口的管理能力。首轮 IA 建议按以下分组验证：

| 分组 | 候选内容 | 状态 |
| --- | --- | --- |
| Workspace | Always-on-top、窗口恢复相关入口 | `P0 / P1` |
| Canvas Display | Keyword Visibility、低缩放信息显隐偏好 | `P1` |
| Preferences | Accessibility、Reduced Motion、输入与显示偏好 | `P1 / OPEN` |
| Data & Privacy | 本地 Profile、备份、AI 数据说明 | `P1 / OPEN` |
| Help & About | 快捷键、帮助、版本信息 | `P1 / OPEN` |

Theme、Journal、Download / Share 与 Trash 已有独立入口，不应在 More 内重复。Search 是核心检索能力，未来若进入产品，应单独评估其一级入口，不能因为尚未设计就默认塞入 More。

### 4.2 Inspiration Board Internal Level

Board 内部以时间为主要导航轴：

- Day — 原始工作现场；
- Week — 按 Day Stack 压缩浏览；
- Month — 以 Day 为单位进行更高时间压缩；
- Previous Day / Next Day / Today — P0 的直接时间移动。

这些入口位于画面右上时间控制区，与左侧 Global Action Bar 分离：

- 上层：Previous / Today / Next；
- 下层：当前 View Mode，可展开选择 Day / Weekly / Monthly。

主题 Folder、Project Tree、强制标签分类不属于 Board 一级导航。

### 4.3 Journal Internal Level

Journal 主体尚未进入设计与开发。本节只保留已经确认的产品级命名空间，便于定义 Board 的出口；不代表 Journal 页面形态已经定案。

当前暂以用户主动建立的 Book 为主要组织轴：

- Journal Cabinet / Books Index；
- 单个 Journal Book；
- 该 Book 的 Material Inbox；
- 该 Book 的 Journal Canvas / Composition；
- Export。

Journal 的分类发生在 Book 层，而不是反向要求 Capture 时先分类。

### 4.4 Journal Gateway

左侧 Journal Icon 是 Board 通往 Journal 的唯一明确入口。它同时承载“把素材送入 Inbox”和“进入 Journal”两种意图，因此不应在无上下文时直接执行不可见的批量添加。

建议点击后打开轻量 Journal Gateway Popover：

- **Add Selected Images to Journal Inbox** — 当前存在 Image Selection 时可用；
- **Add Current Day to Journal Inbox** — 将当前 Day 的素材作为来源引用加入目标 Book；
- **Open Journal Cabinet** — 直接进入 Journal 主体。

`PRO / OPEN`：目标 Book 的选择、重复素材提示、添加后是否停留在 Board，以及无 Journal Book 时的创建路径，将在 Journal 原型阶段定义。所有添加行为必须建立引用，不移动 Source。

---

## 5. Inspiration Board：首屏信息架构

### 5.1 首次启动

用户首次进入后，直接看到一张可使用的当前 Day Canvas。

**持续可见的一级信息：**

- 左上标题／时间身份；
- 正常可操作的无限画布；
- 右上 Previous / Today / Next；
- 右上 Day / Weekly / Monthly View Mode；
- 左侧 Global Action Bar；
- 必需的窗口控制与 Always-on-top 状态入口；
- 已存在时的当日 Image Objects。

**不应作为首屏主体出现：**

- 大型 Onboarding；
- “今天还没有灵感”式任务文案；
- 大按钮 CTA；
- 创建 Project / Folder 的前置步骤；
- 要求用户选择模板、分类、命名或 Journal；
- 用功能介绍遮挡画布。

空 Day 仍然是一张正常、成立的 Canvas。其信息意义是“这里可以开始”，而不是“这里尚未完成”。

### 5.2 再次进入

回访用户进入后，应看到上次可靠保存的工作现场：

- 上次 Active Day；
- 该 Day 的日期与可选标题；
- Canvas Camera / Zoom；
- Image 的位置、尺寸、遮挡与层级；
- Lock、Quick Note、Pinned Keyword 等持久信息；
- 窗口位置、尺寸与 Always-on-top 状态。

Selection、Hover、展开中的 Context Menu 等临时状态不是必须恢复的信息。

---

## 6. Day Canvas 页面层级

Day Canvas 是 Board 的核心页面。其信息层级从背景到前景分为以下七层。

### 6.1 L0 — Canvas Surface

职责：承载世界坐标、空间关系与安静的长期工作台背景。

包含：

- Infinite Canvas；
- 当前 Viewport；
- Pan / Zoom 可操作区域；
- 空白点击区域；
- 极轻、非任务化的空画布提示（如未来验证需要，`P1`）。

Canvas Surface 不拥有自动布局、网格分类或完成度信息。

### 6.2 L1 — Title & Temporal Identity

职责：同时回答“这一页是什么”和“我现在位于哪个时间范围”。

左上 Title Area 有两种结构：

1. **无自定义标题：** 当前日期／日期范围成为默认主标题；
2. **有自定义标题：** 用户标题成为主标题，日期／日期范围缩小、降低视觉纯度并作为次级时间信息保留。

规则：

- 每个 Day 只允许一个自定义总标题；
- Date / Date Range 始终存在，不能被标题替代；
- 无标题时不显示 `Untitled`；
- 中文标题与英文标题使用不同字体映射，但拥有同一信息层级；
- 字体映射由 `DesignSystemRules.md` 定义，IA 不提供语言切换控件；
- 标题文本可按字符脚本自动匹配中文／英文字体，混排回退规则进入 Typography System。

右上 Temporal Controls 包含：

- Previous / Today / Next — `P0`；
- View Mode Selector — Day / Weekly / Monthly，`P1`；
- 当前 Mode 始终在折叠态可见。

### 6.3 L2 — Primary Content Objects

职责：承载用户 Capture 的视觉材料与空间判断。

当前唯一 P0 主内容对象为：

- Image Object。

每个 Image Object 拥有：

- 图片内容与宽高比；
- Day 归属；
- 位置、尺寸、z-order；
- Capture 来源与真实时间等后台 provenance；
- Lock State；
- Keyword Set；
- Pinned First Keyword；
- 可选 Quick Note；
- Capture / AI 局部生命周期状态。

以下不属于 P0 独立 Canvas Object：

- Quick Note；
- Keyword Bubble；
- Sticky Note；
- 区域标题；
- 系统自动建立的 Group 或 Folder。

### 6.4 L3 — Image-bound Information

职责：在不破坏图片空间关系的前提下附着语义与个人思考。

包含：

- First Keyword Bubble：默认显示首词与 `+N`；
- Expanded Keyword Group：逐行显示完整关键词；
- Keyword Copy Icon：只在展开态的每个关键词后出现；
- Quick Note Compact State：使用横线纸 PNG，与绑定 Image 等宽，最多三行；
- Quick Note Expanded State：宽度仍与 Image 一致，高度按完整段落自然增长；
- Lock Token / State Mark；
- Image-local processing / error 状态。

`+N` 表示除当前首词外仍有多少个关键词。例如共有 6 个关键词时，折叠态显示 `First Keyword +5`。

虽然其视觉形态接近 Tooltip，First Keyword Bubble 仍是默认常显的信息摘要，不是只能通过 Hover 才能发现的传统 Tooltip。

点击 First Keyword Bubble 后展开关键词组；点击每个关键词后的 Copy Icon 可复制对应词。

同一时间最多只有一个 Expanded Keyword Group：

- 点击另一张图片的 `First Keyword +N` 时，上一组自动折叠；
- 点击 Canvas 空白时，当前展开组自动折叠；
- Copy Keyword 后，当前组保持展开；
- 不为 Expanded Group 额外增加 Close Button。

Quick Note 的横线纸是 Image-bound Surface，不是独立 Canvas Object：

- 宽度始终跟随 Image 当前显示宽度；
- Compact 默认最多显示三行，中文与英文一致；
- 超过三行时隐藏剩余内容并保留可展开入口；
- Expanded 高度由完整文本自然决定；
- 图片移动、缩放时 Note 跟随并重新映射宽度；
- Note 不触发其他 Image 自动避让或 Canvas Auto Layout。

默认空间次序为：Keyword 信息锚定在图片上方／侧上方，Quick Note 锚定在图片下方。关键词展开不改变 Quick Note 与 Image 的绑定关系。

### 6.5 L4 — Contextual Action Layer

职责：只在用户当前关注对象时提供操作，不形成常驻工具墙。

包含：

- Selection Outline；
- 四角等比 Resize Handles；
- Image Note Entry；
- Object Context Menu；
- Context Menu 中的 Lock / Unlock；
- P1 的 Bring to Front / Send to Back；
- Keyword 的 Copy / Pin 等上下文操作。

设计稿中的 Pointer Cursor 只用于说明鼠标上下文，不属于持久组件或信息对象。

Context Menu 分为两个上下文：

- **Image Context Menu：** 第一项固定 Lock / Unlock；其他候选包括 Note、Layer、Delete；
- **Canvas Context Menu：** Undo / Redo、Paste、Select All 等画布级命令，精确清单为 `OPEN`。

设计稿中的菜单视觉可作为右键菜单占位，但不将其中的 Figma／系统菜单文案直接视为产品功能。

Selection 与 Focus 必须是可区分的信息状态。

### 6.6 L5 — Global Action & Temporal Controls

职责：以两个明确分区管理 Board，避免把所有入口混成一条传统 Toolbar。

**左侧 Global Action Bar：**

- More；
- Journal；
- Theme；
- Download / Share；
- Trash。

**右上 Temporal Controls：**

- Previous / Today / Next；
- Day / Weekly / Monthly Mode Selector。

两组控件与左上 Title Area 共同构成 Header / Chrome Layer，但不得遮挡或重排 Canvas Objects。具体坐标、吸附、透明度与窗口缩小时的响应方式进入 Design System 与 Development Specs。

### 6.7 L6 — System Feedback & Safety

职责：说明系统是否正在处理、保存或遇到问题，同时尽量归属到具体对象。

包含：

- Image-local Capture Processing / Failure；
- Keyword-local AI Processing / Failure / Retry；
- Keyword Copy Feedback；
- Quick Note Saving / Error；
- Global Save Safety State；
- Unsaved Close Guard；
- Fatal Profile / Migration Recovery Screen。

普通错误优先放回对象或局部上下文。只有无法安全打开数据的故障才占据 App Level。

---

## 7. Day Canvas 组件与控件清单

| 组件／控件 | 所属层 | 用户何时看到 | 信息职责 | 阶段 |
| --- | --- | --- | --- | --- |
| Canvas Surface | L0 | 始终 | 空间工作台 | `P0` |
| Default Temporal Title | L1 | 无自定义标题时 | 当前时间身份与默认标题 | `P0` |
| Custom Day Title | L1 | 用户键入标题后 | 当前页面的私人标题 | `P0 / PRD SYNC REQUIRED` |
| Secondary Date / Range | L1 | 有自定义标题时 | 被降级但持续可见的时间身份 | `P0` |
| Previous / Next | L1 / L5 | 始终或稳定可发现 | 相邻 Day 导航 | `P0` |
| Today | L1 / L5 | 始终或稳定可发现 | 返回今天 | `P0` |
| View Mode Selector | L1 / L5 | 始终 | Day / Weekly / Monthly 切换 | `P1` |
| Global Action Bar | L5 | 始终 | Board 的全局操作入口 | `P0 shell` |
| More Menu | L5 | 点击 More 后 | 低频功能与 Preferences | `P1 / OPEN` |
| Journal Gateway | L5 | 点击 Journal 后 | 加入 Inbox 或进入 Journal | `PRO` |
| Theme Surface Picker | L5 | 点击 Moon 后 | 更换 Board 背景底板 | `P0 / PROVISIONAL` |
| Download / Share Menu | L5 | 点击 Download 后 | 输出或分享当前页面 | `P1 / OPEN` |
| Trash Entry | L5 | 始终 | 进入 Trash | `P1` |
| Image Object | L2 | Capture 后 | 原始视觉素材 | `P0` |
| First Keyword Bubble | L3 | AI 成功后默认可见 | `首词 +N` 语义摘要 | `P0` |
| Expanded Keyword Group | L3 | 点击首词后 | 完整关键词与逐词 Copy | `P0` |
| Quick Note Compact | L3 | Note 有内容时 | 与图片等宽、最多三行的个人想法 | `P0` |
| Quick Note Expanded | L3 | 展开 Note 时 | 与图片等宽、按段落自然增高 | `P0` |
| Lock State Mark | L3 | Image Locked 时 | 几何已固定 | `P0` |
| Selection Outline | L4 | Image Selected 时 | 当前操作对象 | `P0` |
| Resize Handles | L4 | 未锁定 Image Selected 时 | 可等比缩放 | `P0` |
| Object Context Menu | L4 | 右键 Image 时 | 对象级动作 | `P0` |
| Local Error / Retry | L6 | 对象处理失败时 | 后果与恢复入口 | `P1` |
| Unsaved Close Guard | L6 | 关闭且无法确认保存时 | 数据安全选择 | `P0` |

---

## 8. 信息的渐进披露

本节只定义“新增显示什么”，不重复完整交互状态机。

| 用户当前情境 | 新暴露的信息 | 不应同时暴露 |
| --- | --- | --- |
| 初次进入空 Day | 默认时间标题、Canvas、Global Action Bar、时间导航、窗口状态 | 大 CTA、教程面板、分类表单 |
| 键入自定义标题 | 自定义标题升为主信息；日期／范围缩小并降级 | 隐藏日期、增加第二个页面标题 |
| Capture 图片进入 | Image、局部处理状态 | AI 等待 Modal、命名与分类表单 |
| AI 成功 | `First Keyword +N` | 自动展开全部关键词、自动分类 |
| 点击 First Keyword | 完整 Keyword Group、逐词 Copy / Pin 能力 | 自动改变图片 Geometry |
| 点击另一组 First Keyword | 新组展开，上一组恢复为 `First Keyword +N` | 多组关键词长期同时占据画布 |
| 点击 Canvas 空白 | 当前组恢复为 `First Keyword +N` | 改变图片选择之外的持久数据 |
| Select Image | Selection、Resize、Note Entry 等对象控件 | 全局属性面板或长期覆盖内容的 Toolbar |
| Select Locked Image | Selection、Lock State、Note / Keyword 能力 | 可执行 Resize Handles |
| Expand Quick Note | 与图片等宽、按完整段落增高的 Note | 其他图片自动避让、Canvas Auto Layout |
| Right Click Image | Object Context Menu，首项 Lock / Unlock | 直接执行高风险或隐含动作 |
| 点击 More | Workspace、Display、Preferences、Data、Help 分组 | Theme、Journal、Download、Trash 的重复入口 |
| 点击 Journal | Add Selected、Add Current Day、Open Journal | 未选择目标或范围就静默批量加入 |
| 点击 Theme / Moon | Background Surface Picker | 修改用户图片滤镜 |
| 点击 Download / Share | 当前页面的下载与分享选项 | 将 Journal Export 与 Board Export 混为同一数据对象 |
| 普通处理失败 | 该对象或局部错误、恢复入口 | 全局阻塞 Modal |

渐进披露的目标是让第一眼只出现“工作所需信息”，让管理能力在需要时可发现，而不是隐藏到无法学习。

---

## 9. 信息持久性与可见性

### 9.1 Durable Product Information

以下信息代表用户素材、思考或稳定工作现场，应可靠保存：

- Day Canvas 与 Date；
- Day Title；
- Image 与 Day 归属；
- Position、Size、z-order；
- Lock State；
- Keywords 与 Pinned First Keyword；
- Quick Note；
- 每个 Day 的 Camera；
- Active Day；
- Window Bounds 与 Always-on-top；
- 当前 Background Surface / 用户自定义底板引用；
- Keyword Visibility Preference（P1）；
- Soft Delete / Trash 状态（P1）。

### 9.2 Transient Interface Information

以下信息只说明当前操作上下文，通常不作为文档事实恢复：

- Hover；
- Selected Image；
- Focus 位置；
- 展开中的 Context Menu；
- 当前唯一的 Expanded Keyword Group；
- 当前 Expanded Note；
- Dragging / Resizing 的临时视觉层；
- 短暂 Copy / Saved Feedback。

### 9.3 Derived Information

以下信息由原始事实生成，可失败、可重建或只读：

- AI Keywords；
- Week Day Stack；
- Month 时间压缩表示；
- Working Image / Thumbnail；
- Journal 中基于 Source 的使用实例。

Derived 不等于不重要。用户 Pin 的首词与 Journal 的编排结果仍是用户事实，必须保存；只有其来源素材或投影计算可以重建。

---

## 10. Day、Week、Month 的信息关系

### 10.1 Day — Canonical Workspace `P0`

Day 是唯一可直接编辑 Capture 原始空间的位置。它拥有 Image Object、空间关系、Quick Note 与 Camera。

### 10.2 Week — Read-only Temporal Projection `P1`

Week 由多个 Day Stack 组成。每个 Stack 可展示：

- Date；
- 若干图片边缘或缩略投影；
- 当日图片数量；
- 可选 Day Title。

Week 不直接修改 Day 的坐标、尺寸、z-order、Note 或 Keyword State。进入某个 Stack 后回到该 Day 的完整 Scene。

### 10.3 Month — Higher Temporal Projection `P1`

Month 继续以 Day 为基本单位，不展开当月所有 Image Object。其视觉表示可探索 Film、Contact Sheet 或 Archive Strip，但当前保持 `OPEN`。

Month 必须能进入 Week 或 Day；它不拥有独立可回写的 Capture Geometry。

### 10.4 时间视图的信息权威

| 信息 | Day | Week | Month |
| --- | --- | --- | --- |
| Image 原始内容 | 拥有 | 读取／缩略投影 | 读取／压缩投影 |
| Geometry | 拥有并可编辑 | 不回写 | 不回写 |
| Quick Note | 拥有并可编辑 | 最多摘要，待定 | 默认不展开，待定 |
| Keyword | 拥有 | 可摘要，待定 | 默认不展开，待定 |
| Camera | 每 Day 独立拥有 | 自身浏览状态待定 | 自身浏览状态待定 |

---

## 11. Journal Cabinet：Pro 信息架构

> 本节定义已确认的产品关系，不代表当前 Inspiration Board 的开发范围。

### 11.1 Journal 的产品位置

Journal 是用户主动进行选择、编排和叙述的第二工作空间。它不是：

- 每次 Capture 后的必经步骤；
- Board 的“完成态”；
- 自动把素材归类的系统；
- 对 Source Day 的直接编辑器。

### 11.2 Journal Cabinet / Books Index

职责：展示和管理用户创建的多个 Journal Book。

Book 可以代表任意用户主题，例如 PPT Layout、穿搭、插画、摄影或诗性复古。主题组织主要发生在这里。

**已确认信息：**

- 用户可以创建多个自定义 Book；
- Book 是 Journal 内的主要分类单位；
- Book 与 Day 不要求一一对应；
- 一个 Book 可以选择一个或多个 Day 作为素材来源。

**仍开放：**

- Cabinet 首屏是书脊／封面陈列、列表还是混合视图；
- Book 的封面、标题、描述与排序规则；
- 空 Cabinet 的创建入口如何表达；
- 最近打开、收藏和归档是否存在。

### 11.3 Journal Book

单个 Journal Book 是一个独立的主题创作容器。它至少包含：

- Book Identity；
- Material Inbox；
- Journal Canvas / Composition Space；
- Export Entry。

`OPEN`：Book 内采用单一无限 Canvas、固定页面、多页文档，还是三者结合，尚未定案。这会显著改变 IA，必须通过 Journal 原型单独确认。

### 11.4 Material Inbox

职责：接收用户从一个或多个 Day 选择的 Source Material Reference。

每个 Material Reference 至少指向：

- Source Day Canvas；
- Source Image Object；
- Source Media Asset；
- 被选择进入 Journal 的时间。

关键规则：

- 加入 Inbox 不移动原 Capture；
- 同一 Image 可以被多个 Book 引用；
- Inbox 中移除引用不删除 Source；
- Source Day 的空间关系保持不变；
- Quick Note 是否作为可见参考进入 Inbox 为 `OPEN`，不得默认复制为 Journal 正文。

### 11.5 Journal Canvas / Composition Space

职责：把 Inbox 中的素材实例组织为更强的个人叙述和视觉构图。

未来可支持：

- Move / Resize；
- Collage / Recompose；
- Cutout；
- Subject Outline；
- Materialize；
- Sticker / Paper；
- Text；
- 更高密度的个人表达。

Journal 中的对象属于 Journal Instance。其位置、尺寸、裁切、轮廓和删除均不得修改 Source Image Object 或 Original Media。

工作型 Keyword Bubble 在 Journal Canvas 默认隐藏。需要语义信息时的入口与表现为 `OPEN`。

### 11.6 Export

职责：把 Journal 的编排结果输出为本地诗性审美档案／手账页面。

以下保持 `OPEN`：

- 图片或 PDF 等格式；
- 单页或多页；
- 页面尺寸与比例；
- 手机／平板适配；
- 是否包含元数据、日期或来源；
- Export 历史与版本管理。

---

## 12. Board → Journal 的信息关系

### 12.1 单向引用原则

Board 与 Journal 的关系是：

> Capture Source → Journal Reference → Journal Instance

而不是：

> Capture Source → Move into Journal → Source Disappears

### 12.2 Source Immutability

| Journal 行为 | Journal 中改变 | Board Source 中改变 |
| --- | --- | --- |
| Move | Instance position | 无 |
| Resize | Instance size | 无 |
| Delete | 移除 Instance / Reference | 无 |
| Cutout | Journal derivative / mask | 无 |
| Recompose | Journal layout | 无 |
| Export | 生成输出文件 | 无 |

### 12.3 跨空间可追溯性

`PRO / OPEN`：Journal Material 应保留回到 Source Day 的能力，但具体呈现尚未锁定。无论是否提供显式“查看来源”，数据关系中必须保留 Source Day、Source Image 与 Source Media 的稳定引用。

### 12.4 不自动推进

Board 中的 Capture、AI 完成、Quick Note 完成或某一天结束，均不自动创建 Journal，不弹出“下一步制作 Journal”，也不将未进入 Journal 表达为未完成。

---

## 13. Board 与 Journal 的共享与分离

| 领域 | 共享 | 分离 |
| --- | --- | --- |
| 视觉世界 | Quiet Field、双声道字体、Personal Editorial Archive | Journal 允许更高个人表达密度 |
| 媒体事实 | 同一 Original Media 可被引用 | Journal 不覆盖或替换 Original |
| 空间布局 | 无 | Day Geometry 与 Journal Geometry 各自拥有 |
| Note | 可作为来源线索，具体方式待定 | Journal 文本不自动回写 Quick Note |
| Keyword | 可作为检索／选材线索 | Journal 默认隐藏工作型 Bubble |
| 时间 | Journal 可引用一个或多个 Day | Book 不等于 Day；Journal 有自己的主题结构 |
| 删除 | 可通过引用关系保持一致性检查 | 删除 Journal Instance 不删除 Capture |
| Save / Recovery | 共享可靠性原则 | 各自保存自己的工作现场与编辑状态 |

---

## 14. 系统级信息架构

### 14.1 Workspace / Window State `P0`

- Window Bounds；
- Maximized State；
- Always-on-top；
- Active Workspace；
- Active Day；
- 各 Day Camera。

### 14.2 Save & Safety `P0`

Save 状态平时保持安静。只有出现持续处理、失败或关闭风险时提高显著度。

Unsaved Close Guard 是安全例外，固定提供：

- Save & Close；
- Close Without Saving；
- Cancel。

### 14.3 Trash `P1`

Trash 属于工作空间管理，不属于 Day Canvas 主操作层。

至少包含：

- Soft-deleted Image；
- 原 Day 与原 Geometry 关系；
- Restore；
- Permanent Delete。

`OPEN`：Trash 是全局集合、按 Day 分组还是二者结合。

### 14.4 Theme / Background Surface `P0 / PROVISIONAL`

Moon Icon 打开 Background Surface Picker。它只改变 Board 的承托底板，不修改用户图片、关键词、Quick Note 或空间数据。

至少需要容纳：

- 内置 Quiet Paper / Soft Surface 候选；
- 用户上传自定义背景底板；
- 当前背景的 Selected 状态；
- 恢复默认背景。

P0 暂定为 **Workspace 级持久偏好**：切换后作用于 Board 工作空间，并在重启后恢复。每 Day 独立背景与两层继承模型继续 `OPEN / DEFERRED`；若未来启用，需要更新 PRD、IA 与 Migration。

### 14.5 Download & Share `P1 / OPEN`

Download Icon 打开当前 Board Page 的 Export & Share Menu。当前 IA 确认两类意图：

- **Download Current Page** — 把当前页面输出为本地文件；
- **Share Current Page** — 通过系统分享、复制文件或其他方式发出当前页面。

`OPEN`：输出格式、画布裁切范围、是否包含背景／关键词／Quick Note，以及本地优先产品如何实现“分享”。在 Cloud Link 未进入产品范围前，不得把 Share 自动解释为生成公开链接。

Board Download / Share 与 Journal Export 是两个不同的输出上下文，不共用同一个页面对象。

### 14.6 Preferences in More `P1 / OPEN`

Preferences 不作为操作栏中的独立 Icon，而作为 More Menu 内的低频入口。其信息分组不得在缺乏需求时扩张。可能包含：

- Workspace / Always-on-top 偏好；
- Keyword Visibility；
- Accessibility / Reduced Motion；
- 数据与 Profile 管理；
- AI 与隐私说明。

主题更换已有独立 Moon Icon，不在 Preferences 中重复。账号、Cloud Sync、BYOK 与 Local Model 均未进入当前确认范围。

### 14.7 Language & Font Mapping Boundary

产品不提供中英文切换功能。界面语言与关键词输出语言若未来需要调整，应由产品语言策略或 AI 设置单独定义，不作为当前 Board 导航项。

中文／英文字体库与标题、Quick Note 的脚本映射属于 Typography System：

- IA 只记录 Title 和 Quick Note 的信息角色；
- System / Information Voice 已确认：英文 Segoe UI，简体中文 PingFang SC；
- Personal Voice 按字符语言分配：英文使用 Chenyuluoyan，中文使用 momozhuanji；两者均覆盖相应语言的 Title、Quick Note 与其他非系统文字；
- `DesignSystemRules.md` 定义中文、英文、数字、标点与混排回退；
- 字体映射不得要求用户先手动切换语言。

---

## 15. 信息对象目录

| 信息对象 | 所属空间 | 所有者 | 可编辑性 | 生命周期 |
| --- | --- | --- | --- | --- |
| Workspace State | Shared System | App | 用户间接编辑 | 跨会话 |
| Board Action Bar | Board Chrome | App | 固定入口集合 | 持续可见 |
| Background Surface Preference | Board / Workspace，所有权待定 | User | 可编辑 | 持久 |
| Day Canvas | Board | Board | 可编辑 | 持久 |
| Day Title | Day | Day Canvas | 可编辑、可空 | 持久 |
| Camera State | Day | Day Canvas Session | 可编辑 | 跨会话恢复 |
| Image Object | Day | Day Canvas | 可编辑 | 持久／可软删除 |
| Media Asset | Shared Media Store | App Profile | 不直接编辑 | 持久 |
| Keyword Set | Image | Image Object | AI 派生 | 可重建／持久 |
| Pinned Keyword | Image | 用户偏好 | 可编辑 | 持久 |
| Quick Note | Image | Image Object | 可编辑、可空 | 持久 |
| Board Export | Outside Workspace | User | 输出结果 | 本地文件／分享载体，细节待定 |
| Week Projection | Board | System Projection | 只读 | 可重建 |
| Month Projection | Board | System Projection | 只读 | 可重建 |
| Journal Book | Journal | User | 可编辑 | 持久 |
| Material Reference | Journal Book | Journal | 可增删 | 持久引用 |
| Journal Instance | Journal Canvas | Journal | 可编辑 | 持久 |
| Journal Export | Outside Workspace | User | 输出结果 | 持久文件，细节待定 |

---

## 16. 信息密度与可见性策略

### 16.1 Sparse Board

优先显示：

- 图片；
- Date；
- First Keyword；
- 少量 Quick Note；
- 必要 Selection / Lock State。

背景可保留更多空气，不额外填充推荐、模板或统计。

### 16.2 Working Board

在 15–25 张图的正常场景中，系统仍应保持：

- 图片是第一视觉层；
- 折叠态只显示 `First Keyword +N`；
- Quick Note 默认 Compact 且最多三行；
- 同时最多一个 Expanded Keyword Group；激活新组时上一组自动折叠；
- More、Journal、Theme、Download / Share 的菜单默认关闭；
- 状态反馈尽量局部。

### 16.3 Dense Board

在 50+ 图片场景中，可弱化、聚合或隐藏部分工作信息，但不得丢失：

- 图片空间关系；
- Selection；
- Lock 可辨认性；
- 当前 Date；
- 返回可读细节层级的路径。

Keyword、Note 和 State Token 随 Zoom 的具体阈值为 `OPEN`，进入 Design System 与真实原型验证。

### 16.4 Journal Density

Journal 可以比 Board 有更高的图文密度和个人表达比例，但不应改变一级导航和系统控件的基本可预测性。

---

## 17. 检索与分类边界

产品方向为“分类弱、检索强”，但当前检索界面尚未完整定义。

### 17.1 已确认

- AI Keywords 是工作与未来检索的语义基础；
- Capture 时不要求分类；
- 系统不根据关键词自动建立 Folder / Project；
- Journal Book 可以承载用户主动的主题分类。

### 17.2 `OPEN`

- Search 是全局入口还是 Board 内入口；
- 搜索结果以 Image、Day、Keyword 还是混合结果组织；
- Search 是否跨 Board 与 Journal；
- 搜索结果进入原 Day 时如何恢复空间上下文；
- Journal 是否支持按 Source Day、Book 或 Keyword 过滤素材。

在这些问题定案前，不应为了“检索强”提前建立传统资源管理侧边栏。

---

## 18. 明确排除的信息架构模式

- 以 Project / Folder 创建作为 Capture 前置；
- 默认进入 Journal 或要求每天完成 Journal；
- Board → Journal 的强制线性漏斗；
- 单列瀑布流、固定网格或自动 Day Stack 作为 Day 本体；
- Week / Month 拥有自己的可回写图片布局；
- 系统根据 AI 自动建立主题 Folder；
- 多区域标题、复杂文档大纲或任务管理层；
- 常驻左侧大型导航栏挤压 Canvas；
- 空状态以任务、完成度或推荐内容占据中心；
- Quick Note 被定义为独立漂浮 Sticky Note；
- Journal 编辑反向改变 Source Day；
- 删除 Journal Instance 等同删除 Capture；
- 为尚未确认的同步、协作、账号和多设备能力提前增加导航。
- 为 Inspiration Board 再放置一个无必要的 Home / Board Icon；
- 把 Day / Weekly / Monthly 塞入左侧 Global Action Bar；
- 在操作栏中加入中英文切换；
- 把 Theme、Journal、Download / Share、Trash 在 More 内重复一遍；
- 把字体脚本映射暴露成用户必须手动处理的语言选择。

---

## 19. 当前开放决策

以下问题需要用户基于真实原型继续拍板：

### 19.1 Board

- More Menu 五个建议分组中，哪些进入第一个版本；
- Journal Gateway 的素材范围、目标 Book 与添加后去向；
- Theme 是全局、每 Day 独立，还是继承后可覆盖；
- Download Current Page 的边界、格式与内容层选择；
- Share 在本地优先产品中的真实实现方式；
- 自定义 Title 是否进入主体首版；
- Dense / Zoomed-out 时 Keyword、Quick Note、Lock Token 的显隐阈值；
- Search 的一级入口和结果结构；
- Trash 的全局／按 Day 组织方式；
- Preferences 的最小信息分组；
- Canvas Context Menu 的精确命令清单。

### 19.2 Journal

- Cabinet Landing 的陈列模型；
- Journal Book 的身份字段与排序；
- Book 内是单 Canvas、固定 Page、多页文档还是混合模型；
- Board 中选择 Day / Image 进入 Journal 的入口位置；
- Material Inbox 的筛选、去重与已使用状态；
- Quick Note 与 Keyword 如何作为选材线索进入 Journal；
- Source Traceback 的呈现；
- Export 格式、尺寸、范围和历史。

这些问题会改变真实 IA，必须在绘制最终架构图前逐项确认或保持显式 `OPEN`。

---

## 20. IA 验证场景

### Scenario A — First Entry

用户不阅读说明即可辨认当前日期、画布和基本时间入口，并可以立即拖入或粘贴图片。首屏不存在必须完成的分类或创建步骤。

### Scenario B — Existing Day

用户返回应用后能认出上次 Day、Camera、图片空间关系和附着信息。系统控件不会覆盖主要素材。

### Scenario C — Image Attention

默认只显示 Image 与 `First Keyword +N`；点击后看到完整关键词及逐词 Copy。Quick Note 默认与图片等宽并最多显示三行，展开后按完整段落自然增高。

### Scenario D — Temporal Browse

用户通过 Week / Month 看见 Day 的时间压缩，再进入原始 Day。投影没有改动原 Canvas。

### Scenario E — Optional Journal

用户可以长期只使用 Board。只有主动进入 Journal Cabinet 后，才选择／创建 Book 和引用一个或多个 Day 的素材。

### Scenario F — Source Safety

同一 Image 被两个 Journal 引用，在两个 Journal 中拥有不同裁切与位置；原 Day 的图片、Note 和 Geometry 均保持不变。

### Scenario G — Board Global Actions

用户能够在不寻找 Board Home 的情况下，直接通过左侧操作栏进入 More、Journal Gateway、Theme、Download / Share 与 Trash；时间切换保持在右上独立区域。

### Scenario H — Bilingual Typography Mapping

用户键入英文或中文标题／Quick Note 时，系统自动采用对应字体映射；界面中不存在必须手动切换中英文的控件。

---

## 21. IA 验收清单

### 21.1 Product Level

- [ ] Inspiration Board 是明确默认主体。
- [ ] Journal 是主动进入的 Pro 第二主体，而非强制下一步。
- [ ] Board 与 Journal 共享视觉世界，但拥有分离的信息所有权。
- [ ] P0、P1、PRO 与 OPEN 能被实现者明确区分。

### 21.2 Board

- [ ] Day 是唯一可编辑的 Capture 原始空间。
- [ ] Date 始终可见。
- [ ] 空 Day 是正常 Canvas，没有任务化空状态。
- [ ] Image 是 P0 的主内容对象。
- [ ] Inspiration Board 不重复出现 Home / Board Icon。
- [ ] 左侧 Action Bar 顺序为 More、Journal、Theme、Download / Share、Trash。
- [ ] Previous / Today / Next 与 View Mode 位于独立时间控制区。
- [ ] 自定义标题出现后，日期／范围降级但不消失。
- [ ] 折叠关键词显示首词与准确的剩余数量 `+N`。
- [ ] 展开关键词后，每个词拥有独立 Copy 入口。
- [ ] 同时最多一个 Keyword Group 展开；激活新组或点击 Canvas 空白时旧组折叠。
- [ ] Quick Note 与图片等宽，Compact 最多三行。
- [ ] Keyword 与 Quick Note 绑定 Image，不改变其 Geometry。
- [ ] 次级管理控件不长期占据画布。
- [ ] Week / Month 只读投影不回写 Day。
- [ ] 产品不提供中英文切换按钮；字体脚本映射自动完成。

### 21.3 Journal

- [ ] Cabinet、Book、Material Inbox、Journal Canvas、Export 的层级明确。
- [ ] Book 是 Journal 内的主题组织单位，不成为 Capture 前置分类。
- [ ] Material Inbox 保存引用，不移动原素材。
- [ ] Journal Instance 与 Source Image 分离。
- [ ] Journal 删除、裁切、缩放和编排不修改 Source。

### 21.4 Progressive Disclosure

- [ ] 首屏只保留工作所需信息。
- [ ] 对象操作在关注对象后出现。
- [ ] 同时展开的信息量在 Dense Board 中仍可管理。
- [ ] 普通错误尽量归属到对象或局部区域。
- [ ] 管理能力可发现，但不变成常驻工具墙。

---

## 22. 后续架构图交付接口

当本文件经用户审阅并完成关键修订后，以同一份节点与关系源生成以下四种格式：

- `InformationArchitecture.mmd` — Mermaid 源文件；
- `InformationArchitecture.dot` — Graphviz DOT 源文件；
- `InformationArchitecture.svg` — 可缩放矢量图；
- `InformationArchitecture.png` — 便于预览与分享的位图。

架构图至少需要表达：

1. Product → Default Board / Deferred Journal / Shared System 的一级关系；
2. Board → Day / Week / Month 的时间层级；
3. Day Canvas 的信息层、左侧 Global Action Bar 与右上 Temporal Controls；
4. Journal → Cabinet / Book / Inbox / Canvas / Export 的层级；
5. Board Source → Journal Reference → Journal Instance 的单向关系；
6. `P0 / P1 / PRO / OPEN` 状态图例。

图文件不得引入本 Markdown 未确认的新页面或新关系。若四种图的节点命名不一致，应以本 Markdown 的术语为准并重新生成。

---

## 23. Cross-document Sync Status

本版 IA 已吸收新页面设计；核心文档已在本轮按 PRD 最高权威原则同步。下表记录同步结果，后续不得恢复旧规则。

| 变更 | IA 定案 | 已同步文档 |
| --- | --- | --- |
| Board Chrome | 左侧 Action Bar + 右上 Temporal Controls | PRD v2.1、InteractionFlow v2.1、DevelopmentSpecs v2.1、Architecture v2.1 |
| Custom Title | 已进入真实主体页面，为 `P0` | PRD v2.1、InteractionFlow v2.1、DevelopmentSpecs v2.1、Architecture v2.1 |
| Keyword Folded State | `First Keyword +N` | PRD、InteractionFlow、DevelopmentSpecs |
| Keyword Expand Trigger | Click 展开 | InteractionFlow、DevelopmentSpecs |
| Expanded Group Exclusivity | 同时最多一个；激活新组或点击 Canvas 空白时折叠旧组 | DevelopmentSpecs |
| Keyword Copy | 展开后每个词显示 Copy Icon | InteractionFlow、DevelopmentSpecs |
| Quick Note Compact | 中文／英文均最多三行 | PRD、InteractionFlow、DevelopmentSpecs |
| Quick Note Surface | 横线纸 PNG、与 Image 等宽、展开后自然增高 | DevelopmentSpecs、DesignSystemRules |
| Theme | Moon Icon 打开 Background Surface Picker | PRD、InteractionFlow、DevelopmentSpecs |
| Journal Entry | Gateway：Add Selected / Add Current Day / Open Journal | PRD、InteractionFlow |
| Download / Share | Board 当前页面的输出入口 | PRD、InteractionFlow、Architecture |
| Language Control | 删除中英文切换 UI；System Voice 与 Personal Voice 均按脚本自动映射；AI Keyword P0 固定 `en-US` | SystemPrompt v2.2、DevelopmentSpecs v2.1；DesignSystemRules 继承已锁定字体映射 |

同步时应以本版已确认的新界面意图为依据，但不得顺势提前开发 Journal 主体。

---

## 24. Version Notes

### v0.4

- 将 PRD v2.1 设为最高产品事实；
- 记录核心文档已完成同步，不再保留“待实现者选择”的冲突；
- P0 Background Surface 所有权暂定为 Workspace Preference；
- 锁定 System Voice：Segoe UI / PingFang SC；
- 锁定 Personal Voice：Chenyuluoyan 用于英文非系统文字，momozhuanji 用于中文非系统文字；
- AI Keyword P0 固定 `en-US`，无语言切换 UI。

### v0.3

- 确认同一时间最多一个 Expanded Keyword Group；
- 点击另一组 `First Keyword +N` 时，上一组自动折叠；
- 点击 Canvas 空白时，当前组自动折叠；
- Copy Keyword 后当前组保持展开；
- 不增加 Keyword Group Close Button，继续沿用低复杂度的单一 Active Group 规则。

### v0.2

- 根据三张真实 Board 页面将原 `Global Workspace Level` 改写为 Board Global Action Bar；
- 明确 Inspiration Board 是默认主体，不在操作栏中重复出现 Board Icon；
- 锁定操作栏顺序：More、Journal、Theme、Download / Share、Trash；
- 将 More 拆为 Workspace、Canvas Display、Preferences、Data & Privacy、Help & About 候选分组；
- 将 Journal Icon 定义为 Add Selected / Add Current Day / Open Journal 的 Gateway；
- 将 Moon Icon 定义为 Background Surface Picker，并纳入用户自定义底板；
- 将 Download 定义为 Board 当前页面的 Download & Share 入口；
- 明确右上 Previous / Today / Next 与 Day / Weekly / Monthly 两层时间控制；
- 建立默认时间标题与自定义标题出现后的降级日期结构；
- 明确中文／英文字体自动映射，删除产品级中英文切换；
- 将 Keyword Folded State 细化为 `First Keyword +N`，Expanded State 提供逐词 Copy；
- 将 Quick Note 细化为横线纸、与图片等宽、Compact 三行、Expanded 自然增高；
- 区分 Image Context Menu 与 Canvas Context Menu，并将 Pointer Cursor 排除为持久 IA 节点；
- 保留 Journal 主体内部结构为 Pro / Deferred，不提前虚构其页面模型。

### v0.1

- 明确 IA 与 `InteractionFlow.md` 的职责边界；
- 确立 Inspiration Board 为默认一级空间、Journal Cabinet 为主动进入的 Pro 第二空间；
- 建立 Day Canvas 的 L0–L6 信息层；
- 整理 P0 Board 组件与渐进披露关系；
- 确立 Day 为本体、Week / Month 为只读时间投影；
- 建立 Cabinet → Book → Material Inbox → Journal Canvas → Export 的 Pro 层级；
- 锁定 Board Source → Journal Reference → Journal Instance 的单向引用与 Source Immutability；
- 建立共享／分离矩阵、信息对象目录、密度规则、排除模式和开放决策；
- 预留 MMD、DOT、SVG、PNG 四类 IA 架构图的统一生成接口。

---

# End of InformationArchitecture.md v0.4
