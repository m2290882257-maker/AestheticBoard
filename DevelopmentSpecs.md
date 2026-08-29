# DevelopmentSpecs.md v2.1 — Implementation Contract

> **Document Status**：P0 Engineering Baseline v2.1  
> **Product Source of Truth**：`PRD.md v2.1 — Capture-first Temporal Spatial Inspiration Board.md`  
> **Architecture Source of Truth**：`Architecture.md v2.1 — Capture-first Temporal Spatial Inspiration Board.md`  
> **Interaction Source of Truth**：`InteractionFlow.md v2.1 — Capture-first Temporal Spatial Inspiration Board.md`  
> **AI Contract Source of Truth**：`SystemPrompt.md v2.2 — Visual Keyword Parsing Contract`  
> **Interface Structure Inputs**：`InformationArchitecture.md v0.4` + `ReferenceMapping.md v0.2`  
> **P0 Platform**：Windows 11 + Chrome / Edge + Electron Desktop App  
> **Deferred Platform**：macOS  
> **Primary Engineering Goal**：先把 Browser Drag / Paste、原图本地化、空间关系与自动保存做成可靠内核，再扩展时间视图与 Journal。

---

# 0. Document Governance

## 0.1 文档职责

本文件负责把上游四份文档转化为可执行的工程规范，包括：

- P0 技术栈与依赖边界；
- Repository、Module 与文件组织；
- Main / Preload / Renderer / Worker 的代码责任；
- TypeScript、命名、错误与文件规模规范；
- IPC、Domain Model、Mutation 与 Durable ACK 契约；
- Pinterest / Browser Drag 和 Clipboard Paste 的实现细节；
- Local Profile、SQLite、媒体文件与 Migration 的落地规则；
- World Coordinate、Camera、Scene Store 与 Overlay 的实现算法；
- Auto-save、Close Guard 和 Crash Recovery 的代码路径；
- AI Gateway、Prompt Version、固定 P0 Output Locale 与 Schema Validation；
- Security、Performance、Testing、Build 与 Definition of Done。

本文件不负责：

- 修改 PRD 的 Requirement ID 或优先级；
- 重新选择 Desktop Framework；
- 将 macOS、Week、Month、Trash 或 Journal 提前为 P0；
- 决定尚未确认的最终视觉风格；
- 改写 `SystemPrompt.md` 中的 Prompt 内容与 AI 权限边界；
- 以实现便利为由削弱 Capture Reliability 或 Data Safety。

## 0.2 Source Priority

`PRD.md` 是最高产品事实。其余文件不组成脱离任务语境的固定线性阅读顺序：实现页面结构时先读 IA 与 Reference Mapping，实现交互时先读 Interaction Flow，实现持久化与进程边界时先读 Architecture，实现 AI 时先读 System Prompt；最终都必须回到本文件的工程约束。任何低层文件不得覆盖更新后的 PRD。

若本文件中的实现无法满足上游文档，必须回到相应上游文件做显式变更，不得在代码中静默改变产品。

## 0.3 Normative Language

| 词语 | 含义 |
| --- | --- |
| MUST / 必须 | P0 合规所必需 |
| MUST NOT / 禁止 | 违反即不合规 |
| SHOULD / 应 | 默认采用；偏离需要记录理由 |
| MAY / 可以 | 可选实现，不构成产品事实 |
| DEFERRED | 已识别但不进入 P0 |

## 0.4 Requirement Traceability

| 工程领域 | 主要来源 |
| --- | --- |
| Desktop / Window | `ADR-001 ~ ADR-003`、`WIN-*`、InteractionFlow §5 |
| Capture | `CAP-001 ~ CAP-007`、Architecture §6–§7、InteractionFlow §6–§8 |
| Media | `ADR-005 / ADR-006`、Architecture §8 |
| Persistence | `SAVE-*`、`ADR-008`、Architecture §9 / §11、InteractionFlow §17 |
| Canvas | `DAY-*`、`CAN-*`、`OBJ-*`、`LAY-*`、`LCK-*`、Architecture §10 |
| AI | `AI-*`、`TAG-*`、`ADR-009 / ADR-010`、SystemPrompt v2.2 |
| Failure | `FDBK-*`、Architecture §15、InteractionFlow §18 |
| Test / Delivery | Architecture §17 / §18、InteractionFlow §21 / §23 |

---

# 1. Legacy DevelopmentSpecs Reconciliation

旧版规范基于 Chrome Extension Side Panel 和 WeeklyBoard。本次不做增量修补，而是重新建立 Electron P0 工程基线。

## 1.1 Retained

| 旧版原则 | v2.0 处理 |
| --- | --- |
| TypeScript 与明确命名 | 保留并加强为 strict contract |
| 功能内聚目录 | 保留，改为 Domain + Process Boundary |
| 高频输入不逐事件落盘 | 保留，改为 Revision Queue + Coalescing + End Flush |
| 语义化视觉 Token | 保留，不再预设琥珀色或手账风 |
| UI、业务逻辑与外部 I/O 分离 | 保留，升级为 Electron 多进程边界 |
| 文件规模需要受控 | 保留，改为可审查阈值而非机械拆分 |

## 1.2 Modified

| 旧版定义 | v2.0 定义 |
| --- | --- |
| React 页面拥有全部状态 | Renderer Scene Store 只拥有最新交互状态；SQLite 拥有 Durable State |
| `onDragEnd` 直接写数据库 | Renderer 发送 Typed Mutation；Persistence Worker 单写入并 ACK |
| Framer Motion 负责拖拽 | Pointer Event + World Geometry 负责核心交互；动效库不得拥有领域坐标 |
| 图片卡片 DOM 列表 | 可视区域 Scene Projection + Viewport Cull |
| 标签 Skeleton 占据卡片 | Keyword-local Overlay，不改变 Image Bounding Box |
| 随前端库确定视觉风格 | CSS Token 承载视觉；最终风格继续服从 UI Specs |

## 1.3 Removed

以下实现不得继承：

- Chrome Extension / Manifest V3；
- Side Panel API；
- WeeklyBoard、WeeklyCanvas 与 `weekId`；
- IndexedDB 与 localforage；
- 原图禁止落盘；
- 强制 WebP、1080 px、500 KB；
- Base64 图片长期存入数据库；
- Renderer 直连 AI Provider；
- Renderer 保存 Provider Key；
- BYOK 作为 P0；
- `sanitizeJSON()` 截取自由文本；
- `tags: string[]` 旧返回结构；
- 强制 Polaroid、胶带、图钉、随机旋转；
- 独立 StickyNote Canvas Object；
- 点击对象自动置顶；
- Drag-out-to-delete；
- 全局 AI Loading 或阻断式导入 Dialog。

## 1.4 Added

v2.0 新增：

- Electron Main / Preload / Renderer / Workers 代码隔离；
- Windows Workspace Restore 与 Always-on-top 校正；
- DataTransfer 多候选 Harness；
- Original / Working / Thumbnail / Cache / Staging 分层；
- SQLite WAL、Migration、Integrity Check 与单写入者；
- World / Viewport / Screen 三坐标空间；
- Typed Mutation、Entity Revision、Local Revision 与 Durable ACK；
- AI Gateway、Output Locale 与严格 Schema；
- Prompt Injection、防 SSRF 与本地媒体协议；
- Crash / Staging / Queue Recovery；
- Gate 0、性能基线与数据安全测试。

---

# 2. P0 Technology Baseline

## 2.1 Accepted Stack

