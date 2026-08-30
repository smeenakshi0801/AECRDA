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

  // Multi-Session History State
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
                { sender: "bot", text: `🚀 Repository "${repoName}" vectorized successfully! You can now ask questions about the codebase.` }
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

  const handleAskAI = (e) => {
    e.preventDefault();
    if (!userQuery.trim() || !activeSessionId) return;

    const currentText = userQuery.trim();
    setUserQuery("");
    setChatLoading(true);

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, { sender: "user", text: currentText }] }
          : s
      )
    );

    fetch("http://localhost:8000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: currentText }),
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

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden"
    }}>

      {/* LEFT SIDEBAR */}
      <div style={{
        width: "280px",
        backgroundColor: "#161b22",
        borderRight: "1px solid #30363d",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0
      }}>
        <div style={{
          padding: "16px",
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
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold"
              }}
              title="Start new repository ingestion"
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
                title="Clear all sessions"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {sessions.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: "0.85rem", textAlign: "center", marginTop: "30px", padding: "0 10px" }}>
              Ingest a GitHub repo to begin. Past sessions will appear here.
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
                  fontSize: "0.9rem",
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

        {/* HEADER & STATUS */}
        <div style={{ width: "100%", maxWidth: "800px", textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ color: "#58a6ff", margin: "5px 0", fontSize: "1.8rem" }}>AECRDA</h1>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            borderRadius: "12px",
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            fontSize: "0.85rem",
            color: isBackendOnline ? "#3fb950" : "#f85149"
          }}>
            <span>{isBackendOnline ? "🟢" : "🔴"}</span>
            <span>{serverMessage}</span>
          </div>
        </div>

        {/* REPO URL INPUT */}
        <div style={{ width: "100%", maxWidth: "800px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isProcessing}
              placeholder="Paste GitHub Repository Link (e.g. https://github.com/)..."
              style={{
                flex: "1",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #30363d",
                backgroundColor: "#161b22",
                color: "#c9d1d9",
                outline: "none",
                fontSize: "0.95rem"
              }}
            />
            <button
              onClick={processGithubRepo}
              disabled={isProcessing}
              style={{
                padding: "12px 22px",
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
            <div style={{ marginTop: "8px", color: "#58a6ff", fontSize: "0.85rem" }}>
              🔄 {progressStep}
            </div>
          )}
          {!isProcessing && resultMessage && (
            <div style={{ marginTop: "8px", fontSize: "0.85rem", color: resultMessage.includes("❌") ? "#f85149" : "#3fb950" }}>
              {resultMessage}
            </div>
          )}
        </div>

        {/* CHAT CONTAINER */}
        <div style={{
          width: "100%",
          maxWidth: "800px",
          flex: "1",
          minHeight: "450px",
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
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {!activeSessionId ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#8b949e", fontSize: "0.9rem" }}>
                <p style={{ fontSize: "1.1rem", color: "#c9d1d9", marginBottom: "6px" }}>No Repository Active</p>
                <span>Paste and ingest a repo above or select a previous repository from the sidebar.</span>
              </div>
            ) : chatHistory.length === 0 ? (
              <div style={{ margin: "auto", textAlign: "center", color: "#8b949e", fontSize: "0.9rem" }}>
                <p>Ask any question about <strong>{currentSession?.repoName}</strong> below!</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender === "user" ? "flex-end" : "flex-start"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#8b949e", marginBottom: "4px", paddingLeft: "4px", paddingRight: "4px" }}>
                    {msg.sender === "user" ? "You" : "AECRDAI"}
                  </span>
                  <div style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: msg.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                    backgroundColor: msg.sender === "user" ? "#1f6feb" : "#21262d",
                    color: "#f0f6fc",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                    border: "1px solid",
                    borderColor: msg.sender === "user" ? "#388bfd" : "#30363d",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}

            {chatLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.75rem", color: "#8b949e", marginBottom: "4px" }}>AECRDAI</span>
                <div style={{
                  padding: "10px 16px",
                  borderRadius: "16px 16px 16px 2px",
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  color: "#58a6ff",
                  fontSize: "0.9rem",
                  fontStyle: "italic"
                }}>
                  ⚡ Searching codebase & thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleAskAI} style={{
            padding: "15px",
            backgroundColor: "#0d1117",
            borderTop: "1px solid #30363d",
            display: "flex",
            gap: "10px"
          }}>
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              disabled={!activeSessionId || chatLoading}
              placeholder={activeSessionId ? "Ask a question about the code (e.g. How does routing work?)..." : "Please ingest or select a repo first..."}
              style={{
                flex: "1",
                padding: "12px 16px",
                borderRadius: "24px",
                border: "1px solid #30363d",
                backgroundColor: "#161b22",
                color: "#f0f6fc",
                fontSize: "0.95rem",
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={!activeSessionId || chatLoading}
              style={{
                padding: "12px 24px",
                borderRadius: "24px",
                border: "none",
                backgroundColor: (!activeSessionId || chatLoading) ? "#30363d" : "#1f6feb",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.95rem",
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