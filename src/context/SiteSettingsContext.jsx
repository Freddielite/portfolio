import { createContext, useContext } from 'react'
import useContent from '../hooks/useContent.js'
import { getSiteSettings } from '../lib/content.js'
import fallbackSettings from '../data/siteSettings.js'

const SiteSettingsContext = createContext(fallbackSettings)

export function SiteSettingsProvider({ children }) {
  const [settings] = useContent(getSiteSettings, fallbackSettings)
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
