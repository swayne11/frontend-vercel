import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { API_BASE_URL } from '../config'

function AdminPanel() {
    const [topic, setTopic] = useState('')
    // ... (lines 8-71 omitted for brevity in search, but context needed for import)

    // We need to insert the import at the top first, but replace_file_content can't do two disjoint edits easily without multi_replace.
    // Wait, I can't insert import AND change lines 74-75 in one go if they are far apart.
    // I should use multi_replace for AdminPanel.

    const [headline, setHeadline] = useState('') // [NEW]

    // [DIRECTOR MODE] Scenario State
    const [scenarioConfig, setScenarioConfig] = useState({
        context: '',
        incident: '',
        constraints: ''
    })
    const [scenario, setScenario] = useState('') // Native string for backend

    const [headlineLimit, setHeadlineLimit] = useState('3-5')
    const [copyLimit, setCopyLimit] = useState('20-50')
    const [feedSpeed, setFeedSpeed] = useState(2000) // [NEW]
    const [debateFormat, setDebateFormat] = useState('individual') // [NEW] individual, teams, collective
    const [tickerText, setTickerText] = useState('8 LOCAL AI MODELS debating in real time on Ryzen AI Max+ 395')
    const [models, setModels] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Continuous Mode & Live Controls State
    const [continuousMode, setContinuousMode] = useState(false)
    const [moderatorMessage, setModeratorMessage] = useState('')
    const [participantMessages, setParticipantMessages] = useState({})
    const [amdConfig, setAmdConfig] = useState({
        roleName: 'AMD',
        teamName: 'Host',
        modelId: 'Human Admin',
        avatarUrl: ''
    })


    // [DIRECTOR MODE] Participant State
    const [participants, setParticipants] = useState([
        {
            model_id: '',
            role_name: 'Pro',
            team_name: 'Team Red',
            avatar_url: '',
            // Director Fields
            archetype: 'Logician',
            core_belief: 'Facts matter more than feelings.',
            speaking_style: 'Concise, analytical.',
            public_goal: 'Win the argument.',
            secret_objective: 'Expose logical fallacies.',
            instructions: 'You are the Pro side. Argue in favor.' // Legacy/Compiled
        },
        {
            model_id: '',
            role_name: 'Con',
            team_name: 'Team Blue',
            avatar_url: '',
            // Director Fields
            archetype: 'Populist',
            core_belief: 'The voice of the people is truth.',
            speaking_style: 'Emotional, rhetorical.',
            public_goal: 'Defend the status quo.',
            secret_objective: 'Appeal to emotion.',
            instructions: 'You are the Con side. Argue against.'
        }
    ])

    const [presetName, setPresetName] = useState('')
    const [savedPresets, setSavedPresets] = useState([])

    useEffect(() => {
        // Fetch models
        const fetchModels = fetch(`${API_BASE_URL}/models`).then(res => res.json())
        const fetchPresets = fetch(`${API_BASE_URL}/config/presets`).then(res => res.json())

        Promise.all([fetchModels, fetchPresets])
            .then(([modelsData, presetsData]) => {
                const list = modelsData.models || []
                setModels(list)
                setSavedPresets(presetsData.presets || [])

                // Auto-populate participants with ALL available models if not loaded from preset
                if (list.length > 0) {
                    const autoParticipants = list.map((model, idx) => ({
                        model_id: model,
                        role_name: `Participant ${idx + 1}`,
                        team_name: `Team ${String.fromCharCode(65 + idx)}`,
                        avatar_url: '',
                        archetype: 'Mediator',
                        core_belief: 'Compromise is key.',
                        speaking_style: 'Diplomatic, calm.',
                        public_goal: 'Find common ground.',
                        secret_objective: 'Avoid conflict.',
                        instructions: ''
                    }))
                    setParticipants(autoParticipants)
                }
                setLoading(false)

                // [NEW] Attempt to load last session
                loadPreset('last_session', true)
            })
            .catch(err => {
                console.error(err)
                setError("Failed to load initial data")
                setLoading(false)
            })
    }, [])

    const loadPreset = async (name, silent = false) => {
        try {
            const res = await fetch(`${API_BASE_URL}/config/presets/${name}`)
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            // Apply config
            setTopic(data.topic)
            setHeadline(data.headline || '') // [NEW]


            // Hydrate Director Mode Config
            if (data.scenario_config) {
                setScenarioConfig(data.scenario_config)
            }
            // Fallback for legacy presets: put raw scenario int 'context' if config missing
            else if (data.scenario) {
                setScenarioConfig({ context: data.scenario, incident: '', constraints: '' })
            }

            setScenario(data.scenario)
            setHeadlineLimit(data.headline_limit)

            setCopyLimit(data.copy_limit)
            if (data.ticker_text) setTickerText(data.ticker_text)
            if (data.feed_speed) setFeedSpeed(data.feed_speed)
            if (data.debate_format) setDebateFormat(data.debate_format)
            if (typeof data.continuous_mode !== 'undefined') setContinuousMode(data.continuous_mode)
            setParticipants(data.participants)

            if (data.amd_profile) {
                setAmdConfig({
                    roleName: data.amd_profile.role_name,
                    teamName: data.amd_profile.team_name,
                    modelId: data.amd_profile.model_id,
                    avatarUrl: data.amd_profile.avatar_url
                })
            }

            if (!silent) alert(`Loaded preset: ${name}`)
        } catch (e) {
            if (!silent) alert("Failed to load: " + e.message)
        }
    }

    const savePreset = async () => {
        if (!presetName.trim()) return alert("Enter a name")
        try {
            const payload = {
                topic,
                headline, // [NEW]

                participants,
                scenario_config: scenarioConfig, // Save structured data
                scenario: compileScenario(scenarioConfig), // Compile just in case
                headline_limit: headlineLimit,
                copy_limit: copyLimit,
                ticker_text: tickerText,
                continuous_mode: continuousMode,
                feed_speed: feedSpeed,
                debate_format: debateFormat,
                amd_profile: {
                    model_id: amdConfig.modelId,
                    role_name: amdConfig.roleName,
                    team_name: amdConfig.teamName,
                    avatar_url: amdConfig.avatarUrl,
                    instructions: 'Admin'
                }
            }
            await fetch(`${API_BASE_URL}/config/presets/${presetName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            // Refresh list
            setSavedPresets(prev => prev.includes(presetName) ? prev : [...prev, presetName])
            setPresetName('')
            alert("Saved!")
        } catch (e) {
            console.error(e)
            alert("Save failed")
        }
    }

    const updateParticipant = (index, field, value) => {
        setParticipants(prev => {
            const newParts = [...prev]
            const p = { ...newParts[index], [field]: value }

            // Auto-update instructions if modifying Director fields AND instructions are empty
            const directorFields = ['archetype', 'core_belief', 'public_goal', 'secret_objective', 'speaking_style']
            if (directorFields.includes(field) && !p.instructions) {
                p.instructions = compileInstructions(p)
            }

            newParts[index] = p
            return newParts
        })
    }

    const addParticipant = () => {
        setParticipants(prev => [
            ...prev,
            {
                model_id: models[0] || '',
                role_name: `Participant ${prev.length + 1}`,
                team_name: 'New Team',
                avatar_url: '',
                archetype: 'Wildcard',
                core_belief: 'Chaos.',
                speaking_style: 'Unpredictable.',
                public_goal: 'Disrupt.',
                secret_objective: 'Have fun.',
                instructions: ''
            }
        ])
    }

    const removeParticipant = (index) => {
        if (participants.length <= 2) {
            alert("Must have at least 2 participants")
            return
        }
        setParticipants(prev => prev.filter((_, i) => i !== index))
    }

    const moveParticipant = (index, direction) => {
        setParticipants(prev => {
            const newParts = [...prev]
            if (direction === 'up' && index > 0) {
                [newParts[index], newParts[index - 1]] = [newParts[index - 1], newParts[index]]
            } else if (direction === 'down' && index < newParts.length - 1) {
                [newParts[index], newParts[index + 1]] = [newParts[index + 1], newParts[index]]
            }
            return newParts
        })
    }

    const handleImageUpload = (index, e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            updateParticipant(index, 'avatar_url', reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleAmdImageUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => {
            setAmdConfig(prev => ({ ...prev, avatarUrl: reader.result }))
        }
        reader.readAsDataURL(file)
    }



    // [DIRECTOR MODE] Compilation Logic
    // [DIRECTOR MODE] Compilation Logic
    const compileScenario = (config) => {
        // Just return the raw context as the full scenario now
        return config.context
    }

    const compileInstructions = (p) => {
        return `[YOUR IDENTITY]
You are ${p.role_name}, the ${p.team_name}.
Archetype: ${p.archetype || 'Neutral'}

[YOUR BELIEF SYSTEM]
You fundamentally believe: "${p.core_belief || 'N/A'}".

[OBJECTIVES]
Public Goal: ${p.public_goal || 'Participate'}
SECRET GOAL: ${p.secret_objective || 'None'} (Do not reveal this explicitly, but act towards it).

[SPEAKING STYLE]
${p.speaking_style || 'Natural'}`
    }

    // Auto-update instructions string when director fields change
    useEffect(() => {
        setScenario(compileScenario(scenarioConfig))
    }, [scenarioConfig])

    // We also need to update participant instructions dynamically, but they are in an array.
    // So we'll do it on-the-fly during render or just compile at submit time?
    // Better to update state so the preview works.
    // Actually, let's just compile at submit time to keep state simple, 
    // OR have a 'Preview' view.
    // Let's compile strictly at Submit Time to avoid fighting with the textarea if user edits it manually?
    // No, per plan: "This schema is the source of truth".

    // Changing strategy: We will compile into the 'instructions' field WHENEVER the director fields change.
    // But `participants` is an array, tricky to useEffect deep watch.
    // Instead, we will compile in `startDebate` payload generation.

    const startDebate = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                topic,
                headline, // [NEW]
                // Ensure participants have instructions
                participants: participants.map(p => ({
                    ...p,
                    instructions: p.instructions || compileInstructions(p)
                })),
                scenario,
                headline_limit: headlineLimit,
                copy_limit: copyLimit,
                ticker_text: tickerText,
                feed_speed: feedSpeed,
                debate_format: debateFormat,
                continuous_mode: continuousMode,
                amd_profile: {
                    model_id: amdConfig.modelId,
                    role_name: amdConfig.roleName,
                    team_name: amdConfig.teamName,
                    avatar_url: amdConfig.avatarUrl,
                    instructions: 'Admin'
                }
            }

            const res = await fetch(`${API_BASE_URL}/debate/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error(res.statusText)

            alert("Debate Started!")
            // navigate('/') 
        } catch (err) {
            setError(err.message)
        }
    }

    const stopDebate = async () => {
        try {
            await fetch(`${API_BASE_URL}/debate/stop`, { method: 'POST' })
            alert("Debate Stopped")
        } catch (err) {
            console.error(err)
            alert("Error stopping")
        }
    }

    const updateDebate = async () => {
        try {
            await fetch(`${API_BASE_URL}/debate/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic,
                    headline: headline, // [NEW]
                    scenario: scenario,
                    ticker_text: tickerText,
                    feed_speed: feedSpeed,
                    debate_format: debateFormat
                })
            })
            alert("Topic, Headline, Scenario & Ticker Updated!")
        } catch (err) {
            console.error(err)
            alert("Update Failed")
        }
    }

    const injectMessage = async () => {
        if (!moderatorMessage.trim()) return
        try {
            await fetch(`${API_BASE_URL}/debate/inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: moderatorMessage,
                    role: amdConfig.roleName,
                    team: amdConfig.teamName,
                    model: amdConfig.modelId,
                    avatar_url: amdConfig.avatarUrl,
                    is_amd: true
                })
            })
            setModeratorMessage('')
            alert("AMD message sent!")
        } catch (err) {
            console.error(err)
            alert("Failed to inject message")
        }
    }

    const guideParticipant = async (index) => {
        const text = participantMessages[index]
        if (!text || !text.trim()) return

        try {
            await fetch(`${API_BASE_URL}/debate/guide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index: index,
                    text: text
                })
            })
            setParticipantMessages(prev => ({ ...prev, [index]: '' }))
            alert(`Guidance set for next turn!`)
        } catch (err) {
            console.error(err)
            alert("Failed to set guidance")
        }
    }

    const broadcastParticipant = async (index) => {
        const text = participantMessages[index]
        if (!text || !text.trim()) return

        const p = participants[index]
        try {
            await fetch(`${API_BASE_URL}/debate/inject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    role: p.role_name,
                    team: p.team_name,
                    model: p.model_id,
                    avatar_url: p.avatar_url,
                    is_amd: false
                })
            })
            setParticipantMessages(prev => ({ ...prev, [index]: '' }))
            alert(`Broadcast sent as ${p.role_name}!`)
        } catch (err) {
            console.error(err)
            alert("Failed to broadcast")
        }
    }

    if (loading) return <div className="container">Loading models...</div>

    return (
        <div className="container">
            <header>
                <h1>⚙️ Debate Admin</h1>
                <div style={{ textAlign: "center" }}>
                    <a href="/" target="_blank" style={{ color: "#646cff" }}>Open Feed ↗</a>
                </div>
            </header>

            <main style={{ maxWidth: "800px", margin: "0 auto" }}>
                {error && <div className="error">{error}</div>}

                <form onSubmit={startDebate} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <div className="actions" style={{ display: "flex", gap: "1rem" }}>
                        <button type="submit" style={{ flex: 1 }}>Start Debate</button>
                        <button type="button" onClick={updateDebate} style={{ flex: 1, background: "#888" }}>Update</button>
                        <button type="button" onClick={stopDebate} className="stop-btn">Stop</button>
                    </div>

                    <div className="section" style={{ borderBottom: "1px solid #444", paddingBottom: "1.5rem" }}>
                        <div className="participant-config" style={{ border: "2px solid #b91c1c", background: "#2a1a1a", padding: "1rem", borderRadius: "8px" }}>
                            <h3 style={{ marginTop: 0, color: "#f87171" }}>⚡ Host Control</h3>

                            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <div style={{ flex: 1 }}>
                                        <label>Headline</label>
                                        <input
                                            type="text"
                                            value={amdConfig.roleName}
                                            onChange={e => setAmdConfig(prev => ({ ...prev, roleName: e.target.value }))}
                                            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Team Name</label>
                                        <input
                                            type="text"
                                            value={amdConfig.teamName}
                                            onChange={e => setAmdConfig(prev => ({ ...prev, teamName: e.target.value }))}
                                            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Posted By (Model)</label>
                                        <input
                                            type="text"
                                            value={amdConfig.modelId}
                                            onChange={e => setAmdConfig(prev => ({ ...prev, modelId: e.target.value }))}
                                            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                                        />
                                    </div>
                                    <div>
                                        <label>Avatar</label>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            {amdConfig.avatarUrl && (
                                                <img src={amdConfig.avatarUrl} alt="AMD" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} />
                                            )}
                                            <input type="file" accept="image/*" onChange={handleAmdImageUpload} style={{ width: "90px", fontSize: "0.8rem" }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <textarea
                                    value={moderatorMessage}
                                    onChange={e => setModeratorMessage(e.target.value)}
                                    placeholder={`Speak as ${amdConfig.roleName}...`}
                                    rows="2"
                                    style={{ flex: 1, padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                                />
                                <button type="button" onClick={injectMessage} style={{ background: "#dc2626", fontWeight: "bold" }}>
                                    BROADCAST
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="section" style={{ borderBottom: "1px solid #444", paddingBottom: "1.5rem" }}>
                        <h3>💾 Configuration Presets</h3>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <select
                                    onChange={(e) => loadPreset(e.target.value)}
                                    value=""
                                    style={{ padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                                >
                                    <option value="" disabled>Load Preset...</option>
                                    {savedPresets.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={e => setPresetName(e.target.value)}
                                    placeholder="New Preset Name"
                                    style={{ padding: "0.5rem" }}
                                />
                                <button type="button" onClick={savePreset} style={{ padding: "0.5rem 1rem" }}>Save</button>
                            </div>
                        </div>
                    </div>

                    <div className="section">

                        <label>Headline Title (Screen sees this)</label>
                        <input
                            type="text"
                            value={headline}
                            onChange={e => setHeadline(e.target.value)}
                            placeholder="Enter display title (Optional)..."
                            style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                        />
                    </div>

                    <div className="controls-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div className="section" style={{ gridColumn: "1 / -1", border: "1px solid #555", padding: "1rem", borderRadius: "8px", background: "#252525" }}>
                            <h3 style={{ marginTop: 0, color: "#fbbf24" }}>🎬 Director's Deck: Scenario</h3>

                            <div style={{ display: "grid", gap: "1rem" }}>
                                <div>
                                    <label>Topic (System Focus)</label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={e => setTopic(e.target.value)}
                                        placeholder="Enter main debate topic/question..."
                                        style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444", marginBottom: "0.5rem" }}
                                    />
                                </div>
                                <div>
                                    <label>Scenario / Context</label>
                                    <textarea
                                        value={scenarioConfig.context}
                                        onChange={e => setScenarioConfig(prev => ({ ...prev, context: e.target.value }))}
                                        placeholder="Year 2050, Mars Colony. Water is scarce..."
                                        rows="6"
                                        style={{ width: "100%", background: "#222", color: "#ddd", marginBottom: "0.5rem", padding: "0.5rem", border: "1px solid #444" }}
                                    />
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>
                                    <details>
                                        <summary>Preview Compiled Scenario</summary>
                                        <pre style={{ whiteSpace: "pre-wrap", background: "#111", padding: "0.5rem" }}>
                                            {compileScenario(scenarioConfig)}
                                        </pre>
                                    </details>
                                </div>
                            </div>
                        </div>

                        <div className="section" style={{ gridColumn: "1 / -1" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", background: "#333", padding: "0.5rem", borderRadius: "4px" }}>
                                <input
                                    type="checkbox"
                                    checked={continuousMode}
                                    onChange={e => setContinuousMode(e.target.checked)}
                                />
                                <span>🔄 Continuous Mode (Run until stopped)</span>
                            </label>
                        </div>

                        <div className="section">
                            <label>Headline Word Limit</label>
                            <input
                                type="text"
                                value={headlineLimit}
                                onChange={e => setHeadlineLimit(e.target.value)}
                                placeholder="e.g. 3-5"
                                style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                            />
                        </div>

                        <div className="section">
                            <label>Copy Word Limit</label>
                            <input
                                type="text"
                                value={copyLimit}
                                onChange={e => setCopyLimit(e.target.value)}
                                placeholder="e.g. 20-50"
                            />
                        </div>

                        <div className="section" style={{ gridColumn: "1 / -1" }}>
                            <label>Ticker Text (Marquee)</label>
                            <input
                                type="text"
                                value={tickerText}
                                onChange={e => setTickerText(e.target.value)}
                                placeholder="Enter scrolling text..."
                                style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                            />
                        </div>

                        <div className="section" style={{ gridColumn: "1 / -1" }}>
                            <label>Feed Speed ({feedSpeed}ms)</label>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <span style={{ fontSize: "0.8rem" }}>Fast (500ms)</span>
                                <input
                                    type="range"
                                    min="500"
                                    max="5000"
                                    step="100"
                                    value={feedSpeed}
                                    onChange={e => setFeedSpeed(Number(e.target.value))}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: "0.8rem" }}>Slow (5000ms)</span>
                            </div>
                        </div>

                        <div className="section" style={{ gridColumn: "1 / -1" }}>
                            <label>Debate Structure</label>
                            <select
                                value={debateFormat}
                                onChange={e => setDebateFormat(e.target.value)}
                                style={{ width: "100%", padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                            >
                                <option value="individual">Individual (Round Robin)</option>
                                <option value="teams">Teams (Alternating A vs B)</option>
                                <option value="collective">Collective (Chaotic / Random)</option>
                            </select>
                        </div>
                    </div>

                    <div className="participants-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {participants.map((p, idx) => (
                            <div key={idx} className="participant-config" style={{ border: "1px solid #333", padding: "1rem", borderRadius: "8px", position: "relative" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                    <h3>Participant {idx + 1}</h3>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button type="button" onClick={() => moveParticipant(idx, 'up')} disabled={idx === 0} style={{ padding: "2px 8px", cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                                        <button type="button" onClick={() => moveParticipant(idx, 'down')} disabled={idx === participants.length - 1} style={{ padding: "2px 8px", cursor: 'pointer', opacity: idx === participants.length - 1 ? 0.3 : 1 }}>↓</button>
                                        {participants.length > 2 && (
                                            <button type="button" onClick={() => removeParticipant(idx)} title="Remove" style={{ padding: "2px 8px", background: "#442222" }}>✕</button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: "grid", gap: "0.5rem" }}>
                                    <label>Model</label>
                                    <select
                                        value={p.model_id}
                                        onChange={e => updateParticipant(idx, 'model_id', e.target.value)}
                                        style={{ padding: "0.5rem", background: "#333", color: "white", border: "1px solid #444" }}
                                    >
                                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>

                                    <label>Role Name</label>
                                    <input
                                        type="text"
                                        value={p.role_name}
                                        onChange={e => updateParticipant(idx, 'role_name', e.target.value)}
                                    />

                                    <label>Team Name</label>
                                    <input
                                        type="text"
                                        value={p.team_name}
                                        onChange={e => updateParticipant(idx, 'team_name', e.target.value)}
                                    />

                                    <label>Avatar Image</label>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        {p.avatar_url && (
                                            <img src={p.avatar_url} alt="Preview" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "50%" }} />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(idx, e)}
                                            style={{ color: "#aaa" }}
                                        />
                                    </div>

                                    <div className="director-mode-fields" style={{ background: "#252525", padding: "0.5rem", borderRadius: "4px", borderLeft: "3px solid #fbbf24", marginTop: "0.5rem" }}>
                                        <label style={{ color: "#fbbf24", fontWeight: "bold" }}>🎭 Character Engine</label>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                                            <div>
                                                <label>Archetype</label>
                                                <select
                                                    value={p.archetype || 'Logician'}
                                                    onChange={e => updateParticipant(idx, 'archetype', e.target.value)}
                                                    style={{ width: "100%", padding: "0.3rem", background: "#333", color: "white" }}
                                                >
                                                    {['Logician', 'Visionary', 'Deceiver', 'Mediator', 'Aggressor', 'Populist', 'Wildcard'].map(a =>
                                                        <option key={a} value={a}>{a}</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div>
                                                <label>Public Goal</label>
                                                <input
                                                    type="text"
                                                    value={p.public_goal || ''}
                                                    onChange={e => updateParticipant(idx, 'public_goal', e.target.value)}
                                                    placeholder="Win the election"
                                                    style={{ width: "100%", padding: "0.3rem", background: "#333", color: "white" }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ marginTop: "0.5rem" }}>
                                            <label>Core Belief (Axiom)</label>
                                            <input
                                                type="text"
                                                value={p.core_belief || ''}
                                                onChange={e => updateParticipant(idx, 'core_belief', e.target.value)}
                                                placeholder="e.g. 'Efficiency is everything'"
                                                style={{ width: "100%", padding: "0.3rem", background: "#333", color: "white" }}
                                            />
                                        </div>

                                        <div style={{ marginTop: "0.5rem" }}>
                                            <label style={{ color: "#f87171" }}>🕵️ SECRET OBJECTIVE</label>
                                            <input
                                                type="text"
                                                value={p.secret_objective || ''}
                                                onChange={e => updateParticipant(idx, 'secret_objective', e.target.value)}
                                                placeholder="e.g. Provoke the other side into anger"
                                                style={{ width: "100%", padding: "0.3rem", background: "#333", color: "white", border: "1px solid #7f1d1d" }}
                                            />
                                        </div>

                                        <div style={{ marginTop: "0.5rem" }}>
                                            <label>Speaking Style</label>
                                            <input
                                                type="text"
                                                value={p.speaking_style || ''}
                                                onChange={e => updateParticipant(idx, 'speaking_style', e.target.value)}
                                                placeholder="e.g. Short, punchy sentences. Metaphors."
                                                style={{ width: "100%", padding: "0.3rem", background: "#333", color: "white" }}
                                            />
                                        </div>

                                        <div style={{ marginTop: "1rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                                <label style={{ fontWeight: "bold" }}>🧠 Knowledge / Instructions</label>
                                                <button
                                                    type="button"
                                                    onClick={() => updateParticipant(idx, 'instructions', compileInstructions(p))}
                                                    style={{ fontSize: "0.7rem", padding: "2px 6px", background: "#444" }}
                                                    title="Overwrite with generated text from Archetype/Goals"
                                                >
                                                    Generate form Director Deck
                                                </button>
                                            </div>
                                            <textarea
                                                value={p.instructions || ''}
                                                onChange={e => updateParticipant(idx, 'instructions', e.target.value)}
                                                placeholder="System prompt / Knowledge base for this agent..."
                                                rows="6"
                                                style={{ width: "100%", padding: "0.5rem", background: "#222", color: "#ddd", border: "1px solid #444", fontFamily: "monospace", fontSize: "0.8rem" }}
                                            />
                                        </div>
                                    </div>

                                    {/* Per-Participant Injection */}
                                    <div style={{ marginTop: "1rem", borderTop: "1px dashed #555", paddingTop: "1rem" }}>
                                        <label style={{ color: "#4caf50", fontWeight: "bold" }}>⚡ Live Control for {p.role_name}</label>
                                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                            <input
                                                type="text"
                                                value={participantMessages[idx] || ''}
                                                onChange={e => setParticipantMessages(prev => ({ ...prev, [idx]: e.target.value }))}
                                                placeholder={`Type message or instruction...`}
                                                style={{ flex: 1, padding: "0.5rem", background: "#222", color: "white", border: "1px solid #444" }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => guideParticipant(idx)}
                                                style={{ background: "#333", border: "1px solid #4caf50", color: "#4caf50", fontWeight: "bold", padding: "0.5rem 1rem" }}
                                                title="Send as hidden instruction (SYSTEM PROMPT) for next turn"
                                            >
                                                GUIDE
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => broadcastParticipant(idx)}
                                                style={{ background: "#dc2626", color: "white", fontWeight: "bold", padding: "0.5rem 1rem", border: "none" }}
                                                title="Force post this message immediately (IMPERSONATE)"
                                            >
                                                BROADCAST
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addParticipant} style={{ border: "1px dashed #666", background: "transparent", color: "#aaa" }}>
                        + Add Participant
                    </button>


                </form>
            </main>
        </div>
    )
}

export default AdminPanel
