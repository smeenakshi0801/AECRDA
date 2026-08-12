import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [serverMessage, setServerMessage] = useState("Connecting...");
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState("");

  const [userQuery, setUserQuery] = useState("");
 // ✅ To this:
const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef(null);

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
      body: JSON.stringify({ repo_url: repoUrl }),
    })
    .then(res => res.json())
    .then(data => {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      if(data.status === "success") {
        setResultMessage(`✅ ${data.message}`);
        setChatHistory(prev => [
          ...prev, 
          { sender: "bot", text: `🚀 Repository vectorized successfully! You can now ask questions about the codebase.` }
        ]);
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
    if (!userQuery.trim()) return;

    const currentText = userQuery;
    setChatHistory((prev) => [...prev, { sender: "user", text: currentText }]);
    setUserQuery("");
    setChatLoading(true);

    fetch("http://localhost:8000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: currentText }),
    })
    .then((res) => res.json())
    .then((data) => {
      let replyText = "";
      if (data.matches && data.matches.length > 0) {
        replyText = "🔍 **Matching Code Fragments Found:**\n\n" + 
          data.matches.map((m, i) => `📁 **File:** \`${m.source}\`\n\`\`\`\n${m.content}\n\`\`\``).join("\n\n---\n\n");
      } else {
        replyText = data.response || data.answer || data.message || "No relevant code snippets found in the database.";
      }

      setChatHistory((prev) => [...prev, { sender: "bot", text: replyText }]);
    })
    .catch(() => {
      setChatHistory((prev) => [...prev, { sender: "bot", text: "⚠️ Server error while retrieving response." }]);
    })
    .finally(() => setChatLoading(false));
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px"
    }}>
      
      {/* HEADER & STATUS */}
      <div style={{ width: "100%", maxWidth: "800px", textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ color: "#58a6ff", margin: "10px 0 5px 0", fontSize: "2rem" }}>AECRDA</h1>
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

      {/* GITHUB REPO LINK INPUT BAR */}
      <div style={{ width: "100%", maxWidth: "800px", marginBottom: "20px" }}>
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

        {/* PROGRESS / STATUS MESSAGES */}
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

      {/* CHATGPT STYLE CHAT BOX */}
      <div style={{
        width: "100%",
        maxWidth: "800px",
        flex: "1",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "12px",
        height: "500px",
        overflow: "hidden"
      }}>
        
        {/* MESSAGES VIEW CONTAINER */}
        <div style={{
          flex: "1",
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {chatHistory.map((msg, idx) => (
            <div key={idx} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === "user" ? "flex-end" : "flex-start"
            }}>
              <span style={{ fontSize: "0.75rem", color: "#8b949e", marginBottom: "4px", paddingLeft: "4px", paddingRight: "4px" }}>
                {msg.sender === "user" ? "You" : "Code AI"}
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
          ))}

          {/* AI THINKING STATE */}
          {chatLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem", color: "#8b949e", marginBottom: "4px" }}>Code AI</span>
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

        {/* CHAT INPUT BAR */}
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
            placeholder="Ask a question about the code (e.g. How does routing work?)..."
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
            disabled={chatLoading}
            style={{
              padding: "12px 24px",
              borderRadius: "24px",
              border: "none",
              backgroundColor: "#1f6feb",
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "0.95rem",
              cursor: "pointer"
            }}
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}

export default App;