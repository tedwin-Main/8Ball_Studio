import test from 'node:test'
import assert from 'node:assert/strict'
import { limitScrollLead } from './scrollLead.js'

test( 'a wheel delta may only push the target up to the speed limit ahead of the page', () =>
{
  // Page at rest: a small notch passes, a huge flick is trimmed to the limit.
  assert.equal( limitScrollLead( 40, 0, 540 ), 40 )
  assert.equal( limitScrollLead( 2000, 0, 540 ), 540 )
  // Already 500 px ahead: only 40 more fits.
  assert.equal( limitScrollLead( 100, 500, 540 ), 40 )
  // Scrolling back against the lead is never trimmed short of the far limit.
  assert.equal( limitScrollLead( -100, 500, 540 ), -100 )
  assert.equal( limitScrollLead( -2000, 0, 540 ), -540 )
} )

test( 'a limit of 0 (off) or bad input leaves the delta alone', () =>
{
  assert.equal( limitScrollLead( 2000, 0, 0 ), 2000 )
  assert.equal( limitScrollLead( 2000, Number.NaN, 540 ), 540 )
  assert.ok( Number.isNaN( limitScrollLead( Number.NaN, 0, 540 ) ) )
} )
