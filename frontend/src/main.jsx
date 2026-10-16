import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// chrome-extension://<id>/ui/index.html has no server-side routing, so the extension build uses hash routes.
const Router = import.meta.env.MODE === 'extension' ? HashRouter : BrowserRouter
createRoot(document.getElementById('root')).render(<Router><App /></Router>)
