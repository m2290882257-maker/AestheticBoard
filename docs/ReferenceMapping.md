# ReferenceMapping.md — Inspiration Board v0.2

> **文档状态：** v0.2 — Development-synchronized Reference Baseline  
> **当前范围：** Inspiration Board 主体界面；Journal 仅映射入口，不定义内部页面  
> **界面依据：** `默认英文界面.png`、`英文标题键入界面.png`、`中文标题键入.png`  
> **产品依据：** `PRD.md v2.1`（最高事实）、`InformationArchitecture.md v0.4`、`InteractionFlow.md v2.1`、`Architecture.md v2.1`、`VisualDirection.md`  
> **用途：** 将视觉参考逐项映射为可开发、可验证、不会被 AI 擅自解释的界面事实

---

## 0. 文档目的

Reference Mapping 负责回答：

- 设计稿中的每个区域在产品中是什么；
- 它对应哪个组件、信息对象与行为规则；
- 哪些视觉只能作为方向参考，不能直接抄成参数；
- 哪些内容已经锁定，哪些仍需 Design System 或真实原型验证；
- Codex、Stitch 与 Google AI Studio 应以哪份文档作为最终行为依据；
- 当前设计稿与旧 PRD / Interaction Flow 不一致时，应采用什么规则。

它处在以下文档之间：

> Visual Reference → Reference Mapping → Design System Rules → Components → Implementation

本文档不替代：

- PRD：不重新定义完整产品范围；
- Information Architecture：不重画产品页面树；
- Interaction Flow：不展开完整事件时序；
- Design System：不锁定全部 px、hex、字体和动效参数；
- Development Specs：不描述技术实现细节。

---

## 1. 参考依据与权威层级

用户明确要求变更时，先更新 PRD；**更新后的 PRD 是最高产品事实**。其余文档按任务读取：页面归属读 IA，行为读 Interaction Flow，技术边界读 Architecture / Development Specs，视觉实现读本文件、Visual Direction 与 Design System。AI 或前端框架默认样式永远没有覆盖权。

AI 不得因为设计稿中出现某个占位菜单、鼠标指针或同时展示的多个状态，就将其全部推断为运行时功能。

---

## 2. 界面参考清单

| Ref ID | 文件 | 主要证明内容 | 不直接证明 |
| --- | --- | --- | --- |
| `REF-BOARD-01` | `默认英文界面.png` | 默认时间标题、Board Chrome、Canvas 密度、图片、关键词、Quick Note、Context Menu 的总体关系 | 多组关键词可同时展开；菜单中的全部文案已确认 |
| `REF-BOARD-02` | `英文标题键入界面.png` | 英文自定义标题为主信息；日期／范围成为次级信息 | 英文字体最终型号、字号和字距 |
| `REF-BOARD-03` | `中文标题键入.png` | 中文标题与英文标题共享信息结构，但使用不同字体映射 | 中文字体最终型号、混排 fallback 与授权状态 |

### 2.1 设计稿中的状态展示说明

`REF-BOARD-01` 同时绘制了多个 Expanded Keyword Group，是为了在一张画面中展示组件状态。实际运行规则为：

- 同时最多一个 Expanded Keyword Group；
- 激活新组时上一组折叠；
- 点击 Canvas 空白时当前组折叠；
- Copy 后当前组保持展开；
- 不提供单独 Close Button。

---

## 3. 页面区域映射

