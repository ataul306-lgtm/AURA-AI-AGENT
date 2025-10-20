import React from 'react';
import ToggleSwitch from './ToggleSwitch';
import { ExtensionsIcon } from './icons/ExtensionsIcon';

interface HeaderProps {
  showAiAgent: boolean;
  onToggleAiAgent: (enabled: boolean) => void;
  onOpenExtensions: () => void;
}

const Header: React.FC<HeaderProps> = ({ showAiAgent, onToggleAiAgent, onOpenExtensions }) => {
  return (
    <header className="bg-brand-surface/70 backdrop-blur-sm shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-secondary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" opacity=".3" />
              <path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm1-11h-2v6h2V9zm-1 8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
            <span className="ml-3 text-xl font-bold text-white">Aura Browser Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={onOpenExtensions}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-brand-text-secondary hover:bg-brand-surface hover:text-white transition-colors"
            >
                <ExtensionsIcon className="w-5 h-5"/>
                Extensions
            </button>
            <div className="w-px h-6 bg-brand-dark"></div>
            <ToggleSwitch
              label="AI Agent"
              enabled={showAiAgent}
              onChange={onToggleAiAgent}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;