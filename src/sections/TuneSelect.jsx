import { SERVICES_STYLES } from '../servicesStyle'

// ?tune only: a small fixed select that swaps the Services layout live (accordion or a flat drum).
// data-lenis-prevent keeps Lenis from eating the wheel while the select is open.
export function TuneSelect( { value, onChange } ) {
  return (
    <label className="tune-select" data-lenis-prevent>
      <span>Services</span>
      <select value={ value } onChange={ ( event ) => onChange( event.target.value ) }>
        { Object.entries( SERVICES_STYLES ).map( ( [ id, label ] ) => <option value={ id } key={ id }>{ label }</option> ) }
      </select>
    </label>
  )
}
