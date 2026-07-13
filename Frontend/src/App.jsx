import { useState } from 'react'  // Tool Import: Grabs the built-in useState tool from React to track changing data later

function App() { //Component Declaration: Creates a reusable visual block named 'App' (must start with capital letter)

//Tells the browser exactly what layout to draw on the user's screen
  return ( 
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>AECRDA</h1>
      <h3 style={{ textAlign: 'center' }}>AI Enterprise Code Review & Documentation Assistant</h3>
      <p style={{ textAlign: 'center' }}>Hello World</p>
    </div>
  )
}
export default App  //Ships this component out so main.jsx can import it and mount it to the webpage shell