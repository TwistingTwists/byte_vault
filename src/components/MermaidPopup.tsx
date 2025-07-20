import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface MermaidPopupProps {
  children: string;
  title?: string;
  className?: string;
  type?: 'mermaid' | 'svg' | 'auto';
}

const MermaidPopup: React.FC<MermaidPopupProps> = ({ children, title, className = '', type = 'auto' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const renderType = type === 'auto' ? (children.trim().startsWith('<svg') ? 'svg' : 'mermaid') : type;

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === popupRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const renderContent = () => {
    if (renderType === 'svg') {
      // Ensure SVG has proper styling
      const styledSvg = children.replace(
        /<svg([^>]*)>/,
        '<svg$1 style="width: 100%; height: auto; max-width: 960px; max-height: 320px;">'
      );
      return (
        <div 
          className="svg-container flex items-center justify-center w-full h-full"
          dangerouslySetInnerHTML={{ __html: styledSvg }} 
        />
      );
    } else {
      return (
        <div className="mermaid-container">
          <pre className="mermaid">{children}</pre>
        </div>
      );
    }
  };

  return (
    <>
      {/* Simple, clean preview */}
      <div 
        className={`relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${className}`}
        onClick={() => setIsOpen(true)}
      >
        {title && (
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </div>
        )}
        
        <div className="p-2">
          <div className="w-full flex justify-center">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Fixed modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div 
            ref={popupRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-fit h-fit max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title || 'Diagram'}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={handleZoomOut} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button onClick={handleZoomIn} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4 flex items-center justify-center">
              <div 
                ref={contentRef}
                style={{ transform: `scale(${scale})` }}
              >
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MermaidPopup;