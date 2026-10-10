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
import { SERVICES_STYLES } from '../looks/lookRegistry'

// The ?tune panel, the owner's one place to try the site: one Design list (Studio2, or a Main layout
// of Services), then one slider per STORY_SETTINGS dial; "Copy values" gives lines for
// src/storyTiming.js. Choosing a Main Design also writes ?services= to the URL.
export default function TunePanel ( { servicesStyle, onServicesStyleChange } )
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

  // Studio2 is its own page (studio2.html) with its own stylesheet, so picking it leaves Main.
  const chooseDesign = ( id ) =>
  {
    if ( id === 'studio2' ) window.location.assign( '/studio2.html?tune' )
    else onServicesStyleChange?.( id )
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
    <aside className="tune-panel" aria-label="Design and scroll feel tuning" data-lenis-prevent>
      <div className="tune-panel-head">
        <strong>Tune</strong>
        <button type="button" onClick={ () => setOpen( ( current ) => !current ) } aria-expanded={ open }>
          { open ? 'Hide' : 'Show' }
        </button>
      </div>
      { open && (
        <>
          <label className="tune-panel-row tune-panel-choice">
            <span>Design</span>
            <select value={ servicesStyle } onChange={ ( event ) => chooseDesign( event.target.value ) }>
              { Object.entries( SERVICES_STYLES ).map( ( [ id, label ] ) => <option value={ id } key={ id }>{ label }</option> ) }
            </select>
          </label>
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
