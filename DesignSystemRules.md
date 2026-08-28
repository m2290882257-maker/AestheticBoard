# DesignSystemRules.md — Inspiration Board v0.1

> **Document Status:** v0.1 — Executable Provisional Baseline  
> **Current Scope:** Inspiration Board 主体；Journal 仅继承未来视觉边界，不进入本版组件实现  
> **Product Source of Truth:** `PRD.md v2.1`  
> **Structure Inputs:** `InformationArchitecture.md v0.4` + `ReferenceMapping.md v0.2`  
> **Behavior Inputs:** `InteractionFlow.md v2.1`  
> **Engineering Inputs:** `Architecture.md v2.1` + `DevelopmentSpecs.md v2.1`  
> **Visual Inputs:** `VisualDirection.md` + `专业设计工程规范.md v0.2`  
> **Core Sentence:** 安静的编辑系统，鲜活的人为痕迹。

---

## 0. 文档职责

本文件是 Inspiration Board 第一版可直接执行的视觉与组件规范。它负责定义：

- 设计 token 的命名、默认值与使用边界；
- System Voice / Personal Voice 的字体映射；
- 色彩、间距、圆角、边界、阴影、透明度与动效候选值；
- Board Chrome、Title、Keyword、Quick Note、Image 与 Context Menu 的组件规则；
- 状态、响应式、可访问性、密度与视觉验收要求；
- `PROVISIONAL` 参数如何在真实开发中被验证、调整和锁定。

本文件不重新定义产品范围、交互状态机、数据模型或 AI 输入输出。发生冲突时，最新 PRD 是最高产品事实。

---

## 1. 规则状态

| 状态 | 含义 | 开发要求 |
| --- | --- | --- |
| `LOCKED` | 已由产品决定、界面证据或工程底线确认 | 必须实现；修改前先更新上游文档 |
| `PROVISIONAL` | 可直接实现的首轮候选参数 | 必须集中为 token；允许根据真实截图调整 |
| `OPEN` | 缺少资产、视觉证据或真实场景验证 | 不得自行伪装成最终规则 |
| `EXCLUDED` | 已明确不采用 | 禁止引入 |

### 1.1 v0.1 执行原则

1. `PROVISIONAL` 不等于“先随便写”；它是可运行、可比较、可回滚的正式候选值。
2. 所有候选值必须通过 token 使用，禁止散落在 JSX / TSX / component CSS 中。
3. 首轮只允许围绕少数高风险参数建立视觉对照，不为所有组件制作多版本。
4. 调整参数时先改 token，再检查组件，不以局部覆盖掩盖系统问题。
5. 用户图片、位置、尺寸、颜色与构图不受本设计系统统一改造。

---

## 2. 设计系统结构

采用三层 token：

```text
Primitive Token
  → Semantic Token
    → Component Token
```

- Primitive：原始色值、尺寸、时长与曲线；
- Semantic：承托面、文本、边界、状态等意义；
- Component：Keyword、Quick Note、Toolbar 等局部映射。

组件优先使用 Semantic / Component Token。Domain Model、State Store 与业务常量中不得出现视觉值。

---

## 3. Typography System

### 3.1 双声道映射 `LOCKED`

| Voice | English | 简体中文 | 使用范围 |
| --- | --- | --- | --- |
| System / Editorial | Segoe UI | PingFang SC | Keyword、导航、按钮、菜单、Tooltip、状态、元数据、次级日期、输入编辑态 |
| Personal / Handwritten | Chenyuluoyan | momozhuanji | Title、Quick Note 展示态及其他非系统私人文字 |

资产：

| Asset | CSS Family | Role |
| --- | --- | --- |
| `segoeui(1).ttf` | `Segoe UI` | English System Voice |
| `PingFang.ttc` | `PingFang SC` | Chinese System Voice |
| `辰宇落雁體ChenYuluoyan.ttf` | `Chenyuluoyan` | English Personal Voice |
| `默陌专辑手写体momozhuanji.ttf` | `momozhuanji` | Chinese Personal Voice |

