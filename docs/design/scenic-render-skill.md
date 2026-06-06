# Scenic Render Skill

## Goal

把用户上传的风景照片转成可执行的“建模渲染蓝图”，让 `/dream` 的景点预览从泛化 AI 风景图升级为更接近真实目的地的电影感预览。

## Flow

1. 用户在 `/dream` 上传 PNG/JPG/WebP 风景照片。
2. 也可以直接点击真实照片示例库：大理山海、海边浪线、城市天际线、古街巷。
   示例图会自动载入并触发 M3 读图设计，适合录屏演示。
3. 浏览器把照片临时转成 data URL，不保存原图到本地媒体库。
4. `/api/generate-scenic-render-design` 使用 MiniMax-M3 读取照片和当前路书上下文。
5. M3 输出结构化 JSON：地形、建筑、水体植被、光照、镜头、材质、Three.js 计划、图片生成 prompt、负面约束。
6. `/api/generate-preview-asset` 在生成 cinematic preview 时把这份蓝图加入 prompt。
7. 生成图继续进入现有缓存、历史版本、最终封面和 `/share-preview` 流程。

## Sample Library

- 示例图文件在 `public/sample-photos/`。
- 来源和许可记录在 `public/sample-photos/ATTRIBUTION.md`。
- 示例库只用于本地 demo 和录屏素材准备；公开发布时保留作者、许可和来源链接。

## Recording Angle

可讲成：

> 我不是只让 AI 生成一张旅游封面图，而是先配置一个视觉 skill：用户给一张景点照片，M3 把它翻译成地形、建筑、光线和镜头语言。后面的 Three.js 和图片模型都消费同一份蓝图，这样这个动态路书未来就能按每个用户的目的地照片定制。

也可以讲：

> 为了录屏稳定，我做了一个真实照片示例库。点一下大理、海边、城市或街巷，照片会自动进入 M3 读图设计管线，不用每次临时找素材，也不用多点一次读图按钮。

neon-city 模板可与本 skill 协同：照片风格偏赛博时让 M3 输出的蓝图更接近霓虹都市调性。

## Boundaries

- 当前是预览级建模蓝图，不是测绘级真实地形或真实建筑模型。
- 不识别或复现人脸、车牌、私人信息。
- 不生成地图 pin、字幕、水印或 logo。
- 如果 M3 读图接口不可用，页面会使用本地建模蓝图兜底，产品不会崩。
