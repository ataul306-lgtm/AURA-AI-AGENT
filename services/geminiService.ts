import { type BrowserProfile, type HealthStatus } from "../types";
// FIX: Import 'Type' from '@google/genai' to use in function declarations.
import { Type, type FunctionDeclaration, type FunctionCall } from '@google/genai';

// A helper function to call our secure backend
const callApi = async <T>(endpoint: string, body: object): Promise<T | null> => {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            console.error(`API call to /api/${endpoint} failed:`, await response.text());
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Error calling backend service /api/${endpoint}:`, error);
        return null;
    }
};

const callApiWithTextResponse = async (endpoint: string, body: object): Promise<string | null> => {
     try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            console.error(`API call to /api/${endpoint} failed:`, await response.text());
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error calling backend service /api/${endpoint}:`, error);
        return null;
    }
};


export const getGeoDataFromIp = async (ip: string): Promise<{ timezone: string; language: string; } | null> => {
    const jsonStr = await callApiWithTextResponse('geo-from-ip', { ip });
    return jsonStr ? JSON.parse(jsonStr) : null;
};

export const generateFullFingerprint = async (profileName: string): Promise<Partial<BrowserProfile> | null> => {
    const jsonStr = await callApiWithTextResponse('generate-fingerprint', { profileName });
    return jsonStr ? JSON.parse(jsonStr) : null;
};

export const analyzeProfileFingerprint = async (profile: BrowserProfile): Promise<Omit<HealthStatus, 'lastChecked'> | null> => {
    const jsonStr = await callApiWithTextResponse('analyze-fingerprint', { profile });
    return jsonStr ? JSON.parse(jsonStr) : null;
};

export const generateUserAgent = async (): Promise<string> => {
    const result = await callApi<{ text: string }>('generate-content', { prompt: `Generate a single, realistic, and valid user agent string for a recent model of an Apple iPhone running a recent version of iOS. Only return the user agent string itself, with no extra text or explanation. Example: Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1` });
    return result?.text || "Error generating User Agent.";
};

export const generateMacAddress = async (): Promise<string> => {
    const result = await callApi<{ text: string }>('generate-content', { prompt: `Generate a single, valid MAC address in the format XX:XX:XX:XX:XX:XX. Only return the MAC address itself, with no extra text or explanation.` });
    return result?.text || "Error generating MAC Address.";
};

export const parseCookies = async (cookieString: string): Promise<string> => {
    if (!cookieString.trim()) {
        return "[]";
    }
    const jsonStr = await callApiWithTextResponse('parse-cookies', { cookieString });
    if (!jsonStr) return "Error: Could not parse cookies.";
    const parsedJson = JSON.parse(jsonStr);
    return JSON.stringify(parsedJson, null, 2);
};

// --- AI Agent Service ---

const tools: FunctionDeclaration[] = [
    { name: 'search_web', description: 'Searches the web...', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] } },
    { name: 'launch_profile', description: 'Launches a browser...', parameters: { type: Type.OBJECT, properties: { profile_name: { type: Type.STRING } }, required: ['profile_name'] } },
    { name: 'launch_and_navigate_profile', description: 'Launches and navigates...', parameters: { type: Type.OBJECT, properties: { profile_name: { type: Type.STRING }, url: { type: Type.STRING } }, required: ['profile_name', 'url'] } },
    { name: 'close_profile', description: 'Closes a profile...', parameters: { type: Type.OBJECT, properties: { profile_name: { type: Type.STRING } }, required: ['profile_name'] } },
    { name: 'navigate_url', description: 'Navigates a running profile...', parameters: { type: Type.OBJECT, properties: { profile_name: { type: Type.STRING }, url: { type: Type.STRING } }, required: ['profile_name', 'url'] } },
    { name: 'list_profiles', description: 'Lists all profiles...', parameters: { type: Type.OBJECT, properties: {} } },
    { name: 'create_profile', description: 'Creates a new profile...', parameters: { type: Type.OBJECT, properties: { profile_name: { type: Type.STRING }, proxy: { type: Type.STRING } }, required: ['profile_name'] } }
];

export const searchWeb = async (query: string): Promise<string> => {
    const response: any = await callApi('search-web', { query });
    if (!response || !response.text) return "Sorry, I couldn't search the web right now.";
    
    const answer = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: string[] = Array.from(new Set(
         groundingChunks
        .map((chunk: any) => chunk.web)
        .filter(Boolean)
        .map((web: any) => `[${web.title}](${web.uri})`)
    ));
    
    if (sources.length > 0) {
        return `${answer}\n\nSources:\n${sources.join('\n')}`;
    }
    return answer;
};

export const getAiAgentResponse = async (
    userInput: string,
    profiles: BrowserProfile[]
): Promise<{ text: string, functionCall?: FunctionCall }> => {
    const result = await callApi<{ text: string, functionCall?: FunctionCall }>('agent-response', { userInput, profiles, tools });
    return result || { text: "Sorry, I encountered an error. Please try again." };
};