### 3.2 字体加载与授权边界

- 字体文件进入受控 `assets/fonts/`，由本地应用打包；
- 文件名不得直接作为 CSS family；以字体内部 family 或显式 alias 注册；
- 发布前必须确认四个字体文件的再分发授权；授权未确认时只允许本地开发验证；
- `font-display: swap` 为首轮候选；加载切换不得改变组件尺寸；
- Font metrics 差异通过固定 line-height、容器高度与截图测试处理，不使用负 margin 修补单个字符串。

### 3.3 字符脚本映射 `LOCKED`

由于 Personal Voice 两个字体可能包含重叠字形，不得只依赖 CSS fallback 顺序。Renderer 应把 Personal 文本按 script run 分段：

```html
<span data-voice="personal" data-script="latin">A quiet afternoon</span>
<span data-voice="personal" data-script="han">午后的风</span>
```

规则：

- Latin 字母使用 Chenyuluoyan；
- Han 字符使用 momozhuanji；
- 数字与标点继承相邻语义 run；
- 纯日期、时间、数量和系统 metadata 始终属于 System Voice；
- 混排时不显示语言切换 UI；
- 编辑态可临时使用 System Voice，失焦后回到 Personal Voice 展示态。

### 3.4 字体 Tokens

```css
:root {
  --font-system-en: "Segoe UI", system-ui, sans-serif;
  --font-system-zh: "PingFang SC", "Microsoft YaHei UI", sans-serif;
  --font-personal-en: "Chenyuluoyan", cursive;
  --font-personal-zh: "momozhuanji", "KaiTi", cursive;

  --type-caption-size: 12px;
  --type-caption-line: 16px;
  --type-control-size: 13px;
  --type-control-line: 18px;
  --type-body-size: 14px;
  --type-body-line: 20px;
  --type-subtitle-size: 16px;
  --type-subtitle-line: 22px;
  --type-title-size: 28px;
  --type-title-line: 36px;
  --type-note-size: 16px;
  --type-note-line: 24px;
}
```

以上字号与行高为 `PROVISIONAL`；字体家族与角色为 `LOCKED`。

### 3.5 角色表

| Role | Font | Size / Line-height | Weight | Status |
| --- | --- | --- | --- | --- |
| System Caption | System | 12 / 16 | 400 | `PROVISIONAL` |
| System Control | System | 13 / 18 | 500 | `PROVISIONAL` |
| System Body | System | 14 / 20 | 400 | `PROVISIONAL` |
| System Body Strong | System | 14 / 20 | 600 | `PROVISIONAL` |
| Default Temporal Title | Personal | 28 / 36 | font native | `PROVISIONAL` size |
| Custom Board Title | Personal | 28 / 36 | font native | `PROVISIONAL` size |
| Secondary Date | System | 12 / 16 | 400 | `PROVISIONAL` |
| Quick Note Display | Personal | 16 / 24 | font native | `PROVISIONAL` size |
| Quick Note Editor | System | 14 / 20 | 400 | `PROVISIONAL` |

### 3.6 Typography 验收

必须检查：

- Windows 11 100% / 125% / 150% display scale；
- 英文、中文、数字、标点与中英混排；
- 默认标题、长标题、两行标题与 Secondary Date；
- Quick Note 1 / 2 / 3 行及展开长段落；
- 字体未加载、加载完成和 fallback 三种状态；
- 字体切换不导致 Chrome、Keyword 或 Note 尺寸跳动。

---

## 4. Spacing System

### 4.1 Primitive Scale `PROVISIONAL`

