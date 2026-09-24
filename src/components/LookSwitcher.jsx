import { LOOK_CONFIGS, LOOK_IDS } from '../looks/lookRegistry.js'

// Whole-site look selector. A native <select> keeps it compact, keyboard and screen-reader friendly,
// and usable on phones; each look restyles it through the shared `.tape` label material.
export function LookSwitcher ( { activeLook, onChange } )
{
  return (
    <label className="look-switcher tape">
      <span className="look-switcher-label">Look</span>
      <select
        className="look-switcher-select"
        value={ activeLook }
        onChange={ ( event ) => onChange( event.target.value ) }
        aria-label="Site look"
      >
        { LOOK_IDS.map( ( id ) => (
          <option value={ id } key={ id }>{ LOOK_CONFIGS[ id ].label }</option>
        ) ) }
      </select>
      <svg className="look-switcher-caret" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5l5-5" /></svg>
    </label>
  )
}