| Zone ID | 页面区域 | 位置证据 | 产品角色 | 主要组件 |
| --- | --- | --- | --- | --- |
| `Z-01` | Title Area | 左上 | 页面身份与时间身份 | Default Temporal Title / Custom Title / Secondary Date |
| `Z-02` | Global Action Bar | 标题下方左侧 | 从当前 Board 发起全局动作 | More / Journal / Theme / Download-Share / Trash |
| `Z-03` | Temporal Controls | 右上 | Day 导航与时间视图切换 | Previous / Today / Next / View Mode Selector |
| `Z-04` | Canvas Surface | 主体区域 | 无限空间工作台 | Infinite Canvas / Viewport / Background Surface |
| `Z-05` | Image Object Layer | Canvas 内 | Capture 素材与空间关系 | Image Object / Selection / Resize / Lock |
| `Z-06` | Keyword Layer | 图片上方或侧上方 | AI 生成的工作语义 | First Keyword +N / Expanded Group / Copy |
| `Z-07` | Quick Note Layer | 图片下方 | 与图片绑定的个人短注释 | Lined Paper Surface / Compact / Expanded |
| `Z-08` | Contextual Layer | 指针或对象附近 | 右键上下文命令 | Image Context Menu / Canvas Context Menu |
| `Z-09` | Feedback Layer | 对象局部或轻量全局 | 保存、复制、AI、错误状态 | Processing / Saved / Error / Retry |

---

## 4. Title Area Mapping

### 4.1 Default Temporal Title

**Reference：** `REF-BOARD-01`

无自定义标题时：

- 当前日期或日期范围作为主标题；
- 不显示 `Untitled`；
- 主标题使用 Personal / Human Voice；
- 时间信息仍是页面身份，不是装饰文字。

### 4.2 Custom English Title

**Reference：** `REF-BOARD-02`

用户键入英文标题后：

- Custom Title 成为主信息；
- Date / Date Range 缩小并降低视觉权重；
- 两者保持同一 Title Area，不拆成两块 Header；
- 英文标题使用 Voice B English Mapping。

### 4.3 Custom Chinese Title

**Reference：** `REF-BOARD-03`

用户键入中文标题后：

- 信息结构与英文标题一致；
- 中文标题使用 Voice B Chinese Mapping；
- 日期／范围继续使用系统信息层的映射；
- 用户不需要手动切换中文／英文模式。

### 4.4 Title 相关状态

| 状态 | 必须出现 | 当前状态 |
| --- | --- | --- |
| Default | 日期／范围作为主标题 | `LOCKED STRUCTURE` |
| Editing | 可读、可输入、不会移动 Canvas Objects | `BEHAVIOR TO SPEC` |
| Custom English | 英文主标题 + 次级日期 | `LOCKED STRUCTURE` |
| Custom Chinese | 中文主标题 + 次级日期 | `LOCKED STRUCTURE` |
| Mixed Script | 自动字体 fallback | `DESIGN SYSTEM OPEN` |
| Empty After Delete | 回到默认时间标题 | `BEHAVIOR TO SYNC` |

---

## 5. Global Action Bar Mapping

Inspiration Board 是默认主体，因此操作栏不出现 Board / Home Icon。

### 5.1 固定顺序

| Order | Icon Meaning | Component ID | 目标 | 当前决定 |
| ---: | --- | --- | --- | --- |
| 1 | More | `action.more` | 低频能力与 Preferences | 结构已确认，内部清单待收敛 |
| 2 | Journal | `action.journal` | Journal Gateway | 只开发入口边界，不开发 Journal 主体 |
| 3 | Moon / Theme | `action.theme` | Background Surface Picker | 已确认 |
| 4 | Download / Share | `action.export` | Board Export & Share Menu | 意图确认，格式与分享方式开放 |
| 5 | Trash | `action.trash` | Trash | 已确认，具体页面 P1 |

### 5.2 More Menu Mapping

| Group | 候选项 | 不应混入 |
| --- | --- | --- |
| Workspace | Always-on-top、窗口恢复 | Theme、Journal、Trash |
| Canvas Display | Keyword Visibility、低缩放信息显隐 | Day / Week / Month |
| Preferences | Accessibility、Reduced Motion、输入与显示偏好 | 中英文切换 |
| Data & Privacy | Profile、备份、AI 数据说明 | Board Download |
| Help & About | 快捷键、帮助、版本信息 | 核心 Search |

### 5.3 Journal Gateway Mapping

点击 Journal Icon 后，目标信息结构为：

