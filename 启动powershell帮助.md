# 启动 PowerShell 帮助

## 1. 正常启动桌面端

日常免终端启动：首次双击项目中的 install-shortcuts.cmd 创建桌面和开始菜单的 AestheticBoard 快捷方式，之后直接点击即可。完整说明见 [README.md](README.md)。

如果你看到 `Could not read package.json`，通常是因为 PowerShell 当前目录在 `C:\Windows\System32`，而不是项目目录。

请先切到项目目录，再启动：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
cmd /c npm start
```

也可以用预览服务：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
node server.js
```

## 2. 启动带 Qwen AI 的桌面端

快捷方式不会继承其他 PowerShell 会话的临时环境变量。建议在应用的 AI Privacy 中导入并加密保存 Qwen key。使用下方临时变量前，先关闭已有应用窗口。

API key 不要写进代码、Markdown、截图或 Git。只在当前 PowerShell 会话里临时设置：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
$env:AESTHETICBOARD_QWEN_MODEL = "qwen3.7-flash"
$env:AESTHETICBOARD_AI_PROVIDER = "qwen3.7-flash"
$env:AESTHETICBOARD_EXTERNAL_AI_ENABLED = "1"
$env:AESTHETICBOARD_QWEN_API_KEY = "你的 Qwen 或 DashScope API Key"
cmd /c npm start
```

也可以用 `DASHSCOPE_API_KEY` 作为备用变量名。

## 3. 检查 Qwen 连接

同一个 PowerShell 会话里运行：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
cmd /c npm run check:provider:qwen
```

如果返回 `AI_MISSING_API_KEY`，说明这个 PowerShell 会话没有读到 `AESTHETICBOARD_QWEN_API_KEY` 或 `DASHSCOPE_API_KEY`。

## 4. 当前文档位置

核心开发文档已经统一放到 `docs/` 目录，避免根目录堆太多重复 Markdown：

- `PROJECT_STATUS.md` 仍保留在根目录，作为当前进度总账。
- 产品和设计规范在 `docs/PRD.md v2.1 — Capture-first Temporal Spatial Inspiration Board.md`、`docs/DevelopmentSpecs.md`、`docs/Architecture (1).md` 等文件中。
- Qwen prompt 在 `docs/QWEN_KEYWORD_PROMPT.md`。

## 5. 常用检查

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
cmd /c npm run check
```

这个检查会覆盖前端脚本、Electron 主进程、持久化、媒体、导入导出、搜索、AI provider 基础路径和恢复检查。
