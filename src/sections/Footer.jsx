import { CONTACT_CHANNELS, PRIMARY_CONTACT } from '../content'

// Action: one massive call to action, then the links and the footer row.
// The primary button is lime with ink text; the secondary ones are outlined with cream text.
export function Footer() {
  return (
    <footer className="footer" id="footer">
      {/* id="contact" lives here now: the Nav's Contact link points at this call to action. */}
      <div className="section footer-cta" id="contact">
        <h2 className="cta-title">Send us the brief.</h2>
        <div className="cta-actions">
          <a className="btn btn-lime btn-xl" href={ PRIMARY_CONTACT.href } target="_blank" rel="noreferrer">
            { PRIMARY_CONTACT.label }
          </a>
          { CONTACT_CHANNELS.map( ( channel ) => (
            <a key={ channel.title } className="btn btn-outline btn-xl" href={ channel.href } target="_blank" rel="noreferrer">
              { channel.title }
            </a>
          ) ) }
        </div>
      </div>
      <div className="footer-row">
        <p>8ightBall Studio, Greater Kuala Lumpur, Malaysia</p>
        <p>{ PRIMARY_CONTACT.number }</p>
        <p>&copy; { new Date().getFullYear() } 8ightBall Studio</p>
      </div>
    </footer>
  )
}
