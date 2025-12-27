import React from 'react';
import { AlertTriangle, RefreshCw, Monitor } from 'lucide-react';
import FallbackCV from './FallbackCV';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isWebGLError: false
    };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a WebGL-related error
    const isWebGLError = error && (
      error.message?.includes('WebGL') ||
      error.message?.includes('webgl') ||
      error.message?.includes('context') ||
      error.stack?.includes('WebGLRenderer')
    );

    return {
      hasError: true,
      isWebGLError
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      isWebGLError: error && (
        error.message?.includes('WebGL') ||
        error.message?.includes('webgl') ||
        error.message?.includes('context') ||
        error.stack?.includes('WebGLRenderer')
      )
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isWebGLError: false
    });
  };

  render() {
    if (this.state.hasError) {
      // If it's a WebGL error, show the fallback CV
      if (this.state.isWebGLError) {
        return <FallbackCV />;
      }

      // For other errors, show a general error page
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center px-6">
          <div className="text-center max-w-2xl">
            <div className="mb-8">
              <AlertTriangle className="mx-auto text-red-500 mb-4" size={64} />
              <h1 className="text-4xl font-bold mb-4">Oops! Something went wrong</h1>
              <p className="text-gray-400 text-lg mb-6">
                We encountered an unexpected error while loading the application.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-3 text-red-400">Error Details</h3>
              <div className="text-left bg-black/30 p-4 rounded-lg">
                <code className="text-sm text-gray-300">
                  {this.state.error?.message || 'Unknown error occurred'}
                </code>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center space-x-2 bg-gold text-black hover:bg-yellow-400 px-6 py-3 rounded-lg font-semibold transition-all duration-300 mx-auto"
              >
                <RefreshCw size={18} />
                <span>Try Again</span>
              </button>

              <div className="text-sm text-gray-500">
                <p className="mb-2">If the problem persists, try:</p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Refreshing your browser</li>
                  <li>Clearing your browser cache</li>
                  <li>Using a modern browser (Chrome, Firefox, Safari, Edge)</li>
                  <li>Enabling hardware acceleration in your browser settings</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center space-x-2 bg-white/10 text-white hover:bg-white/20 px-6 py-3 rounded-lg transition-all duration-300 mx-auto"
              >
                <Monitor size={18} />
                <span>Reload Page</span>
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10">
              <p className="text-gray-500 text-sm">
                You can also contact me directly at{' '}
                <a href="mailto:heshamamoudi.it@gmail.com" className="text-gold hover:underline">
                  heshamamoudi.it@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