| Layer | P0 Baseline | 约束 |
| --- | --- | --- |
| Desktop Shell | Electron | 使用受支持的稳定 Major；版本由 Lockfile 固定 |
| Language | TypeScript | 全仓 strict；不得以 `any` 穿透进程边界 |
| Renderer | React + Vite | React 负责视图组合，不拥有文件系统或 SQLite |
| Scene State | Framework-independent external store | 通过 `useSyncExternalStore` 或等价适配接入 React |
| Styling | CSS Custom Properties + CSS Modules | 可引入工具类，但 Domain 不得依赖 CSS 框架 |
| Runtime Validation | Zod 或等价 JSON Schema Validator | 所有 IPC、AI 和 Profile Manifest 边界必须验证 |
| Metadata DB | SQLite | WAL、Foreign Keys、单 Persistence Worker 写入 |
| SQLite Driver | `better-sqlite3` behind adapter | 只在 Worker 使用；Native Module 必须随 Electron 重建 |
| Media Processing | `sharp` behind adapter | 只在 Media Worker 使用；Original 永不被覆盖 |
| Unit / Contract Test | Vitest | 与纯 Domain Module 同进程快速运行 |
| E2E | Playwright Electron + Windows manual harness | Browser-to-Desktop Drag 仍需真实 Chrome / Edge Matrix |
| Package Manager | 单一 Lockfile | CI 使用 frozen install；不得混用多个 Lockfile |

## 2.2 Version Policy

- 不在本文件写死易过期的包版本号；
- `package.json` 与 Lockfile 是具体版本事实源；
- Electron Major 升级必须跑完整 Security、Drag、Native Module、Migration 与 E2E Matrix；
- Native Dependencies 必须针对当前 Electron ABI 构建；
- CI 与 Release Build 使用相同 Node、Package Manager 和 Lockfile；
- 禁止使用 `latest` 作为可重复构建版本；
- 每次 Dependency Upgrade 单独提交，不与领域功能混杂。

## 2.3 Dependency Admission Rule

新增 Runtime Dependency 前必须回答：

1. 它属于哪个进程？
2. 它是否会进入 Renderer Bundle？
3. 它是否需要 Node / Native 权限？
4. 它是否重复已有能力？
5. 它是否改变 Domain Model 或持久化格式？
6. 它的许可证、维护状态与安全更新路径是否可接受？
7. 移除它时数据能否保持可读？

核心拖拽、坐标、Revision 与 Schema 逻辑优先使用可测试的项目代码，不交给大型黑箱白板框架。

## 2.4 Explicit Non-baseline Libraries

- Framer Motion 不负责 Move、Resize、Pan、Zoom 或 z-order；
- shadcn/ui 不作为全局视觉系统，可按需用于无领域状态的基础控件；
- Tailwind CSS 不是产品事实；若采用，只能消费同一组 Semantic Tokens；
- 不引入第三方白板 Document Model；
- 不引入 Redux 仅为解决局部 Scene State；
- 不引入 ORM 隐藏 Migration 与 Transaction Boundary；
- 不为 P0 引入云同步 SDK、账号 SDK、向量数据库或 Analytics Replay。

---

# 3. Repository Structure

## 3.1 Canonical Layout

```text
root/
├─ docs/
│  ├─ PRD.md
│  ├─ Architecture.md
│  ├─ InteractionFlow.md
│  ├─ SystemPrompt.md
│  └─ DevelopmentSpecs.md
├─ src/
│  ├─ main/
│  │  ├─ app/
│  │  ├─ window/
│  │  ├─ ipc/
│  │  ├─ protocol/
│  │  ├─ workers/
│  │  └─ security/
│  ├─ preload/
│  │  ├─ bridge.ts
│  │  └─ contracts.ts
│  ├─ renderer/
│  │  ├─ app/
│  │  ├─ scene/
│  │  ├─ capture/
│  │  ├─ image-object/
│  │  ├─ keyword/
│  │  ├─ quick-note/
│  │  ├─ time/
│  │  ├─ workspace/
│  │  ├─ feedback/
│  │  └─ styles/
│  ├─ workers/
│  │  ├─ persistence/
│  │  ├─ media/
│  │  └─ ai/
│  ├─ domain/
│  │  ├─ canvas/
│  │  ├─ capture/
│  │  ├─ media/
│  │  ├─ persistence/
│  │  ├─ ai/
│  │  └─ workspace/
│  └─ shared/
│     ├─ contracts/
│     ├─ errors/
│     ├─ ids/
│     ├─ time/
│     └─ validation/
├─ migrations/
├─ prompts/
│  └─ visual-keywords-v2.2.0.txt
├─ tests/
│  ├─ unit/
│  ├─ property/
│  ├─ contract/
│  ├─ integration/
│  ├─ e2e/
│  ├─ performance/
│  └─ fixtures/
├─ scripts/
├─ package.json
├─ tsconfig.json
└─ lockfile
```

实际 Lockfile 名称由所选 Package Manager 决定；仓库只能保留一种。

## 3.2 Dependency Direction

```text
renderer / main / workers
        ↓
application adapters
        ↓
domain + shared contracts
```

规则：

- `domain/` 不导入 Electron、React、SQLite、Sharp 或网络库；
- `renderer/` 不导入 `main/`、`workers/` 或 Node 内置模块；
- `preload/` 只导入共享 Contract 与 Electron Bridge 所需最小 API；
- Worker 不能导入 Renderer Component；
- Main 不包含图片处理算法或大批量同步 SQL；
- Shared Contract 不引用某个 UI Library 类型；
- Prompt Text 的 canonical source 与 Prompt Version 必须可在 Build 时校验一致。

## 3.3 Feature Boundary

每个 Renderer Feature 可以包含：

```text
feature/
├─ components/
├─ state/
├─ commands/
├─ selectors/
├─ contracts/
└─ __tests__/
```

禁止按 `components/`, `hooks/`, `utils/` 建立无限增长的全局垃圾目录。真正跨领域的代码才进入 `shared/`。

---

# 4. Code Style, Naming & File Limits

## 4.1 TypeScript Baseline

必须启用：

- `strict`；
- `noUncheckedIndexedAccess`；
- `exactOptionalPropertyTypes`；
- `noImplicitOverride`；
- `useUnknownInCatchVariables`；
- `noFallthroughCasesInSwitch`；
- ESM 一致性检查。

规则：

- 外部输入类型一律从 `unknown` 开始验证；
- 禁止跨 IPC 使用 class instance、Error instance、Date、BigInt 或 Electron Object；
- 时间跨边界使用 UTC ISO-8601 string；
- z-rank 跨 IPC 使用十进制 string，进入 Domain 后再转 `bigint`；
- `any` 只允许在隔离的第三方 Adapter 内，并须立刻收敛为已验证类型；
- 不使用非空断言掩盖生命周期问题；
- Exhaustive Switch 必须通过 `never` 检查。

## 4.2 Naming

| 类型 | 规则 | 示例 |
| --- | --- | --- |
| React Component | PascalCase | `ImageObjectView.tsx` |
| Hook | `use` + camelCase | `useCanvasPointer.ts` |
| Domain Type | PascalCase，无 `I` 前缀 | `CaptureIntent` |
| Command | 动词 + 名词 | `moveImageObject` |
| Event | 过去式 | `MediaLocalized` |
| IPC Channel | `domain:version:action` | `capture:v1:submitIntent` |
| DB Table / Column | snake_case | `image_object`, `world_x` |
| Error Code | UPPER_SNAKE_CASE | `CAPTURE_NO_CANDIDATE` |
| Test | 行为句 | `keeps world point under pointer` |

产品代码中使用现行领域名：

- `DayCanvas`，不用 `WeeklyBoard`；
- `ImageObject`，不用 `PolaroidCard`；
- `ImageKeyword`，不用 `VibeTag`；
- `QuickNote`，不用独立 `StickyNote`；
- `worldX / worldY`，不用含义不明的 `left / top`。

## 4.3 File Size Guidance

文件规模用于触发审查，不用于机械拆分：

