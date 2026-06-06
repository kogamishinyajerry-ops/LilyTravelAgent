export type CreatorMilestone = {
  step: string;
  title: string;
  buildFocus: string;
  contentAngle: string;
};

export type VibeCodingLesson = {
  title: string;
  lesson: string;
  proof: string;
};

export type ClipBlueprint = {
  title: string;
  hook: string;
  screen: string;
};

export const creatorMilestones: CreatorMilestone[] = [
  {
    step: "01",
    title: "把想法压成 MVP",
    buildFocus: "只做本地路书 Agent：表单、生成、地图、展示。",
    contentAngle: "讲清楚为什么先要能录、能看、能分享，而不是一开始做平台。",
  },
  {
    step: "02",
    title: "把 Agent 拆成三层",
    buildFocus: "MiniMax 负责内容，高德负责定位，Leaflet 负责展示。",
    contentAngle: "把复杂 AI 项目讲成普通人能理解的内容层、数据层、展示层。",
  },
  {
    step: "03",
    title: "让输出可控",
    buildFocus: "用 JSON schema 和校验约束路书结构，减少模型乱写。",
    contentAngle: "解释 Vibe Coding 不是随便许愿，而是给 AI 明确边界和验收标准。",
  },
  {
    step: "04",
    title: "把过程变成素材",
    buildFocus: "每一阶段都留下 shot list、dev log、voiceover note。",
    contentAngle: "展示自己从使用 AI 写代码，到用 AI 管理产品叙事的学习过程。",
  },
];

export const vibeCodingLessons: VibeCodingLesson[] = [
  {
    title: "先定义成品画面",
    lesson: "开始写代码前先确定观众会看到什么：一张漂亮路书、一个真实地图、一个清楚的生成按钮。",
    proof: "页面第一屏直接呈现旅行路书工具，而不是营销介绍页。",
  },
  {
    title: "把需求写成可验收清单",
    lesson: "每一轮开发都要能用 lint、build、页面状态或接口返回证明，不靠感觉说完成。",
    proof: "当前项目用 npm run lint、npm run build、缺 key API 状态和浏览器页面检查收口。",
  },
  {
    title: "保留失败和配置状态",
    lesson: "录屏素材不只拍成功结果，缺密钥、地图未配置、接口错误也能变成教程内容。",
    proof: "页面会显示 MINIMAX_API_KEY 和 AMAP_KEY 的配置提示，而不是直接崩掉。",
  },
  {
    title: "小步迭代比大而全更适合内容账号",
    lesson: "先做能解释的单点功能，再逐步扩展 PDF、长图、保存历史和分享链接。",
    proof: "v1 明确不做账号、数据库、支付、部署，把精力放在可演示体验。",
  },
];

export const clipBlueprints: ClipBlueprint[] = [
  {
    title: "我用 AI 搭了一个旅游路书 Agent",
    hook: "如果你经常做攻略，可以先让 Agent 帮你产出一本可编辑路书。",
    screen: "首页表单 + 空状态预览 + 路线地图面板。",
  },
  {
    title: "Vibe Coding 第一课：别直接开写",
    hook: "我以前容易一上来就写代码，这次先把可录屏成品定义出来。",
    screen: "README、shot-list、页面第一屏。",
  },
  {
    title: "为什么 Agent 要输出 JSON",
    hook: "AI 写一大段攻略很好看，但产品需要稳定结构。",
    screen: "generate-roadbook API 的 prompt 和 roadbook schema。",
  },
  {
    title: "地图不是装饰，是路书可信度的一部分",
    hook: "AI 推荐地点之后，还要交给高德定位，再显示到地图上。",
    screen: "geocode API、GCJ-02 转 WGS84、Leaflet 地图。",
  },
];
