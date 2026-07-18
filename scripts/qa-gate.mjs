// scripts/qa-gate.mjs — 轻量质量门禁，零依赖
// 卡住团队红线：空 catch / 未门控 console.log / 版本号不一致 / 单文件超 600 行
// 用法：node scripts/qa-gate.mjs   （在 QuickInteraction/ 目录下运行）
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
// 按项目扩展 targets（当前仅主脚本；新增交付脚本时在此登记）
const targets = ['quick-interaction.user.js'];
const errors = [];

for (const f of targets) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  const lines = src.split('\n');

  // 1) 空 catch（允许带注释说明的 best-effort 吞错，但禁止完全空白）
  lines.forEach((l, i) => {
    if (/}\s*catch\s*\([^)]*\)\s*\{\s*}/.test(l))
      errors.push(`${f}:${i + 1} 空 catch(_){}（红线：必须处理或注释说明）`);
  });

  // 2) 未门控 console.log（排除 logD 封装内部）
  lines.forEach((l, i) => {
    if (/^\s*console\.log\s*\(/.test(l) && !/logD/.test(l))
      errors.push(`${f}:${i + 1} 未门控 console.log（应走 logD）`);
  });

  // 3) 版本号双维护不一致
  const m1 = src.match(/@version\s+([\d.]+)/);
  const m2 = src.match(/const VERSION\s*=\s*['"]([\d.]+)['"]/);
  if (m1 && m2 && m1[1] !== m2[1])
    errors.push(`${f} 版本号不一致 @version=${m1[1]} VERSION=${m2[1]}`);

  // 4) 单文件行数（架构红线，拆分 src/ 前会持续报警，属已知技术债）
  if (lines.length > 600)
    errors.push(`${f} 单文件 ${lines.length} 行 > 600（需拆 src/，当前为已知技术债）`);
}

if (errors.length) {
  console.error('❌ 质量门禁未通过（' + errors.length + ' 项）：\n' + errors.join('\n'));
  process.exit(1);
}
console.log('✅ 质量门禁通过');