| 文件类型 | 目标 | Review Threshold |
| --- | ---: | ---: |
| React Component | ≤ 220 LOC | 320 LOC |
| Domain / Application Module | ≤ 280 LOC | 420 LOC |
| Worker Handler | ≤ 250 LOC | 380 LOC |
| Test File | ≤ 450 LOC | 650 LOC |
| Schema / Migration / Generated | 按语义完整 | 不适用 |

超过 Review Threshold 时必须说明：

- 是否存在多个变化原因；
- 是否混合 I/O 与纯逻辑；
- 是否能按 Domain Responsibility 拆分；
- 拆分是否反而破坏 Transaction 或 State Machine 可读性。

函数默认目标 ≤ 60 LOC。Transaction、State Machine Reducer 与 Protocol Parser 可超过，但必须有直接测试。

## 4.4 Comments & Documentation

注释解释：

- 不变量；
- 安全边界；
- 为什么不能采用更直观的实现；
- 与 Requirement / ADR 的对应关系。

注释不得复述代码。临时 `TODO` 必须包含 Issue / Decision ID 或明确退出条件。

---

# 5. Runtime Process Rules

## 5.1 Renderer

Renderer 可以：

- 同步读取 Drop / Paste Event 的浏览器数据；
- 计算 Viewport → World；
- 维护 Scene Store 与 Interaction State；
- 乐观更新 Move、Resize、Note、Pin 与 Camera；
- 请求 Narrow Bridge API；
- 根据 Durable ACK 显示 Save State。

Renderer 禁止：

- `fs`、`path`、`child_process`、任意 Node API；
- 直接打开 SQLite；
- 直接 Fetch 任意图片 URL；
- 直接调用 AI Provider；
- 读取绝对本地路径；
- 执行拖入 HTML；
- 把原始 Provider Response 注入 DOM；
- 在未 ACK 时显示 Saved。

## 5.2 Preload

Preload：

- 只暴露版本化的 `DesktopBridgeV1`；
- 每个方法内部固定 IPC Channel；
- 所有入参与返回值均做 Runtime Validation；
- 不暴露 `ipcRenderer`、EventEmitter、Electron Object 或通用 `invoke`；
- 订阅函数必须返回 unsubscribe；
- Renderer 提供的 Callback 不得被永久持有。

## 5.3 Main

Main 负责：

- Single Instance；
- BrowserWindow；
- Always-on-top；
- Display / Bounds 恢复；
- Close Ownership；
- IPC Authorization；
- `app-media://`；
- Worker Lifecycle；
- AI Gateway Network Policy。

Main 禁止在 UI Thread：

- 同步解码大图；
- 生成 Thumbnail；
- 执行长事务或全库扫描；
- 等待 AI 才响应 Window；
- 读取远程页面并注入 Renderer。

## 5.4 Workers

- Persistence Worker 是 SQLite 唯一写入者；
- Media Worker 是媒体 Staging、Hash、验证与 Derivative 的所有者；
- AI Worker 是 Queue、Prompt Registry、Gateway 与 AI Schema Validation 的所有者；
- Worker Message 必须携带 `requestId` / `jobId` 与可序列化 Payload；
- Worker 崩溃由 Main 重启；
- 幂等 Job 可重放；
- Renderer 不感知 `worker_threads` 或未来 `utilityProcess` 的差异。

---

# 6. Shared Contracts & IPC

## 6.1 Bridge Surface

```ts
interface DesktopBridgeV1 {
  workspace: {
    getState(): Promise<Result<WorkspaceStateDto>>
    setAlwaysOnTop(value: boolean): Promise<Result<{ effective: boolean }>>
    onAlwaysOnTopChanged(listener: (value: boolean) => void): Unsubscribe
    requestCloseState(): Promise<Result<CloseStateDto>>
  }
  capture: {
    submitIntent(intent: CaptureIntentDto): Promise<Result<CaptureAcceptedDto>>
    onCaptureChanged(listener: (event: CaptureEventDto) => void): Unsubscribe
  }
  persistence: {
    loadDay(dayId: string): Promise<Result<DaySceneSnapshotDto>>
    submitMutations(batch: MutationBatchDto): Promise<Result<DurableAckDto>>
    flush(targetLocalRevision: number): Promise<Result<DurableAckDto>>
    onSaveStatus(listener: (status: SaveStatusDto) => void): Unsubscribe
  }
  media: {
    getUrl(assetId: string, variant: MediaVariant): Promise<Result<string>>
  }
  ai: {
    retry(imageObjectId: string): Promise<Result<AiJobDto>>
    onJobChanged(listener: (job: AiJobDto) => void): Unsubscribe
  }
}
```

`Result<T>` 必须是可序列化判别联合：

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppErrorDto }
```

## 6.2 IPC Rules

- Channel 使用固定 Allowlist；
- Main 验证 Sender WebContents 属于主窗口；
- Payload 大小有上限；
- 图片 Byte 不通过 JSON IPC 反复复制；优先使用受控临时 Handle / Transferable / Worker Message；
- 绝对路径不发给 Renderer；
- Stack Trace 不发给 Renderer；
- 未知字段默认拒绝；
- 请求响应必须有关联 ID；
- 取消订阅必须可测试；
- API 破坏性变化需要 `DesktopBridgeV2`，不得静默改变 V1。

## 6.3 Error DTO

```ts
interface AppErrorDto {
  code: string
  scope: 'capture' | 'media' | 'persistence' | 'ai' | 'workspace' | 'fatal'
  retryable: boolean
  userMessageKey: string
  entityId?: string
  correlationId: string
}
```

Renderer 根据 `userMessageKey` 显示文案，不展示原始 Exception、SQL、URL Query 或本地路径。

---

# 7. Domain Model

## 7.1 Core Entities

```ts
type DayId = string
type ImageObjectId = string
type MediaAssetId = string
type CaptureJobId = string
type AiJobId = string

