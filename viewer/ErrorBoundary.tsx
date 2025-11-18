"use client"

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
          <div className="text-center">
            <h2 className="text-xl mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-400">Check console for details</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
