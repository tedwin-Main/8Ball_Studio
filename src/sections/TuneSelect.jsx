import { NAV_STYLES, SERVICES_STYLES } from '../servicesStyle'

// ?tune only: a small fixed select that swaps the Services layout live (accordion or a flat drum).
// data-lenis-prevent keeps Lenis from eating the wheel while the select is open.
export function TuneSelect( { value, onChange, navValue, onNavChange } ) {
  return (
    <label className="tune-select" data-lenis-prevent>
      <span>Services</span>
      <select value={ value } onChange={ ( event ) => onChange( event.target.value ) }>
        { Object.entries( SERVICES_STYLES ).map( ( [ id, label ] ) => <option value={ id } key={ id }>{ label }</option> ) }
      </select>
      <span>Nav</span>
      <select value={ navValue } onChange={ ( event ) => onNavChange( event.target.value ) }>
        { Object.entries( NAV_STYLES ).map( ( [ id, label ] ) => <option value={ id } key={ id }>{ label }</option> ) }
      </select>
    </label>
  )
}