interface DayCanvas {
  id: DayId
  boardDate: string
  title: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

interface ImageObject {
  id: ImageObjectId
  dayCanvasId: DayId
  mediaAssetId: MediaAssetId | null
  captureJobId: CaptureJobId
  capturedAtUtc: string
  sourceType: 'browser-drag' | 'clipboard-paste'
  geometry: ImageGeometry
  quickNote: string | null
  lifecycleState: ImageLifecycleState
  revision: number
}

interface ImageGeometry {
  x: number
  y: number
  width: number
  height: number
  zRank: bigint
  locked: boolean
}
```

## 7.2 State Separation

必须区分：

| State | 示例 | 持久化 |
| --- | --- | ---: |
| Document | Geometry、Lock、Note、Pin、Day | 是 |
| Session | Camera、Active Day、Window Bounds、Always-on-top | 是，但与 Document 分表 |
| Interaction | Selection、Pointer Capture、Active Overlay | 否 |
| Derived | Working、Thumbnail、AI Keywords | 是或可重建 |
| Ephemeral | Hover、Toast、Animation | 否 |

Selection、Hover、Expanded Keyword Group 不得写入 SQLite。

## 7.3 Image and AI Axes

Image Lifecycle 与 AI Lifecycle 是独立状态轴：

```ts
type ImageLifecycleState =
  | 'received'
  | 'resolving'
  | 'localizing'
  | 'durable'
  | 'deriving'
  | 'ready'
  | 'failed'

type AiJobState =
  | 'queued'
  | 'uploading'
  | 'running'
  | 'succeeded'
  | 'retry-wait'
  | 'failed'
```

禁止用一个 `loading` Boolean 表示整个对象状态。

---

# 8. Scene Store & Rendering

## 8.1 Scene Store Responsibilities

Scene Store 必须提供：

- Normalized Entity Maps；
- Active Day Snapshot；
- Camera；
- Interaction State Machine；
- Local / Queued / Durable Revision；
- Command → Mutation 生成；
- Selector-based Subscription；
- Worker Event Reconciliation。

React Component 不得直接拼装 SQL Payload 或修改 Worker State。

## 8.2 Render Projection

P0 使用 DOM Scene Renderer：

- Scene Root 只应用统一 Camera Transform；
- Image 节点使用 World Geometry；
- Selection Handle、Keyword 与 Quick Note 使用 Overlay Projection；
- Expanded Overlay 可溢出 Image，但不影响布局测量；
- Overlay 层不得改变 Domain zRank；
- 交互临时抬高使用独立 Interaction Layer；
- 只挂载 Viewport 及安全边距内对象；
- 先显示 Thumbnail / Working，不批量解码 Original。

## 8.3 React Performance Rules

- Pointer Move 不通过顶层 React State 触发全树重渲染；
- 高频 Geometry 写入 Store，并使用细粒度 Selector；
- 同一 Frame 最多一次视觉提交；
- `requestAnimationFrame` 用于渲染节拍，不用于 Durable 判定；
- 不以数组索引作为 Entity Key；
- Keyword / Note 编辑不得重建 Image Bitmap；
- 不为不可见对象保留重型 Observer；
- React Strict Mode 下不得产生重复 Capture 或 Mutation。

---

# 9. Coordinate & Interaction Algorithms

## 9.1 Coordinate Functions

必须以纯函数实现并做 Property Test：

```ts
interface Point { x: number; y: number }
interface CameraState { x: number; y: number; zoom: number }

function viewportToWorld(
  point: Point,
  camera: CameraState,
  viewport: { width: number; height: number }
): Point

function worldToViewport(
  point: Point,
  camera: CameraState,
  viewport: { width: number; height: number }
): Point
```

禁止从 CSS Transform Matrix 反推并保存 Geometry。

## 9.2 Zoom

P0 建议参数：

```text
minZoom = 0.10
maxZoom = 8.00
wheelSensitivity = 0.0015
newZoom = clamp(oldZoom × exp(-deltaY × wheelSensitivity))
```

这些参数可通过 UX 测试调整，但必须保持：

- Pointer 下 World Point 不变；
- Zoom 不修改任何对象 Geometry；
- Wheel Event 在 Canvas 内阻止页面滚动；
- 连续 Wheel 合并 Camera Mutation；
- Interaction Settle 后立即 Flush。

## 9.3 Pan

- Middle Button 拥有最高 Pointer Intent；
- 即使起点在 Image 上，也执行 Pan；
- Pan 只修改 Camera；
- Space + Drag 可以后加，不能替代 Middle Pan；
- Pointer Cancel 时释放 Capture，不产生重复 End Mutation。

## 9.4 Move Threshold

P0 初始阈值：

```text
moveThresholdViewportPx = 4
```

行为：

- 未越过阈值：Click / Select；
- 越过阈值：进入 Moving，临时抬高；
- Pointer Up：Geometry + 新最高 zRank 同一 Mutation；
- Click 本身绝不写 zRank；
- Locked Object 的 Geometry Intent 在 Command Layer 拒绝。

## 9.5 Resize

- 仅 Selected + Unlocked Image 显示可执行 Corner Handles；
- 默认保持原始宽高比；
- Handle 命中区使用 Viewport px，不随 Zoom 缩到不可用；
- 最小视觉边长建议 48 viewport px；
- Resize 期间内存更新，最长约 500 ms Checkpoint；
- Pointer Up 立即 Flush；
- Note / Keyword 只重新投影锚点，不参与 Bounding Box。

## 9.6 Comfortable Initial Size

初始尺寸以当前 Viewport 的视觉尺寸计算，再除以 Zoom 转成 World Size：

```ts
const maxViewportWidth = clamp(viewport.width * 0.42, 320, 720)
const maxViewportHeight = clamp(viewport.height * 0.58, 280, 720)

const downscale = Math.min(
  1,
  maxViewportWidth / pixelWidth,
  maxViewportHeight / pixelHeight,
)

const viewportWidth = Math.max(pixelWidth * downscale, 96)
const viewportHeight = Math.max(pixelHeight * downscale, 96)

const worldWidth = viewportWidth / camera.zoom
const worldHeight = viewportHeight / camera.zoom
```

补充规则：

- 保持宽高比；
- 大图只缩小展示，不覆盖 Original；
- 小图不进行模糊的强制大幅放大；96 px 下限只用于 Provisional Placeholder；
- 解码出真实尺寸后围绕原 Drop Anchor 重算；
- 最终参数必须在 100%、125%、150% Display Scale 下验证；
- 参数可以基准测试调整，但不得改为统一卡片尺寸或自动布局。

## 9.7 Spawn & Micro Offset

Drag：

```text
spawnAnchor = viewportToWorld(dropClientPoint - canvasBounds.origin)
```

Paste：

```text
spawnAnchor = viewportCenterWorld + microOffset
microOffsetViewportPx = 18 × (sequence mod 5)
microOffsetWorld = microOffsetViewportPx / zoom
```

Micro Offset 只沿固定轻微对角方向暴露重叠对象；达到循环上限后重新开始。不得扫描最佳空白区域、移动既有对象或生成瀑布流。

## 9.8 zRank

- SQLite 存 signed 64-bit Integer；
- TypeScript Domain 使用 `bigint`；
- IPC 使用十进制 string；
- 新对象与 Drag End 申请 `currentMax + rankGap`；
- 初始 `rankGap` 建议 1024；
- 空间不足时 Persistence Worker 在一个 Transaction 中稳定重排；
- Selection、Hover、Context Menu、Note 与 Keyword 不改变 zRank。

---

# 10. Capture Implementation

## 10.1 Synchronous Event Snapshot

`drop` 与 `paste` Handler 必须在事件生命周期内同步复制：

- Files / Blob References；
- `text/html`；
- `text/uri-list`；
- `text/plain`；
- MIME Types；
- Drop Client Point；
- Active Day ID；
- Capture Timestamp；
- Sequence。

事件返回后不得再次读取原始 `DataTransfer` / `ClipboardData`。

## 10.2 Candidate Priority

```text
Image Blob / File
> explicit <img src> from parsed HTML
> text/uri-list HTTPS candidate
> text/plain HTTPS candidate
```

HTML 解析规则：

- 使用 `DOMParser`；
- 只提取 `img[src]`、必要的 `srcset` Candidate 与页面 Provenance；
- 不插入 Renderer DOM；
- 不执行 Script、Style、Event Handler；
- 不保留 Cookie、Authorization 或页面 DOM Snapshot。

## 10.3 Capture Intent

```ts
interface CaptureIntentDto {
  id: string
  targetDayId: string
  capturedAtUtc: string
  sourceType: 'browser-drag' | 'clipboard-paste'
  candidates: MediaCandidateDto[]
  spawnWorldPoint: Point
  sequence: number
}
```

`targetDayId` 在 Intent 创建时冻结。午夜变化或远程下载完成时不得把它改成 Today。

## 10.4 Remote Fetch Guardrails

P0 初始值：

| Guardrail | Value |
| --- | ---: |
| Scheme | `https:` only |
| Timeout | 10 s |
| Redirects | ≤ 3 |
| Response Bytes | ≤ 25 MiB |
| Decoded Pixels | ≤ 60 MP |
| Types | JPEG / PNG / WebP / GIF |

必须：

- 每次 Redirect 重新执行网络地址检查；
- 拒绝 Loopback、Link-local、Private Network、`file:`、`data:` 与未知协议；
- MIME 与 Magic Byte 冲突时以安全验证结果决定；
- 拒绝 HTML、SVG、Script 与可执行内容；
- 不携带浏览器 Cookie 或 Authorization；
- 响应流式写入 Staging，不把 25 MiB 全部复制进 Renderer。

## 10.5 Gate 0 Harness

在完整 Canvas 前完成独立 Harness：

- Chrome / Edge；
- Pinterest Feed / Search / Pin Detail；
- Always-on-top ON / OFF；
- Windows Display Scale 100% / 125% / 150%；
- Blob、HTML、URI List、Plain URL；
- Redirect、Offline、Expired URL、Non-image；
- 脱敏 DataTransfer Fixture Corpus。

Gate：

- Chrome ≥ 50 次真实 Drag；
- Edge ≥ 50 次真实 Drag；
- Durable Success ≥ 98%；
- Drop Error ≤ 2 viewport px；
- 单次失败不破坏后续 Drag / Paste；
- 全路径无 Download、Name、Category 或 Import Modal。

---

# 11. Media Pipeline

## 11.1 Profile Layout

```text
%LOCALAPPDATA%/<ProductId>/profile-v1/
├─ metadata.sqlite
├─ metadata.sqlite-wal
├─ metadata.sqlite-shm
├─ media/
│  ├─ originals/
│  ├─ working/
│  └─ thumbnails/
├─ staging/
├─ cache/
├─ logs/
└─ profile.json
```

数据库只保存相对路径。Renderer 永远不获得 Profile Root 绝对路径。

## 11.2 Atomic Original Commit

```text
Write staging/<captureId>.part
→ flush / close
→ validate length + magic bytes + decode limits
→ compute SHA-256
→ atomic rename to media/originals/<sha>.<ext>
→ transaction: media_asset + image_object relation + capture_job durable
→ durable ACK
→ enqueue derivatives
```

Original：

- 验证后原样保存；
- 内容寻址；
- 不可变；
- 不因压缩策略改变而覆盖；
- 相同 Hash 可以被多个 Image Object 引用；
- Remote URL 失效不影响显示。

## 11.3 Working / Thumbnail Recipe

初始 Recipe：

| Variant | Rule |
| --- | --- |
| Working Transparent / Graphic | PNG 或 WebP Lossless；long edge ≤ 2560 px |
| Working Opaque Photo | JPEG Q≈85 或 WebP Q≈82；long edge ≤ 2560 px |
| Thumbnail | WebP；long edge 384 px；Q≈75 |

实现要求：

- 归一到 sRGB；
- 烘焙 EXIF Orientation；
- 保持 Alpha；
- Recipe 记录 `derivativeRecipeVersion`；
- 编码选择依据像素与收益，不依据文件扩展名；
- 不设 500 KB 强制上限；
- 删除 Working / Thumbnail 后可以后台重建；
- GIF Original 保留；P0 AI Working 与 Thumbnail 使用明确记录的静态帧策略，Animated Playback 不在本规范中擅自扩展。

建议以真实 Pinterest Corpus 比较：

- 解码时间；
- 峰值内存；
- 文件体积；
- Canvas 清晰度；
- AI Keyword 质量；
- Alpha 与色彩正确性。

## 11.4 Media Protocol

Renderer 只使用：

```text
app-media://asset/<assetId>?variant=thumbnail|working|original
```

Main 必须：

- 查询 Asset ID；
- 解析 Profile 内相对路径；
- Canonicalize；
- 验证最终路径仍在允许目录；
- 设置正确 MIME、Cache Header 与 `nosniff`；
- 只读返回；
- 拒绝目录遍历、未知 Variant 与未引用 Asset。

---

# 12. SQLite & Persistence

## 12.1 Database Settings

启动时必须设置并验证：

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
PRAGMA quick_check;
```

若 `quick_check` 失败，不得创建空白库覆盖原数据；进入 Fatal Recovery Screen。

## 12.2 Schema Ownership

- Migration 文件只前进，不修改已发布 Migration；
- Schema Version 存在专用 Metadata；
- Persistence Worker 启动前执行 Migration；
- 每次 Migration 前创建 Metadata Backup；
- Migration 必须在 Transaction 内；
- 失败保留旧 DB 和 Backup；
- Renderer 不拼 SQL、不知道表结构。

## 12.3 SystemPrompt v2.2 Schema Completion

Architecture Core Schema 是基线；实现时必须补齐 SystemPrompt v2.2 所需字段，不得把 Dimension 或固定 Locale 丢进不可查询 JSON。

```sql
ai_result(
  id TEXT PRIMARY KEY,
  input_asset_sha256 TEXT NOT NULL,
  working_recipe_version INTEGER NOT NULL,
  prompt_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  output_locale TEXT NOT NULL,
  created_at_utc TEXT NOT NULL,
  UNIQUE(
    input_asset_sha256,
    working_recipe_version,
    prompt_version,
    schema_version,
    output_locale
  )
)

image_keyword(
  id TEXT PRIMARY KEY,
  image_object_id TEXT NOT NULL REFERENCES image_object(id),
  text TEXT NOT NULL,
  dimension TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  ai_result_id TEXT NOT NULL REFERENCES ai_result(id),
  created_at_utc TEXT NOT NULL
)

app_preference(
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at_utc TEXT NOT NULL
)
```

`keywordOutputLocale` 在 P0 固定为 `en-US`。产品不提供中英文切换 UI；字段仍进入 AI Cache Key，作为协议版本事实和未来迁移边界，但 Renderer 不拥有设置接口。

## 12.4 Mutation Envelope

```ts
interface MutationEnvelope<TKind extends MutationKind, TPayload> {
  mutationId: string
  entityId: string
  entityRevision: number
  localRevision: number
  kind: TKind
  payload: TPayload
  createdAtUtc: string
}
```

规则：

- `mutationId` 全局唯一并幂等；
- `localRevision` 在 Renderer 单调递增；
- `entityRevision` 在实体内单调递增；
- 旧 Entity Revision 不得覆盖新 Revision；
- Worker ACK 返回最高 Durable Revision；
- 同一 Entity + Kind 高频 Mutation 可合并；
- End Boundary 不得被 Debounce 丢失。

## 12.5 Typed Mutation Kinds

最低需要：

```ts
type MutationKind =
  | 'image.geometry.commit'
  | 'image.lock.set'
  | 'image.note.set'
  | 'keyword.pin.set'
  | 'canvas.camera.set'
  | 'workspace.bounds.set'
  | 'workspace.alwaysOnTop.set'
  | 'capture.intent.create'
  | 'capture.media.commit'
  | 'ai.result.commit'
```

禁止 `kind: 'update'` + 任意 Payload 这种无边界 Mutation。

## 12.6 Transaction Boundaries

必须在一个 Transaction 内：

- Drag End：x / y / zRank / Entity Revision；
- Lock / Unlock + Entity Revision；
- Media Asset + Image Relation + Capture Durable；
- AI Result + Keywords + AI Job Succeeded；
- P1 Delete / Restore 及引用更新。

## 12.7 Save Cadence

| Interaction | Memory | Checkpoint | End Flush |
| --- | --- | --- | --- |
| Move / Resize | 每 Frame | 最长约 500 ms | Pointer Up |
| Pan / Zoom | 每 Frame | 最长约 500 ms | Settle |
| Quick Note | 每次输入 | 300–500 ms | Blur / Close Editor |
| Lock / Unlock | 立即 | 无 | 立即 |
| Keyword Pin | 立即 | 无 | 立即 |
| Drop / Paste Intent | 立即 | 无 | 立即 |
| Media Durable | 状态替换 | 无 | 立即 Transaction |
| Window Bounds | Main Memory | 500 ms | Close |

时间值是初始工程参数，可经测试调整；任何调整不得变成逐 Pointer Event 写 SQLite。

---

# 13. Auto-save & Close

## 13.1 Save State

```ts
interface SaveStatus {
  localRevision: number
  queuedRevision: number
  durableRevision: number
  state: 'saved' | 'saving' | 'unsaved' | 'error'
}
```

状态推导：

```text
durableRevision >= localRevision and no required failure → saved
queuedRevision > durableRevision → saving
localRevision > queuedRevision → unsaved
required persistence failure → error
```

AI Running / Failed 不属于 Unsaved User Data。

## 13.2 Close Protocol

Close 必须由 Main 拥有：

```text
Window close intent
→ Main asks latest localRevision
→ Persistence Worker flush(targetRevision)
→ ACK covers target: close silently
→ failure / timeout / unknown: show three-choice guard
```

Guard 只有：

- Save & Close；
- Close Without Saving；
- Cancel。

禁止仅依赖 `beforeunload`。

## 13.3 Crash Recovery

启动时：

- 恢复最后 Durable Scene；
- 检查 Staging Job；
- 重新验证可继续的 Media Import；
- 修复超时卡死 Job；
- 恢复 AI Queue；
- 不把未 ACK 内存状态标为 Saved；
- Orphan Original 延迟审计，不立即删除；
- Window Fallback 不修改 World Geometry。

---

# 14. AI Implementation

## 14.1 Ownership

AI Worker 负责：

- 从 Profile 读取允许发送的 Working Image；
- 读取 Prompt Registry；
- 读取 `keywordOutputLocale`；
- 创建匿名 Job ID；
- 调用 Product-managed Gateway；
- 验证 `VisualKeywordResultV1`；
- 机械规范化与去重；
- 把成功结果交给 Persistence Worker；
- 管理 Retry / Backoff。

Renderer 只接收 AI Job State 与已持久化 Keyword Projection。

## 14.2 Prompt Registry

```ts
interface PromptDefinition {
  id: 'visual-keywords'
  version: 'visual-keywords-v2.2.0'
  schemaVersion: 1
  supportedLocales: readonly ['en-US']
  defaultLocale: 'en-US'
  systemMessageSha256: string
}
```

Build Test 必须验证：

- 文件名、Prompt Version 与 Registry 一致；
- System Message Hash 与打包内容一致；
- Schema `promptVersion` Const 一致；
- 默认 Locale 为 `en-US`；
- P0 不暴露 Locale 切换入口。

## 14.3 Allowed Request

只发送：

- Working Image Bytes；
- MIME / Width / Height；
- Prompt Version；
- Output Locale；
- Anonymous Job ID。

禁止发送：

- Quick Note / Day Title；
- Day / Capture Time；
- Geometry / zRank / Lock；
- Source URL / Browser History；
- Local Path；
- Adjacent Images；
- Pinned Keyword；
- Workspace State。

## 14.4 Validation

```text
JSON decode
→ schema version
→ exact schema
→ 5–10 items
→ dimension enum
→ text normalization
→ duplicate detection
→ locale consistency
→ transaction commit
```

禁止：

- Regex 截取自由文本中的 JSON；
- `tags` 自动升级；
- 猜测缺失 Dimension；
- 本地补词；
- 自动翻译补足；
- 覆盖 Pinned Keyword。

## 14.5 Locale

- P0 固定 `en-US`，面向 Pinterest、Unsplash、Microsoft Edge、Mobbin 等检索；
- 产品不提供中英文切换 UI，也不由 Renderer 发送自由 Locale；
- Locale 缺失或非法时 Gateway Adapter 强制使用 `en-US` 并记录非敏感 Validation Event；
- `imageSha + recipeVersion + promptVersion + schemaVersion + outputLocale` 仍构成 Cache Identity。

## 14.6 Failure Isolation

AI 失败：

- 只更新 Keyword-local Job State；
- 不删除 Image；
- 不回滚 Geometry、Note、Lock 或 Pin；
- 不触发全局 Loading；
- 不触发 Close Guard；
- 不阻止打开历史 Day；
- P1 Manual Retry 复用同一 Image Object。

---

# 15. UI, Overlay & Accessibility

## 15.1 Visual Boundary

现阶段锁定：

- Content First；
- 轻量物理感可以存在；
- Loading、Note、Keyword 不引发 Reflow；
- 不强制 Polaroid、胶带、图钉、随机旋转；
- System / Information Voice：英文 Segoe UI，简体中文 PingFang SC；
- Personal Voice 用于 Custom Title、Quick Note 与其他非系统文字：英文固定使用 Chenyuluoyan，中文固定使用 momozhuanji；
- 字体按字符脚本自动映射，不提供语言切换控件；
- 最终 Color、Typography Size、Radius、Shadow 服从 `专业设计工程规范.md` / DesignSystemRules。

## 15.2 Design Tokens

所有视觉值通过 Semantic Tokens：

```css
:root {
  --color-canvas: ...;
  --color-surface: ...;
  --color-text-primary: ...;
  --color-text-muted: ...;
  --color-accent: ...;
  --color-danger: ...;
  --shadow-object-rest: ...;
  --shadow-object-active: ...;
  --radius-control: ...;
  --motion-fast: ...;
}
```

禁止在 Domain / State 文件中出现颜色、阴影与动画常量。

## 15.3 Keyword Overlay

- AI 成功后首词默认可见；
- Folded Label 使用 `First Keyword +N`，其中 N = 关键词总数 - 1；
- `activeKeywordGroupId` 只在内存；
- Hover 只显示可交互提示，不展开；
- Click 首词展开当前组并折叠上一个 Active Group；
- 不显示 Group Close Button；
- Canvas Empty Click 或激活另一组才收起；
- 同时最多一个 Expanded Group；
- Copy 后保持展开；
- Overlay 不修改 Image Bounding Box 或 zRank。

## 15.4 Quick Note Overlay

- Quick Note 绑定 Image Object；
- 默认锚定图片下方；
- Surface 使用已提供的横线纸 PNG；
- Note 宽度始终与所绑定 Image 的显示宽度一致，Image Resize 时同步；
- Compact 中文／英文均最多显示三行；
- Expanded 保持同宽，按完整段落自然增高；
- Compact → Expanded 使用 Overlay；
- Expanded 不推动其他对象；
- Image Move 时跟随；
- Locked Image 仍可编辑；
- Note 文本不得发送给 AI；
- 输入期间按 Debounce 保存，Blur 立即 Flush。

## 15.5 Accessibility

- 所有可点击控件支持 Keyboard Focus；
- Focus Ring 不得只依赖颜色；
- Context Menu 可键盘导航；
- Keyword Copy 与 Save Error 有非视觉反馈；
- Icon Button 必须有 Accessible Name；
- 文字与控件满足可读 Contrast；
- `prefers-reduced-motion` 时关闭非必要动画；
- Resize Handle 与 Pointer Target 保持可用尺寸；
- Canvas Shortcut 不得吞掉 Note Editor 中的正常文本输入。

## 15.6 Modal Rule

P0 仅 Unsaved Close Guard 可以使用阻断式 Modal。Capture、Move、Resize、Pan、Zoom、AI、Keyword、Quick Note 不得弹 Modal。

---

# 16. Security

## 16.1 Electron Baseline

BrowserWindow 必须：

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webviewTag: false,
}
```

并且：

- 严格 CSP；
- 只加载打包后的本地 App；
- 禁止未知 Navigation / Popup；
- 外链只允许经验证的 `https:` 交给系统浏览器；
- 权限请求默认拒绝；
- 不启用 Remote Module；
- 不把 DevTools 暴露为生产功能。

## 16.2 Input Safety

- Drag HTML 永不执行；
- SVG 作为 Remote Capture 默认拒绝；
- Magic Byte 验证先于解码；
- 图片尺寸在解码前后都有 Guard；
- URL Redirect 每跳验证；
- 不允许访问本机或内网地址；
- Source URL Query 不写普通日志；
- 文件名由 Hash 生成，不使用网页标题。

## 16.3 AI Safety

- Provider Secret 只在 Gateway；
- Renderer 和安装包无生产 Secret；
- 图片内文字是不可信内容；
- AI 原始响应不渲染；
- Schema Validation 后才持久化；
- Prompt / Payload 日志默认关闭；
- AI 不拥有 Canvas Command Channel。

---

# 17. Error Handling & Observability

## 17.1 Error Scope

| Error | UI Scope | Blocks Canvas | Close Guard |
| --- | --- | ---: | ---: |
| Capture Candidate / Fetch | Image-local | 否 | 否 |
| Derivative | Image-local / Background | 否 | 否 |
| AI | Keyword-local | 否 | 否 |
| Clipboard Copy | Keyword-local | 否 | 否 |
| Day Load | Time Navigation | 保留当前 Day | 否 |
| Persistence | Global Save Safety | 暂不阻断 | 是，若未确认 |
| Profile / Migration Fatal | Recovery Screen | 是 | 不适用 |

## 17.2 Stable Error Codes

错误码按领域前缀：

```text
CAPTURE_*
MEDIA_*
PERSISTENCE_*
AI_*
WORKSPACE_*
PROFILE_*
```

同类后台错误聚合，避免 Toast Storm。Toast 消失不等于 Error State 清除；只有对应操作成功后才清除。

## 17.3 Redacted Logging

允许记录：

- Correlation / Job ID；
- 状态转换；
- Error Code；
- 时延、字节量、像素尺寸；
- Schema / Recipe / Prompt Version；
- 脱敏 Domain。

禁止记录：

- 图片内容；
- Quick Note / Day Title；
- 完整 Source URL Query；
- AI Upload Payload / 原始响应；
- 用户名与绝对路径；
- Provider Secret。

---

# 18. Performance Budget

## 18.1 Product Baseline

| Scenario | Target |
| --- | ---: |
| Single Day open capacity | 1,000 Image Objects |
| Typical visible objects | 100 |
| Pan / Zoom | 60 FPS target |
| Existing 300-image Day first interactive | ≤ 2 s on benchmark machine |
| Drop point conversion | ≤ 2 viewport px error |
| Pinterest Durable Capture | ≥ 98% in Gate 0 corpus |

开发基准机规格必须记录在 Performance Report 中，不能只写“本机正常”。

## 18.2 Main-thread Budget

- Pointer / Wheel Handler 不做同步 I/O；
- 每 Frame JS 工作目标 < 8 ms，为 Paint 留出余量；
- 大图 Decode / Resize / Hash 全部在 Worker；
- 不在启动时同步扫描全部媒体；
- 不一次挂载 1,000 个完整 Image DOM；
- 不同时解码全部 Original；
- Note 输入不得因全 Scene Reconcile 掉帧。

## 18.3 Memory

- Blob URL 生命周期必须可追踪并及时 revoke；
- Image Bitmap / decoded surface 离开可见区域后允许释放；
- Original Byte 不进入长期 Renderer State；
- Worker 大 Buffer 及时释放；
- 性能测试记录 Working Set、Peak Heap 与 GPU Memory 近似值；
- 连续 Capture 200 张后不得出现线性不可回收增长。

---

# 19. Testing Strategy

## 19.1 Unit

必须覆盖：

- DataTransfer Candidate Priority；
- URL / MIME / Magic Byte Rule；
- Initial Size；
- Micro Offset；
- Move Threshold；
- Lock Command Rejection；
- Mutation Coalescing；
- Revision Comparison；
- Locale Default / Switch；
- Keyword Normalization。

## 19.2 Property Tests

至少验证：

- `worldToViewport(viewportToWorld(p)) ≈ p`；
- Zoom 前后 Pointer 下 World Point 不变；
- Geometry 不受 Window Bounds 改变；
- zRank Rebalance 保序；
- Coalescing 后最终状态等于按序执行全部同类状态 Mutation；
- Duplicate Capture 共享 Media Asset 但保持独立 Image Object。

## 19.3 Contract Tests

- 每个 IPC Input / Output Schema；
- 未知 Channel / Field 拒绝；
- `app-media://` 路径逃逸拒绝；
- `VisualKeywordResultV1`；
- Prompt Registry Version / Hash；
- P0 固定 `en-US` 且拒绝 Renderer Locale 覆盖；
- AI Prompt Injection Fixture；
- Error DTO Redaction。

