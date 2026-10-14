import { Navigate, useParams } from 'react-router-dom';
import { AnatomyExplorer } from './AnatomyExplorer';
import { ROUTES } from '../../app/routes';
import { getSystem } from '../../domain';

/** 04 人体系统（神经 / 循环 / 淋巴，以及其余系统的真实浏览） */
export function SystemPage() {
  const { systemId } = useParams<{ systemId: string }>();
  const system = getSystem(systemId);
  if (!system) return <Navigate to={ROUTES.body} replace />;
  return <AnatomyExplorer systemId={system.id} />;
}
