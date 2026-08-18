import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './site.css'

const root = document.getElementById('root')
if (root === null) throw new Error('website root is missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
