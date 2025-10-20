// FIX: Removed self-import of 'ProfileStatus' which caused a conflict with its own enum declaration.
export enum ProfileStatus {
    Running = 'Running',
    Stopped = 'Stopped',
    Error = 'Error',
}

export enum ProxyType {
    None = 'None',
    HTTP = 'HTTP',
    SOCKS5 = 'SOCKS5',
}

export interface ProxyConfig {
    type: ProxyType;
    ip: string;
    port: string;
    username?: string;
    password?: string;
}

export interface BrowserExtension {
    id: string;
    name: string;
    icon: string; // For simplicity, we'll use a generic icon or a placeholder URL
}

export interface HealthReportItem {
    parameter: string;
    issue: string;
    suggestion: string;
}

export interface HealthStatus {
    risk: 'low' | 'medium' | 'high' | 'unchecked';
    report: HealthReportItem[];
    lastChecked: string | null;
}

export interface BrowserProfile {
    id: string;
    name: string;
    proxy: ProxyConfig;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    webRTC: 'Public' | 'Disabled';
    macAddress: string;
    cookies: string;
    status: ProfileStatus;
    extensionIds: string[];
    // New Geolocation Fields
    language: string;
    // FIX: Added missing latitude and longitude properties to resolve type error in App.tsx.
    latitude: number;
    longitude: number;
    // New Hardware Spoofing Fields
    cpuCores: number;
    memory: number; // in GB
    deviceName: string;
    // New Fingerprint Protection Fields
    audioContextNoise: boolean;
    mediaDeviceNoise: boolean;
    clientRectsNoise: boolean;
    speechVoicesSpoof: boolean;
    // New WebGL Fields
    webGLVendor: string;
    webGLRenderer: string;
    // New Health Check field
    healthStatus?: HealthStatus;
}

export enum MessageAuthor {
    User = 'user',
    AI = 'ai',
    System = 'system',
}

export interface ChatMessage {
    id: number;
    author: MessageAuthor;
    text: string;
    isLoading?: boolean;
}