## 19.4 Integration

- Staging → Validate → Hash → Rename → DB Commit；
- Process Crash 在每个 Atomic Media Step；
- Persistence Worker Crash + Idempotent Replay；
- AI Result + Keywords + Job Completion Transaction；
- Migration Success / Failure / Rollback；
- Cache Delete + Lazy Rebuild；
- Remote URL Expired + Historical Display。

## 19.5 E2E

覆盖 InteractionFlow Journey A–G：

- Pinterest Fast Capture；
- Clipboard Capture；
- Spatial Thinking；
- Historical Continuation；
- Keyword Work；
- Quick Note；
- Safe Close。

必须额外覆盖：

- Always-on-top ON / OFF；
- Display Disconnect / DPI Change；
- Midnight While Historical Day Open；
- AI Offline 24 h；
- Clean Close 无 Guard；
- Flush Failure 三选项 Guard；
- Cancel 回到原 Selection / Camera / Editor。

## 19.6 Migration Fixtures

每个已发布 DB Schema 都保留脱敏 Fixture。CI 必须验证：

- 逐版本升级；
- Geometry / Note / Pin / Day / Capture Time 不丢失；
- 失败不覆盖源数据库；
- 重复执行 Migration 幂等；
- 新 `output_locale` 默认正确迁移为 `en-US`，但不改写已有 Keyword Text。