```css
:root {
  --space-0: 0;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-1-5: 6px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

页面与组件以 4px 节奏为骨架；2px / 6px 只用于视觉微调。

### 4.2 Semantic Spacing

| Token | v0.1 | Use | Status |
| --- | ---: | --- | --- |
| `--page-safe-x` | 32px | Chrome 与窗口左右安全区 | `PROVISIONAL` |
| `--page-safe-y` | 28px | Chrome 与窗口上下安全区 | `PROVISIONAL` |
| `--title-stack-gap` | 4px | 主标题与次级日期 | `PROVISIONAL` |
| `--chrome-title-gap` | 20px | Title Area 到 Action Bar | `PROVISIONAL` |
| `--control-gap` | 4px | 同组图标控件 | `PROVISIONAL` |
| `--control-group-gap` | 8px | 控件组之间 | `PROVISIONAL` |
| `--popover-padding` | 12px | 小型 Popover | `PROVISIONAL` |
| `--keyword-gap` | 6px | Expanded Keywords | `PROVISIONAL` |
| `--image-note-gap` | 8px | Image 与 Quick Note | `PROVISIONAL` |

用户画布对象之间不使用统一 spacing token，不自动吸附为网格。

---

## 5. Color System

### 5.1 Primitive Palette `PROVISIONAL`

以下颜色用于第一版真实界面，不代表最终品牌色：

```css
:root {
  --warm-ivory-50: #F4F1E9;
  --warm-paper-100: #ECE7DC;
  --warm-paper-200: #DDD6C8;
  --ink-900: #292822;
  --ink-700: #535047;
  --ink-600: #676258;
  --ink-400: #726C63;

  --human-red: #B94C3F;
  --human-green: #52765A;
  --human-blue: #496C88;
  --human-yellow: #A77D2E;
  --human-violet: #75658B;
}
```

### 5.2 Semantic Palette `PROVISIONAL`

```css
:root {
  --surface-canvas: var(--warm-ivory-50);
  --surface-control: rgb(250 248 242 / 82%);
  --surface-control-hover: rgb(255 254 250 / 94%);
  --surface-control-pressed: rgb(232 227 217 / 94%);
  --surface-popover: rgb(250 248 242 / 96%);
  --surface-note: #F2EBDD;

  --text-primary: var(--ink-900);
  --text-secondary: var(--ink-700);
  --text-muted: var(--ink-600);
  --text-disabled: var(--ink-400);

  --border-subtle: rgb(54 51 44 / 14%);
  --border-strong: rgb(54 51 44 / 30%);
  --focus-ring: #496C88;

  --state-selected: #496C88;
  --state-locked: #B94C3F;
  --state-processing: #75658B;
  --state-saved: #52765A;
  --state-error: #A83F3B;
}
```

### 5.3 使用纪律 `LOCKED`

- 大面积基底低饱和、低对比、中高明度；
- 鲜色只用于小面积 human mark、focus 和关键状态；
- 用户图片不加统一滤镜；
- selected、locked、error 不得只靠颜色；
- 普通文本对比至少 4.5:1；必要非文本边界至少 3:1；
- 半透明控件必须在纯背景、浅图、深图与复杂图上分别验证。

---

## 6. Background Surface

### 6.1 产品事实 `LOCKED`

- Moon Icon 打开 Background Surface Picker；
- P0 以 Workspace 级 preference 持久化；
- 更换底板不得修改 Image、Keyword、Quick Note、Camera 或 Geometry；
- 用户已整理本地候选底板，开发时登记为稳定 Asset ID；
- 背景纹理使用静态或低成本平铺方案，不做动态噪声。

### 6.2 Asset Registry

```ts
type BackgroundSurfaceDefinition = {
  id: string
  label: string
  assetPath: string
  fallbackColor: string
  fit: 'cover' | 'tile' | 'stretch'
  overlayOpacity: number
  status: 'default' | 'available' | 'experimental'
}
```

首个注册项：

```ts
{
  id: 'quiet-paper-default',
  label: 'Quiet Paper',
  assetPath: 'assets/backgrounds/<USER_ASSET_FILENAME>',
  fallbackColor: '#F4F1E9',
  fit: 'cover',
  overlayOpacity: 0.18,
  status: 'default'
}
```

文件名与 `fit` 在接入真实资产后替换；`overlayOpacity: 0.18` 为 `PROVISIONAL`。

---

## 7. Shape, Border, Shadow & Blur

### 7.1 Radius `PROVISIONAL`

```css
:root {
  --radius-none: 0;
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-round: 999px;
}
```

| Component | v0.1 |
| --- | ---: |
| Image | 2px |
| Keyword Bubble | 6px |
| Icon Button | 8px |
| Action Bar | 10px |
| Popover / Context Menu | 10px |
| Quick Note | 0–2px，服从纸面资产 |

`--radius-round` 只用于真实圆形按钮、状态点或明确的 segmented control，不作为默认标签样式。

### 7.2 Border

```css
:root {
  --border-width-subtle: 1px;
  --focus-width: 2px;
  --selection-width: 1px;
}
```

- Image 默认不加明显 card border；
- Keyword / Chrome 使用 1px subtle border；
- focus-visible 与 selected 分开表达；
- outline 不参与 layout，不改变世界坐标。

### 7.3 Shadow `PROVISIONAL`

```css
:root {
  --shadow-float: 0 4px 16px rgb(50 45 36 / 10%);
  --shadow-popover: 0 12px 32px rgb(50 45 36 / 16%);
  --shadow-selection: 0 0 0 1px rgb(73 108 136 / 65%);
}
```

- 只用于系统 Chrome、Popover 与临时浮层；
- 图片和 Quick Note 默认不使用 SaaS card shadow；
- Dense Board 禁止每个节点常驻复杂阴影。

### 7.4 Blur / Opacity `PROVISIONAL`

```css
:root {
  --chrome-backdrop-blur: 12px;
  --chrome-opacity: 0.82;
  --popover-opacity: 0.96;
  --disabled-opacity: 0.68;
}
```

- 玻璃感只属于系统操作层；
- 图片、Quick Note 与 Canvas 根层禁用动态 blur；
- 性能或对比不足时，优先提高 surface opacity，再降低 blur。

---

## 8. Motion System

### 8.1 Tokens

```css
:root {
  --ease-ui-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-ui-move: cubic-bezier(0.77, 0, 0.175, 1);
  --duration-instant: 0ms;
  --duration-press: 120ms;
  --duration-fast: 160ms;
  --duration-ui: 200ms;
  --duration-slow: 250ms;
}
```

全部为 `PROVISIONAL`，但以下边界为 `LOCKED`：

- Pan、Zoom、keyboard 操作为 0ms；
- Image Drag 1:1 跟手，释放后不漂移；
- 普通 UI 动效低于 300ms；
- 禁止 `transition: all`、`ease-in`、从 `scale(0)` 进入；
- 高频 Keyword 不逐个弹跳或 stagger；
- 动画优先 transform / opacity；
- 必须支持 `prefers-reduced-motion`。

---

## 9. Input & Accessibility

### 9.1 Hit Area `PROVISIONAL`

| Target | Visible | Hit Area |
| --- | ---: | ---: |
| Action Bar Icon | 16–18px | 36 × 36px |
| Temporal Icon | 16–18px | 36 × 36px |
| Keyword Copy Icon | 14px | 28 × 28px |
| Context Menu Row | content | min-height 36px |
| Resize Handle | 7px | 20 × 20px |

最低不得低于 WCAG 允许的 24 × 24px 原则；密集例外必须提供键盘或菜单等价入口。

### 9.2 Focus `LOCKED`

- 所有可键盘到达控件具有 `:focus-visible`；
- 采用至少 2px、具有 3:1 相邻对比的 focus indicator；
- focus、selected 与 locked 是三个不同状态；
- Canvas object outline 不改变对象 geometry；
- icon-only button 必须有 accessible name 与 Tooltip。

---

## 10. Layer & Z-index

UI layer 不得与 Canvas zRank 混用。

```css
:root {
  --z-canvas: 0;
  --z-canvas-object: 10;
  --z-object-overlay: 20;
  --z-board-chrome: 100;
  --z-popover: 200;
  --z-context-menu: 240;
  --z-toast: 300;
  --z-close-guard: 400;
}
```

以上数值为 `PROVISIONAL`；层级关系为 `LOCKED`。

---

## 11. Board Chrome

### 11.1 Title Area

- 固定在左上 screen-space；不进入世界坐标；
- 无自定义标题：日期／日期范围作为 Personal Voice 主标题；
- 有自定义标题：Title 为 Personal Voice 主标题，日期缩小为 System Caption；
- 日期始终存在；不显示 `Untitled`；
- 建议最大宽度 `min(42vw, 560px)`；`PROVISIONAL`；
- 超长标题允许两行，之后截断并在编辑态显示完整内容；`PROVISIONAL`。

### 11.2 Global Action Bar

固定顺序 `LOCKED`：

```text
More → Journal → Theme → Download / Share → Trash
```

- Inspiration Board 不重复显示 Home / Board Icon；
- 视觉容器为轻量半透明 system surface；
- 建议 `padding: 4px`、按钮 36px、gap 4px；`PROVISIONAL`；
- Journal 只打开 Gateway，不提前实现 Journal 主体；
- Download / Share 与 Trash 可在 P0 Shell 中显示 disabled / coming-later state，但不得伪造成功。

### 11.3 Temporal Controls

- 位于右上 screen-space；
- 上层 Previous / Today / Next；
- 下层 Day / Weekly / Monthly View Mode Selector；
- Day 为 P0；Week / Month 未实现时必须表现为不可用或开发占位，不得切换到空白伪页面；
- 与 Global Action Bar 使用同一 System Voice 与 surface family。

### 11.4 Responsive Chrome `PROVISIONAL`

| Window width | Layout |
| --- | --- |
| `>= 1200px` | Title 左上，Action Bar 位于其下；Temporal Controls 右上 |
| `960–1199px` | 收紧 page safe area 与 Title max-width；保持两侧分离 |
| `< 960px` | 允许 Temporal Controls 合并为单一 compact group；禁止覆盖 Title |

首轮建议最小窗口 `960 × 640px`，状态为 `PROVISIONAL`，需真实 Windows resize 验证。

---

## 12. Canvas & Image Object

### 12.1 Canvas

- 默认使用 Workspace Background Surface；
- Chrome 使用 screen-space，内容使用 world-space；
- 空画布不显示强 onboarding card；允许一句低显著度邀请文案或完全留空；
- 背景不能出现强污渍、强撕裂、满版手写或高对比图案。

### 12.2 Image

- 保持原始比例和色彩；
- 默认 radius 2px `PROVISIONAL`；
- Click 不自动提升 zRank；Drag End 才按产品规则提升；
- selected 使用 outline / handles，不改变图片尺寸；
- locked 必须通过状态 token 与非颜色线索表达；
- 禁止随机旋转、统一拍立得框、胶带与图钉。

---

## 13. Keyword Group

### 13.1 Folded State `LOCKED`

```text
First Keyword +N
```

- N = 总关键词数 - 1；
- AI 成功后默认可见，不依赖 Hover；
- 使用 System Voice；
- Hover 只提示可交互；Click 才展开；
- v0.1 建议 padding `6px 8px`、min-height 28px、max-width 220px；`PROVISIONAL`；
- 超长首词单行 ellipsis，完整文本通过 Tooltip / Expanded State 可达。

### 13.2 Expanded State `LOCKED behavior`

- 同时最多一个 Active Group；
- 展开新组时自动折叠旧组；
- 点击 Canvas 空白折叠；
- 不提供 Group Close Button；
- 每个 Keyword 后显示 Copy Icon；点击词或 icon 均复制；
- Copy 后保持展开，并提供局部非阻塞反馈；
- 不改变 Image Geometry、zRank 或 Quick Note；
- 建议 width `min(260px, max-content)`、padding 8px、gap 6px；`PROVISIONAL`。

### 13.3 States

| State | Visual Requirement |
| --- | --- |
| default | 安静可读，细边界 |
| hover | surface 轻微变亮；不展开 |
| focus-visible | 2px focus ring |
| expanded | 明确 group surface 与 copy affordance |
| processing | 局部占位，不改变 Image bounds |
| error | 显示原因与 Retry 入口，不删除图片 |
| copied | icon / label 的短时局部确认，不 Toast 泛滥 |

---

## 14. Quick Note

### 14.1 Structure `LOCKED`

- Quick Note 绑定一个 Image Object；
- 默认位于图片下方；
- 宽度始终等于绑定图片的显示宽度；
- Image Move 时跟随；Image Resize 时同步宽度；
- Surface 使用用户提供的横线纸 PNG；
- Compact 中文／英文最多三行；
- Expanded 保持同宽并按完整段落自然增高；
- Expanded 不推动其他图片，不改变世界空间中其他对象；
- Locked Image 的 Note 仍可查看和编辑。

### 14.2 Tokens `PROVISIONAL`

```css
:root {
  --quick-note-gap: 8px;
  --quick-note-padding-x: 12px;
  --quick-note-padding-y: 10px;
  --quick-note-line-height: 24px;
  --quick-note-max-lines: 3;
  --quick-note-min-width: 160px;
}
```

### 14.3 PNG Surface Rule

- 不直接把整张 PNG 非等比拉伸到任意高度；
- 首选 9-slice、三段切片或固定行距的 repeat-y；
- 横线 pitch 应与 `--quick-note-line-height` 对齐；
- 资产尚未接入时使用 `--surface-note` fallback，不能临时画成普通 textarea card；
- 接入后分别验证 1 行、3 行、10 行及不同图片宽度。

### 14.4 Display / Edit

- Display 使用 Personal Voice：英文 Chenyuluoyan，中文 momozhuanji；
- Edit 可使用 System Voice，以保证光标、选区与输入可读；
- 进入编辑态不改变 Note 外部尺寸；
- 保存中、已保存与错误反馈只出现在 Note 局部；
- Compact 截断采用 line clamp，不修改原始文本。

---

## 15. Popover, Tooltip & Context Menu

### 15.1 Shared Surface `PROVISIONAL`

- background: `--surface-popover`；
- border: 1px `--border-subtle`；
- radius: 10px；
- shadow: `--shadow-popover`；
- padding: 8–12px；
- System Voice 13–14px。

### 15.2 Behavior `LOCKED`

- Tooltip 不承载唯一必要信息；
- Popover 从 Trigger 建立 transform origin；
- Context Menu 第一项固定 Lock / Unlock；
- 菜单支持键盘导航、Escape 关闭与焦点恢复；
- 普通操作不使用 Modal；Unsaved Close Guard 是安全例外。

---

## 16. Global State Matrix

组件从同一字典选取状态：

```text
default / hover / focus-visible / pressed / selected / dragging /
locked / processing / saved / error / disabled
```

| State | Required | Forbidden |
| --- | --- | --- |
| hover | 细微可交互提示 | 位移、布局变化、自动展开 |
| focus-visible | 明确键盘位置 | 与 selected 共用唯一表现 |
| pressed | 即时收到操作 | Canvas object 统一缩放 |
| selected | outline / handles | 只用颜色 |
| dragging | 抓取与当前位置清楚 | 松手继续漂移 |
| locked | 锁定语义 + token | 只有装饰小花 |
| processing | 局部进度 | 全屏 spinner / blocking modal |
| saved | 安静确认 | 每次 Toast / 庆祝动画 |
| error | 原因、影响、恢复 | 删除内容 / 只显示红色 |
| disabled | 可理解原因 | opacity 低到无法阅读 |

---

## 17. Density & Zoom

### 17.1 Density Modes

| Mode | Requirement |
| --- | --- |
| Sparse | 背景气质可感，Chrome 与少量对象比例自然 |
| Working | Keyword、Quick Note 与图片关系清楚 |
| Dense | 50+ 图片下避免 blur / shadow 成本和 overlay 堆积 |
| Zoomed-out | 优先保留图片关系，弱化或隐藏文字层 |

### 17.2 Zoom Visibility `PROVISIONAL`

| Zoom | Keyword / Note |
| --- | --- |
| `>= 0.75` | 正常显示 |
| `0.5–0.74` | 弱化次级信息；保留选中对象信息 |
| `< 0.5` | 默认隐藏 Note 文本与非选中 Keyword，保留状态 token |

阈值必须用真实 50+ Image 场景验证后再锁定。

---

## 18. Anti-patterns `EXCLUDED`

- 通用 SaaS 纯白画布与默认灰组件；
- 所有内容统一卡片化、胶囊化；
- 系统导航与按钮使用手写体；
- 胶带、贴纸、图章、纸屑堆叠；
- 强泛黄、强污渍、强噪点；
- 随机旋转、随机错位、随机字体；
- 用户图片统一滤镜；
- 内容层全局玻璃拟态；
- Keyword Hover 自动展开；
- 多个 Keyword Group 同时展开；
- Quick Note 与 Image 宽度脱离；
- 为尚未实现的 Journal / Share 伪造成功路径。

---

## 19. PROVISIONAL 参数验证

### 19.1 只比较五类高风险变量

1. Canvas Background Surface 的强度；
2. System Chrome 的透明度 / blur；
3. Title 与 Quick Note 的 Personal Voice 字号；
4. Keyword Bubble 的紧凑度与最大宽度；
5. Image selected / locked 的状态强度。

每轮最多选择一个轴制作 2–3 个版本，其余参数保持不变。

### 19.2 必测样张

- Sparse Board：3 张图片、1 个 Keyword Group、1 条 Quick Note；
- Working Board：12–20 张图片、混合横竖比例、多组折叠 Keyword；
- Dense Board：50+ 图片、10+ Note、多状态对象；
- 中文：中文 Title + 三行中文 Note；
- English：English Title + three-line English Note；
- Mixed：中英标题、数字、标点和长关键词；
- Window：960×640、1280×800、1440×900；
- Windows display scale：100%、125%、150%。

### 19.3 升级为 LOCKED 的条件

某个候选 token 只有在同时满足以下条件后才能升级：

- 用户在真实全屏界面中拍板；
- Sparse / Working / Dense 均无明显层级问题；
- Windows 字体与缩放测试通过；
- 对比、focus、hit area 与 reduced motion 合格；
- 50+ 图片场景无不可接受性能退化；
- 变更被记录在 Version Notes。

---

## 20. v0.1 Acceptance Checklist

- [ ] 所有视觉值来自 token；
- [ ] System / Personal Voice 与中英映射正确；
- [ ] 没有语言切换 UI；
- [ ] Board Chrome 顺序与位置正确；
- [ ] Default / Custom Title 层级正确；
- [ ] Keyword 为 `First Keyword +N`，Click 展开且最多一组；
- [ ] Quick Note 使用纸面、与 Image 等宽、Compact 三行；
- [ ] Theme 只修改 Background Surface Preference；
- [ ] focus-visible、accessible name 与 hit area 合格；
- [ ] Pan / Zoom / Drag 无展示型动画；
- [ ] reduced motion 生效；
- [ ] Sparse / Working / Dense 截图均已审查；
- [ ] 所有尚未验证的数值仍标记 `PROVISIONAL`。

---

## 21. Version Notes

### v0.1

- 建立可执行 Primitive / Semantic / Component token 基线；
- 锁定 Segoe UI / PingFang SC 与 Chenyuluoyan / momozhuanji 双声道映射；
- 提供首轮 typography、spacing、color、radius、shadow、blur、motion 与 hit-area 候选值；
- 写入 Board Chrome、Title、Keyword、Quick Note、Theme 与 Context Menu 组件规范；
- 建立 Density、Zoom、Accessibility 与高风险视觉样张验证流程；
- 明确 Journal 不进入当前组件实现。

---

# End of DesignSystemRules.md v0.1