- Add Selected Images to Journal Inbox；
- Add Current Day to Journal Inbox；
- Open Journal Cabinet。

Journal 尚未设计，因此当前开发阶段可以：

- 完成 Icon、Tooltip、Popover 与禁用／Coming Later 状态；
- 保留事件接口；
- 不制作 Cabinet、Book、Inbox 和 Journal Canvas 的真实页面。

不得把素材从 Board 移走；未来添加只能建立 Source Reference。

### 5.4 Theme Mapping

Moon Icon 打开 Background Surface Picker：

- 内置 Quiet Paper 候选；
- 用户上传自定义底板；
- 当前 Selected Surface；
- Restore Default。

Theme 只改变 Canvas Background，不处理图片滤镜、字体映射或 Journal 风格。

### 5.5 Download / Share Mapping

当前确认：

- Download Current Page；
- Share Current Page。

仍需定义：

- 输出当前 Viewport、全部内容边界还是用户选择区域；
- 是否包含背景、Keyword、Quick Note 和系统 Chrome；
- PNG / JPEG / PDF 等格式；
- Share 是系统分享、复制文件还是未来链接。

在这些问题未确认前，可以制作菜单信息结构和禁用／占位状态，不应伪造公开分享链接。

---

## 6. Temporal Controls Mapping

### 6.1 Previous / Today / Next

**Reference：** 三张页面右上第一行。

| Control | 信息职责 | 当前规则 |
| --- | --- | --- |
| Previous | 进入前一 Day | 加载该 Day Scene 与 Camera |
| Today | 返回当前日期 | 不覆盖其他 Day 的 Geometry |
| Next | 进入后一 Day | 加载该 Day Scene 与 Camera |

### 6.2 View Mode Selector

**Reference：** 三张页面右上第二行。

折叠态显示当前 Mode；展开后提供：

- Day Mode；
- Weekly；
- Monthly。

命名仍可调整，但信息关系已确定：Day 是原始可编辑空间，Weekly / Monthly 是时间压缩投影。

Day Navigation 与 View Mode 不进入左侧 Global Action Bar。

---

## 7. Canvas & Image Mapping

### 7.1 Canvas Surface

**Reference：** 三张页面的纸面主体。

映射规则：

- Quiet Field；
- Infinite Canvas；
- Background Surface 与系统 Chrome 分离；
- 空 Canvas 仍然是正常工作台；
- 不出现大型 CTA、模板选择或分类入口。

### 7.2 Image Object

**Reference：** 不同比例、尺寸、位置与重叠的图片。

映射规则：

- 保持原图比例；
- 用户自由决定位置与尺寸；
- 不统一为卡片网格；
- Image、Keyword 和 Quick Note 形成一个强关联单元；
- 系统 Overlay 不改变 Image Geometry；
- 指针图形只是设计说明，不是持久组件。

### 7.3 Context Menu

设计稿中的菜单证明需要右键上下文层，不证明全部菜单文案。

| Context | 已确认 | 待定义 |
| --- | --- | --- |
| Image | 第一项 Lock / Unlock | Note、Layer、Delete 的最终顺序与快捷键 |
| Canvas | 独立于 Image Menu | Undo、Redo、Paste、Select All 等精确清单 |

---

## 8. Keyword Mapping

### 8.1 Folded State

默认常显：

> `First Keyword +N`

其中 `N = 总关键词数量 - 1`。

它虽然像 Tooltip，但属于持久 Keyword Bubble，不是 Hover 后才出现的信息。

### 8.2 Expanded State

点击 Folded Bubble 后：

- 展示完整 Keyword Group；
- 每个 Keyword 后显示 Copy Icon；
- 点击 Keyword / Copy Icon 复制该词；
- Copy 后当前组保持展开。

### 8.3 Exclusivity

- 同时最多一个 Expanded Keyword Group；
- 点击另一组时，上一组恢复为 `First Keyword +N`；
- 点击 Canvas 空白时，当前组折叠；
- 不提供 Close Button；
- 展开／折叠不改变 Image Geometry、z-order 或 Quick Note 内容。

