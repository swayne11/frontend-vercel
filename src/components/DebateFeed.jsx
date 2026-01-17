import React, { useState, useEffect, useRef } from 'react';
import {
    Radio,
    Globe,
    TrendingUp,
    Clock,
    Cpu,
    Zap,
    Shield,
    Code,
    Database,
    Server,
    Activity,
    Scale,
    Reply,
    MessageSquare,
    Lock,
    Cloud,
    PauseCircle // [NEW]
} from 'lucide-react';
import { API_BASE_URL } from '../config';


// Maps role/model to visual identity
const getUser = (role, model, teamName, isAmd) => {
    // Basic mapping heuristic based on role names or model names
    let avatar = '🤖';
    let color = 'bg-slate-700';
    let team = teamName || 'Debater'; // Use explicit team if provided
    let name = model || 'Unknown Model';
    let roleLabel = role || 'Participant';

    const lowerRole = role?.toLowerCase() || '';
    const lowerModel = model?.toLowerCase() || '';

    // AMD / Host Identity
    if (isAmd || lowerRole.includes('amd') || (teamName && teamName.toLowerCase().includes('host')) || lowerModel.includes('admin') || lowerModel.includes('operator')) {
        color = 'bg-red-600';
        if (!teamName) team = 'AMD Host';
    }
    // If moderator
    else if (lowerRole.includes('moderator')) {
        avatar = '⚖️';
        color = 'bg-purple-800';
        if (!teamName) team = 'Moderator';
        name = model || 'Moderator AI';
        roleLabel = 'The Moderator';
    }
    // Heuristic for "Team Small" / "Internal" vs "Team Large" / "External"
    else if (lowerRole.includes('small') || lowerRole.includes('local') || lowerModel.includes('mini') || lowerModel.includes('3b')) {
        if (!teamName) team = 'Team Local';
        color = 'bg-zinc-700'; // Small/Local -> Dark Gray
        if (lowerModel.includes('phi')) avatar = '📐';
        else if (lowerModel.includes('gemma')) avatar = '💎';
        else if (lowerModel.includes('mistral')) avatar = '🌪️';
        else avatar = '⚡';
    }
    else {
        // Assume large/outsourced
        if (!teamName) team = 'Team Scale';
        color = 'bg-zinc-700'; // Large/Scale -> Dark Gray
        if (lowerModel.includes('llama')) avatar = '🦙';
        else if (lowerModel.includes('gpt')) avatar = '🧠';
        else if (lowerModel.includes('qwen')) avatar = '👾';
        else avatar = '🚀';
    }

    return { id: model, name: name, avatar, color, role: roleLabel, team: team.toUpperCase(), avatar_url: teamName?.avatar_url };
};

