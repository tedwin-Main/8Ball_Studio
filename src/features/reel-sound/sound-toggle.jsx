// Renders Instagram-style tap-to-mute layer over a playing reel, speaker badge in corner.
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { useReelSound } from './use-reel-sound'

export function SoundToggle() {
  const { audible, toggle } = useReelSound()
  const Icon = audible ? SpeakerHigh : SpeakerSlash
  return (
    <button
      type="button"
      className="reel-sound-toggle"
      aria-label={ audible ? 'Mute music' : 'Play music' }
      data-cursor={ audible ? 'Mute' : 'Sound' }
      onClick={ toggle }
    >
      <span className="reel-sound-badge">
        <Icon size={ 16 } weight="fill" aria-hidden="true" />
      </span>
    </button>
  )
}