### 8.4 Pin First Keyword

用户可以把任意 Keyword Pin 为新的首词。Pin 后：

- Folded State 显示新首词；
- `+N` 数量不改变；
- 其他 Keywords 不删除；
- AI Refresh 不覆盖用户 Pin。

---

## 9. Quick Note Mapping

### 9.1 Surface

**Reference：** 图片下方横线纸。

- 使用用户提供的横线纸 PNG；
- Note Surface 与绑定 Image 等宽；
- 图片 Resize 后 Note Width 同步更新；
- 纸张纹理的拉伸、平铺或切片实现进入 Development Specs。

### 9.2 Compact State

- 中文最多三行；
- 英文最多三行；
- 超出内容截断并提供展开能力；
- 空 Note 不显示持续输入框或未完成提醒。

### 9.3 Expanded State

- 宽度继续与 Image 一致；
- 高度按完整段落自然增长；
- 不推动其他图片；
- 不触发 Auto Layout；
- Image Locked 时仍可查看和编辑。

### 9.4 Typography

- 展示态使用 Voice B；
- 英文 Personal Voice 固定使用 Chenyuluoyan，覆盖 English Title、English Quick Note 与其他非系统英文文字；
- 中文 Personal Voice 固定使用 momozhuanji，覆盖中文 Title、中文 Quick Note 与其他非系统中文文字；
- 不提供语言切换；
- 混排、数字、标点和字体加载失败进入 Design System Typography Mapping。

---

## 10. Visual Truth vs Product Truth

| 设计稿中看见的内容 | 正确解释 | 错误解释 |
| --- | --- | --- |
| 多组关键词展开 | 在一张稿中展示多种组件状态 | 运行时允许无限多组同时展开 |
| Figma / OS 风格菜单 | Context Menu 的形态占位 | 菜单每一项都是已确认需求 |
| Pointer Cursor | 操作情境说明 | 需要在产品中画一个固定鼠标图标 |
| Moon | Background Theme | Dark Mode 已确认 |
| Download Icon | Download + Share Gateway | 已确认生成公开链接 |
| Journal Icon | Board 到 Journal 的出口 | Journal 主体已进入当前开发范围 |
| 手写标题 | 用户／私人声音 | 所有系统文字都使用手写字体 |
| 多种图片尺寸 | 用户空间表达 | 系统随机改变图片尺寸与位置 |

---

## 11. Component → Document Mapping

| Component | IA | Interaction Flow | Design System | Development Specs |
| --- | --- | --- | --- | --- |
| Title Area | 信息层级与角色 | 编辑、保存、清空 | 字体映射、字号、颜色 | 输入框与布局实现 |
| Global Action Bar | 入口顺序与目的 | 打开／关闭、焦点 | 尺寸、材质、状态 | 响应布局与事件 |
| Temporal Controls | Day / View 层级 | 导航与恢复 | 控件 tokens | 日期查询与 Scene Loading |
| Image Object | 对象归属 | Select / Move / Resize | 边界、Handles、状态 | 坐标与渲染 |
| Keyword | 信息结构 | Expand / Collapse / Copy / Pin | Bubble、字体、状态 | Overlay、Clipboard、AI |
| Quick Note | 强绑定与三行规则 | Create / Edit / Expand | 字体、纸面、间距 | 文本测量、PNG 切片 |
| Context Menu | 上下文分类 | Right Click / Dismiss | Menu 样式与焦点 | Portal、边界吸附 |
| Theme Picker | 背景所有权 | Select / Restore | Surface tokens | 资源与持久化 |
| Download / Share | 输出意图 | Export Flow | Menu / Feedback | 文件生成与系统分享 |
| Journal Gateway | 单向引用出口 | Add / Open / Failure | Popover / Disabled | 未来接口；当前不实现主体 |

---

## 12. “少数高风险参数的可切换视觉样张”是什么意思

