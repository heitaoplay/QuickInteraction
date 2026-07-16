![快捷互动 Banner](docs/assets/banner.svg)

# 快捷互动 · QuickInteraction

> Bondage Club 社区辅助脚本 · 用 Tampermonkey 一键安装，支持自动更新

[![Version](https://img.shields.io/badge/version-0.6.0-FF5C7A)](https://github.com/heitaoplay/QuickInteraction/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Bondage%20Club-FF5C7A)](https://bondageclub.com)
[![Tampermonkey](https://img.shields.io/badge/engine-Tampermonkey-FF5C7A)](https://www.tampermonkey.net/)
[![Maintained](https://img.shields.io/badge/maintained-yes-FF5C7A)](https://github.com/heitaoplay/QuickInteraction/commits)

**快捷互动 · QuickInteraction** 是一个 Bondage Club 动作快捷操作台。它把原本要层层点开的原生菜单，收敛成一个悬浮操作面板——进入动作模式后，直接在人物身上点部位就能选动作，一步到位。

---

## 为什么需要它 (Why)

BC 原生的动作菜单层级深、步骤多，想对一个角色做一个动作往往要翻好几层。快捷互动 的思路很简单：

- **少点几层**：房间内每个人物身上直接出现可点的部位热区，点一下就出动作列表
- **批量省力**：同一个动作一键对全房间人执行，不用挨个来
- **常用常驻**：把高频动作收藏、把连招存成组合，下次一键触发
- **看得顺眼**：暗色战术操作台风格，面板可拖拽可缩放，角色名字自动避让屏幕裁切

---

## 安装 (Installation)

### 📥 一键安装（Tampermonkey）

[![Install QuickInteraction](https://img.shields.io/badge/Install-Tampermonkey-FF5C7A?logo=tampermonkey&logoColor=white)](https://github.com/heitaoplay/QuickInteraction/raw/main/quick-interaction.user.js)

> 点击上方按钮，或直接打开 [安装脚本链接](https://github.com/heitaoplay/QuickInteraction/raw/main/quick-interaction.user.js)，Tampermonkey 会自动弹出安装提示。脚本自带 `@updateURL`，安装后默认开启自动更新，以后发新版会自动收到。

### 方法一：脚本管理器（推荐）

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey 等同类管理器）
2. 打开本仓库的 [`quick-interaction.user.js`](quick-interaction.user.js) 文件页，点右上角 **Raw**（原始文件）
3. Tampermonkey 会自动弹出安装提示，点「安装」即可
4. 安装后默认开启「自动更新」，以后发布新版本会自动收到，无需手动重装

> ⚠️ 安装链接已指向本仓库地址 `heitaoplay/QuickInteraction`；若你 fork 到自己的账号，请把链接里的用户名改成你的。

### 方式二：从 Greasy Fork / 第三方源

若你习惯用脚本市场分发，也可把 Release 里的 `quick-interaction.user.js` 上传到对应平台，再从平台安装。脚本自带 `@updateURL` / `@downloadURL`，安装后仍可自动更新。

### 依赖 (Dependencies)

- 需要 Bondage Club 官方网页客户端（含 `bondageclub.com` 及其镜像站点）
- 自动依赖 **bcModSdk**（脚本已通过 `@require` 引入，无需手动安装）
- 兼容 ECHO 服装拓展、LSCG 等社区动作扩展

---

## 功能模块 (Features)

### 🎯 动作模式 (Action Mode)
- 进入后房间内每个人物身上出现线框热区，点部位即弹出该部位可用动作列表
- 热区跟随角色移动与人数变化实时刷新
- 兼容 ECHO 情绪动作、LSCG、Liko-Prank 等社区动作包（剪衣 / 拔呆毛等已验证可用）

### 🧍 自己模式 (Self Mode)
- 开启后可对自己使用动作，自己的身体也会出现线框热区
- 自己对自己的动作自动走 `ChatSelf-` 文案，不会出现 `MISSING` 占位

### 👥 全员模式 (All-Room)
- 一键对房间内所有其他成员执行当前选中的动作
- 当前选中的目标会排到执行首位，其余随后

### ⭐ 收藏 (Favorites)
- 把常用动作标星，在列表中以高亮底色 + 填充星标突出
- 收藏模式下点击动作即加入 / 取消收藏，不再执行
- 底部垃圾桶按钮可一键清空全部收藏

### 🔗 自定义组合 (Combos)
- 把多个「部位 + 动作」存成一个连招，可逐条增删
- 每步间隔可在 50–2000ms 间调节（默认 160ms）
- 组合可整体执行、编辑、删除，支持一键对全场释放


### 🔌 社区拓展兼容 (Extensibility)
- 优先读取 ECHO 自定义 `Panties_*` 等拓展物品，聊天里显示真实物品名而非占位符
- 对无官方翻译的中文动作名（如「张开嘴」「流口水」）直接放行，避免乱码

---

## 功能对比 (Comparison)

| 能力 | 原生菜单 | 快捷互动 · QuickInteraction |
| --- | :---: | :---: |
| 点部位直接出动作 | ❌ | ✅ |
| 对自己使用动作 | ❌ | ✅ |
| 一键对全房间执行 | ❌ | ✅ |
| 动作收藏 | ❌ | ✅ |
| 多步连招组合 | ❌ | ✅ |
| 自定义面板布局 | ❌ | ✅ |
| 社区拓展兼容 | 部分 | ✅ |

---

## 工作原理 (How it works)

快捷互动 不修改游戏逻辑，只是在官方客户端之上做了一层**交互增强**：

1. 通过 **bcModSdk** 注册为模组，等待玩家登入后初始化
2. 在每帧绘制时记录每个角色的真实屏幕坐标（含拥抱等位移），据此生成对齐的线框热区
3. 点击热区时，调用游戏内置的 `ActivityAllowedForGroup` 取该部位当前可用动作
4. 执行动作时优先用标准 `ChatRoomChat` 协议发包；对依赖 `FocusGroup` 的社区动作（如 Liko-Prank 剪衣）会临时补全作用部位再发送
5. 所有面板状态、收藏、组合、布局都存进 `localStorage`，刷新页面不丢

> 💡 想看更详细的质量审查与代码规范，见 [docs/review.md](docs/review.md) 与 [docs/code-standards.md](docs/code-standards.md)。

---

## 使用指北 (Usage)

1. 进入 BC 聊天室
2. 右下角出现一个浮动开关，**点一下**进入「动作模式」
3. 点人物身上高亮部位 → 选动作 → 执行
4. 底部按钮按需切换：
   - **自己**：对自己可用
   - **全员**：对房间内所有人执行
   - **收藏**：进入收藏管理（点动作=加/取消收藏）
   - **组合动作**：切到自定义连招列表

---

## 常见问题 (FAQ)

**Q：装完没反应 / 找不到浮动开关？**
A：确认 Tampermonkey 已启用本脚本，且你正处于 BC 聊天室页面。刷新一次页面通常即可。

**Q：聊天里出现 `MISSING ACTIVITY DESCRIPTION`？**
A：一般是该动作在当前目标身上不可用或被其他模组拦截。快捷互动 已对「自己对自己」走专用文案，正常情况下不会触发。

**Q：为什么有的动作点下去没效果？**
A：动作是否真能执行取决于游戏状态（如目标是否穿着对应物品、是否被拘束）。脚本只负责把动作发到游戏，最终由游戏判定。

**Q：换电脑 / 清缓存后收藏没了？**
A：收藏与组合存在浏览器 `localStorage`，换设备或清缓存会丢失。目前为本地存储，未做云端同步。

**Q：能关掉后台日志吗？**
A：生产版默认已关闭调试日志（头部 `DEBUG = false`）。需要排障时临时改为 `true` 即可在控制台看到详细输出。

---

## 更新日志 (Changelog)

### v0.6.0
- 内部结构重构：23 个散落全局变量归并为单一 `state` 对象；重复逻辑合并为 `findAllowedActivity` / `comboDelay` / `orderBySelectedTarget` 公共函数
- 调试日志剥离生产代码，错误不再被静默吞掉

### v0.5.9
- 修复 Liko-Prank 剪衣 / 拔呆毛因缺 `FocusGroup` 导致的无效执行

### v0.5.8
- 修复「自己对自己」动作因缺 `ChatSelf-` 文案导致的 `MISSING` 报错

### v0.5.7
- 自己模式放开对 ECHO / LSCG 中文动作名的加载过滤

### v0.5.6
- 新增自己模式、下排角色名字显示、一键清空收藏

> 更早版本见 [docs/review.md](docs/review.md) 中的质量审查记录。

---

## 开发 / 贡献 (Development)

- 代码规范：[docs/code-standards.md](docs/code-standards.md)
- 质量审查：[docs/review.md](docs/review.md)
- 排障开关：脚本头部 `const DEBUG = false;`，需要控制台日志时改为 `true`
- 欢迎提 Issue 与 Pull Request

---

## 作者与支持 (Author & Support)

- **作者 (Author)**：Tao MUSE（游戏内显示名：𝐓𝐀𝐎 𝑀𝒰𝒮𝔼）
- **技术支持 (Technical Support)**：Liko — [liko-Plugin-Repository](https://github.com/awdrrawd/liko-Plugin-Repository)
- **反馈与建议**：欢迎在仓库 [Issues](https://github.com/heitaoplay/QuickInteraction/issues) 提出

## 许可证 (License)

[MIT](LICENSE) © 2026 Tao MUSE

---

⚠️ **免责声明**：本脚本仅提供动作快捷操作界面，不包含任何不当内容。使用时请遵守 Bondage Club 社区规则，并对自身行为负责。

---

> 📌 **说明**：仓库地址已指向 `heitaoplay/QuickInteraction`，作者署名 `Tao MUSE`，技术支持 `Liko`。如需调整署名或版权，修改 [LICENSE](LICENSE) 与本文件对应字段即可。
