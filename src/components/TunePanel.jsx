import { useEffect, useState } from 'react'
import {
  REBUILD_KEYS,
  TUNING_DEFAULTS,
  TUNING_FIELDS,
  formatTuningForTiming,
  getTuning,
  resetTuning,
  setTuning,
  subscribeTuning,
} from '../motion/runtimeTuning'

// The ?tune panel: one slider per STORY_SETTINGS dial; "Copy values" gives lines for src/storyTiming.js.
export default function TunePanel ()
{
  const [ values, setValues ] = useState( getTuning )
  // Slider positions while dragging a scrub, before they are committed on release.
  const [ drafts, setDrafts ] = useState( {} )
  const [ open, setOpen ] = useState( true )
  const [ copied, setCopied ] = useState( false )

  useEffect( () => subscribeTuning( setValues ), [] )

  const update = ( key, raw, commit ) =>
  {
    const value = Number( raw )
    if ( !Number.isFinite( value ) ) return
    if ( REBUILD_KEYS.includes( key ) && !commit )
    {
      setDrafts( ( current ) => ( { ...current, [ key ]: value } ) )
      return
    }
    setDrafts( ( current ) =>
    {
      const next = { ...current }
      delete next[ key ]
      return next
    } )
    setTuning( { [ key ]: value } )
  }

  const copy = async () =>
  {
    try
    {
      await navigator.clipboard.writeText( formatTuningForTiming( getTuning() ) )
      setCopied( true )
      window.setTimeout( () => setCopied( false ), 1600 )
    }
    catch
    {
      // Clipboard can be blocked (insecure origin, denied permission): show the text instead.
      window.prompt( 'Copy these values into src/storyTiming.js', formatTuningForTiming( getTuning() ) )
    }
  }

  return (
    <aside className="tune-panel" aria-label="Scroll feel tuning" data-lenis-prevent>
      <div className="tune-panel-head">
        <strong>Scroll feel</strong>
        <button type="button" onClick={ () => setOpen( ( current ) => !current ) } aria-expanded={ open }>
          { open ? 'Hide' : 'Show' }
        </button>
      </div>
      { open && (
        <>
          { TUNING_FIELDS.map( ( field ) =>
          {
            const value = drafts[ field.key ] ?? values[ field.key ]
            const changed = values[ field.key ] !== TUNING_DEFAULTS[ field.key ]
            return (
              <label className="tune-panel-row" key={ field.key }>
                <span>
                  { field.label }
                  { changed && <em> *</em> }
                </span>
                <input
                  type="range"
                  min={ field.min }
                  max={ field.max }
                  step={ field.step }
                  value={ value }
                  onChange={ ( event ) => update( field.key, event.target.value, false ) }
                  onPointerUp={ ( event ) => update( field.key, event.currentTarget.value, true ) }
                  onKeyUp={ ( event ) => update( field.key, event.currentTarget.value, true ) }
                />
                <output>{ value }</output>
              </label>
            )
          } ) }
          <div className="tune-panel-actions">
            <button type="button" onClick={ copy }>{ copied ? 'Copied' : 'Copy values' }</button>
            <button type="button" onClick={ () => { setDrafts( {} ); resetTuning() } }>Reset</button>
          </div>
        </>
      ) }
    </aside>
  )
}
