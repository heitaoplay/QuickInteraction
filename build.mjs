// 构建脚本：把 bcmodsdk + 主脚本打包成自包含的 assets/main.js
// 这样运行时零外部依赖（与 RW 的 assets/main.js 思路一致），
// 通过 GitHub Pages 用 import() 加载，刷新即最新版。
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const sdk = fs.readFileSync(path.join(root, 'bcmodsdk.js'), 'utf8');

let main = fs.readFileSync(path.join(root, 'quick-interaction.user.js'), 'utf8');
// 去掉 Userscript 元数据头（// ==UserScript== ... // ==/UserScript==）
const endHeader = main.indexOf('// ==/UserScript==');
if (endHeader === -1) {
  throw new Error('未找到 ==/UserScript== 标记，无法剥离头');
}
main = main.slice(endHeader + '// ==/UserScript=='.length);

const outDir = path.join(root, 'assets');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'main.js');
fs.writeFileSync(outFile, sdk + '\n' + main);

console.log('built', outFile, 'bytes:', fs.statSync(outFile).size);
