import React, { useState, useEffect } from 'react';
import { type BrowserProfile, ProfileStatus, BrowserExtension, ProxyType, ProxyConfig } from '../types';
import { generateUserAgent, generateMacAddress, parseCookies, getGeoDataFromIp, generateFullFingerprint } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { CloseIcon } from './icons/CloseIcon';
import { ExtensionsIcon } from './icons/ExtensionsIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: BrowserProfile) => void;
  profile: BrowserProfile | null;
  extensions: BrowserExtension[];
}

type FormData = Omit<BrowserProfile, 'id' | 'status'>;

const AILoadingButton: React.FC<{ loading: boolean; children: React.ReactNode, onClick: () => void; className?: string }> = ({ loading, children, onClick, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`flex items-center justify-center px-3 py-1 text-xs font-semibold text-brand-light bg-brand-secondary/50 rounded-md hover:bg-brand-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {loading ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ) : (
            <>
                <SparklesIcon className="h-4 w-4 mr-1" />
                {children}
            </>
        )}
    </button>
);

const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-sm font-medium text-brand-text-secondary mb-2">
                {title}
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && <div className="p-3 bg-brand-dark/50 rounded-md">{children}</div>}
        </div>
    );
}


const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, profile, extensions }) => {
  const createDefaultFormData = (): FormData => ({
    name: '',
    proxy: { type: ProxyType.None, ip: '', port: '', username: '', password: '' },
    userAgent: '',
    screenResolution: '390x844',
    timezone: 'UTC',
    webRTC: 'Disabled',
    macAddress: '',
    cookies: '',
    extensionIds: [],
    language: 'en-US',
    // FIX: Added missing latitude and longitude properties to resolve type error.
    latitude: 34.0522,
    longitude: -118.2437,
    cpuCores: 10,
    memory: 8,
    deviceName: '',
    audioContextNoise: true,
    mediaDeviceNoise: true,
    clientRectsNoise: true,
    speechVoicesSpoof: true,
    webGLVendor: 'Google Inc. (AMD)',
    webGLRenderer: 'ANGLE (AMD, AMD Radeon Pro 5700 XT OpenGL Engine, 4.1 ATI-4.2.13)',
  });

  const [formData, setFormData] = useState<FormData>(createDefaultFormData());

  const [aiLoading, setAiLoading] = useState({
      fingerprint: false,
      geo: false,
      cookies: false,
      userAgent: false,
      macAddress: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({ ...createDefaultFormData(), ...profile });
    } else {
      setFormData(createDefaultFormData());
    }
  }, [profile, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;

    const updateState = (fieldPath: string, fieldValue: any) => {
        const keys = fieldPath.split('.');
        setFormData(prev => {
            const newState = { ...prev };
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = fieldValue;
            return newState;
        });
    };

    updateState(name, isCheckbox ? checked : value);
  };
  
  const handleExtensionToggle = (extensionId: string) => {
    setFormData(prev => {
        const newExtensionIds = prev.extensionIds.includes(extensionId)
            ? prev.extensionIds.filter(id => id !== extensionId)
            : [...prev.extensionIds, extensionId];
        return { ...prev, extensionIds: newExtensionIds };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: profile ? profile.id : Date.now().toString(),
      status: profile ? profile.status : ProfileStatus.Stopped,
    });
  };

  const handleFetchGeo = async () => {
      if (!formData.proxy.ip) return;
      setAiLoading(prev => ({ ...prev, geo: true }));
      const geoData = await getGeoDataFromIp(formData.proxy.ip);
      if (geoData) {
          setFormData(prev => ({ ...prev, ...geoData }));
      } else {
          alert('Failed to fetch geolocation data from IP.');
      }
      setAiLoading(prev => ({ ...prev, geo: false }));
  };

  const handleGenerateFingerprint = async () => {
      if (!formData.name) {
          alert("Please enter a profile name first.");
          return;
      }
      setAiLoading(prev => ({ ...prev, fingerprint: true }));
      const fingerprintData = await generateFullFingerprint(formData.name);
      if (fingerprintData) {
          setFormData(prev => ({...prev, ...fingerprintData }));
      } else {
          alert('Failed to generate a full fingerprint. Please try again or generate fields individually.');
      }
      setAiLoading(prev => ({ ...prev, fingerprint: false }));
  };

  const handleParseCookies = async () => {
    setAiLoading(prev => ({ ...prev, cookies: true }));
    const parsed = await parseCookies(formData.cookies);
    setFormData(prev => ({ ...prev, cookies: parsed }));
    setAiLoading(prev => ({ ...prev, cookies: false }));
  };

  const handleGenerateUserAgent = async () => {
    setAiLoading(prev => ({...prev, userAgent: true}));
    const ua = await generateUserAgent();
    if (ua && !ua.startsWith("Error")) {
        setFormData(prev => ({...prev, userAgent: ua}));
    } else {
        alert('Failed to generate User Agent.');
    }
    setAiLoading(prev => ({...prev, userAgent: false}));
  };

  const handleGenerateMacAddress = async () => {
    setAiLoading(prev => ({...prev, macAddress: true}));
    const mac = await generateMacAddress();
    if (mac && !mac.startsWith("Error")) {
        setFormData(prev => ({...prev, macAddress: mac}));
    } else {
        alert('Failed to generate MAC Address.');
    }
    setAiLoading(prev => ({...prev, macAddress: false}));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
      <div className="bg-brand-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
        <div className="flex justify-between items-center p-4 border-b border-brand-dark">
          <h2 className="text-xl font-bold text-white">{profile ? 'Edit Profile' : 'Create New Profile'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-dark">
             <CloseIcon/>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto p-6 space-y-4">
            <div className="flex items-start gap-4">
                <div className="flex-grow">
                    <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary mb-1">Profile Name</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text"/>
                </div>
                <div className="pt-6">
                    <AILoadingButton onClick={handleGenerateFingerprint} loading={aiLoading.fingerprint}>Generate Fingerprint</AILoadingButton>
                </div>
            </div>
            
            <Accordion title="Proxy Configuration">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                      <label htmlFor="proxy.type" className="block text-xs font-medium text-brand-text-secondary mb-1">Proxy Type</label>
                      <select id="proxy.type" name="proxy.type" value={formData.proxy.type} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm" >
                          <option value={ProxyType.None}>None</option>
                          <option value={ProxyType.HTTP}>HTTP</option>
                          <option value={ProxyType.SOCKS5}>SOCKS5</option>
                      </select>
                  </div>
                  {formData.proxy.type !== ProxyType.None && (
                      <>
                          <div>
                              <label htmlFor="proxy.ip" className="block text-xs font-medium text-brand-text-secondary mb-1">IP Address</label>
                              <input type="text" id="proxy.ip" name="proxy.ip" value={formData.proxy.ip} onChange={handleChange} placeholder="127.0.0.1" className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                          </div>
                          <div>
                              <label htmlFor="proxy.port" className="block text-xs font-medium text-brand-text-secondary mb-1">Port</label>
                              <input type="text" id="proxy.port" name="proxy.port" value={formData.proxy.port} onChange={handleChange} placeholder="8080" className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                          </div>
                          <div>
                              <label htmlFor="proxy.username" className="block text-xs font-medium text-brand-text-secondary mb-1">Username (Optional)</label>
                              <input type="text" id="proxy.username" name="proxy.username" value={formData.proxy.username || ''} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                          </div>
                          <div>
                              <label htmlFor="proxy.password" className="block text-xs font-medium text-brand-text-secondary mb-1">Password (Optional)</label>
                              <input type="password" id="proxy.password" name="proxy.password" value={formData.proxy.password || ''} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                          </div>
                          <div className="md:col-span-2">
                            <AILoadingButton onClick={handleFetchGeo} loading={aiLoading.geo}>Fetch Geo from IP</AILoadingButton>
                          </div>
                      </>
                  )}
              </div>
            </Accordion>
            
            <Accordion title="Geolocation">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="timezone" className="block text-xs font-medium text-brand-text-secondary mb-1">Timezone</label>
                        <input type="text" name="timezone" value={formData.timezone} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="language" className="block text-xs font-medium text-brand-text-secondary mb-1">Language</label>
                        <input type="text" name="language" value={formData.language} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                </div>
            </Accordion>

            <Accordion title="Hardware Spoofing">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label htmlFor="deviceName" className="block text-xs font-medium text-brand-text-secondary mb-1">Device Name</label>
                        <input type="text" name="deviceName" value={formData.deviceName} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="cpuCores" className="block text-xs font-medium text-brand-text-secondary mb-1">CPU Cores</label>
                        <input type="number" name="cpuCores" value={formData.cpuCores} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="memory" className="block text-xs font-medium text-brand-text-secondary mb-1">Memory (GB)</label>
                        <input type="number" name="memory" value={formData.memory} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                </div>
            </Accordion>

            <Accordion title="Fingerprint Protection">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['audioContextNoise', 'mediaDeviceNoise', 'clientRectsNoise', 'speechVoicesSpoof'].map(key => (
                        <label key={key} className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                            <input
                                type="checkbox"
                                name={key}
                                checked={formData[key as keyof FormData] as boolean}
                                onChange={handleChange}
                                className="w-4 h-4 rounded text-brand-secondary bg-brand-dark border-brand-dark/50 focus:ring-brand-secondary"
                            />
                            {key.replace(/([A-Z])/g, ' $1').replace('Noise', '').trim()}
                        </label>
                    ))}
                 </div>
            </Accordion>
            
            <Accordion title="Advanced Fingerprint">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="userAgent" className="flex items-center text-xs font-medium text-brand-text-secondary mb-1">User Agent</label>
                        <div className="flex gap-2">
                            <input type="text" id="userAgent" name="userAgent" value={formData.userAgent} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                            <AILoadingButton onClick={handleGenerateUserAgent} loading={aiLoading.userAgent}>Generate</AILoadingButton>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="macAddress" className="flex items-center text-xs font-medium text-brand-text-secondary mb-1">MAC Address</label>
                        <div className="flex gap-2">
                            <input type="text" id="macAddress" name="macAddress" value={formData.macAddress} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                            <AILoadingButton onClick={handleGenerateMacAddress} loading={aiLoading.macAddress}>Generate</AILoadingButton>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="webGLVendor" className="block text-xs font-medium text-brand-text-secondary mb-1">WebGL Vendor</label>
                        <input type="text" name="webGLVendor" value={formData.webGLVendor} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="webGLRenderer" className="block text-xs font-medium text-brand-text-secondary mb-1">WebGL Renderer</label>
                        <input type="text" name="webGLRenderer" value={formData.webGLRenderer} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm"/>
                    </div>
                     <div>
                        <label htmlFor="screenResolution" className="block text-xs font-medium text-brand-text-secondary mb-1">Screen Resolution</label>
                        <select id="screenResolution" name="screenResolution" value={formData.screenResolution} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm">
                            <option>390x844</option>
                            <option>375x667</option>
                            <option>414x896</option>
                            <option>320x568</option>
                            <option>1920x1080</option>
                            <option>2560x1440</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="webRTC" className="block text-xs font-medium text-brand-text-secondary mb-1">WebRTC</label>
                        <select id="webRTC" name="webRTC" value={formData.webRTC} onChange={handleChange} className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text text-sm">
                            <option>Disabled</option>
                            <option>Public</option>
                        </select>
                    </div>
                 </div>
            </Accordion>
             
            <Accordion title="Extensions">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {extensions.length === 0 ? (
                        <p className="text-xs text-brand-text-secondary col-span-full">No extensions added yet.</p>
                    ) : extensions.map(ext => (
                        <label key={ext.id} className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.extensionIds.includes(ext.id)}
                                onChange={() => handleExtensionToggle(ext.id)}
                                className="w-4 h-4 rounded text-brand-secondary bg-brand-dark border-brand-dark/50 focus:ring-brand-secondary"
                            />
                            {ext.name}
                        </label>
                    ))}
                </div>
            </Accordion>
            
            <Accordion title="Cookies">
                <label htmlFor="cookies" className="flex items-center text-sm font-medium text-brand-text-secondary mb-1">
                    Cookies (Paste to Parse)
                     <AILoadingButton onClick={handleParseCookies} loading={aiLoading.cookies} className="ml-2">Parse</AILoadingButton>
                </label>
                <textarea id="cookies" name="cookies" value={formData.cookies} onChange={handleChange} rows={3} placeholder="Paste raw cookie data here..." className="w-full bg-brand-dark border border-brand-dark focus:border-brand-secondary focus:ring-brand-secondary rounded-md p-2 text-brand-text font-mono text-xs"></textarea>
            </Accordion>
          </div>
          <div className="p-4 bg-brand-dark/50 flex justify-end gap-3 border-t border-brand-dark">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-brand-secondary hover:bg-blue-500 text-white font-semibold rounded-lg">{profile ? 'Save Changes' : 'Create Profile'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;