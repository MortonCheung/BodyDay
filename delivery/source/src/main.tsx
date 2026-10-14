import { createRoot } from 'react-dom/client';
import './design/index.css';
import { AppRouter } from './app/AppRouter';

/**
 * BodyDay 入口。
 *
 * 不使用 StrictMode：该作品在人体层需要按需拉取数十 MB 的解剖模型，
 * 开发模式下的双次挂载会导致重复网络请求与重复解码，
 * 因此以真实的生产加载行为作为开发基线。
 */
const container = document.getElementById('root');
if (!container) throw new Error('未找到 #root 挂载点');

createRoot(container).render(<AppRouter />);