它不是要求再做三套完整产品，也不是在开发前把所有参数研究完。

它的意思是：

> 对少数会显著改变产品气质、但仅凭静态设计稿无法可靠拍板的视觉决定，在同一个真实页面中准备 2–3 个可即时切换的版本。用户使用同一批图片、同一窗口尺寸和同一交互状态比较，然后选定一个进入正式 tokens。

### 12.1 一个具体例子

以 Background Surface 为例：

- Variant A — Paper Light：纹理很轻；
- Variant B — Paper Present：纸感更明显；
- Variant C — Editorial Flat：接近纯色，只保留微颗粒。

页面右侧只增加一个开发期 Variant Switcher。切换时图片、布局、关键词和 Note 完全不变。这样你判断的是“背景强度”，而不是被不同构图干扰。

选定后：

1. 将选中值写入 `DesignSystemRules.md`；
2. 删除开发期 Variant Switcher；
3. 未采用版本不进入正式产品。

### 12.2 为什么要这样做

字体、透明度、背景纹理、阴影和 Bubble 密度很难仅凭 Markdown 判断。直接把临时参数写死，开发后往往需要大范围返工；但为所有参数做方案又会拖延。

因此只处理少数“高杠杆、高不确定、修改成本高”的项目。

### 12.3 现在已经不需要再比较的内容

- 页面大区布局；
- 左侧 Action Bar 的五个入口及顺序；
- 右上时间控制分区；
- Default Title / Custom Title / Secondary Date 的信息层级；
- `First Keyword +N` 信息结构；
- 同时最多一个 Expanded Keyword Group；
- Quick Note 与图片等宽；
- Compact Quick Note 最多三行；
- Board 是默认主体，Journal 暂不开发。

### 12.4 建议只做的高风险样张

| Priority | 变量 | 建议版本数 | 为什么需要真实页面 |
| ---: | --- | ---: | --- |
| 1 | Background Surface 强度 | 3 | 会影响整个产品是“温柔纸面”还是“脏、旧、抢内容” |
| 2 | Action Bar / Temporal Controls 的玻璃强度 | 3 | 透明度、blur、border 必须在复杂图片与纸面上验证 |
| 3 | Keyword Bubble 密度 | 3 | 字号、padding、radius、边界会决定是否像 SaaS 标签墙 |
| 4 | Quick Note 纸面与文字关系 | 3 | PNG 纹理、行距和三行高度需要真实中英文验证 |
| 5 | Image Selected / Locked 状态 | 2–3 | 必须清楚但不能破坏图片观看 |

不建议在开发前继续为每个按钮、每种颜色和每个间距制作多版本。

---

## 13. Style Guide / DesignSystemRules 还需要什么

### 13.1 已经具备

- Personal Editorial Archive 视觉方向；
- Quiet Field / Human Trace / Controlled Irregularity；
- 真实页面布局；
- 中英文标题状态；
- Global Action Bar；
- Temporal Controls；
- Keyword Folded / Expanded；
- Quick Note 的基本外形和三行规则；
- 动效、可访问性与 token 架构的专业工程依据；
- `LOCKED / PROVISIONAL / OPEN / EXCLUDED` 决策体系。
- System Voice 字体文件：Segoe UI（英文）与 PingFang SC（简体中文）；
- Personal Voice 字体映射：Chenyuluoyan = 英文非系统文字；momozhuanji = 中文非系统文字；
- Background Surface 候选与当前 Icon Set 已由用户在本地整理，开发时接入 Asset Registry。

### 13.2 仍需用户提供或拍板

| 内容 | 最小材料 | 不要求用户提供 |
| --- | --- | --- |
| Voice A | **已完成：** Segoe UI / PingFang SC | 精确 CSS 参数 |
| Voice B Mapping | **已完成：** Chenyuluoyan = 英文；momozhuanji = 中文；均覆盖 Title、Quick Note 等非系统文字 | 自己计算字号阶梯与 fallback 代码 |
| Quick Note PNG | 原始透明／可用 PNG | 自己决定切片算法 |
| Background Surfaces | **资产已就绪；**开发时确认目录、默认项与候选 ID | 自己给出纹理 opacity |
| Icons | **资产已就绪；**开发时确认目录与 Icon → Action 映射 | 自己处理 hit area |
| Accent Marks | 2–4 个喜欢的小面积颜色参考 | 自己给 hex |
| Visual Variants | 在上述 5 项中做选择 | 比较所有组件的多个版本 |

