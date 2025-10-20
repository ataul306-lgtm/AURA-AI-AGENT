import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());

// API routes
app.post('/api/generate-content', async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: { temperature: 0.7, topP: 1, topK: 1 }
        });
        res.json({ text: response.text.trim() });
    } catch (error) {
        console.error("Error in /api/generate-content:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
});

app.post('/api/geo-from-ip', async (req, res) => {
    try {
        const { ip } = req.body;
        const prompt = `Based on the IP address "${ip}", provide the most likely geographic data in a JSON object. The object must have these exact keys: "timezone" (e.g., "America/New_York") and "language" (e.g., "en-US"). Return only the raw JSON object.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { timezone: { type: Type.STRING }, language: { type: Type.STRING } }
                }
            }
        });
        res.send(response.text.trim());
    } catch (error) {
        console.error("Error in /api/geo-from-ip:", error);
        res.status(500).json({ error: "Failed to fetch geo data" });
    }
});

app.post('/api/generate-fingerprint', async (req, res) => {
    try {
        const { profileName } = req.body;
        const prompt = `Generate a complete and consistent browser fingerprint for a modern, high-end mobile device. The device name should be based on the profile name "${profileName}". The output must be a single JSON object with these exact keys: "userAgent" (string), "screenResolution" (string, e.g., "390x844"), "cpuCores" (number, 10), "memory" (number, 8), "webGLVendor" (string, "Google Inc. (Apple)"), "webGLRenderer" (string, "Apple GPU"), "macAddress" (string), "deviceName" (string, based on profileName). Return only the raw JSON object.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { userAgent: { type: Type.STRING }, screenResolution: { type: Type.STRING }, cpuCores: { type: Type.INTEGER }, memory: { type: Type.INTEGER }, webGLVendor: { type: Type.STRING }, webGLRenderer: { type: Type.STRING }, macAddress: { type: Type.STRING }, deviceName: { type: Type.STRING } }
                }
            }
        });
        res.send(response.text.trim());
    } catch (error) {
        console.error("Error in /api/generate-fingerprint:", error);
        res.status(500).json({ error: "Failed to generate fingerprint" });
    }
});

app.post('/api/analyze-fingerprint', async (req, res) => {
    try {
        const { profile } = req.body;
        const { proxy, ...profileData } = profile;
        const prompt = `You are a digital privacy expert... Analyze the following profile... Profile Data: ${JSON.stringify(profileData, null, 2)} Proxy IP (if any): ${proxy.ip || 'N/A'} ... Respond with a single raw JSON object...`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { risk: { type: Type.STRING, enum: ['low', 'medium', 'high'] }, report: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { parameter: { type: Type.STRING }, issue: { type: Type.STRING }, suggestion: { type: Type.STRING } } } } }
                }
            }
        });
        res.send(response.text.trim());
    } catch (error) {
        console.error("Error in /api/analyze-fingerprint:", error);
        res.status(500).json({ error: "Failed to analyze fingerprint" });
    }
});

app.post('/api/parse-cookies', async (req, res) => {
    try {
        const { cookieString } = req.body;
        const prompt = `Parse the following raw cookie string into a JSON array of objects... The input string is: \n\n${cookieString}\n\nReturn only the valid JSON array.`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING }, domain: { type: Type.STRING }, path: { type: Type.STRING }, expires: { type: Type.STRING }, secure: { type: Type.BOOLEAN } } } }
            }
        });
        res.send(response.text.trim());
    } catch (error) {
        console.error("Error in /api/parse-cookies:", error);
        res.status(500).json({ error: "Failed to parse cookies" });
    }
});

app.post('/api/search-web', async (req, res) => {
    try {
        const { query } = req.body;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: query }] }],
            config: { tools: [{ googleSearch: {} }] }
        });
        res.json(response); // Send the full response object
    } catch (error) {
        console.error("Error in /api/search-web:", error);
        res.status(500).json({ error: "Failed to search web" });
    }
});

app.post('/api/agent-response', async (req, res) => {
    try {
        const { userInput, profiles, tools } = req.body;
        const profileContext = profiles.length > 0 ? profiles.map(p => `- "${p.name}" (Status: ${p.status})`).join('\\n') : "No profiles have been created yet.";
        const systemInstruction = `You are Aura, a helpful AI agent... Here is the current list of profiles and their status.\\n${profileContext}...`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: userInput }] }],
            config: { systemInstruction, tools: [{ functionDeclarations: tools }] }
        });
        res.json({ text: response.text, functionCall: response.functionCalls?.[0] });
    } catch (error) {
        console.error("Error in /api/agent-response:", error);
        res.status(500).json({ error: "Failed to get agent response" });
    }
});

// Serve frontend
const clientDistPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
