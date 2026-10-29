// Freezes an object and every nested object or array, so shared config and cached results stay read-only.

export const freezeDeep = ( value ) =>
{
  if ( !value || typeof value !== 'object' || Object.isFrozen( value ) ) return value
  Object.values( value ).forEach( freezeDeep )
  return Object.freeze( value )
}
