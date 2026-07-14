import { useState, useEffect } from 'react';  //Grabs the React hooks that let us add interactivity to our webpage

function App() {
  //Create a state variable to hold the message from the backend
  const [serverMessage, setServerMessage] = useState("Loading...");

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

//Tells the browser exactly what layout to draw on the user's screen
return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>React + FastAPI Connection Test</h1>
      {/* Display the message on the screen */}
      <p style={{ fontSize: '1.2rem', color: '#4CAF50', fontWeight: 'bold' }}>
        Backend says: {serverMessage}
      </p>
    </div>
  );
}
export default App;  //Ships this component out so main.jsx can import it and mount it to the webpage shell