# 身体的一天 · 大学生寝室（Web 3D Demo）

《身体的一天》科普互动作品的**寝室场景**可运行 Demo：Vite + React + TypeScript + Three.js + React Three Fiber。

## 本地运行

```bash
npm install
npm run dev        # 开发模式，默认 http://localhost:5173/
```

生产构建与本地预览：

```bash
npm run build      # tsc -b && vite build，产物在 dist/
npm run preview    # 预览生产构建，默认 http://localhost:4173/
```

## 操作方式

| 按键 / 操作 | 作用 |
| --- | --- |
| `W` `A` `S` `D` / 方向键 | 移动角色（相对相机方向） |
| `Shift` | 奔跑 |
| 鼠标拖拽 | 环绕视角 |
| 滚轮 | 拉近 / 拉远 |
| `E` | 与身边的门交互（靠近才会出现提示） |
| `T` | 切换白天 / 夜晚 |
| 右上角按钮 | 切换到白天 / 夜晚 |

## 交互点

- **卫生间门**（左墙）：弹出「要刷牙吗？」，可选「刷牙 / 不刷牙」。
- **寝室出口**（后墙）：弹出「准备前往食堂」，可选「确认出发 / 留在寝室」。

## 目录结构

```
src/
  App.tsx            装配入口：Canvas + 场景模块 + HUD
  theme.ts           统一色板、Toon 渐变贴图、程序化 Canvas 贴图
  game/
    state.ts         每帧可变全局状态（玩家、相机、按键）
    layout.ts        平面布局常量与交互点定义
    collision.ts     AABB 圆形玩家碰撞
  scene/
    Room.tsx         地板/墙体/门窗/踢脚线（含按相机隐藏近侧墙）
    Furniture.tsx    床、书桌、显示器、书架、绿植、地毯等
    Outside.tsx      窗外天空、树木、建筑剪影、云
    Lighting.tsx     昼夜光照
    Character.tsx    程序化风格化角色 + 走步/待机动画
    CameraRig.tsx    第三人称斜俯视跟随相机
    Interact.tsx     交互点探测与门口标记
    Prop.tsx         GLB 道具加载 + Toon 化 + 自动重定心
  ui/                中文 HUD（时钟、状态条、提示、弹窗、加载层）
public/models/       Kenney Furniture Kit（CC0）GLB 资产
```

## 第三方素材

全部第三方 3D 模型来自 **Kenney Furniture Kit**（作者 Kenney，许可证 CC0 1.0 公共领域，可免费商用、无需署名）。
完整清单与许可证说明见 `../report/身体的一天_寝室Demo_交付说明.md`。
