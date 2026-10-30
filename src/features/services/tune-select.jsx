// Renders tune review panel with section selectors.

import { DRAFTS } from './services-style'

// ?tune > panel: fixed bottom-right, swaps any section draft live
// data-lenis-prevent keeps Lenis from eating wheel while a select is open
export function TuneSelect( { drafts, onChange } ) {
  return (
    <div className="tune-select" data-lenis-prevent>
      { Object.entries( DRAFTS ).map( ( [ section, { label, options } ] ) => (
        <label key={ section }>
          <span>{ label }</span>
          <select value={ drafts[ section ] } onChange={ ( event ) => onChange( section, event.target.value ) }>
            { Object.entries( options ).map( ( [ id, name ] ) => <option value={ id } key={ id }>{ name }</option> ) }
          </select>
        </label>
      ) ) }
    </div>
  )
}
