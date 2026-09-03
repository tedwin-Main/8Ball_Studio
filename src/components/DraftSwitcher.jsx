import { getDraftOptions } from '../drafts/draftRegistry.js'

// Options are now data-driven from the central draft registry
const DRAFT_OPTIONS = getDraftOptions()

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
