import { useState, useEffect } from 'react';  //Grabs the React hooks that let us add interactivity to our webpage

function App() {
  //Create a state variable to hold the message from the backend
  const [serverMessage, setServerMessage] = useState("Loading...");
  const [inputText, setInputText] = useState("");
  
  useEffect(() => {
    //Call the backend API endpoint we created above to get the message
    fetch("http://localhost:8000/")
      .then((response) => response.json())
      .then((data) => {
        //Update the state with the message from FastAPI
        setServerMessage(data.message);
      })
      .catch((error) => {
        console.error("Error connecting to backend:", error);
        setServerMessage("Failed to connect to backend ❌");
      });
  }, []);

  // The POST function
  const sendDataToBackend = () => {
    fetch("http://localhost:8000/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_input: inputText }), // Sends text to backend
    })
    .then(res => res.json())
    .then(data => alert(data.echo)); // Shows a popup with backend response
  };

//Tells the browser exactly what layout to draw on the user's screen
return (
    <div style={{ padding: '20px' }}>
      <h1>{serverMessage}</h1>
      <input 
        value={inputText} 
        onChange={(e) => setInputText(e.target.value)} 
        placeholder="Type project data here..." 
      />
      <button onClick={sendDataToBackend}>
        Send to Backend
      </button>
    </div>
  );
}
export default App;  //Ships this component out so main.jsx can import it and mount it to the webpage shell