### 13.3 可由 Codex 直接完成

- Primitive / Semantic / Component token 命名；
- spacing scale；
- typography scale 与 fallback 结构；
- radius、border、shadow、blur、opacity 范围；
- hit area、focus-visible 与 keyboard 状态；
- hover、pressed、selected、locked、processing、saved、error、disabled；
- motion duration、easing 与 reduced motion；
- z-index 与 Overlay 层级；
- Sparse / Working / Dense / Zoomed-out 显隐策略；
- Windows 11 在 100% / 125% / 150% 缩放的验收要求；
- 组件 token 与 CSS variables；
- Open 项、候选值和升级为 Locked 的验证记录。

### 13.4 需要通过真实开发验证

- 字体在 Windows 11 的真实渲染；
- 中英文混排是否引起高度跳动；
- Quick Note PNG 如何随宽度和内容高度扩展；
- 半透明控件在浅图、深图、复杂图和纯背景上的对比；
- 50+ 图片时 blur、shadow、texture 与 Overlay 的性能；
- 小窗口下 Title、Action Bar 与 Temporal Controls 是否冲突；
- Keyword `+N` 在长英文词和中文词中的宽度上限；
- 低 Zoom 下 Keyword、Note 和 Lock Token 的退让阈值。

---

## 14. Style Skill / Prompt Spec 还需要什么

Prompt Spec 不是再次描述“要温柔、要高级”。它需要把 AI 的工作边界、输入顺序和验收方式写成可执行协议。

### 14.1 必须包含的读取与权威协议

1. **每项开发任务先读最新 PRD；PRD 是最高产品事实。**
2. 再按任务选择直接依据：
   - 页面与信息归属：Information Architecture + Reference Mapping；
   - 状态与操作时序：Interaction Flow；
   - 进程、数据与安全：Architecture + Development Specs；
   - AI Keyword：System Prompt Architecture；
   - 视觉组件：Visual Direction + Design System Rules + 当前设计稿与 assets。
3. Product Constitution / `AGENTS.md` 若存在，约束工作方式，但不得静默改写 PRD 的产品事实。
4. 发现冲突时停止该冲突部分并报告，不自行折中。

### 14.2 必须包含的实施协议

- 一次只实现一个明确 slice；
- 先列出将使用的组件、tokens、assets 和行为规则；
- 不引入未在 IA / PRD 中存在的新页面；
- 不用 UI library 默认样式覆盖视觉系统；
- 不把 `OPEN` 候选值伪装为 Locked；
- 不把 Journal 主体提前并入 Board 开发；
- 不改变用户图片位置、比例与颜色；
- 不用随机旋转、胶带、贴纸制造“手作感”；
- 所有状态必须映射到统一状态字典；
- 完成后提供截图、状态矩阵和未解决差异。

### 14.3 必须包含的生成输出格式

每次实现任务至少输出：

1. Scope；
2. Sources Read；
3. Components Reused / Created；
4. Tokens Used / Added；
5. States Implemented；
6. Accessibility Checks；
7. Screenshot Comparison；
8. Known Deviations；
9. Files Changed；
10. Verification Result。

### 14.4 需要准备的任务模板

- Build Board Shell；
- Build Title Area；
- Build Global Action Bar；
- Build Temporal Controls；
- Build Image Object State；
- Build Keyword Bubble；
- Build Quick Note；
- Build Context Menu；
- Review Against Reference；
- Create 3 Visual Variants；
- Promote Selected Variant to Tokens。

### 14.5 不同生成工具的侧重点

