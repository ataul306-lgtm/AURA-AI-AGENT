import React, { useState, useRef, useEffect } from 'react';
import { type BrowserProfile, ProfileStatus, ChatMessage, MessageAuthor } from '../types';
import { getAiAgentResponse } from '../services/geminiService';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { FunctionCall } from '@google/genai';
import { TerminalIcon } from './icons/TerminalIcon';

interface AiAgentProps {
    isVisible: boolean;
    onClose: () => void;
    profiles: BrowserProfile[];
    actions: {
        navigate: (profileName: string, url: string) => string;
        launch: (profileName: string) => string;
        close: (profileName: string) => string;
        create: (profileName: string, proxy?: string) => string;
        launchAndNavigate: (profileName: string, url: string) => string;
        search: (query: string) => Promise<string>;
    }
}

const AiAgent: React.FC<AiAgentProps> = ({ isVisible, onClose, profiles, actions }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 1, author: MessageAuthor.AI, text: "Hello! I can manage profiles or search the web for you.\n\ne.g., \"Launch 'Work' and go to whoer.com\"\ne.g., \"What's the latest news about Gemini?\"" }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleFunctionCall = async (functionCall: FunctionCall) => {
        let result = "Unknown function or missing arguments.";
        const { name, args } = functionCall;
        let isAsync = false;

        if (name === 'search_web' && args.query) {
            isAsync = true;
            const query = args.query as string;
            const tempMessageId = Date.now();
            setMessages(prev => [...prev, { id: tempMessageId, author: MessageAuthor.System, text: `Searching for "${query}"...`, isLoading: true }]);
            
            const searchResult = await actions.search(query);
            
            setMessages(prev => prev.map(m => m.id === tempMessageId ? { ...m, text: searchResult, isLoading: false } : m));
        
        } else if (name === 'navigate_url' && args.profile_name && args.url) {
            result = actions.navigate(args.profile_name as string, args.url as string);
        } else if (name === 'launch_profile' && args.profile_name) {
            result = actions.launch(args.profile_name as string);
        } else if (name === 'launch_and_navigate_profile' && args.profile_name && args.url) {
            result = actions.launchAndNavigate(args.profile_name as string, args.url as string);
        } else if (name === 'close_profile' && args.profile_name) {
            result = actions.close(args.profile_name as string);
        } else if (name === 'create_profile' && args.profile_name) {
            result = actions.create(args.profile_name as string, args.proxy as string | undefined);
        } else if (name === 'list_profiles') {
            if (profiles.length === 0) {
                result = "There are no profiles yet."
            } else {
                result = "Here are your profiles:\n" + profiles.map(p => `- ${p.name} (${p.status})`).join('\n');
            }
        }
        
        if (!isAsync) {
             setMessages(prev => [...prev, { id: Date.now(), author: MessageAuthor.System, text: result }]);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: ChatMessage = { id: Date.now(), author: MessageAuthor.User, text: input };
        setMessages(prev => [...prev, userMessage, { id: Date.now() + 1, author: MessageAuthor.AI, text: '', isLoading: true }]);
        setInput('');

        const { text: aiText, functionCall } = await getAiAgentResponse(input, profiles);

        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
             if (lastMessage.author === MessageAuthor.AI) {
                lastMessage.text = aiText || "Thinking...";
                lastMessage.isLoading = false;
             }
            return newMessages;
        });

        if (functionCall) {
            await handleFunctionCall(functionCall);
        } else if (!aiText) {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.author === MessageAuthor.AI) {
                     lastMessage.text = "I'm not sure how to respond to that.";
                }
                return newMessages;
            });
        }
    };

    const renderSystemMessage = (text: string) => {
        return text.split('\n').map((line, lineIndex) => {
            const parts = line.split(/(\[.*?\]\(.*?\))/g);
            return (
                <p key={lineIndex} className="min-h-[1em]">
                    {parts.map((part, partIndex) => {
                        const match = part.match(/\[(.*?)\]\((.*?)\)/);
                        if (match) {
                            return <a key={partIndex} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline">{match[1]}</a>;
                        }
                        return <span key={partIndex}>{part}</span>;
                    })}
                </p>
            );
        });
    };

    const MessageBubble: React.FC<{msg: ChatMessage}> = ({msg}) => {
         switch (msg.author) {
            case MessageAuthor.User:
                return (
                    <div className="flex justify-end">
                        <div className="max-w-xs md:max-w-sm rounded-lg px-3 py-2 text-sm whitespace-pre-wrap bg-brand-secondary text-white rounded-br-none">
                            {msg.text}
                        </div>
                    </div>
                );
            case MessageAuthor.AI:
                return (
                    <div className="flex gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-brand-secondary flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-4 h-4 text-white"/></div>
                        <div className="max-w-xs md:max-w-sm rounded-lg px-3 py-2 text-sm whitespace-pre-wrap bg-brand-dark text-brand-text rounded-bl-none">
                            {msg.isLoading ? <div className="animate-pulse">...</div> : msg.text}
                        </div>
                    </div>
                );
            case MessageAuthor.System:
                 return (
                    <div className="flex gap-2 justify-start items-center">
                         <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><TerminalIcon className="w-4 h-4 text-gray-300"/></div>
                         <div className="max-w-xs md:max-w-sm rounded-lg px-3 py-2 text-xs text-brand-text-secondary italic">
                            {msg.isLoading ? <div className="animate-pulse">{msg.text}</div> : renderSystemMessage(msg.text)}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`fixed bottom-0 right-0 left-0 sm:left-auto sm:right-8 sm:bottom-28 bg-brand-surface border border-brand-dark/50 shadow-2xl rounded-t-lg sm:rounded-lg w-full sm:w-96 h-[70vh] sm:h-[60vh] flex flex-col transition-transform duration-300 ease-in-out z-[9998] ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <header className="flex items-center justify-between p-3 border-b border-brand-dark">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-brand-secondary" />
                    <h3 className="font-bold text-white">Aura AI Agent</h3>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-dark">
                    <CloseIcon />
                </button>
            </header>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <MessageBubble key={msg.id || index} msg={msg} />
                ))}
                 <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t border-brand-dark flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="w-full bg-brand-dark border border-brand-dark/50 focus:border-brand-secondary focus:ring-brand-secondary rounded-lg px-4 py-2 text-sm text-brand-text"
                />
                <button type="submit" className="bg-brand-secondary p-2 rounded-lg text-white hover:bg-blue-500 transition-colors disabled:opacity-50" disabled={!input.trim()}>
                    <SendIcon/>
                </button>
            </form>
        </div>
    );
};

export default AiAgent;