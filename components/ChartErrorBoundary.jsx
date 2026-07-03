'use client';

import { Component } from 'react';

export default class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Chart error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[420px] flex items-center justify-center border border-white/10 rounded-xl text-white/40 text-sm">
          Chart failed to load. Try selecting the pair again.
        </div>
      );
    }
    return this.props.children;
  }
}
