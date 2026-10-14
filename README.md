# AestheticBoard

本地运行的 Electron 灵感板应用，支持图片采集、画布整理、关键词和本地数据保存。

## 准备条件

- Windows。
- 项目文件夹及已安装的 Electron 依赖（`node_modules/electron/dist/electron.exe`）。
- 首次安装依赖、开发或用 PowerShell 启动时，需要 PATH 中可用的 Node.js 和 npm。

这台电脑的项目位置是 `E:\Codex_Projects\AestheticBoard`。如果依赖尚未安装，先运行：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
npm.cmd ci
```

安装依赖需要网络；日常打开本地画布无需网络。远程图片和外部 AI 功能需要网络。

## 方式一：像桌面应用一样打开

首次设置：双击项目内的 `install-shortcuts.cmd`。它为当前 Windows 用户创建三个 `AestheticBoard` 快捷方式：项目文件夹、桌面和开始菜单。无需管理员权限。

之后可以：

- 双击桌面的 **AestheticBoard**。
- 按 Windows 键，搜索 **AestheticBoard**，打开开始菜单中的应用。
- 双击项目文件夹内的 **AestheticBoard.lnk**。

日常快捷方式直接运行 Electron，不会打开 PowerShell 或命令提示符。应用已经运行时，再次打开会唤起已有窗口；最小化的窗口会恢复。关闭窗口后应用退出，下次点击重新启动。可以右键开始菜单快捷方式，选择固定到开始菜单（具体菜单取决于 Windows 版本）。

也可通过 PowerShell 创建快捷方式：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-shortcuts.ps1
```

`-ExecutionPolicy Bypass` 仅用于本次脚本进程，不修改系统执行策略。只想生成项目内快捷方式时，在命令末尾加 `-ProjectOnly`。

这是依赖项目目录的本机快捷启动方案。请保留项目及 `node_modules`；移动文件夹后，在新位置重新运行设置脚本（先删除指向旧位置的同名快捷方式）。当前不是独立安装包，图标沿用 Electron 默认图标。

删除桌面、开始菜单和项目中的快捷方式即可移除启动入口，不影响画布数据。设置脚本遇到指向其他位置的同名快捷方式会停止，以免覆盖它。

## 方式二：用 PowerShell 启动

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
npm.cmd start
```

也可使用原来的 `cmd /c npm start`。使用 `npm.cmd` 可避免 PowerShell 的 `npm.ps1` 执行策略问题。先进入项目目录，避免 `Could not read package.json`。

如果应用已经运行，新的启动只会唤起已有窗口。要让新的环境变量生效，先关闭已有窗口，再从配置好变量的 PowerShell 启动。

## 小窗口采集

拖动窗口四角或边缘可独立调整宽、高。原生窗口最小尺寸为 **360 × 320**（Windows 设备独立像素，包含窗口边框和标题栏），方便与浏览器并排采集资料。关闭后重新打开会恢复已保存的位置和尺寸。

小窗口下：

- 内容区域宽度小于 760px 时，日期和 Day / Weekly / Monthly 切换放在标题下方；工具栏与 Reset View 分列底部。
- 较宽但高度小于 500px 时，控件使用紧凑排列，避免底部入口被裁切。
- 菜单限制在窗口内；较长内容可以滚动。菜单打开时继续缩放窗口也会调整边界。
- 窗口缩放只改变可见范围，不重排图片、修改笔记或改变画布坐标；可继续平移、缩放画布寻找资料。

尺寸限制或界面代码更新后，请完全退出并重新打开桌面应用。启动已有实例只会唤起当前窗口。

## AI 配置与快捷启动

桌面快捷方式不会继承另一个 PowerShell 会话临时设置的 `$env:...`。若希望日常快捷启动也能使用 Qwen，在应用的 **More → Data & Privacy → AI Privacy** 中点击 **Save Qwen key → Choose file**，导入仅含密钥（或 `AESTHETICBOARD_QWEN_API_KEY=value`）的 `.txt`、`.key` 或 `.env` 文件，并启用 Qwen。应用使用 Electron `safeStorage` 加密保存密钥，后续启动从本机配置读取。模型配置详见 [AI 配置文档](docs/AI_PROVIDER_SETUP.md)。

临时开发配置仍可在 PowerShell 中使用：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
$env:AESTHETICBOARD_QWEN_MODEL = "qwen3.7-flash"
$env:AESTHETICBOARD_AI_PROVIDER = "qwen3.7-flash"
$env:AESTHETICBOARD_EXTERNAL_AI_ENABLED = "1"
$env:AESTHETICBOARD_QWEN_API_KEY = "你的 Qwen 或 DashScope API Key"
npm.cmd start
```

不要将真实密钥提交到 Git、写入 Markdown 或放进快捷方式。

## 本地数据

两种桌面启动方式使用相同的数据目录：`%LOCALAPPDATA%\AestheticBoard`，画布和媒体位于其中的 `profile-v1`。改变启动入口不会迁移数据。可在应用内使用 Profile 备份功能备份数据。

## 浏览器预览与检查

仅预览界面：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
node server.js
```

随后在浏览器打开 `http://127.0.0.1:5173`，按 `Ctrl+C` 停止服务。浏览器预览不具备 Electron 的本地持久化、媒体和密钥存储能力。项目目前没有 `npm run dev` 命令。

项目检查：

```powershell
Set-Location E:\Codex_Projects\AestheticBoard
npm.cmd run check
```

Qwen 文本连接检查（从设置了临时 API key 的同一 PowerShell 会话运行）：

```powershell
npm.cmd run check:provider:qwen
```

进度记录见 [PROJECT_STATUS.md](PROJECT_STATUS.md)，原有命令帮助见 [启动 PowerShell 帮助](启动powershell帮助.md)。
