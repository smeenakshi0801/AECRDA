import { useState, useEffect } from 'react';

function App() {
  
  const [serverMessage, setServerMessage] = useState("Loading...");// State to hold the greeting or initial message from the backend API root
  const [repoUrl, setRepoUrl] = useState(""); // State to track the text entry inside the input field (the GitHub URL)
  const [resultMessage, setResultMessage] = useState("");// State to display the feedback or error messages received after parsing the repo

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

//Tells the browser exactly what layout to draw on the user's screen
return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Displays the server connection status at the top */}
      <h1>AECRDA</h1>
      <h3>{serverMessage}</h3>
      <div style={{ margin: '20px 0' }}>
        {/* Controlled Input Box: updates our repoUrl state on every single keystroke */}
        <input 
          value={repoUrl} 
          onChange={(e) => setRepoUrl(e.target.value)} 
          placeholder="Paste GitHub Repo URL here..." 
          style={{ width: '350px', padding: '8px', marginRight: '10px' }}
        />
        {/* Button that triggers the fetch call above */}
        <button onClick={processGithubRepo} style={{ padding: '8px 15px' }}>
          Process Repository
        </button>
      </div>
      {/* Conditionally render the feedback text block only if a result message exists */}
      {resultMessage && <p style={{ fontWeight: 'bold', color: '#007BFF' }}>{resultMessage}</p>}
    </div>
  );
}
export default App;  //Ships this component out so main.jsx can import it and mount it to the webpage shell