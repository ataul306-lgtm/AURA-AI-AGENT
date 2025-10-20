import React from 'react';
import { BrowserProfile, ProxyType } from '../types';
import { FingerprintIcon } from './icons/FingerprintIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { HardwareIcon } from './icons/HardwareIcon';
import { WebGLIcon } from './icons/WebGLIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface ProfileInfoViewProps {
  profile: BrowserProfile;
}

const InfoRow: React.FC<{ label: string; value: string | React.ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth = false }) => (
  <div className={`flex flex-col ${fullWidth ? 'sm:col-span-2' : ''}`}>
    <span className="text-xs text-brand-text-secondary font-medium">{label}</span>
    <span className="text-sm text-brand-text break-words font-mono">{value}</span>
  </div>
);

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-brand-surface/70 rounded-lg p-4 border border-brand-dark/50">
        <h3 className="text-md font-bold text-white flex items-center gap-2 mb-3">
            {icon}
            {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {children}
        </div>
    </div>
);

const ProfileInfoView: React.FC<ProfileInfoViewProps> = ({ profile }) => {
  return (
    <div className="w-full h-full p-4 space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Profile Active: <span className="text-brand-secondary">{profile.name}</span></h2>
      <p className="text-center text-brand-text-secondary text-sm -mt-2">This is a summary of the active fingerprint and settings for this simulated browser.</p>

      <InfoCard title="Identity & User Agent" icon={<FingerprintIcon />}>
        <InfoRow label="Device Name" value={profile.deviceName || 'Not Set'} />
        <InfoRow label="MAC Address" value={profile.macAddress || 'Not Set'} />
        <InfoRow label="User Agent" value={profile.userAgent || 'Default'} fullWidth/>
      </InfoCard>

      <InfoCard title="Network & Geolocation" icon={<GlobeIcon />}>
        <InfoRow 
            label="Proxy" 
            value={
                profile.proxy.type === ProxyType.None 
                ? 'None' 
                : `${profile.proxy.type}: ${profile.proxy.ip}:${profile.proxy.port}`
            } 
        />
        <InfoRow label="Timezone" value={profile.timezone} />
        <InfoRow label="Language" value={profile.language} />
        <InfoRow label="WebRTC" value={profile.webRTC} />
      </InfoCard>
      
      <InfoCard title="Hardware Spoofing" icon={<HardwareIcon />}>
        <InfoRow label="CPU Cores" value={`${profile.cpuCores} Cores`} />
        <InfoRow label="Memory" value={`${profile.memory} GB`} />
        <InfoRow label="Screen Resolution" value={profile.screenResolution} />
      </InfoCard>

      <InfoCard title="Graphics (WebGL)" icon={<WebGLIcon />}>
        <InfoRow label="Vendor" value={profile.webGLVendor} fullWidth/>
        <InfoRow label="Renderer" value={profile.webGLRenderer} fullWidth/>
      </InfoCard>

      <InfoCard title="Fingerprint Protection" icon={<ShieldCheckIcon />}>
        <InfoRow label="Audio Context Noise" value={profile.audioContextNoise ? 'Enabled' : 'Disabled'} />
        <InfoRow label="Media Device Noise" value={profile.mediaDeviceNoise ? 'Enabled' : 'Disabled'} />
        <InfoRow label="Client Rects Noise" value={profile.clientRectsNoise ? 'Enabled' : 'Disabled'} />
        <InfoRow label="Speech Voices Spoof" value={profile.speechVoicesSpoof ? 'Enabled' : 'Disabled'} />
      </InfoCard>

    </div>
  );
};

export default ProfileInfoView;
