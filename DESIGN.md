<!-- SEED: re-run `$impeccable document` (without --seed) once you want real tokens and components captured from code. This is a forward-looking scaffold, not the extracted system. -->
---
name: 3D智慧财税仿真平台
description: 人工智能应用 · 实践教学
---

# Design System: 3D智慧财税仿真平台

## 1. Overview

**Creative North Star: "现代学堂"**

平台的视觉像一所当代校园里的实操机房：温暖、有序、被认真对待。色彩策略是 Restrained（克制）：以 emerald 翡翠绿作为唯一品牌锚点，slate 中性色承载全部文字与结构，五个功能色只在申报流程的步骤标记上短暂出现。字体走 Display + Mono 方向，让税额、金额、编号等数据以等宽呈现，传达可核对的精确感，而非花哨。动效同样克制，只服务于状态过渡与进度指示。

它明确拒绝三类参照。最首要的反参照是**过度低龄化的教育产品**：卡通 mascot、高饱和糖果色、圆滚滚按钮、emoji 堆砌，这些会直接削弱专业可信度。其次拒绝**传统政务网站**的灰底蓝条、密集表格、过小字号、无反馈表单。最后拒绝**千篇一律的 SaaS 着陆页模板**（Hero + 三栏 feature cards + testimonial + CTA 的流水账结构）。

**Key Characteristics:**
- Restrained 色彩：emerald 锚点 + slate 中性，功能色按流程步骤点缀
- Display + Mono 字体方向：标题成体量，数据走等宽
- 扁平优先：靠染色背景与间距建立层级，不靠分隔线或重阴影
- 克制动效：仅状态过渡与进度，尊重 prefers-reduced-motion
- 线性流程是主导航：识别 → 计算 → 加计扣除 → 申报 → 报告

## 2. Colors

色彩策略为 Restrained（克制）：单一 emerald 锚点 + slate 全灰度中性，功能色仅用于流程步骤标记。

**色相锚点：** emerald / 翡翠绿。完整色阶与精确取值 `[实现时确定 / 由扫描模式从代码提取]`。

### Named Rules
**The Restrained Rule.** emerald 主色在任意单屏上的占用面积不超过约 15%；功能色每个步骤只出现一次（图标 + 标签），不向无关区域扩散。中性灰承载结构，颜色靠稀缺产生分量。

## 3. Typography

**Display Font:** `[实现时选定]`，用于页面级标题与区块标题，建立体量与层级。
**Mono Font:** `[实现时选定]`，用于税额、金额、发票号码、申报编号等表格化数据与数字标签。
**Body:** `[实现时选定]`，正文与表单标签。

**Character:** 标题成体量、数据走等宽的组合，让财税数字像账面一样可对齐、可核对，传达精确而非装饰。当前代码使用系统无衬线字栈；本 seed 方向引入独立的 Display 标题字与 Mono 数字字，待实现时落定。

### Named Rules
**The Tabular Number Rule.** 税额、金额、编号一律用等宽数字呈现，保证跨行列对齐与可审计感；正文与说明性文字不混入等宽。

## 4. Elevation

扁平优先。动效与层级都走克制路线：层级靠染色背景与间距建立，而非分隔线或大范围阴影。深色 emerald 侧边栏不使用横向分隔线，靠区块间距分段；卡片与容器靠边框 + 背景色差区分，阴影仅在确需「浮起」语义时（如登录卡、悬停）出现。

### Named Rules
**The Flat-By-Default Rule.** 表面默认无阴影、无装饰性分隔线。深度只作为状态的回应（hover、聚焦、浮层）出现，不作为静止态的装饰。

## 5. Components

`[组件已存在于代码中，但 seed 模式不逐一枚举。运行扫描模式 `$impeccable document` 以从代码提取真实的按钮 / 输入框 / 卡片 / 侧边栏 / 步骤卡规格，并生成 .impeccable/design.json sidecar。]`

## 6. Do's and Don'ts

### Do:
- **Do** 让 emerald 主色单屏占用 ≤15%，靠稀缺产生分量。
- **Do** 用染色背景 + 间距建立层级，优先于分隔线与阴影（深色侧边栏不使用横向白/亮线分段）。
- **Do** 税额、金额、编号用等宽数字，保证对齐与可审计感。
- **Do** 表单错误提供背景色 + 边框色 + 文字色的完整三色状态，并解释「为什么错」。
- **Do** 让每个页面都能独立理解当前流程阶段（为中断设计）。

### Don't:
- **Don't** 出现过度低龄化的教育产品视觉：卡通 mascot、高饱和糖果色、圆滚滚按钮、emoji 堆砌（首要反参照）。
- **Don't** 出现传统政务网站的沉闷：灰底蓝条、密集表格、过小字号、无反馈表单。
- **Don't** 套用千篇一律的 SaaS 模板：Hero + 三栏 feature cards + testimonial + CTA 的流水账结构。
- **Don't** 使用 gradient text（background-clip: text）；强调靠字重与字号。
- **Don't** 使用大于 1px 的彩色 border-left / border-right 条纹作为卡片或列表项装饰。
- **Don't** 把 hero-metric 模板（大数字 + 小标签 + 渐变强调）当作数据展示的默认形式。
- **Don't** 使用 #000 纯黑或 #fff 纯白作为文字 / 背景，中性色微调向品牌色相染色。
