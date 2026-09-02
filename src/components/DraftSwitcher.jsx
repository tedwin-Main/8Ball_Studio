const DRAFT_OPTIONS = [
  { id: 'cinematic', label: '01 3D POV' },
  { id: 'webgl', label: '02 3D Break' },
  { id: 'original', label: '03 Original' },
  { id: 'draft4', label: '04 3D POV' },
]

export function DraftSwitcher ( { activeDraft, onChange } )
{
  return (
    <nav className="draft-switcher" aria-label="Animation draft selector">
      <div className="draft-switcher-options">
        { DRAFT_OPTIONS.map( ( option ) => (
          <button
            className={ `draft-switcher-button${activeDraft === option.id ? ' is-active' : ''}` }
            type="button"
            aria-pressed={ activeDraft === option.id }
            onClick={ () => onChange( option.id ) }
            key={ option.id }
          >
            { option.label }
          </button>
        ) ) }
      </div>
    </nav>
  )
}
