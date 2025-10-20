import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type BrowserProfile, type BrowserExtension, ProxyType } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { InfoIcon } from './icons/InfoIcon';
import { ExtensionsIcon } from './icons/ExtensionsIcon';
import ProfileInfoView from './ProfileInfoView';


interface BrowserViewProps {
  profile: BrowserProfile;
  onClose: () => void;
  initialPosition: { x: number; y: number };
  zIndex: number;
  onFocus: () => void;
  urlOverride?: string;
  allExtensions: BrowserExtension[];
}

const parseResolution = (res: string) => {
  const [width, height] = res.split('x').map(Number);
  return { width: Math.max(width, 500), height: Math.max(height, 600) };
};

const BrowserView: React.FC<BrowserViewProps> = ({ profile, onClose, initialPosition, zIndex, onFocus, urlOverride, allExtensions }) => {
  const [size, setSize] = useState(parseResolution(profile.screenResolution));
  const [position, setPosition] = useState(initialPosition);
  const [url, setUrl] = useState('about:home');
  const [inputValue, setInputValue] = useState('about:home');
  const [activeExtensionMenu, setActiveExtensionMenu] = useState<string | null>(null);

  const dragRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const activeExtensions = allExtensions.filter(ext => profile.extensionIds.includes(ext.id));

  useEffect(() => {
    if (urlOverride) {
        let newUrl = urlOverride.trim();
        if (!/^(https?:\/\/)/.test(newUrl)) {
            newUrl = `https://${newUrl}`;
        }
        setUrl(newUrl);
        setInputValue(newUrl);
    }
  }, [urlOverride]);

    useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveExtensionMenu(null);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      setPosition({
        x: e.clientX - dragRef.current.x,
        y: e.clientY - dragRef.current.y,
      });
    }
    if (isResizing.current) {
      const newWidth = resizeRef.current.width + (e.clientX - resizeRef.current.x);
      const newHeight = resizeRef.current.height + (e.clientY - resizeRef.current.y);
      setSize({ width: Math.max(newWidth, 500), height: Math.max(newHeight, 600) });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);
  
  useEffect(() => {
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    onFocus();
    isDragging.current = true;
    dragRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    onFocus();
    isResizing.current = true;
    resizeRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  };

  const handleNavigate = () => {
    let newUrl = inputValue.trim();
    if (newUrl === 'about:home') {
        setUrl('about:home');
        return;
    }
    if (!/^(https?:\/\/)/.test(newUrl)) {
      newUrl = `https://${newUrl}`;
    }
    setUrl(newUrl);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };
  
  const navigate = (action: 'back' | 'forward' | 'reload') => {
      if (!iframeRef.current) return;
      try {
        switch(action) {
            case 'back': iframeRef.current.contentWindow?.history.back(); break;
            case 'forward': iframeRef.current.contentWindow?.history.forward(); break;
            case 'reload': iframeRef.current.contentWindow?.location.reload(); break;
        }
      } catch (error) {
          console.warn("Could not execute navigation due to iframe security policies.", error);
      }
  };

  return (
    <div
      className="fixed bg-brand-surface rounded-lg shadow-2xl flex flex-col border border-brand-dark/50"
      style={{ top: position.y, left: position.x, width: size.width, height: size.height, zIndex }}
      onMouseDown={onFocus}
    >
      <header
        className="bg-brand-dark/80 px-3 h-10 flex items-center justify-between rounded-t-lg cursor-move"
        onMouseDown={handleDragStart}
      >
        <span className="font-bold text-sm text-white truncate">{profile.name}</span>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-red-500/50">
          <CloseIcon className="w-4 h-4" />
        </button>
      </header>
      
      <div className="flex items-center p-2 bg-brand-surface border-b border-brand-dark">
        <button onClick={() => navigate('back')} className="p-1 rounded-full hover:bg-brand-dark text-brand-text-secondary"><ArrowLeftIcon /></button>
        <button onClick={() => navigate('forward')} className="p-1 rounded-full hover:bg-brand-dark text-brand-text-secondary"><ArrowRightIcon /></button>
        <button onClick={() => navigate('reload')} className="p-1 mr-2 rounded-full hover:bg-brand-dark text-brand-text-secondary"><RefreshIcon /></button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-brand-dark border border-brand-dark/50 focus:border-brand-secondary focus:ring-brand-secondary rounded-md px-2 py-1 text-sm text-brand-text"
        />
         <div className="flex items-center gap-1 pl-2 relative">
            {activeExtensions.map(ext => (
                <div key={ext.id} className="relative">
                    <button
                        title={ext.name}
                        className="text-brand-text-secondary p-1 hover:bg-brand-dark rounded"
                        onClick={() => setActiveExtensionMenu(activeExtensionMenu === ext.id ? null : ext.id)}
                    >
                        <ExtensionsIcon className="w-5 h-5" />
                    </button>
                    {activeExtensionMenu === ext.id && (
                        <div ref={menuRef} className="absolute top-full right-0 mt-2 w-48 bg-brand-dark rounded-md shadow-lg z-10 p-1 animate-fade-in-up">
                            <div className="font-bold text-white px-2 py-1">{ext.name}</div>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button className="w-full text-left px-2 py-1 text-sm rounded text-brand-text-secondary opacity-50 cursor-not-allowed">Manage extension</button>
                            <button className="w-full text-left px-2 py-1 text-sm rounded text-brand-text-secondary opacity-50 cursor-not-allowed">Remove from profile</button>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div className="flex-grow bg-brand-background overflow-auto">
        {url === 'about:home' ? (
            <ProfileInfoView profile={profile} />
        ) : (
            <iframe
                ref={iframeRef}
                src={url}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onError={() => console.error("Error loading iframe content.")}
                onLoad={() => {
                    try {
                        const newLocation = iframeRef.current?.contentWindow?.location.href;
                        if(newLocation && newLocation !== 'about:blank') {
                            setInputValue(newLocation);
                        }
                    } catch(e) {
                        // Cross-origin error, can't access location. This is expected.
                    }
                }}
            />
        )}
      </div>

      <div className="bg-brand-dark/80 px-3 py-1 text-xs text-brand-text-secondary flex items-center justify-between border-t border-brand-dark/50">
        <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate flex items-center gap-1" title={profile.userAgent}>UA: Custom <InfoIcon title="This is a simulated setting."/></span>
            <span className="truncate flex items-center gap-1">Proxy: {profile.proxy?.type !== ProxyType.None ? profile.proxy.ip : 'None'} <InfoIcon title="This is a simulated setting."/></span>
            <span className="truncate flex items-center gap-1">CPU: {profile.cpuCores} <InfoIcon title="This is a simulated setting."/></span>
            <span className="truncate flex items-center gap-1">RAM: {profile.memory}GB <InfoIcon title="This is a simulated setting."/></span>
        </div>
        <div 
          className="w-3 h-3 cursor-se-resize"
          style={{ backgroundImage: 'linear-gradient(to left top, #94a3b8 50%, transparent 50%)'}}
          onMouseDown={handleResizeStart}
        />
      </div>
    </div>
  );
};

export default BrowserView;