| Tool | 应承担 | 不应承担 |
| --- | --- | --- |
| Codex | 产品代码、状态、tokens、测试、截图校对 | 凭感觉重新设计产品 |
| Stitch | 快速探索局部视觉方案和页面变体 | 决定数据模型与持久化 |
| Google AI Studio | 辅助 Prompt / AI 关键词能力验证 | 决定 Board 交互和视觉真值 |

---

## 15. 今晚进入开发前的最小闭环

不需要等所有 Style Guide 参数最终锁定，今晚可以开始开发。但开始前应完成一个最小文档同步闭环。

### 15.1 已完成的核心同步

- PRD v2.1：Action Bar、Title、Theme、Journal Gateway、Download / Share、Keyword、Quick Note；
- Interaction Flow v2.1：Click Expand、单一 Active Keyword Group、三行 Quick Note、Action Bar 菜单；
- Development Specs v2.1：页面区域、组件状态、PNG Note、字体资产与响应布局；
- System Prompt v2.2：P0 Keyword 固定 `en-US`，无语言切换 UI；
- Architecture v2.1：Theme 资源、Board Export 与未来 Journal Reference 的扩展边界。

### 15.2 可以保持开放

- Journal 主体页面；
- Month 最终视觉；
- Search 页面；
- Share 的 Cloud Link；
- Personal Voice 的字号、行高与混排 fallback 样张验证；
- 最终色值与纹理 opacity；
- 高密度阈值。

### 15.3 今晚建议开发的第一条 Vertical Slice

只实现：

> Board Shell → Title Area → Global Action Bar → Temporal Controls → 静态 Canvas → 1 个 Image Object → `First Keyword +N` → 单组展开／复制 → 三行 Quick Note

暂不实现：

- Journal 主体；
- Week / Month 数据投影；
- 正式 Download / Share；
- 完整 Trash；
- 最终主题库；
- 所有高保真动效。

这条 Slice 足以验证页面比例、字体层级、Bubble 密度、Note 纸面和整体气质，是当前最快得到“真实可判断界面”的路径。

---

## 16. Development Readiness Gate

满足以下条件即可开始主体开发：

- [x] Board 页面大区布局存在；
- [x] Title 三种状态存在；
- [x] Global Action Bar 信息结构存在；
- [x] Temporal Controls 信息结构存在；
- [x] Keyword Folded / Expanded 规则存在；
- [x] Quick Note 宽度与行数规则存在；
- [x] IA 已更新；
- [x] Reference Mapping 已建立；
- [x] 关键旧文档完成同步；
- [ ] 第一版 Style Guide 写入可执行候选 tokens；
- [ ] Prompt Spec 写入任务协议与验收格式；
- [x] 字体文件已提供；Background 与 Icon 资产已由用户整理，开发时登记目录；

最后四项不需要全部达到“最终版”，但必须至少有一版可执行状态，避免开发者自行补全。

---

## 17. Version Notes

### v0.2

- 将更新后的 PRD v2.1 设为最高产品事实；
- 改为“PRD 优先 + 按任务读取直接依据”的 Prompt Spec 协议；
- 记录四个字体资产与 System Voice 映射；
- 锁定 Personal Voice 按语言分配：Chenyuluoyan（英文）/ momozhuanji（中文）；
- 记录 Background 与 Icon Set 已就绪；
- 标记核心产品、交互、工程、AI 与架构文档同步完成。

### v0.1

- 建立三张 Board 界面的引用清单；
- 完成页面区域、Title、Action Bar、Temporal Controls、Canvas、Image、Keyword、Quick Note 与 Context Menu 映射；
- 区分 Visual Truth 与 Product Truth；
- 明确单一 Active Keyword Group；
- 解释少数高风险参数的可切换视觉样张；
- 列出 Style Guide 与 Prompt Spec 的剩余输入；
- 建立今晚进入开发前的最小闭环与第一条 Vertical Slice。

---

# End of ReferenceMapping.md v0.2
