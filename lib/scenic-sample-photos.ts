export type ScenicSamplePhoto = {
  id: string;
  label: string;
  scene: string;
  src: string;
  destinationHint: string;
  credit: string;
  license: string;
  sourceUrl: string;
};

export const scenicSamplePhotos: ScenicSamplePhoto[] = [
  {
    id: "dali-cangshan-erhai",
    label: "大理山海",
    scene: "苍山 / 洱海",
    src: "/sample-photos/dali-cangshan-erhai.jpg",
    destinationHint: "云南大理",
    credit: "Toni Wohrl",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dali-Cangshan_Erhai_Lake_2017-11-16.jpg",
  },
  {
    id: "glass-beach-coast",
    label: "海边浪线",
    scene: "海岸 / 水面",
    src: "/sample-photos/glass-beach-coast.jpg",
    destinationHint: "海边目的地",
    credit: "Jef Poskanzer",
    license: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Glass_Beach_Fort_Bragg_2.jpg",
  },
  {
    id: "minneapolis-skyline-night",
    label: "城市天际线",
    scene: "夜景 / 河岸",
    src: "/sample-photos/minneapolis-skyline-night.jpg",
    destinationHint: "城市 skyline",
    credit: "Bobak Ha'Eri",
    license: "CC BY 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:2008-0419-MPLS-skyline-night.jpg",
  },
  {
    id: "yunxi-china-alley",
    label: "古街巷",
    scene: "街巷 / 霓虹",
    src: "/sample-photos/yunxi-china-alley.jpg",
    destinationHint: "中国古镇街巷",
    credit: "Kristoffer Trolle",
    license: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Back_alley_in_Yunxi,_China_-_Flickr_-_Kristoffer_Trolle.jpg",
  },
];
