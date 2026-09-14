import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [serverMessage, setServerMessage] = useState("Connecting...");
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("");

  const [userQuery, setUserQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Multi-Session History State (Persisted in localStorage)
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem("aecrda_repo_sessions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const saved = localStorage.getItem("aecrda_active_session_id");
      return saved || null;
    } catch {
      return null;
    }
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("aecrda_repo_sessions", JSON.stringify(sessions));
    } catch (e) {
      console.error(e);
    }
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      try {
        localStorage.setItem("aecrda_active_session_id", activeSessionId);
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeSessionId]);

  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const chatHistory = currentSession ? currentSession.messages : [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  useEffect(() => {
    fetch("http://localhost:8000/")
      .then((res) => res.json())
      .then((data) => {
        setServerMessage(data.message || "Backend Online");
        setIsBackendOnline(true);
      })
      .catch(() => {
        setServerMessage("Backend Offline");
        setIsBackendOnline(false);
      });
  }, []);

  const processGithubRepo = () => {
    if (!repoUrl.trim()) {
      setResultMessage("⚠️ Please paste a valid GitHub repository URL!");
      return;
    }

    const trimmedUrl = repoUrl.trim();
    setIsProcessing(true);
    setResultMessage("");
    setProgressStep("📥 Step 1/3: Cloning GitHub Repository...");

    const step2Timer = setTimeout(() => {
      setProgressStep("✂️ Step 2/3: Extracting code files & splitting chunks...");
    }, 3000);

    const step3Timer = setTimeout(() => {
      setProgressStep("🧠 Step 3/3: Vectorizing code snippets into Chroma DB...");
    }, 7000);

    fetch("http://localhost:8000/api/process-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: trimmedUrl }),
    })
      .then((res) => res.json())
      .then((data) => {
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
        if (data.status === "success") {
          setResultMessage(`✅ ${data.message}`);

          const urlParts = trimmedUrl.split("/").filter(Boolean);
          const repoName = urlParts[urlParts.length - 1]?.replace(".git", "") || trimmedUrl;

          const existing = sessions.find((s) => s.repoUrl === trimmedUrl);
          if (existing) {
            setActiveSessionId(existing.id);
          } else {
            const newSession = {
              id: Date.now().toString(),
              repoName: repoName,
              repoUrl: trimmedUrl,
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              messages: [
                { sender: "bot", text: `🚀 Repository "${repoName}" vectorized successfully! Click one of the Quick Prompts on the left or type any question below.` }
              ],
            };
            setSessions((prev) => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
          }
        } else {
          setResultMessage(`❌ Error: ${data.message}`);
        }
      })
      .catch(() => {
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
        setResultMessage("❌ Connection Failed with backend.");
      })
      .finally(() => {
        setIsProcessing(false);
        setProgressStep("");
      });
  };

  const executeAskQuery = (textToAsk) => {
    if (!textToAsk.trim() || !activeSessionId) return;

    const queryText = textToAsk.trim();
    setUserQuery("");
    setChatLoading(true);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, { sender: "user", text: queryText }] }
          : s
      )
    );

    fetch("http://localhost:8000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryText }),
    })
      .then((res) => res.json())
      .then((data) => {
        let replyText = "";
        if (data.answer) {
          replyText = data.answer;
          if (data.matches && data.matches.length > 0) {
            const sources = [...new Set(data.matches.map((m) => m.source))];
            replyText += "\n\n📌 **Sources Referenced:**\n" + sources.map((s) => `- \`${s}\``).join("\n");
          }
        } else {
          replyText = data.message || "No relevant code snippets found in the codebase.";
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, { sender: "bot", text: replyText }] }
              : s
          )
        );
      })
      .catch(() => {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, { sender: "bot", text: "⚠️ Server error while retrieving response." }] }
              : s
          )
        );
      })
      .finally(() => setChatLoading(false));
  };

  const handleAskAI = (e) => {
    e.preventDefault();
    executeAskQuery(userQuery);
  };

  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNewRepoSession = () => {
    setActiveSessionId(null);
    setRepoUrl("");
    setResultMessage("");
    setUserQuery("");
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all repository chat history?")) {
      setSessions([]);
      setActiveSessionId(null);
      localStorage.removeItem("aecrda_repo_sessions");
      localStorage.removeItem("aecrda_active_session_id");
    }
  };

  // 1-Click Code Inspector Quick Prompts
  const quickActions = [
    { label: "🏗️ Project Architecture", query: "Give a high-level overview of the architectural design and folder structure of this codebase." },
    { label: "🛡️ Security & Bugs", query: "Are there any obvious security vulnerabilities, plain credentials, or edge case bugs in this repository?" },
    { label: "🚀 Main API Routes", query: "List the core endpoints, routing logic, or main execution triggers defined in this repo." },
    { label: "🧪 How to Run & Test", query: "How do I set up, execute, and run unit tests for this project locally?" }
  ];

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden"
    }}>

      {/* LEFT SIDEBAR: Active Repos + 1-Click Inspector */}
      <div style={{
        width: "300px",
        backgroundColor: "#161b22",
        borderRight: "1px solid #30363d",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}>
        {/* Header Actions */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid #30363d",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#58a6ff", margin: 0 }}>
            📁 Repositories ({sessions.length})
          </h2>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleNewRepoSession}
              style={{
                backgroundColor: "#238636",
                border: "none",
                color: "#fff",
                borderRadius: "4px",
                padding: "4px 9px",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold"
              }}
              title="Start new repository session"
            >
              + New
            </button>
            {sessions.length > 0 && (
              <button
                onClick={handleClearHistory}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8b949e",
                  cursor: "pointer",
                  fontSize: "0.75rem"
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Repos History List */}
        <div style={{ flex: "0 0 45%", overflowY: "auto", padding: "10px 8px", borderBottom: "1px solid #30363d" }}>
          {sessions.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: "0.82rem", textAlign: "center", marginTop: "24px", padding: "0 10px" }}>
              No repositories ingested yet.
            </div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setRepoUrl(sess.repoUrl);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  backgroundColor: sess.id === activeSessionId ? "#1f6feb22" : "transparent",
                  border: sess.id === activeSessionId ? "1px solid #1f6feb" : "1px solid transparent",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: sess.id === activeSessionId ? "#58a6ff" : "#f0f6fc",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  📦 {sess.repoName}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#8b949e", marginTop: "4px" }}>
                  {sess.messages.filter((m) => m.sender === "user").length} queries • {sess.createdAt}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 1-Click Code Inspector Shortcuts */}
        <div style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            ⚡ 1-Click Inspector
          </span>
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => executeAskQuery(qa.query)}
              disabled={!activeSessionId || chatLoading}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #30363d",
                backgroundColor: !activeSessionId || chatLoading ? "#21262d55" : "#21262d",
                color: !activeSessionId || chatLoading ? "#6e7681" : "#c9d1d9",
                fontSize: "0.78rem",
                cursor: !activeSessionId || chatLoading ? "not-allowed" : "pointer",
                transition: "background 0.2s ease"
              }}
            >
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 24px",
        overflowY: "auto"
      }}>
        {/* HEADER */}
        <div style={{ width: "100%", maxWidth: "800px", textAlign: "center", marginBottom: "14px" }}>
          <h1 style={{ color: "#58a6ff", margin: "4px 0", fontSize: "1.7rem" }}>AECRDA</h1>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "3px 10px",
            borderRadius: "12px",
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            fontSize: "0.8rem",
            color: isBackendOnline ? "#3fb950" : "#f85149"
          }}>
            <span>{isBackendOnline ? "🟢" : "🔴"}</span>
            <span>{serverMessage}</span>
          </div>
        </div>

        {/* INPUT REPO URL */}
        <div style={{ width: "100%", maxWidth: "800px", marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isProcessing}
              placeholder="Paste GitHub Repository Link (e.g. https://github.com/)..."
              style={{
                flex: "1",
                padding: "11px 15px",
                borderRadius: "8px",
                border: "1px solid #30363d",
                backgroundColor: "#161b22",
                color: "#c9d1d9",
                outline: "none",
                fontSize: "0.92rem"
              }}
            />
            <button
              onClick={processGithubRepo}
              disabled={isProcessing}
              style={{
                padding: "11px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: isProcessing ? "#30363d" : "#238636",
                color: "#fff",
                fontWeight: "600",
                cursor: isProcessing ? "not-allowed" : "pointer"
              }}
            >
              {isProcessing ? "Processing..." : "Ingest Repo"}
            </button>
          </div>

          {isProcessing && (
            <div style={{ marginTop: "7px", color: "#58a6ff", fontSize: "0.82rem" }}>
              🔄 {progressStep}
            </div>
          )}
          {!isProcessing && resultMessage && (
            <div style={{ marginTop: "7px", fontSize: "0.82rem", color: resultMessage.includes("❌") ? "#f85149" : "#3fb950" }}>
              {resultMessage}
            </div>
          )}
        </div>

        {/* CHAT CONTAINER */}
        <div style={{
          width: "100%",
          maxWidth: "800px",
          flex: "1",
          minHeight: "440px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "12px",
          overflow: "hidden"
        }}>
          <div style={{
            flex: "1",
            overflowY: "auto",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            {!activeSessionId ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#8b949e", fontSize: "0.88rem" }}>
                <p style={{ fontSize: "1.05rem", color: "#c9d1d9", marginBottom: "6px" }}>No Repository Active</p>
                <span>Paste a repo above or pick a session to use the 1-click Inspector.</span>
              </div>
            ) : chatHistory.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#8b949e", fontSize: "0.88rem" }}>
                <p>Ask questions or click a shortcut button on the left!</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender === "user" ? "flex-end" : "flex-start"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.72rem", color: "#8b949e" }}>
                      {msg.sender === "user" ? "You" : "AECRDAI"}
                    </span>
                    {msg.sender === "bot" && (
                      <button
                        onClick={() => handleCopyText(msg.text, idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: copiedIndex === idx ? "#3fb950" : "#58a6ff",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        {copiedIndex === idx ? "✓ Copied!" : "📋 Copy"}
                      </button>
                    )}
                  </div>
                  <div style={{
                    maxWidth: "86%",
                    padding: "11px 15px",
                    borderRadius: msg.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    backgroundColor: msg.sender === "user" ? "#1f6feb" : "#21262d",
                    color: "#f0f6fc",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    border: "1px solid",
                    borderColor: msg.sender === "user" ? "#388bfd" : "#30363d"
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {chatLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.72rem", color: "#8b949e", marginBottom: "4px" }}>AECRDAI</span>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "14px 14px 14px 2px",
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  color: "#58a6ff",
                  fontSize: "0.85rem",
                  fontStyle: "italic"
                }}>
                  ⚡ Analyzing repository context...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT FORM */}
          <form onSubmit={handleAskAI} style={{
            padding: "12px",
            backgroundColor: "#0d1117",
            borderTop: "1px solid #30363d",
            display: "flex",
            gap: "10px"
          }}>
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              disabled={!activeSessionId || chatLoading}
              placeholder={activeSessionId ? "Type a prompt or click a shortcut on the left..." : "Select or ingest a repo first..."}
              style={{
                flex: "1",
                padding: "11px 16px",
                borderRadius: "24px",
                border: "1px solid #30363d",
                backgroundColor: "#161b22",
                color: "#f0f6fc",
                fontSize: "0.92rem",
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={!activeSessionId || chatLoading}
              style={{
                padding: "10px 22px",
                borderRadius: "24px",
                border: "none",
                backgroundColor: (!activeSessionId || chatLoading) ? "#30363d" : "#1f6feb",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.92rem",
                cursor: (!activeSessionId || chatLoading) ? "not-allowed" : "pointer"
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;