import React, { useState } from 'react';
import { type BrowserExtension } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { ExtensionsIcon } from './icons/ExtensionsIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: BrowserExtension[];
  onAdd: (name: string) => string;
  onRemove: (id: string) => void;
}

const ExtensionsModal: React.FC<ExtensionsModalProps> = ({ isOpen, onClose, extensions, onAdd, onRemove }) => {
  const [newExtensionUrl, setNewExtensionUrl] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtensionUrl.trim()) return;

    let newId;
    // Simulate parsing name from a Chrome Web Store URL
    // e.g., https://chromewebstore.google.com/detail/google-translate/aapbdbdomjkkjkaonfhkkikfgjllcleb
    try {
        const url = new URL(newExtensionUrl);
        const pathParts = url.pathname.split('/');
        const name = pathParts[pathParts.length - 2] || 'New Extension';
        const formattedName = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        newId = onAdd(formattedName);
    } catch (error) {
        // If URL is not valid, just use the input string as name
        newId = onAdd(newExtensionUrl);
    }
    
    setLastAddedId(newId);
    setNewExtensionUrl('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
      <div className="bg-brand-surface rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-brand-dark">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ExtensionsIcon /> Manage Extensions
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-dark">
            <CloseIcon />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {extensions.length === 0 ? (
            <p className="text-brand-text-secondary text-center py-8">No extensions have been added.</p>
          ) : (
            <ul className="space-y-2">
              {extensions.map(ext => (
                <li key={ext.id} className={`flex items-center justify-between p-3 bg-brand-dark/50 rounded-lg ${lastAddedId === ext.id ? 'new-extension-item' : ''}`}>
                  <div className="flex items-center gap-3">
                    <ExtensionsIcon className="w-5 h-5 text-brand-light" />
                    <span className="font-medium text-brand-text">{ext.name}</span>
                  </div>
                  <button onClick={() => onRemove(ext.id)} className="p-2 rounded-full hover:bg-red-500/30 text-red-400 transition-colors">
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <form onSubmit={handleAdd} className="p-4 bg-brand-dark/50 flex gap-3">
          <input
            type="text"
            value={newExtensionUrl}
            onChange={(e) => setNewExtensionUrl(e.target.value)}
            placeholder="Paste Chrome Web Store URL to add..."
            className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text"
          />
          <button type="submit" className="px-4 py-2 bg-brand-secondary hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
            Add
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExtensionsModal;
