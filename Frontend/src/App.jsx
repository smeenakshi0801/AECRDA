import { useState, useEffect } from 'react';

function App() {
  
  const [serverMessage, setServerMessage] = useState("Loading...");// State to hold the greeting or initial message from the backend API root
  const [repoUrl, setRepoUrl] = useState(""); // State to track the text entry inside the input field (the GitHub URL)
  const [resultMessage, setResultMessage] = useState("");// State to display the feedback or error messages received after parsing the repo
  //For handling semantic search queries
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/")
      .then((res) => res.json())
      .then((data) => setServerMessage(data.message));
  }, []);

  // Handler function triggered when clicking the "Process Repository" button
  const processGithubRepo = () => {
    // Show a loading feedback notice instantly so the user knows it's processing
    setResultMessage("Processing... Please wait.");
    
    // Fire a POST request containing our GitHub URL to the backend route we created
    fetch("http://localhost:8000/api/process-repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_url: repoUrl }), // Wrap the link into the expected JSON structure
    })
    .then(res => res.json())
    .then(data => {
      // Check the status flag returned by our FastAPI try-except block
      if(data.status === "success") {
        setResultMessage(data.message); // Displays the file count message
      } else {
        setResultMessage("Error: " + data.message); // Displays the validation or clone error
      }
    })
    .catch(err => {
      // Network failure fallback (e.g., if the Uvicorn backend server is turned off)
      setResultMessage("Failed to connect to backend server.");
    });
  };

  const searchKnowledgeBase = () => {
      if (!searchQuery.trim()) return;
      setSearchStatus("Searching vector index...");
      setSearchResults([]);

      fetch("http://localhost:8000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: searchQuery }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setSearchStatus(`Found ${data.matches.length} matching code blocks!`);
          setSearchResults(data.matches);
        } else {
          setSearchStatus("Search failed: " + data.message);
        }
      })
      .catch(err => {
        setSearchStatus("Failed to run semantic query.");
      });
    };

//Tells the browser exactly what layout to draw on the user's screen
return (
    <div style={{ padding: '5px', fontFamily: 'times new roman', textAlign: 'center' }}>
      <h1>AECRDA</h1>
      <h3>{serverMessage}</h3>
      
      <div style={{ margin: '20px 0', borderBottom: '1px solid #ccc', paddingBottom: '30px' }}>
        <h4>Ingestion & Vectorization</h4>
        <input 
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="Paste GitHub Repo URL here..."
          style={{ width: '350px', padding: '8px', marginRight: '10px' }}
        />
        <button onClick={processGithubRepo} style={{ padding: '8px 15px', color: '#ffffff', backgroundColor: '#1a237e' }}>
          Process Repository
        </button>
        {resultMessage && <p style={{ fontWeight: 'bold', color: '#007BFF' }}>{resultMessage}</p>}
      </div>

        <h4>Semantic Code Search</h4>
        <input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ask a technical question about the code..."
          style={{ width: '450px', padding: '8px', marginRight: '10px' }}
        />
        <button onClick={searchKnowledgeBase} style={{ padding: '8px 15px', color: '#ffffff', backgroundColor: '#1a237e' }}>
          Search Code
        </button>
        {searchStatus && <p style={{ fontWeight: 'bold', color: '#007BFF' }}>{searchStatus}</p>}

        <div style={{ textAlign: 'left', maxWidth: '800px', margin: '20px auto' }}>
          {searchResults.map((match, index) => (
            <div key={index} style={{ backgroundColor: '#f5f5f5', padding: '15px', margin: '10px 0', borderLeft: '5px solid #2e7d32', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#777' }}>
                📁 Source File: {match.source}
              </p>
              <pre style={{ margin: '0', overflowX: 'auto', backgroundColor: '#272822', color: '#f8f8f2', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>
                <code>{match.content}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
  );
}
export default App;  //Ships this component out so main.jsx can import it and mount it to the webpage shell