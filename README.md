![快捷互动 Banner](docs/assets/banner.svg)

# 快捷互动 · XSAct-QuickAction

> 为 Bondage Club 设计的即时互动工具：点选角色身体部位，一键触发对应动作。

[![Version](https://img.shields.io/badge/version-1.0.8-FF5C7A)](https://github.com/heitaoplay/QuickInteraction/commits)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 功能

- **部位直选**：点按角色身体热区，即时调出该部位全部可用动作
- **批量执行**：一键对自身、全员或指定目标同步施放
- **动作收藏**：按身体部位隔离收藏，高频动作触手可及
- **连招编排**：多部位动作组合为序列，单次触发依次执行
- **双主题**：深／浅色界面随账号同步，跨设备一致
- **生态兼容**：原生支持 ECHO、LSCG、Liko 等社区动作扩展

---

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 点击下方 **Install** 按钮，在弹出的安装提示里点「安装」

   [![Install](https://img.shields.io/badge/Install-Tampermonkey-FF5C7A?logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/heitaoplay/QuickInteraction/main/loader.user.js)

3. 进入 BC 聊天室，刷新页面，右下角出现闪电开关即安装成功

> ⚠️ 如果之前装过完整版 `quick-interaction.user.js`，建议先在油猴里删除，避免重复加载。

---

## 其他方式（无需 Tampermonkey）

不想装脚本管理器，也可以直接在 BC 页面加载：

### 控制台安装
1. 在 BC 聊天室页面按 `F12` 打开开发者工具，切到 **Console（控制台）** 标签
2. 粘贴下面一行并回车：

```js
var s=document.createElement('script');s.src='https://heitaoplay.github.io/QuickInteraction/assets/main.js?v='+Date.now();document.head.appendChild(s);
```

3. 右下角出现闪电开关即成功（**每次刷新页面需重新粘贴一次**）

### 书签安装
1. 右键书签栏 → 新建书签，名称填「快捷互动」
2. 网址填下面整行：

```
javascript:(function(){var s=document.createElement('script');s.src='https://heitaoplay.github.io/QuickInteraction/assets/main.js?v='+Date.now();document.head.appendChild(s);})();
```

3. 以后进入 BC 聊天室，点一下这个书签即可加载（**同样每次刷新需重点**）

> 💡 控制台和书签方式每次刷新都要重新执行一次。想「刷新即自动更新」还是推荐上面的 Tampermonkey 安装。

---

## 使用

1. 进入 BC 聊天室
2. 点击右下角闪电按钮，进入「动作模式」
3. 选目标有两种方式：
   - **游戏内**：直接点击角色身上的高亮部位 → 弹出该部位动作列表
   - **人物浮层**：点击面板左侧的 ◀ 小三角按钮 → 在浮层里选人物 → 选身体部位（BC 原生矩形 Zone 地图）→ 右面板出动作
4. 底部按钮可切换：自己 / 全员 / 收藏 / 组合动作
5. 标题栏的太阳 / 月亮按钮切换深色 / 浅色主题

---

## 常见问题

**Q：装完没反应？**  
A：确认 Tampermonkey 已启用本脚本，且你正处于 BC 聊天室页面，刷新一次即可。

**Q：为什么有的动作点了没效果？**  
A：动作能否执行由游戏判定（目标是否穿着对应物品、是否被拘束等），脚本只负责发送动作请求。

**Q：换电脑后设置还在吗？**  
A：收藏、组合、主题等设置会写入游戏账号并同步到服务器，换设备登录同一账号即可恢复。

---

## 更新日志

### v1.0.8
- 【新增】自定义 tooltip：替换原生 title——统一玻璃拟态风格、视口自动翻转、双行信息层级（标题 + 说明），删除 / 清空等危险操作以红色高亮；仅作用于本插件界面，不影响 BC 原生提示
- 【修复】从 echo 导入的原始动作（如「埋怀里」）被点击时，接收方不再显示 MISSING TEXT——已屏蔽的 echo 原始动作改为发送内嵌文本包，确保跨客户端都能看到动作内容
- 【修复】echo 动作名解析更准确：能正确识别 XSAct_ / 笨蛋笨Luzi_ 等原始 Activity 名，减少原始名漏屏蔽的情况
- 【优化】动作文本兜底兼容 echo 的 {SourceCharacter}/{TargetCharacter} 花括号占位符

### v1.0.7
- 【主打】「我的动作」标签点击即独立展开你注册的全部自定义动作，无需先选人物或部位；每条动作可独立开关（隐藏 / 显示即时生效），支持从 echo 一键导入
- 说明：「我的动作」功能当前为【测试版 (Beta)】，仍在开发中，可能存在不稳定情况，欢迎反馈
- 修复：自定义动作开关切换后误跳转到动作界面、且按钮尺寸错乱
- 修复：动作显示混乱——收窄 echo 原始动作屏蔽逻辑，不再误伤 BC 原生动作
- 优化：组合动作标签同样点击即独立展开，不再依赖先选人物 / 部位
- 移除：动作按钮上的 SVG 来源水印

### v1.0.6
- echo / 回声 自定义动作导入后自动「去重与屏蔽」——正确识别中文显示名与真实 Activity Name，并屏蔽 echo 端原始动作
- 修复：echo 原始 Activity Name 带随机后缀时漏屏蔽的问题
- 修复：右上角主题切换太阳图标缺失显示为空白方块
- 重命名自定义动作前缀 `XSAct_CA_` → `XSQAct_`，规避与第三方 mod 小酥的冲突
- 说明：「自定义动作」功能当前为【测试版 (Beta)】，仍在开发中

### v1.0.5
- 修复：LSCG_ 动作改发标准 `Activity` 包，由 LSCG 脚本正常解析执行（饥饿 / 口渴 / 道具 / 特殊效果）
- 修复：Liko_ 动作（如「对朋友的恶作剧」）改发标准 `Activity` 包，Liko 绑定的脚本效果正常触发
- 修复：小酥(XiaoSu) XSAct_ 动作改发标准 `Activity` 包，装 / 未装小酥的玩家都能看到正确中文描述
- 优化：沿用 `ActivityDictionaryText` 数组兜底补丁，标准活动字典缺失时自动回退，避免误判 MISSING
- 公告修复：蓝色公告现与红色版本更新一致，每次发版都会重新弹出（此前看过一次即不再提示）
- 说明：「自定义动作」功能当前为【测试版(Beta)】，仍在开发中，如遇异常欢迎反馈

### v1.0.4
- 紧急修复：第三方 / mod 自定义动作（如 `笨蛋笨Luzi_` / `LSCG_` / `Liko_` / `BCC_` / `XSAct_` 等）发出后，对方显示 `MISSING TEXT IN "ActivityDictionary.csv"` 垃圾串的问题
- 修复：标准 BC 活动保持原生 `Activity` 消息；mod 自定义动作自动改为 `Chat` 消息兜底，确保所有客户端都能看到正常文本
- 修复：兜底消息优先复用原翻译句子并替换 `SourceCharacter` / `TargetCharacter`，尽量保持与原生 Activity 一致的阅读体验
- 修复：彻底移除对 echo 动作的专属硬编码兜底，统一用「是否标准 BC 活动 / 本地字典是否缺失」判断
- 优化：无翻译动作仍显示可读名称，不再向对方展示垃圾串

### v1.0.3
- 紧急修复：BC 游戏更新后，动作列表出现 `MISSING TEXT IN "ActivityDictionary.csv"` 错误文本（乱码）的问题
- 修复：适配 BC 新版「字典缺失」哨兵格式，翻译回退逻辑恢复正确
- 修复：子部位（口2 / 口3 等）重新正确回退到主部位中文翻译
- 优化：无翻译动作显示可读名称，并自动剥离 `XSAct_` / `LSCG_` / `Liko_` / `BCC_` 等 mod 前缀，不再展示垃圾串
- 兼容性：已验证与最新版 BC 完全兼容，发包路径不再嵌入错误文本

### v1.0.2
- 修复：通过 XSAct 触发 echo-activity-ext 自定义动作时，对方界面显示乱码（原始活动键）的问题
- 对齐：发送逻辑现已对齐 BC 原生 ActivityRun 的兜底文本注入机制，对方（未安装扩展）也能正确看到中文动作文本
- 范围：修复仅针对 echo 自定义动作（笨蛋笨Luzi_ 前缀），XSAct_ / 内置 / 第三方动作不受影响

### v1.0.1
- 修复：点击右侧动作或「加入组合」时，左侧人物浮层不再误关闭
- 优化：浅色模式配色与对比度提升，长时间使用更舒适
- 优化：身体部位线框在浅色下改为深灰描边 + 玫红高亮、选中更清晰；浅色下收藏 / 自己模式等状态文字改为深色系更易读
- 精简：「自己模式」开关提示文案更简洁

### v1.0.0
- 正式发布：版本号升至 1.0.0，项目趋于完善
- 新增脚本端 5 分钟轮询更新／公告检测，玩家无需刷新即可收到提示
- 收藏按身体部位隔离，修复跨部位同名动作串扰
- 响应式界面重构、主题与滚动修复
- 全新仓库 Banner 与介绍文案

### v0.7.27
- 人物浮层部位选择改回 BC 原版矩形选择方式：使用 `AssetGroup[].Zone` 原生矩形拼出身体地图，与游戏内浮动线框共用同一套真值坐标；移除 SVG 人物剪影，保留 hover/selected 高亮反馈

### v0.7.26
- 人物剪影重设计为优雅女性全身线稿；线框热区默认淡显、hover 高亮

### v0.7.25
- 压淡人物剪影、增强线框热区可见度

### v0.7.24
- 面板左侧新增 ◀ 小三角人物按钮；人物浮层内直接切换部位选择（不再跳转右面板）
- 浮层与右面板间增加联动桥接；修复选中人物后浮层误关闭

### v0.7.23
- 人物列表改为弹出式浮层，不再被面板裁剪

### v0.7.22
- 脚本自包含：内联 bcModSdk，去除外部 @require 依赖（修复动作模式按钮偶发消失）

### v0.7.21
- 人物列表侧边栏向左展开；部位选择改为 SVG 剪影 + 线框热区

### v0.7.20
- 新增人物列表侧边栏，可展开选择房间内成员

### v0.7.9
- 两人拥抱时线框自动避让，避免重叠
- 闪电按钮支持拖动位置
- 名字浮层精确对齐游戏内角色名字

### v0.7.4
- 修复子部位动作翻译键缺失，列表不再漏动作，聊天不再出现 `MISSING`

### v0.7.3
- 修复主题切换面板无变化的问题

### v0.7.2
- 主题系统简化为深色 / 浅色两套

### v0.7.0
- 设置写入游戏账号并跨设备同步

更早版本见 [docs/review.md](docs/review.md)。

---

## 开发

- 代码规范：[docs/code-standards.md](docs/code-standards.md)
- 质量审查：[docs/review.md](docs/review.md)
- 欢迎提 Issue 与 Pull Request

## 作者

- **作者**：Tao MUSE
- **技术支持**：[Liko](https://github.com/awdrrawd)
- 反馈请走 [Issues](https://github.com/heitaoplay/QuickInteraction/issues)

## 许可证

[MIT](LICENSE) © 2026 Tao MUSE
