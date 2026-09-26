// Mobile browsers fire `resize` whenever their address bar or toolbar slides in or out while you
// scroll. The Story's layout uses svh units, so those resizes change nothing that needs re-measuring;
// treating them as real resizes refreshes every ScrollTrigger and snaps the page in the middle of a
// glide (the "jank" on phones). This filter tells the two kinds apart.

// The biggest height change the browser chrome causes (iOS Safari's URL bar plus toolbar is about
// 140px); a larger change, or any width change, is a real layout change (rotation, split screen).
const CHROME_HEIGHT_PX = 180

/**
 * Returns a function to call from a `resize` listener. It answers true for a real layout change and
 * false for a browser-chrome slide on a touch screen. Each listener needs its own filter, because the
 * filter remembers the last size it saw.
 */
export function createLayoutResizeFilter ( windowObject = window )
{
  let width = windowObject.innerWidth
  let height = windowObject.innerHeight
  const touch = windowObject.matchMedia?.( '(pointer: coarse)' )

  return () =>
  {
    const nextWidth = windowObject.innerWidth
    const nextHeight = windowObject.innerHeight
    const chromeOnly = Boolean( touch?.matches ) &&
      nextWidth === width &&
      Math.abs( nextHeight - height ) <= CHROME_HEIGHT_PX
    width = nextWidth
    height = nextHeight
    return !chromeOnly
  }
}
