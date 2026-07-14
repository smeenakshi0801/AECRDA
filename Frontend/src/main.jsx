import { StrictMode, useState, useEffect } from 'react'    //Imports StrictMode to catch sneaky bugs and bad practices in development
import { createRoot } from 'react-dom/client'    //Imports the tool that lets React manipulate the browser's actual HTML elements
import App from './App.jsx'    //Grabs the App layout file in App.jsx

createRoot(document.getElementById('root')).render(    //Finds the empty '<div id="root">' in index.html and hooks the React engine into it
  //Activates the development-mode check for warnings and bugs
  <StrictMode>
    <App />
  </StrictMode>,
)