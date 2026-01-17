import React, { useState, useEffect, useRef } from 'react';
import { Cloud, PauseCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

// Maps role/model to visual identity
const getUser = (role, model, teamName, isAmd) => {
    let avatar = '🤖';
    let color = 'bg-slate-800';
    let team = teamName || 'Debater';
    let name = model || 'Unknown Model';
    let roleLabel = role || 'Participant';

    const lowerRole = role?.toLowerCase() || '';
    const lowerModel = model?.toLowerCase() || '';

    if (isAmd || lowerRole.includes('amd') || (teamName && teamName.toLowerCase().includes('host')) || lowerModel.includes('admin')) {
        color = 'bg-red-600';
        if (!teamName) team = 'AMD Host';
    } else if (lowerRole.includes('moderator')) {
        avatar = '⚖️';
        color = 'bg-purple-800';
        if (!teamName) team = 'Moderator';
    } else {
        color = 'bg-zinc-800'; // Darker for mobile contrast
        if (lowerModel.includes('llama')) avatar = '🦙';
        else if (lowerModel.includes('gpt')) avatar = '🧠';
        else if (lowerModel.includes('qwen')) avatar = '👾';
        else avatar = '⚡';
    }

    return { id: model, name: name, avatar, color, role: roleLabel, team: team.toUpperCase(), avatar_url: teamName?.avatar_url };
};

export default function MobileFeed() {
    const [messages, setMessages] = useState([]);
    const [topic, setTopic] = useState("Initializing...");
    const [debateHeadline, setDebateHeadline] = useState("");
    const [tickerText, setTickerText] = useState("LIVE DEBATE");
    const [mobileBgUrl, setMobileBgUrl] = useState("");
    const [streamStatus, setStreamStatus] = useState("disconnected");
    const buffer = useRef([]);
    const totalMsgCount = useRef(0); // [NEW] Track total messages for stable alternation

    // Connection Logic
    useEffect(() => {
        let evtSource = null;

        const connect = () => {
            console.log("Connecting Mobile Feed...");
            evtSource = new EventSource(`${API_BASE_URL}/debate/stream?limit=10`);

            evtSource.onopen = () => {
                console.log("Connected");
                setStreamStatus("connected");
            };

            evtSource.onerror = (err) => {
                console.error("Stream Error", err);
                setStreamStatus("error");
                evtSource.close();
                setTimeout(connect, 3000);
            };

            evtSource.addEventListener("init", (event) => {
                const data = JSON.parse(event.data);
                setTopic(data.topic);
                setDebateHeadline(data.headline || "");
                if (data.ticker) setTickerText(data.ticker);
                if (data.mobile_bg_url) setMobileBgUrl(data.mobile_bg_url);
            });

            evtSource.addEventListener("config_update", (event) => {
                const data = JSON.parse(event.data);
                if (data.topic) setTopic(data.topic);
                if (data.headline !== undefined) setDebateHeadline(data.headline);
                if (data.ticker) setTickerText(data.ticker);
                if (data.mobile_bg_url !== undefined) setMobileBgUrl(data.mobile_bg_url);
            });

            evtSource.addEventListener("ticker", (e) => setTickerText(e.data));

            evtSource.addEventListener("message", (event) => {
                const data = JSON.parse(event.data);
                const user = getUser(data.role, data.model, data.team, data.is_amd);
                if (data.avatar_url) user.avatar_url = data.avatar_url;

                totalMsgCount.current += 1; // Increment count
                const isRight = totalMsgCount.current % 2 === 0; // Determine side

                const newMessage = {
                    id: Date.now() + Math.random(),
                    userId: data.model,
                    headline: data.headline || data.role.toUpperCase(),
                    text: data.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    _user: user,
                    isRight: isRight // [NEW] Store specific side
                };

                setMessages(prev => [newMessage, ...prev].slice(0, 50)); // Keep fewer items for mobile perf
            });

            evtSource.addEventListener("ping", () => { });
        };

        connect();
        return () => { if (evtSource) evtSource.close(); };
    }, []);

    return (
        <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden items-center justify-center">

            {/* 9:16 Container (Optional constraint if viewing on Desktop, otherwise Full) */}
            <div
                className="w-full h-full max-w-md relative flex flex-col bg-neutral-900 shadow-2xl bg-cover bg-center"
                style={{ backgroundImage: mobileBgUrl ? `url(${mobileBgUrl})` : undefined }}
            >

                {/* Overlay for readability if bg image is set */}


                {/* FEED AREA - Pushed up via padding (increased to 45vh for spacing) */}
                <div className="flex-1 flex flex-col-reverse overflow-y-auto w-full p-4 gap-6 pt-20 pb-[45vh] scrollbar-hide z-10">

                    {/* Thinking / Typing Indicator (Always visible when connected, or logic based) */}
                    {streamStatus === 'connected' && (
                        <div className="flex flex-col gap-2 items-start animate-fade-in-up">
                            {/* Placeholder Avatar for System/Thinking */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                    <span className="text-xs">💭</span>
                                </div>
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const user = msg._user;
                        const alignClass = msg.isRight ? 'items-end' : 'items-start';
                        const textAlign = 'text-left'; // [MODIFIED] Always left align text
                        const flexDirection = msg.isRight ? 'flex-row-reverse' : 'flex-row';
                        const bubbleRadius = msg.isRight ? 'rounded-tr-sm' : 'rounded-tl-sm';

                        return (
                            <div key={msg.id} className={`animate-fade-in-up flex flex-col gap-2 ${alignClass}`}>
                                {/* Header: Avatar + Name */}
                                <div className={`flex items-center gap-3 ${flexDirection}`}>
                                    <div className={`w-12 h-12 shrink-0 rounded-full border-2 border-white/20 flex items-center justify-center text-2xl overflow-hidden ${user.color}`}>
                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.avatar}
                                    </div>
                                    <div className={`flex flex-col ${textAlign} bg-zinc-900 border border-white/10 px-3 py-1 rounded-md shadow-sm`}>
                                        <span className="font-bold text-sm uppercase tracking-wide text-white/90">{user.role}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-white/50">{user.name}</span>
                                    </div>
                                    <span className={`text-xs text-white/30 font-mono ${msg.isRight ? 'mr-auto' : 'ml-auto'}`}>{msg.timestamp}</span>
                                </div>

                                {/* Content Bubble */}
                                <div className={`bg-zinc-900 border border-white/10 rounded-2xl p-4 text-white max-w-[90%] ${bubbleRadius} ${textAlign}`}>
                                    {msg.headline && (
                                        <div className="font-black text-lg mb-1 uppercase tracking-tight text-yellow-400 leading-tight">
                                            {msg.headline}
                                        </div>
                                    )}
                                    <div className="text-lg leading-snug font-medium text-gray-100">
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* HEADLINE - Bottom Left Half, behind posts */}
                <div className="absolute bottom-[35%] left-4 w-1/2 z-0 pointers-events-none">
                    <h1 className="text-2xl font-black uppercase leading-none tracking-tight text-white drop-shadow-lg text-left">
                        {debateHeadline || topic}
                    </h1>
                </div>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-marquee { display: inline-block; padding-left: 100%; animation: marquee 15s linear infinite; }
                @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
            `}</style>
        </div>
    );
}