---

# 20. CI, Build & Release

## 20.1 Required CI Gates

每个 Merge 必须通过：

1. Format；
2. Lint；
3. Type Check；
4. Unit / Property；
5. Contract；
6. Integration；
7. Migration Fixtures；
8. Production Build；
9. Native Module ABI Check；
10. Dependency / License Audit。

Release Candidate 额外通过：

- Windows 11 E2E；
- Chrome / Edge Drag Matrix；
- Performance Budget；
- Install / Upgrade / Uninstall；
- Code Signing；
- Clean Machine Smoke Test；
- Existing Profile Upgrade；
- Offline Startup。

## 20.2 Build Reproducibility

- Frozen Lockfile；
- Build Toolchain Version 固定；
- Prompt 文件 Hash 进入 Build Manifest；
- DB Migration List 进入 Build Manifest；
- Source Map 不携带 Secret；
- Release Artifact 记录 Commit SHA；
- Dev Mock Gateway 与 Production Gateway 配置物理隔离。

## 20.3 Packaging

- 使用标准 Windows Installer；
- 默认数据位于 Local App Data Profile，不放安装目录；
- Upgrade 不删除 Profile；
- Uninstall 是否删除 Profile 必须显式询问，不能静默删除；
- Installer 不要求浏览器扩展权限；
- 不打包生产 Provider Secret。

