import { Component, type ReactNode } from 'react';

/**
 * 极小的错误边界。
 *
 * 存在的唯一理由：任何一个三维模型失败，都不允许拖垮整页。
 * React 19 下未捕获的渲染异常会卸载整个根节点，因此每个舞台都必须被单独包住。
 */
interface Props {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[BodyDay] 边界捕获异常：', error);
    this.props.onError?.(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}
