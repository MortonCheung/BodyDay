import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import { AppShell } from './AppShell';
import { CoverPage } from '../features/cover/CoverPage';
import { GuidePage } from '../features/guide/GuidePage';
import { BodyPage } from '../features/anatomy/BodyPage';
import { SystemPage } from '../features/anatomy/SystemPage';
import { OrganPage } from '../features/organ/OrganPage';
import { CellPage } from '../features/cell/CellPage';
import { LessonPage } from '../features/learning/LessonPage';
import { RelationsPage } from '../features/relations/RelationsPage';
import { SummaryPage } from '../features/summary/SummaryPage';
import { AboutPage } from '../features/about/AboutPage';

/**
 * BodyDay 路由。
 *
 * 使用 HashRouter：作品以「网址链接」提交，可能部署在任何静态托管上，
 * Hash 路由不依赖服务端重写规则，刷新与直接粘贴链接都能正确恢复视图。
 */
export function AppRouter() {
  return (
    <HashRouter>
      <AppProviders>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<CoverPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/body" element={<BodyPage />} />
            <Route path="/systems/:systemId" element={<SystemPage />} />
            <Route path="/organ/:organId" element={<OrganPage />} />
            <Route path="/cell/:cellId" element={<CellPage />} />
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
            <Route path="/relations" element={<RelationsPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppProviders>
    </HashRouter>
  );
}
