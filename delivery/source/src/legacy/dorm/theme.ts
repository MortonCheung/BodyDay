import * as THREE from 'three';

/**
 * 项目统一色板：温暖、柔和、有设计感。
 * 所有场景物体颜色都必须从这里取，避免出现随机色。
 */
export const C = {
  // —— 房间结构 ——
  floor: '#c19268',
  floorLine: '#ab7c55',
  wallUpper: '#f2e5d1',
  wallLower: '#dcc4a2',
  wallEdge: '#b99a76',
  ceilingTrim: '#d0b592',
  baseboard: '#a97c56',

  // —— 门窗 ——
  doorFrame: '#a5714b',
  doorFrameLight: '#bf8a5f',
  doorLeaf: '#c98f5f',
  doorLeafBath: '#93b3a6',
  windowFrame: '#b8875d',
  curtain: '#e6d3ba',
  curtainShade: '#d5bda1',

  // —— 家具与织物 ——
  bedFrame: '#8b5a3c',
  duvet: '#7ba7b8',
  duvetFold: '#94bdcb',
  pillow: '#f8f0e3',
  rug: '#c9634c',
  rugPattern: '#e2b183',
  deskTop: '#a9764d',
  shelf: '#96684a',
  woodDark: '#6f4b34',

  // —— 生活物件 ——
  lampShade: '#f0c078',
  mug: '#e6ded0',
  plant: '#7d9c6a',
  plantDark: '#5f7d52',
  pot: '#c4836a',
  backpack: '#4f7d8c',
  clockFace: '#faf3e7',

  // —— 强调色 ——
  amber: '#f0a93c',
  terracotta: '#c9634c',
  sage: '#8fa87e',
  teal: '#4f7d8c',
  cream: '#f8f0e3',

  // —— 角色 ——
  skin: '#e9b491',
  skinShade: '#d59a78',
  hair: '#3f2c24',
  hoodie: '#e0a24a',
  hoodieDark: '#c98836',
  pants: '#55647d',
  shoes: '#efe6d6',
  eye: '#3a2a22',

  // —— 描边（暖棕，避免纯黑）——
  outline: '#4a3226',

  // —— 天空与窗外 ——
  skyDayTop: '#a9d8ee',
  skyDayBottom: '#fdf0dc',
  skyNightTop: '#121a30',
  skyNightBottom: '#39496b',
  grassDay: '#93b176',
  grassNight: '#2b3846',
  treeDay: '#7fa06a',
  treeDayAlt: '#6c8e58',
  treeNight: '#26333c',
  treeNightAlt: '#1e2a33',
  buildingDay: '#c3b5a0',
  buildingNight: '#2a3446',
  sunGlow: '#ffe7b3',
  moon: '#f2ead6',
} as const;

/** 三段式 Toon 渐变（手绘感），全场景共用一张。 */
let gradientMap: THREE.DataTexture | null = null;
export function toonGradient(): THREE.DataTexture {
  if (gradientMap) return gradientMap;
  const steps = [96, 150, 200, 255];
  const data = new Uint8Array(steps);
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  gradientMap = tex;
  return tex;
}

/** 兼容 helper：直接把 toon 参数铺开给 <meshToonMaterial>。 */
export function toonProps(color: string) {
  return { color, gradientMap: toonGradient() };
}

function makeCanvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return { cv, ctx: cv.getContext('2d')! };
}

