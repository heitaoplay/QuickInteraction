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
// 只有 version 字段由构建自动填；summary / announcement 在发布时由开发者填写后部署。
const vm = main.match(/const VERSION\s*=\s*'([^']+)'/);
const version = vm ? vm[1] : '0.0.0';
const today = new Date().toISOString().slice(0, 10);
const versionInfo = {
  version,
  date: today,
  severity: 'normal',
  summary: [],
  detailsUrl: `https://github.com/heitaoplay/QuickInteraction/releases/tag/v${version}`,
  announcement: null
};
fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(versionInfo, null, 2) + '\n');

console.log('built', outFile, 'bytes:', fs.statSync(outFile).size);
console.log('built', path.join(outDir, 'version.json'), 'version:', version);
