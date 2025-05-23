import React, { useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface FullScreenWrapperProps {
  children: ReactNode;
  title?: string;
}

const FullScreenWrapper: React.FC<FullScreenWrapperProps> = ({ children, title }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create portal container on mount
    const container = document.createElement('div');
    container.style.position = 'relative';
    document.body.appendChild(container);
    setPortalContainer(container);

    // Cleanup on unmount
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  useEffect(() => {
    // Handle body scroll when in full screen
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const mainContent = (
    <div className="relative">
      {/* Non-fullscreen content */}
      {children}
      <button
        onClick={toggleFullScreen}
        className="absolute right-4 top-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg 
          bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5.414l2.293 2.293a1 1 0 11-1.414 1.414L4 6.414V8a1 1 0 01-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h2.586l-2.293 2.293a1 1 0 001.414 1.414L16 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H5.414l2.293-2.293a1 1 0 00-1.414-1.414L4 13.586V12a1 1 0 10-2 0v4zm14 0a1 1 0 01-1 1h-4a1 1 0 110-2h2.586l-2.293-2.293a1 1 0 011.414-1.414L16 13.586V12a1 1 0 112 0v4z" clipRule="evenodd" />
        </svg>
        Full Screen
      </button>
    </div>
  );

  const fullScreenContent = portalContainer && createPortal(
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <div className="p-8">
        {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}
        {children}
        <button
          onClick={toggleFullScreen}
          className="fixed right-4 top-4 z-[10000] flex items-center gap-2 px-3 py-2 rounded-lg 
            bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm14 0a1 1 0 00-1-1h-4a1 1 0 100 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 6.414V8a1 1 0 102 0V4zM3 16a1 1 0 001 1h4a1 1 0 100-2H6.414l2.293-2.293a1 1 0 00-1.414-1.414L5 13.586V12a1 1 0 10-2 0v4zm14 0a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4z" clipRule="evenodd" />
          </svg>
          Exit Full Screen
        </button>
      </div>
    </div>,
    portalContainer
  );

  return (
    <>
      {mainContent}
      {isFullScreen && fullScreenContent}
    </>
  );
};

export default FullScreenWrapper;
