// 构建脚本：把主脚本（已内联 bcmodsdk，自包含）剥离元数据头后输出 assets/main.js
// 运行时零外部依赖，通过 GitHub Pages 用 import() 加载，刷新即最新版。
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();

// 语法校验：坏代码直接拦下，不进发布产物
const mainPath = path.join(root, 'quick-interaction.user.js');
try {
  execSync('node --check ' + JSON.stringify(mainPath), { stdio: 'inherit' });
} catch (e) {
  console.error('❌ 语法校验失败，终止构建');
  process.exit(1);
}

let main = fs.readFileSync(mainPath, 'utf8');
// 去掉 Userscript 元数据头（// ==UserScript== ... // ==/UserScript==）
const endHeader = main.indexOf('// ==/UserScript==');
if (endHeader === -1) {
  throw new Error('未找到 ==/UserScript== 标记，无法剥离头');
}
main = main.slice(endHeader + '// ==/UserScript=='.length);

const outDir = path.join(root, 'assets');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'main.js');
fs.writeFileSync(outFile, main);

// 生成 version.json（供脚本端 5 分钟轮询检测「更新可用 / 公告」）
// 以仓库根 version.json（开发者维护的蓝本，含 summary / announcement）为基准，
// 仅把 version 字段与源代码的 VERSION 同步，保留公告内容，避免发布时丢失。
const rootVersionPath = path.join(root, 'version.json');
let base = {};
try { base = JSON.parse(fs.readFileSync(rootVersionPath, 'utf8')); } catch (_) { /* 无蓝本：用空模板 */ }
const vm = main.match(/const VERSION\s*=\s*'([^']+)'/);
const version = vm ? vm[1] : '0.0.0';
const versionInfo = {
  version,
  date: base.date || new Date().toISOString().slice(0, 10),
  severity: base.severity || 'normal',
  summary: base.summary || [],
  detailsUrl: base.detailsUrl || `https://github.com/heitaoplay/QuickInteraction/releases/tag/v${version}`,
  announcement: (base.announcement !== undefined ? base.announcement : null)
};
fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(versionInfo, null, 2) + '\n');

console.log('built', outFile, 'bytes:', fs.statSync(outFile).size);
console.log('built', path.join(outDir, 'version.json'), 'version:', version);