export default function DebateFeed() {
    const [messages, setMessages] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [topic, setTopic] = useState("Initializing...");
    const [debateHeadline, setDebateHeadline] = useState(""); // [NEW]
    const [tickerText, setTickerText] = useState("8 LOCAL AI MODELS debating in real time on Ryzen AI Max+ 395");
    const [feedSpeed, setFeedSpeed] = useState(2000); // [NEW] Default 2s
    const [streamStatus, setStreamStatus] = useState("disconnected");
    // eslint-disable-next-line no-unused-vars
    const [isReconnecting, setIsReconnecting] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [participants, setParticipants] = useState({});

    // Staggered Loading State
    // Staggered Loading State
    const buffer = useRef([]); // [NEW] Buffer for paused state
    const [thinkingState, setThinkingState] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const isHoveredRef = useRef(false); // [NEW] Ref to access current hover state in listeners

    // Sync Ref with State
    useEffect(() => {
        isHoveredRef.current = isHovered;

        // Flush buffer when un-hovering
        if (!isHovered && buffer.current.length > 0) {
            const bufferedMsgs = [...buffer.current];
            buffer.current = []; // Clear buffer immediately

            setMessages(prev => {
                const newItems = bufferedMsgs.map(msg => {
                    const user = getUser(msg.role, msg.model, msg.team, msg.is_amd);
                    if (msg.avatar_url) user.avatar_url = msg.avatar_url;
                    return {
                        id: Date.now() + Math.random(),
                        userId: msg.model,
                        headline: msg.headline || msg.role.toUpperCase(),
                        topic: msg.topic,
                        text: msg.text,
                        timestamp: new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        likes: Math.floor(Math.random() * 100) + 10,
                        conversationCount: prev.length + 1, // Approximation
                        _user: user
                    };
                });
                // Add all buffered items to top
                return [...newItems, ...prev];
            });

            // Update participants from buffered items
            bufferedMsgs.forEach(msg => {
                if (msg.role && msg.model) {
                    setParticipants(prev => ({
                        ...prev,
                        [msg.role]: {
                            model: msg.model,
                            avatar: msg.avatar_url,
                            team: msg.team
                        }
                    }));
                }
            });
        }
    }, [isHovered]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let evtSource = null;
        let processingInterval = null;

        const connect = () => {
            console.log("Connecting to EventSource...");
            evtSource = new EventSource(`${API_BASE_URL}/debate/stream?limit=14`);

            evtSource.onopen = () => {
                console.log("Connection opened");
                setStreamStatus("connected");
                setIsReconnecting(false);
            };

            evtSource.onerror = (err) => {
                console.error("EventSource failed:", err);
                setStreamStatus("error");
                evtSource.close();
                setIsReconnecting(true);
                setTimeout(connect, 3000);
            };

            evtSource.addEventListener("init", (event) => {
                const data = JSON.parse(event.data);
                setTopic(data.topic);
                setDebateHeadline(data.headline || ""); // [NEW]
                if (data.ticker) setTickerText(data.ticker);
            });

            // [NEW] Handle live config updates
            evtSource.addEventListener("config_update", (event) => {
                const data = JSON.parse(event.data);
                if (data.topic) setTopic(data.topic);
                if (data.headline !== undefined) setDebateHeadline(data.headline);
                if (data.ticker) setTickerText(data.ticker);
                if (data.feed_speed) setFeedSpeed(data.feed_speed); // [NEW]
            });

            evtSource.addEventListener("ticker", (event) => {
                setTickerText(event.data);
            });

            evtSource.addEventListener("typing", (event) => {
                const data = JSON.parse(event.data);
                setThinkingState(data);
            });

            evtSource.addEventListener("message", (event) => {
                const data = JSON.parse(event.data);

                if (isHoveredRef.current) {
                    // Buffer if hovering
                    buffer.current.push(data);
                } else {
                    // Process immediately
                    const user = getUser(data.role, data.model, data.team, data.is_amd);
                    if (data.avatar_url) user.avatar_url = data.avatar_url;

                    const newMessage = {
                        id: Date.now() + Math.random(),
                        userId: data.model,
                        headline: data.headline || data.role.toUpperCase(),
                        topic: data.topic,
                        text: data.text,
                        timestamp: new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        likes: Math.floor(Math.random() * 100) + 10,
                        replyTo: data.replyTo || null, // Ensure replyTo is passed
                        conversationCount: messages.length + 1, // This is approximate in closure, but sufficient for visual
                        _user: user
                    };

                    setMessages(prev => [newMessage, ...prev]);

                    // Update participants map if new details arrive
                    if (data.role && data.model) {
                        setParticipants(prev => ({
                            ...prev,
                            [data.role]: {
                                model: data.model,
                                avatar: data.avatar_url,
                                team: data.team
                            }
                        }));
                    }
                }
            });

            evtSource.addEventListener("ping", () => { });
        };

        connect();

        return () => {
            if (evtSource) evtSource.close();
        };
    }, []); // Run once on mount

    // [NEW] Hover Ref to avoid stale closures in EventListener if we were using it there
    // BUT, we can just process the "message" event by checking a Ref.

    // Actually, simply using the useEffect above with [] means 'isHovered' would be stale.
    // Better approach: 
    // 1. Queue ALWAYS receives the message in the event listener.
    // 2. A separate effect monitors Queue + Hover? No, user wanted "Update when new post is made".
    //    That means the event listener triggers the update.

    // Let's rewrite the logic to be cleaner.
    // We need 'isHovered' ref to be accessible inside the event listener.


    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Extract latest headline and user for the callout
    const latestMessage = messages.length > 0 ? messages[0] : null;
    let currentUser = latestMessage ? latestMessage._user : null;

    // Override currentUser if someone is thinking
    let isThinking = false;
    if (thinkingState) {
        // Construct a partial user object for visual display
        const thinkingUser = getUser(thinkingState.role, thinkingState.model, thinkingState.team);
        // If we have mapped this user before in participants state (unlikely if they just started typing but maybe?)
        // We generally rely on getUser to give us a good color/avatar defaults
        currentUser = thinkingUser;
        isThinking = true;
    }

    return (
        <div className="flex h-screen bg-neutral-100 text-black font-sans overflow-hidden">
            {/* Main Content (Full Width) */}
            <div className="flex-1 flex flex-col min-w-0 bg-neutral-200 relative">

                {/* Header / Top Bar - Compact Black Bar */}
                <div className="h-12 bg-black flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
                    {/* Left: Branding */}
                    <div className="flex items-center space-x-3 shrink-0">
                        <div className="flex items-center space-x-2 text-white/80 text-xs uppercase tracking-widest font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            <span>Live</span>
                        </div>
                    </div>

                    {/* Right: Meta Stats */}
                    <div className="flex items-center space-x-4 text-white text-xs font-bold shrink-0 justify-end">
                        <div className="flex items-center space-x-2">
                            <Globe className="w-3 h-3 text-red-500" />
                            <span>LOCAL FEED</span>
                        </div>
                        <div className="w-px h-4 bg-white/20"></div>
                        <span>{formatTime(currentTime)}</span>


                    </div>
                </div>

                {/* SIDE SCROLLING BANNER */}
                <div className="bg-white text-red-600 min-h-14 md:min-h-24 h-auto py-2 md:py-4 flex items-center justify-center border-b-4 border-black relative z-10 px-4 md:px-8">
                    <div className="w-full text-center">
                        <span className="text-sm md:text-4xl font-black uppercase tracking-tighter text-center leading-tight inline-block break-words w-full">
                            {tickerText}
                        </span>
                    </div>
                </div>

                {/* LATEST HEADLINE CALLOUT - Massive & Dynamic with Profile Data on Right */}
                <div className="bg-red-600 shrink-0 border-b-4 border-black px-4 py-4 md:px-6 md:py-8 relative z-20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-end gap-1 md:gap-6">

                    <div className="flex-1 text-left min-w-0 w-full">
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white animate-fade-in-up break-words">
                            {debateHeadline || topic || "WAITING FOR START..."}
                        </h1>
                    </div>

                    {/* Right: User Profile Data (Featured or Thinking) */}
                    {currentUser && (
                        <div className="shrink-0 animate-fade-in-up mt-1 md:mt-0 w-full md:w-auto text-left md:text-right">
                            <div className="font-bold text-sm md:text-xl uppercase tracking-tighter text-white/90">
                                {isThinking && <span className="text-yellow-300 mr-2 animate-pulse">THINKING:</span>}
                                {currentUser.name}
                            </div>
                        </div>
                    )}

                    {/* Hover to Pause Instruction - Bottom Right */}
                    <div className="absolute bottom-2 right-4 hidden md:flex items-center space-x-2 text-white/90 animate-pulse">
                        <PauseCircle className="w-5 h-5" />
                        <span className="uppercase tracking-wider text-sm font-black">Hover Over Feed to Pause</span>
                    </div>
                </div>

                {/* Message Feed (Timeline) */}
                <div
                    className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 bg-neutral-200"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {messages.map((msg, idx) => {
                        const user = msg._user;
                        const teamName = user.team;

                        // Determine badge style based on user color
                        let teamColor = 'bg-blue-700 text-white border-blue-900'; // Default (Scale)
                        if (user.color.includes('orange')) {
                            teamColor = 'bg-orange-700 text-white border-orange-900';
                        } else if (user.color.includes('purple')) {
                            teamColor = 'bg-purple-800 text-white border-purple-900';
                        } else if (user.color.includes('red')) {
                            teamColor = 'bg-red-600 text-white border-red-800';
                        } else if (user.color.includes('zinc')) {
                            teamColor = 'bg-zinc-700 text-white border-zinc-900';
                        }

                        return (
                            <div key={msg.id} className="flex justify-start animate-slide-in-top group w-full">
                                <div className="flex w-full items-start gap-4">

                                    {/* Avatar - Squared off - Increased Size */}
                                    <div className="hidden sm:flex flex-col items-start shrink-0 pt-1">
                                        <div className={`w-28 h-28 flex items-center justify-center font-bold text-white text-5xl ${user.color} shadow-sm border border-black/10 overflow-hidden`}>
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                user.avatar
                                            )}
                                        </div>
                                        {/* Team Badge Moved Here */}
                                        <div className={`mt-2 w-28 px-2 py-1 text-[10px] font-black uppercase tracking-wider border-b-2 ${teamColor} shadow-sm text-left break-words leading-tight whitespace-normal`}>
                                            {teamName}
                                        </div>
                                    </div>

                                    {/* Message Bubble - Boxy Broadcast Graphic */}
                                    <div className="flex-1 bg-white shadow-sm border-b-2 border-r-2 border-neutral-300 transition-all duration-300 p-0 overflow-hidden">

                                        {/* Content - Dense and Information heavy - MOVED UP */}
                                        <div className="p-3 sm:p-5 relative">
                                            {msg.replyTo && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mb-2 font-bold uppercase tracking-wide border-l-2 border-neutral-300 pl-2">
                                                    <span>Re: {msg.replyTo}</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2">
                                                {msg.headline && (
                                                    <div className="font-black text-neutral-900 text-2xl md:text-3xl leading-tight font-sans uppercase tracking-tight">
                                                        "{msg.headline}"
                                                    </div>
                                                )}
                                                <div className="text-neutral-800 leading-snug text-sm sm:text-base font-medium whitespace-pre-wrap">
                                                    {msg.text}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Identity Strip - MOVED DOWN */}
                                        <div className="bg-neutral-100 border-t border-neutral-200 px-3 py-2 flex justify-between items-center flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`sm:hidden w-8 h-8 flex items-center justify-center text-xs text-white font-bold ${user.color} overflow-hidden`}>
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.avatar
                                                    )}
                                                </div>
                                                <span className="text-neutral-500 font-bold text-xs uppercase tracking-wide">posted by:</span>
                                                <span className="font-black text-neutral-800 text-sm uppercase tracking-tight mr-2">{user.name}</span>
                                            </div>

                                            <div className="flex items-center gap-2 ml-auto">
                                                {/* Pause Indicator on Latest Message */}
                                                {idx === 0 && isHovered && (
                                                    <div className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                                                        <PauseCircle className="w-3 h-3" />
                                                        <span className="text-[10px] font-black uppercase">Paused</span>
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-neutral-500 font-mono font-bold">{msg.timestamp}</span>
                                            </div>
                                        </div>

                                        {/* Footer / Ticker style meta */}
                                        <div className="hidden sm:flex bg-neutral-50 px-3 py-1 border-t border-neutral-100 items-center justify-end text-[10px] text-neutral-500 font-bold uppercase tracking-wide">
                                            <div className="flex items-center space-x-1 text-red-700">
                                                <Database className="w-3 h-3" />
                                                <span>Ryzen AI Max+ 395</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            <style>{`
        .animate-slide-in-top {
          animation: slideInTop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideInTop {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div >
    );
}