---

# 21. Delivery Order & Engineering Gates

## Gate 0 — Drag Risk Kill

- BrowserWindow + Always-on-top；
- Chrome / Edge Pinterest Drag Harness；
- DataTransfer Corpus；
- DPI / Coordinate Test；
- 最小 Blob / URL Localize。

通过 Gate 0 前，不得投入 Week、Month、Journal 或装饰性视觉系统。

## Gate 1 — Durable Capture Kernel

- Profile Root；
- SQLite / Migration；
- Atomic Original Commit；
- Capture State Machine；
- Paste Unified Pipeline；
- Restart Recovery。

通过条件：断网、URL 失效或重启后，已 Durable Image 仍存在。

## Gate 2 — Spatial Canvas

- World / Viewport / Camera；
- Move / Resize / Pan / Zoom；
- zRank / Lock；
- Viewport Cull；
- Workspace Restore。

通过条件：Window / DPI 改变不修改 World Geometry。

## Gate 3 — Thought & Save Safety

- Title Area 与默认时间标题；
- 左侧 Global Action Bar Shell；
- 右上 Temporal Controls；
- Theme / Background Surface Picker；
- Quick Note；
- Keyword Overlay Shell；
- Revision Auto-save；
- Durable ACK；
- Close Guard；
- Localized Errors。

