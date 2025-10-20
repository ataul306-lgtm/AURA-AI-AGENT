import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { type BrowserProfile, ProfileStatus, BrowserExtension, ProxyConfig, ProxyType, HealthReportItem } from './types';
import Header from './components/Header';
import ProfileCard from './components/ProfileCard';
import ProfileModal from './components/ProfileModal';
import { PlusIcon } from './components/icons/PlusIcon';
import BrowserView from './components/BrowserView';
import AiAgent from './components/AiAgent';
import { ChatBubbleIcon } from './components/icons/ChatBubbleIcon';
import ConfirmationModal from './components/ConfirmationModal';
import ExtensionsModal from './components/ExtensionsModal';
import HealthReportModal from './components/HealthReportModal';
import { searchWeb, analyzeProfileFingerprint } from './services/geminiService';

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<BrowserProfile[]>(() => {
    try {
      const savedProfiles = localStorage.getItem('auraBrowserProfiles');
      return savedProfiles ? JSON.parse(savedProfiles) : [];
    } catch (error) {
      console.error("Error loading profiles from localStorage", error);
      return [];
    }
  });
  const [extensions, setExtensions] = useState<BrowserExtension[]>(() => {
    try {
      const savedExtensions = localStorage.getItem('auraBrowserExtensions');
      return savedExtensions ? JSON.parse(savedExtensions) : [];
    } catch (error) {
      console.error("Error loading extensions from localStorage", error);
      return [];
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [isHealthReportModalOpen, setIsHealthReportModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrowserProfile | null>(null);
  const [viewingHealthProfile, setViewingHealthProfile] = useState<BrowserProfile | null>(null);
  const [zIndexes, setZIndexes] = useState<{ [profileId: string]: number }>({});
  const [nextZIndex, setNextZIndex] = useState(100);
  const [isAiAgentVisible, setIsAiAgentVisible] = useState(false);
  const [runningProfileUrls, setRunningProfileUrls] = useState<{[profileId: string]: string}>({});
  const [checkingHealthProfileId, setCheckingHealthProfileId] = useState<string | null>(null);


  const [showAiAgent, setShowAiAgent] = useState(true);
  const [deletingProfile, setDeletingProfile] = useState<BrowserProfile | null>(null);

  useEffect(() => {
    try {
        localStorage.setItem('auraBrowserProfiles', JSON.stringify(profiles));
    } catch (error) {
        console.error("Error saving profiles to localStorage", error);
    }
  }, [profiles]);

  useEffect(() => {
    try {
        localStorage.setItem('auraBrowserExtensions', JSON.stringify(extensions));
    } catch (error) {
        console.error("Error saving extensions to localStorage", error);
    }
  }, [extensions]);


  const handleOpenProfileModal = (profile: BrowserProfile | null) => {
    setEditingProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setEditingProfile(null);
    setIsProfileModalOpen(false);
  };

  const handleSaveProfile = (profile: BrowserProfile) => {
    const newProfileData = {
      ...profile,
      healthStatus: profile.healthStatus || { risk: 'unchecked', report: [], lastChecked: null },
    };

    if (editingProfile) {
      setProfiles(profiles.map(p => (p.id === profile.id ? newProfileData : p)));
    } else {
      setProfiles([...profiles, { ...newProfileData, id: Date.now().toString(), status: ProfileStatus.Stopped }]);
    }
    handleCloseProfileModal();
  };

  const handleDeleteRequest = useCallback((id: string) => {
      const profileToDelete = profiles.find(p => p.id === id);
      if (profileToDelete) {
          setDeletingProfile(profileToDelete);
      }
  }, [profiles]);

  const handleConfirmDelete = useCallback(() => {
    if (deletingProfile) {
      setProfiles(prevProfiles => prevProfiles.filter(p => p.id !== deletingProfile.id));
      setDeletingProfile(null);
    }
  }, [deletingProfile]);

  const handleCloseDeleteModal = () => {
    setDeletingProfile(null);
  };
  
  const handleAddExtension = (name: string): string => {
    const newExtension: BrowserExtension = {
        id: Date.now().toString(),
        name,
        icon: 'puzzle', // Placeholder icon name
    };
    setExtensions(prev => [...prev, newExtension]);
    return newExtension.id;
  };

  const handleRemoveExtension = (id: string) => {
    setExtensions(prev => prev.filter(ext => ext.id !== id));
    // Also remove this extension from any profiles that use it
    setProfiles(prev => prev.map(p => ({
        ...p,
        extensionIds: p.extensionIds.filter(extId => extId !== id),
    })));
  };

  const handleBringToFront = useCallback((id: string) => {
    if (zIndexes[id] === nextZIndex - 1) return; // Already in front
    setZIndexes(prev => ({ ...prev, [id]: nextZIndex }));
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex, zIndexes]);

  const handleLaunchProfile = useCallback((id: string) => {
    setProfiles(prevProfiles =>
      prevProfiles.map(p => {
        if (p.id === id) {
          const newStatus = p.status === ProfileStatus.Running ? ProfileStatus.Stopped : ProfileStatus.Running;
          
          if (newStatus === ProfileStatus.Running) {
            handleBringToFront(id);
          } else {
            setZIndexes(prev => {
              const newZIndexes = { ...prev };
              delete newZIndexes[id];
              return newZIndexes;
            });
            setRunningProfileUrls(prev => {
                const newUrls = {...prev};
                delete newUrls[id];
                return newUrls;
            });
          }

          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  }, [handleBringToFront]);

  const handleHealthCheck = useCallback(async (profileId: string) => {
      const profileToCheck = profiles.find(p => p.id === profileId);
      if (!profileToCheck) return;

      setCheckingHealthProfileId(profileId);
      const result = await analyzeProfileFingerprint(profileToCheck);
      setCheckingHealthProfileId(null);
      
      if (result) {
          setProfiles(prev => prev.map(p => p.id === profileId ? {
              ...p,
              healthStatus: { ...result, lastChecked: new Date().toISOString() }
          } : p));
      } else {
          alert("Failed to perform health check. Please check your API key and try again.");
      }
  }, [profiles]);
  
  const handleViewHealthReport = (profileId: string) => {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
          setViewingHealthProfile(profile);
          setIsHealthReportModalOpen(true);
      }
  };

  const handleApplyHealthFix = (profileId: string, fix: HealthReportItem) => {
      setProfiles(prev => prev.map(p => {
          if (p.id === profileId) {
              const updatedProfile = { ...p, [fix.parameter]: fix.suggestion };
              // Also update the report to reflect the fix
              const updatedReport = p.healthStatus?.report.filter(item => item.parameter !== fix.parameter) || [];
              const updatedHealthStatus = { ...p.healthStatus!, report: updatedReport };
              if(updatedReport.length === 0) {
                updatedHealthStatus.risk = 'low';
              }
              return { ...updatedProfile, healthStatus: updatedHealthStatus };
          }
          return p;
      }));
  };

  const handleAiNavigate = useCallback((profileName: string, url: string): string => {
      const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase() && p.status === ProfileStatus.Running);
      if (!profile) {
          return `Profile "${profileName}" is not running or does not exist.`;
      }
      setRunningProfileUrls(prev => ({...prev, [profile.id]: url}));
      handleBringToFront(profile.id);
      return `Navigating profile "${profileName}" to ${url}.`;
  }, [profiles, handleBringToFront]);

  const handleAiLaunch = useCallback((profileName: string): string => {
      const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
      if (!profile) {
          return `Profile "${profileName}" not found.`;
      }
      if (profile.status === ProfileStatus.Running) {
          handleBringToFront(profile.id);
          return `Profile "${profileName}" is already running.`;
      }
      handleLaunchProfile(profile.id);
      return `Launching profile "${profileName}".`;
  }, [profiles, handleLaunchProfile, handleBringToFront]);

  const handleAiClose = useCallback((profileName: string): string => {
      const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
       if (!profile) {
          return `Profile "${profileName}" not found.`;
      }
      if (profile.status !== ProfileStatus.Running) {
          return `Profile "${profileName}" is not running.`;
      }
      handleLaunchProfile(profile.id);
      return `Closing profile "${profileName}".`;
  }, [profiles, handleLaunchProfile]);

  const handleAiCreateProfile = useCallback((profileName: string, proxy?: string): string => {
    const existingProfile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
    if (existingProfile) {
        return `A profile with the name "${profileName}" already exists.`;
    }

    let proxyConfig: ProxyConfig = { type: ProxyType.None, ip: '', port: '', username: '', password: '' };
    if (proxy) {
        const parts = proxy.split(':');
        if (parts.length >= 2) {
            proxyConfig = {
                type: ProxyType.HTTP, // Default to HTTP for AI creation
                ip: parts[0],
                port: parts[1],
                username: parts[2] || '',
                password: parts[3] || '',
            };
        }
    }

    const newProfile: BrowserProfile = {
        id: Date.now().toString(),
        name: profileName,
        status: ProfileStatus.Stopped,
        proxy: proxyConfig,
        userAgent: '',
        screenResolution: '390x844',
        timezone: 'UTC',
        webRTC: 'Disabled',
        macAddress: '',
        cookies: '',
        extensionIds: [],
        language: 'en-US',
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
        healthStatus: { risk: 'unchecked', report: [], lastChecked: null },
    };
    setProfiles(prev => [...prev, newProfile]);
    if (proxy) {
        return `Successfully created a new profile named "${profileName}" with proxy. You can now edit it to generate a full fingerprint.`;
    }
    return `Successfully created a new profile named "${profileName}". You can now edit it to generate a full fingerprint.`;
  }, [profiles]);

  const handleAiLaunchAndNavigate = useCallback((profileName: string, url: string): string => {
    const profile = profiles.find(p => p.name.toLowerCase() === profileName.toLowerCase());
    if (!profile) {
      return `Profile "${profileName}" not found.`;
    }

    if (profile.status !== ProfileStatus.Running) {
        handleLaunchProfile(profile.id);
    }
    
    setTimeout(() => {
        setRunningProfileUrls(prev => ({ ...prev, [profile.id]: url }));
        handleBringToFront(profile.id);
    }, 100);

    let fullUrl = url.trim();
    if (!/^(https?:\/\/)/.test(fullUrl)) {
      fullUrl = `https://${fullUrl}`;
    }
    return `Successfully launched "${profileName}" and navigated to ${fullUrl}.`;

  }, [profiles, handleLaunchProfile, handleBringToFront]);

  const handleAiSearch = useCallback(async (query: string): Promise<string> => {
    return await searchWeb(query);
  }, []);

  const handleToggleAiAgent = (enabled: boolean) => {
      setShowAiAgent(enabled);
      if (!enabled) {
          setIsAiAgentVisible(false);
      }
  };

  const runningProfiles = useMemo(() => profiles.filter(p => p.status === ProfileStatus.Running), [profiles]);
  const allExtensions = useMemo(() => extensions, [extensions]);

  return (
    <div className="min-h-screen bg-brand-background text-brand-text font-sans selection:bg-brand-secondary selection:text-white">
      <Header 
        showAiAgent={showAiAgent} 
        onToggleAiAgent={handleToggleAiAgent}
        onOpenExtensions={() => setIsExtensionsModalOpen(true)}
       />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Browser Profiles</h1>
          <button
            onClick={() => handleOpenProfileModal(null)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            <PlusIcon />
            New Profile
          </button>
        </div>
        
        {profiles.length === 0 ? (
          <div className="text-center py-20 bg-brand-surface rounded-lg">
            <p className="text-brand-text-secondary">No profiles created yet.</p>
            <p className="text-brand-text-secondary mt-2">Click "New Profile" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => handleOpenProfileModal(profile)}
                onDelete={handleDeleteRequest}
                onLaunch={handleLaunchProfile}
                onHealthCheck={handleHealthCheck}
                onViewHealthReport={handleViewHealthReport}
                isCheckingHealth={checkingHealthProfileId === profile.id}
              />
            ))}
          </div>
        )}
      </main>
      
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={handleCloseProfileModal}
          onSave={handleSaveProfile}
          profile={editingProfile}
          extensions={allExtensions}
        />
      )}
      
      <ExtensionsModal
        isOpen={isExtensionsModalOpen}
        onClose={() => setIsExtensionsModalOpen(false)}
        extensions={allExtensions}
        onAdd={handleAddExtension}
        onRemove={handleRemoveExtension}
      />

      <HealthReportModal
        isOpen={isHealthReportModalOpen}
        onClose={() => setIsHealthReportModalOpen(false)}
        profile={viewingHealthProfile}
        onApplyFix={handleApplyHealthFix}
      />

      <ConfirmationModal
        isOpen={!!deletingProfile}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Profile"
        message={`Are you sure you want to permanently delete the profile "${deletingProfile?.name}"? This action cannot be undone.`}
      />

      {runningProfiles.map((profile, index) => (
          <BrowserView
            key={profile.id}
            profile={profile}
            onClose={() => handleLaunchProfile(profile.id)}
            initialPosition={{ x: 100 + index * 40, y: 100 + index * 40 }}
            zIndex={zIndexes[profile.id] || 100}
            onFocus={() => handleBringToFront(profile.id)}
            urlOverride={runningProfileUrls[profile.id]}
            allExtensions={allExtensions}
          />
      ))}
      
      {showAiAgent && (
        <button 
          onClick={() => setIsAiAgentVisible(!isAiAgentVisible)}
          className="fixed bottom-6 right-6 bg-brand-primary h-16 w-16 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-brand-secondary transition-all duration-300 transform hover:scale-110 z-[9999]"
          aria-label="Toggle AI Agent"
        >
          <ChatBubbleIcon className="w-8 h-8"/>
        </button>
      )}

      {showAiAgent && (
        <AiAgent 
          isVisible={isAiAgentVisible}
          onClose={() => setIsAiAgentVisible(false)}
          profiles={profiles}
          actions={{
              navigate: handleAiNavigate,
              launch: handleAiLaunch,
              close: handleAiClose,
              create: handleAiCreateProfile,
              launchAndNavigate: handleAiLaunchAndNavigate,
              search: handleAiSearch,
          }}
        />
      )}
    </div>
  );
};

export default App;