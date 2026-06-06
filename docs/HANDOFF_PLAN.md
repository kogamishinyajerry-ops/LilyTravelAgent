# LilyTravelAgent 接管与开发计划

> 制定日期: 2026-06-06
> 接管目标: 在保留现有 MVP 视觉/产品定位的前提下，补齐质量门、扩展示范、准备真实地形管线。
> 写作约束: 只描述方向、范围、验收标准，不提前决定实现细节。

## 1. 项目现状（接手时）

- **技术栈**: Next.js 16.2.7 (App Router, Turbopack) + React 19.2.7 + TypeScript 6.0.3 + Tailwind 4.3.0 + Zod 4.4.3
- **外部依赖**: MiniMax LLM (`api.minimaxi.com`, M2.7-highspeed / M3 / image-01) + 高德 Amap Web Service + Leaflet 1.9.4 + Three.js 0.184.0 + Playwright 1.60.0 (devDeps)
- **路由**: `/`（路书）、`/studio`（16:9 录屏）、`/dream`（2.5D 视觉路书）、`/share-preview`（分享卡） + 5 个 API 路由
- **代码体量**: ~6,600 LOC TS/TSX, 13 个 lib 模块, 7 个组件, 0 个测试
- **历史**: 单次提交 `993e084 Initial LilyTravelAgent MVP`, dev-log 记录 6 个迭代阶段
- **基线状态 (2026-06-06)**: `npm run lint` ✅ 0 错 0 警; `npm run build` ✅ 11 路由全过
- **产品定位**: 同时是产品 + 视频内容载体 (Vibe Coding 系列)
- **设计边界 (v1)**: 无 auth / DB / 支付 / 部署 / PDF 导出 / 公开分享

## 2. 接管策略

按依赖顺序分三阶段，每阶段独立可交付：

### Phase A — 质量门升级（稳健护城河）

**目标**: 把一个 0 测试 / 0 CI 的 MVP 提升到可被团队/未来自己安全改动的状态。

**范围**:

1. **单元测试 (Vitest)**
   - `lib/roadbook-validation.ts` (Zod schemas)
   - `lib/roadbook-normalize.ts`
   - `lib/json-extract.ts`
   - `lib/geo.ts` (GCJ-02 → WGS-84)
   - `lib/dream-design-skill.ts` (route/buildDreamRoadbookDesign)
   - `lib/minimax-config.ts` (env 解析)
   - 目标覆盖率: 纯函数模块 ≥ 80%

2. **E2E 测试 (Playwright)**
   - `/` 渲染 + 表单交互
   - `/dream` 路由 + 视觉骨架
   - `/studio` 路由 + 三栏布局

3. **CI (GitHub Actions)**
   - `ci.yml`: install → lint → typecheck → test → build
   - PR 必跑, push to main 必跑
   - 缓存 node_modules / .next

4. **React error boundary**
   - 全局 boundary (app/error.tsx)
   - 各路由 boundary (dream/error.tsx, studio/error.tsx)
   - 录屏时不会因为某个组件异常导致全白屏

5. **Zod 输出验证增强**
   - 把 `minimax_error` / `parse_error` 的错误信息更具体
   - 暴露更多 `details` 字段给前端
   - 让 LLM 输出不合规时可定位问题

**验收**:
- `npm test` 通过
- `npm run e2e` 通过
- `gh actions run` 在 PR 上能跑通
- error boundary 故意 throw 时页面降级而非白屏
- LLM 返回非 JSON 时 API 返回的 details 可读

### Phase B — /dream 下一个视觉模板

**目标**: 给 /dream 加 1 个新视觉模板，验证模板系统可扩展性。

**候选** (来自 `docs/design/dream-design-skill.md`):
- `island`: 漂浮岛屿
- `shrine`: 清冷神殿
- `desert`: 大漠孤烟
- `neon-city`: 霓虹都市

**先选 `neon-city`** (录屏最有冲击、最容易讲 "Vibe Coding 做视觉")。

**范围**:
- `lib/dream-design-skill.ts` 新增 `neon-city` 条目
- `components/dream-skyline-scene.tsx` 新增渲染分支 (Three.js)
- 三个 mood 组合下各自的视觉参数
- 更新 `docs/design/dream-design-skill.md` 加上 `neon-city` 段
- 单元测试: 新模板的 dream design 不报错

**验收**:
- 录屏演示 `/dream` 选 `neon-city` 模板, 视觉与 `monument` 显著不同
- 测试覆盖新模板

### Phase C — 真实地形/建筑管线（脚手架阶段）

**目标**: 为"接 DEM/真实建筑"准备架构和数据通路；本期交付最小可运行脚手架，渲染真实数据延后到下一阶段。

**范围** (来自 `docs/design/real-scenic-preview-roadmap.md`):

1. **真实地形数据源抽象**
   - `lib/terrain-source.ts`: 接口 + 默认实现 (URL 模板 + bbox → tile 列表)
   - 当前默认实现: 留空 (返回空数组), 留好接入点
   - 文档: 怎么接 Mapbox / MapTiler / 自家瓦片

2. **建筑轮廓数据源抽象**
   - `lib/buildings-source.ts`: 接口 + 默认实现 (bbox → building footprints GeoJSON)
   - 当前默认实现: 留空
   - 文档: 怎么接 OSM Overpass / 高德 3D

3. **混合渲染管线**
   - `components/real-skyline-scene.tsx`: 新组件, 与 `dream-skyline-scene.tsx` 并存
   - 当 `terrain-source` + `buildings-source` 都返回数据时使用真实管线
   - 否则回退到 `dream-skyline-scene.tsx` (Three.js 程序化)

4. **WGS84 → 瓦片坐标 helper**
   - `lib/tile-coords.ts`: 标准 slippy map 瓦片坐标计算 + 单元测试

5. **设计文档**
   - 在 `docs/design/real-scenic-preview-roadmap.md` 加 "Phase C 落地说明" 段

**验收**:
- 现有 `/dream` 行为不变 (回退路径)
- 新增 `real-skyline-scene.tsx` 可以在配置启用真实数据源时被激活
- `tile-coords.ts` 单元测试通过
- 一条 PR 描述 + 一段录屏材料 (用 README / docs 写清楚)

## 3. 不在本次范围

- Trigger.dev 托管化迁移 (D 选项, 用户未选)
- i18n (仅中文, v1 边界)
- 公开分享 / PDF 导出 / 支付
- 任何引入 auth / DB / 部署的改动
- 视觉模板从 4 增到 5+ (只做 Phase B 一个新模板)

## 4. 录屏友好性原则

每一次提交都考虑:
- 这段改动能不能录成 1 段 2-5 分钟的 Vibe Coding 片段?
- dev-log.md 是否有新条目?
- 是否有 README / docs 更新可被镜头扫到?

## 5. 执行节奏

每个 Phase 完成后:
- ✅ `npm run lint` 0 错 0 警
- ✅ `npm test` 全过
- ✅ `npm run build` 全过
- ✅ Conventional commit
- ✅ dev-log.md 加新条目
- ✅ 给用户报告 + 等下个 phase 启动信号

## 6. 模型路由 (per user memory)

- **M2.7-highspeed (60-70%)**: 大多数 lib 单元测试、E2E 配置、CI YAML、错误信息格式化
- **M3 (20-30%)**: 复杂 lib 设计决策、错误边界策略、新模板视觉参数、terrain-source 架构
