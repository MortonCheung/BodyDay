import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { game, keys } from './game/state';
import type { InteractId } from './game/layout';
import { preloadModels } from './scene/models';
import { Outside } from './scene/Outside';
import { Room } from './scene/Room';
import { Furniture } from './scene/Furniture';
import { Lighting } from './scene/Lighting';
import { Character } from './scene/Character';
import { CameraRig } from './scene/CameraRig';
import { Interact } from './scene/Interact';
import { Hud, type DialogKind } from './ui/Hud';

type Mode = 'day' | 'night';

function Scene({ mode, onNear }: { mode: Mode; onNear: (id: InteractId | null) => void }) {
  const night = mode === 'night';
  return (
    <>
      <color attach="background" args={[night ? '#16203a' : '#cfe6f2']} />
      <fog attach="fog" args={[night ? '#1b2540' : '#e9f2f2', 26, 78]} />
      <Outside mode={mode} />
      <Room />
      <Furniture mode={mode} />
      <Lighting mode={mode} />
      <Character />
      <CameraRig />
      <Interact onNear={onNear} />
    </>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('day');
  const [near, setNear] = useState<InteractId | null>(null);
  const [dialog, setDialog] = useState<DialogKind>('none');
  const [toast, setToast] = useState<string | null>(null);

  // 模型预加载（渲染前触发）
  useEffect(() => {
    preloadModels();
  }, []);

  // 同步状态到模块级可变对象（供 r3f 每帧读取，避免 setState 抖动）
  useEffect(() => {
    game.mode = mode;
  }, [mode]);

  useEffect(() => {
    game.dialogOpen = dialog !== 'none';
    // 弹窗打开时清空移动键，防止"按键残留"导致继续走动
    if (dialog !== 'none') {
      keys.w = keys.a = keys.s = keys.d = false;
      keys.arrowUp = keys.arrowLeft = keys.arrowDown = keys.arrowRight = false;
    }
  }, [dialog]);

  // 键盘输入
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') {
        keys.w = true;
        keys.arrowUp = true;
      } else if (k === 'a' || k === 'arrowleft') {
        keys.a = true;
        keys.arrowLeft = true;
      } else if (k === 's' || k === 'arrowdown') {
        keys.s = true;
        keys.arrowDown = true;
      } else if (k === 'd' || k === 'arrowright') {
        keys.d = true;
        keys.arrowRight = true;
      } else if (k === 'shift') {
        keys.run = true;
      } else if (k === 'e') {
        setDialog((d) => (d === 'none' && near ? (near === 'bathroom' ? 'bath' : 'exit') : d));
      } else if (k === 't') {
        setMode((m) => (m === 'day' ? 'night' : 'day'));
      }
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') {
        keys.w = false;
        keys.arrowUp = false;
      } else if (k === 'a' || k === 'arrowleft') {
        keys.a = false;
        keys.arrowLeft = false;
      } else if (k === 's' || k === 'arrowdown') {
        keys.s = false;
        keys.arrowDown = false;
      } else if (k === 'd' || k === 'arrowright') {
        keys.d = false;
        keys.arrowRight = false;
      } else if (k === 'shift') {
        keys.run = false;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [near]);

  const onNear = useCallback((id: InteractId | null) => setNear(id), []);

  const toggleMode = useCallback(() => setMode((m) => (m === 'day' ? 'night' : 'day')), []);

  const onClose = useCallback((note?: string) => {
    setDialog('none');
    if (note) setToast(note);
  }, []);

  // 提示条自动消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="app-root">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 38, position: [5, 3.6, 5], near: 0.1, far: 220 }}
      >
        <Suspense fallback={null}>
          <Scene mode={mode} onNear={onNear} />
        </Suspense>
      </Canvas>
      <Hud
        mode={mode}
        onToggleMode={toggleMode}
        near={near}
        dialog={dialog}
        onOpen={(id) => {
          setDialog('none');
          setToast(id === 'exit' ? '出发前往食堂。（后续剧情待续）' : '');
        }}
        onClose={onClose}
        toast={toast}
      />
    </div>
  );
}
