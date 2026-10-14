import { HashRouter } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import { AppShell } from './AppShell';

/**
 * BodyDay 应用入口。
 *
 * 使用 HashRouter：作品以「网址链接」提交，可能部署在任何静态托管上，
 * Hash 路由不依赖服务端重写规则，刷新与直接粘贴链接都能正确恢复视图。
 *
 * 这里**不使用 `<Routes>`**：路由解析集中在 `AppShell` 内完成（见 `resolveView`），
 * 目的是让工作台组件在整段探索中保持同一实例，三维场景不被反复卸载重建。
 */
export function AppRouter() {
  return (
    <HashRouter>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </HashRouter>
  );
}