/** 电脑屏幕：程序化绘制一个"深夜码代码"的界面。 */
export function screenTexture(): THREE.CanvasTexture {
  const { cv, ctx } = makeCanvas(512, 320);
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#20304a');
  g.addColorStop(1, '#141d2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 320);

  // 顶部窗口条
  ctx.fillStyle = '#2b3c58';
  ctx.fillRect(0, 0, 512, 26);
  ['#e07b6a', '#e8b45a', '#8fb98a'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(18 + i * 20, 13, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#8fa4c4';
  ctx.font = '13px sans-serif';
  ctx.fillText('body-of-day.ts', 92, 18);

  // 左侧行号栏
  ctx.fillStyle = '#1b2537';
  ctx.fillRect(0, 26, 42, 294);
  ctx.fillStyle = '#5b6e8c';
  ctx.font = '12px monospace';
  for (let i = 0; i < 16; i++) ctx.fillText(String(i + 1), 12, 48 + i * 18);

  // 彩色代码行
  const rows: Array<[number, number, string]> = [
    [8, 150, '#7fb3d5'], [16, 90, '#e0a24a'], [34, 190, '#9ecb8f'],
    [8, 120, '#c98fae'], [24, 260, '#8fb7a4'], [16, 140, '#e8c07d'],
    [40, 210, '#7fb3d5'], [8, 96, '#e0a24a'], [24, 180, '#9ecb8f'],
    [16, 130, '#c98fae'], [48, 230, '#8fb7a4'], [8, 110, '#e8c07d'],
    [32, 170, '#7fb3d5'], [16, 88, '#9ecb8f'], [24, 200, '#e0a24a'],
    [8, 140, '#c98fae'],
  ];
  rows.forEach(([x, w, color], i) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(56 + x, 40 + i * 18, w, 8);
    if (i === 4 || i === 8 || i === 11) {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(56 + x + w + 10, 40 + i * 18, 40, 8);
    }
    ctx.globalAlpha = 1;
  });

  // 光标
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.fillRect(150, 274, 8, 12);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 墙面海报：两张风格化风景小画，让空墙有设计感。 */
export function posterTexture(variant: 0 | 1): THREE.CanvasTexture {
  const { cv, ctx } = makeCanvas(256, 340);
  if (variant === 0) {
    // 日出山丘
    const sky = ctx.createLinearGradient(0, 0, 0, 340);
    sky.addColorStop(0, '#f4c98a');
    sky.addColorStop(0.55, '#f0a56f');
    sky.addColorStop(1, '#d9805f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 340);
    ctx.fillStyle = '#fbe4b0';
    ctx.beginPath();
    ctx.arc(128, 150, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a86a5a';
    ctx.beginPath();
    ctx.moveTo(-10, 250);
    ctx.quadraticCurveTo(70, 180, 150, 244);
    ctx.quadraticCurveTo(210, 284, 266, 244);
    ctx.lineTo(266, 340);
    ctx.lineTo(-10, 340);
    ctx.fill();
    ctx.fillStyle = '#7a5050';
    ctx.beginPath();
    ctx.moveTo(-10, 288);
    ctx.quadraticCurveTo(90, 236, 190, 292);
    ctx.quadraticCurveTo(230, 314, 266, 296);
    ctx.lineTo(266, 340);
    ctx.lineTo(-10, 340);
    ctx.fill();
  } else {
    // 抽象几何
    ctx.fillStyle = '#eee0c8';
    ctx.fillRect(0, 0, 256, 340);
    ctx.fillStyle = '#c9634c';
    ctx.beginPath();
    ctx.arc(128, 120, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4f7d8c';
    ctx.beginPath();
    ctx.moveTo(0, 340);
    ctx.lineTo(0, 232);
    ctx.quadraticCurveTo(128, 176, 256, 232);
    ctx.lineTo(256, 340);
    ctx.fill();
    ctx.fillStyle = '#8fa87e';
    ctx.beginPath();
    ctx.arc(128, 258, 46, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0a24a';
    ctx.beginPath();
    ctx.arc(70, 62, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 木地板：细条纹纹理，避免大面积纯色发闷。 */
export function floorTexture(): THREE.CanvasTexture {
  const { cv, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16; i++) {
    ctx.globalAlpha = i % 2 === 0 ? 0.1 : 0.045;
    ctx.fillStyle = i % 3 === 0 ? C.floorLine : '#ffffff';
    ctx.fillRect(0, i * 32, 512, 16);
  }
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = C.floorLine;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 32);
    ctx.lineTo(512, i * 32);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 9; i++) {
    const x = 32 + i * 56;
    ctx.beginPath();
    ctx.moveTo(x, i % 2 === 0 ? 0 : 160);
    ctx.lineTo(x, (i % 2 === 0 ? 0 : 160) + 96);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 1.9);
  tex.anisotropy = 4;
  return tex;
}

let floorTex: THREE.CanvasTexture | null = null;
export function sharedFloorTexture() {
  if (!floorTex) floorTex = floorTexture();
  return floorTex;
}

let screenTex: THREE.CanvasTexture | null = null;
export function sharedScreenTexture() {
  if (!screenTex) screenTex = screenTexture();
  return screenTex;
}

const posterCache: THREE.CanvasTexture[] = [];
export function sharedPosterTexture(v: 0 | 1) {
  if (!posterCache[v]) posterCache[v] = posterTexture(v);
  return posterCache[v];
}
