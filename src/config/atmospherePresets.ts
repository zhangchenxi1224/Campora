export type Season='spring'|'summer'|'autumn'|'winter';
export const seasonPresets={
  spring:{label:'春樱',short:'春',sky:'#dce8df',horizon:'#f4ebdf',grass:'#90aa72',fog:.0042},
  summer:{label:'夏荫',short:'夏',sky:'#c8e3e5',horizon:'#eef2df',grass:'#73915a',fog:.0035},
  autumn:{label:'秋杏',short:'秋',sky:'#e2dccb',horizon:'#f3dfc4',grass:'#9a9d64',fog:.0045},
  winter:{label:'冬雪',short:'冬',sky:'#cbd9e4',horizon:'#edf1f2',grass:'#b4c4bd',fog:.005},
} as const;
export const daylightFrames=[
  {at:0,sky:'#8298b6',horizon:'#ddba9e',sun:'#ffd8ae',light:1.5,ambient:.72,exposure:1.04,night:.32,position:[-48,9,30]},
  {at:.24,sky:'',horizon:'',sun:'#fff1d4',light:2.8,ambient:1.2,exposure:1,night:0,position:[-32,34,28]},
  {at:.5,sky:'',horizon:'',sun:'#fff9ed',light:3.0,ambient:1.28,exposure:.98,night:0,position:[0,56,18]},
  {at:.72,sky:'#68617a',horizon:'#d7a180',sun:'#ffb76b',light:2.7,ambient:.7,exposure:1.06,night:.43,position:[42,16,10]},
  {at:.86,sky:'#17253e',horizon:'#3a405c',sun:'#b6b6dc',light:1.15,ambient:.48,exposure:1.1,night:.8,position:[33,12,-16]},
  {at:1,sky:'#050814',horizon:'#0d152b',sun:'#91b7ec',light:1.7,ambient:.45,exposure:1.17,night:1,position:[-30,38,-25]},
];
