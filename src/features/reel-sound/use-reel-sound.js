// Hooks reels into shared theme music: live sound state and on-screen theme requests.
import { useLayoutEffect, useSyncExternalStore } from 'react'
import { isAudible, releaseTheme, requestTheme, subscribe, toggleMute } from './reel-sound'

export function useReelSound() {
  const audible = useSyncExternalStore( subscribe, isAudible, () => false )
  return { audible, toggle: toggleMute }
}

// Layout effect: a reel opened by a tap asks for its theme inside that tap, so the browser lets it play.
export function useReelTheme( url, active = true ) {
  useLayoutEffect( () => {
    if ( !active || !url ) return undefined
    requestTheme( url )
    return () => releaseTheme( url )
  }, [ url, active ] )
}