通过条件：未 ACK 不显示 Saved；Flush Failure 不丢失且触发 Guard。

## Gate 4 — AI

- Working Recipe；
- Product Gateway；
- Persistent Queue；
- SystemPrompt v2.2；
- P0 固定 `en-US`，无 Locale 切换 UI；
- 5–10 Keywords；
- Pin / Retry Isolation。

通过条件：AI 离线不影响 Capture；Schema Invalid 不进入 Domain Model。

## Gate 5 — P1

- Download / Share；
- Week / Month Projection；
- Trash / Restore；
- Manual Save；
- Manual AI Retry。

Journal 与 macOS 继续独立排期。

---

# 22. Definition of Done

一个功能只有同时满足以下条件才算完成：

- [ ] 对应 Requirement / ADR / InteractionFlow 可追踪；
- [ ] Domain 与进程责任没有被破坏；
- [ ] 输入边界有 Runtime Validation；
- [ ] Happy Path 有自动测试；
- [ ] Failure Path 有自动或可重复人工测试；
- [ ] Durable 状态以 ACK 判定；
- [ ] Restart 后恢复正确；
- [ ] 不依赖 AI 可用性完成 Capture；
- [ ] 不泄露 Local Path、Note、URL Query 或 Secret；
- [ ] 无新的阻断式 Modal；
- [ ] Pointer / Keyboard Conflict 符合 Interaction Priority；
- [ ] Performance Budget 未回退；
- [ ] Migration / Backward Compatibility 已评估；
- [ ] 文档和 Error Code 已更新；
- [ ] 没有携带旧版 Side Panel / WeeklyBoard 术语。

---

# 23. P0 Acceptance Checklist

## 23.1 Capture

- [ ] Chrome 与 Edge Pinterest Drag 在 Drop 世界位置建立对象；
- [ ] Drag / Paste 共用 CaptureIntent 与 ImageObject；
- [ ] 不要求 Download、Name、Category、Project 或 Confirm；
- [ ] Original 可靠本地化且不可变；
- [ ] Remote URL 失效不影响历史显示；
- [ ] 单 Capture 失败不影响下一次 Capture。

## 23.2 Canvas

- [ ] Wheel Zoom 保持 Pointer World Point；
- [ ] Middle Mouse 在 Image 上仍 Pan；
- [ ] Click 不改变 zRank；
- [ ] Drag End 才永久置顶；
- [ ] Resize 默认等比；
- [ ] Lock 只冻结 Geometry；
- [ ] Note / Keyword Overlay 不 Reflow。
- [ ] 自定义 Title 为 P0，日期始终保留且自动降级显示。
- [ ] Action Bar 顺序为 More / Journal / Theme / Download-Share / Trash。
- [ ] Theme 只改变 Background Surface。
- [ ] Keyword 使用 `First Keyword +N`，Click 展开且同时最多一组。
- [ ] Quick Note 与 Image 等宽，Compact 最多三行。

## 23.3 Persistence

- [ ] SQLite 是 Metadata Durable Source；
- [ ] Persistence Worker 是唯一写入者；
- [ ] 高频输入合并写入；
- [ ] Pointer Up / Blur / Pin / Lock 立即 Flush；
- [ ] 未 ACK 不显示 Saved；
- [ ] Clean Close 无 Guard；
- [ ] Flush Failure 显示三选项 Guard；
- [ ] Crash Recovery 不覆盖已保存数据。

## 23.4 AI

- [ ] 只发送 Working Image 与允许技术元数据；
- [ ] 默认英文 `en-US`；
- [ ] 不显示或暴露关键词语言切换；
- [ ] 英文结果适合视觉检索；
- [ ] 输出严格匹配 `VisualKeywordResultV1`；
- [ ] Prompt Injection 不改变任务；
- [ ] AI Loading 不锁 Image；
- [ ] AI Error 不触发 Close Guard；
- [ ] Retry 不覆盖 Pin；
- [ ] Locale 进入 Cache Identity。

## 23.5 Workspace

- [ ] Always-on-top 最终状态由 Main 校正；
- [ ] Window Bounds 跨重启恢复；
- [ ] Display 拔出后窗口回到可见区域；
- [ ] Active Day 与 Camera 恢复；
- [ ] Window Restore 不改变 World Geometry。

---

# 24. Deferred / Open Implementation Items

以下不得由开发者静默决定：

- 最终产品名与 Product ID；
- 最小窗口尺寸；
- 最终 Zoom 范围与 Sensitivity；
- 真实 Corpus 验证后的 Working 编码参数；
- GIF 动画播放策略；
- 最终 Color / Typography / Shadow / Motion Tokens；
- P1 Trash TTL；
- Week / Month 具体视觉投影；
- Journal 文件格式与 Export；
- 用户可见 Backup / Restore 入口；
- macOS Window Level、Drag Payload 与 Profile Path；
- Cloud Sync、BYOK 与 Local Model。

这些开放项必须以 Issue / ADR / PRD Change 的形式关闭，不能只存在于代码默认值中。

---

# 25. Final Development Statement

P0 开发规范被定义为：

> **使用 Electron + TypeScript 建立一套 Windows 11 本地优先桌面内核：Renderer 立即呈现并维护世界坐标交互，Main 和窄 Preload Bridge 保护系统边界，Media Worker 将 Chrome / Edge 的 Pinterest Drag 与 Paste 可靠转化为不可变本地原件，Persistence Worker 用 SQLite Transaction 和 Revision ACK 保存用户的时间与空间思考，AI Worker 通过 Product-managed Gateway 异步生成 P0 固定英文的结构化设计关键词。**

任何实现若恢复 Side Panel / WeeklyBoard 架构、用 IndexedDB 替代 SQLite、覆盖 Original、把 Viewport Pixel 当 World Coordinate、逐 Pointer Event 写数据库、让 AI 阻塞 Capture、在 Renderer 保存 Secret、以 Sanitizer 猜测模型输出，或在 Durable ACK 前显示 Saved，均不符合本规范。

---

# 26. v2.1 Interface Sync Notes

- 吸收 IA v0.4 与 Reference Mapping v0.2 的 Board Chrome、Title、Keyword 与 Quick Note 事实；
- 自定义 Title 移入 P0；
- Keyword 从 Hover 展开改为 Click 展开、单一 Active Group；
- Quick Note 锁定横线纸、Image 等宽和 Compact 三行；
- System Voice 与 Personal Voice 字体映射均已确认：Segoe UI / PingFang SC；Chenyuluoyan / momozhuanji；
- 删除产品级中英文切换入口，P0 AI Keyword 固定 `en-US`。

---

# End of DevelopmentSpecs.md v2.1

---

# Implementation Sync - 2026-08-29

The live prototype has completed Slices 01-17. Current implemented behavior includes the board shell, temporal canvas, drag/paste image capture, link capture, trash retention, Electron desktop shell, Local Profile v1, SQLite metadata scaffold, local original media commit, app-media asset loading, Persistence Worker revision ACK, restart recovery, and per-image capture lifecycle UI.

Current implementation notes:

- Desktop `Saved` must mean a persistence ACK has returned from the main-process Persistence Worker.
- Renderer remains responsible for immediate visual feedback only.
- Move and resize are coalesced by interaction design: geometry updates visually during pointer movement and only the final state is persisted on pointerup.
- Restart recovery currently uses `workspace-snapshot.json` as the primary Profile snapshot, with SQLite storing a `canvas_state` copy.
- Capture failures must stay local to the affected image object and must not block the rest of the canvas.

See `PROJECT_STATUS.md` for the current implementation matrix, known technical debt, and next slices.
