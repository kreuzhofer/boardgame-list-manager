import { useEffect } from 'react';

export function DatenschutzPage() {
  useEffect(() => {
    document.title = 'Datenschutzerklärung — Brettspieltreff';
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Datenschutzerklärung</h1>

        <div className="bg-white rounded-lg shadow p-8 space-y-6 text-gray-700 text-sm leading-relaxed">

          {/* Verantwortlicher */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Verantwortlicher</h2>
            <p>
              Daniel Kreuzhofer<br />
              Hofmarkstr. 8<br />
              86316 Friedberg<br />
              E-Mail: <a href="mailto:daniel@kreuzhofer.de" className="text-blue-600 hover:underline">daniel@kreuzhofer.de</a>
            </p>
          </section>

          {/* Überblick */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Überblick über die Datenverarbeitung</h2>
            <p>
              Brettspieltreff ist eine Web-App zur Organisation von Brettspiel-Events.
              Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
              der App und ihrer Funktionen erforderlich ist. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f
              DSGVO (berechtigtes Interesse an der Bereitstellung und Verbesserung des Dienstes).
            </p>
          </section>

          {/* Erhobene Daten */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Welche Daten wir erheben</h2>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Organisator-Konto</h3>
            <p>
              Bei der Registrierung speichern wir deine E-Mail-Adresse und ein gehashtes
              Passwort. Die E-Mail-Adresse dient zur Anmeldung und ggf. zur
              Kontowiederherstellung.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Event-Teilnehmer</h3>
            <p>
              Teilnehmer geben einen frei gewählten Anzeigenamen ein. Es wird kein
              Benutzerkonto erstellt und keine E-Mail-Adresse abgefragt.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Spieledaten</h3>
            <p>
              Eingetragene Spiele, Spieler-Zuordnungen und Bringer-Zuordnungen werden
              in unserer Datenbank gespeichert und sind für alle Teilnehmer des
              jeweiligen Events sichtbar.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Server-Logs</h3>
            <p>
              Bei jedem Zugriff auf unseren Server werden technische Daten
              protokolliert (IP-Adresse, Zeitpunkt, aufgerufene URL, User-Agent).
              Diese Daten werden zur Fehleranalyse und zum Schutz vor Missbrauch
              verwendet und nach 30 Tagen gelöscht.
            </p>
          </section>

          {/* Lokale Speicherung */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Lokale Speicherung (localStorage)</h2>
            <p>
              Brettspieltreff verwendet keine Cookies. Stattdessen nutzen wir den
              localStorage deines Browsers, um folgende Daten lokal zu speichern:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Authentifizierungs-Token (JWT) für die Anmeldung am Event und am Organisator-Konto</li>
              <li>Ausgewählter Teilnehmer-Name pro Event</li>
              <li>Einstellungen zur Anzeige (z.B. Dismiss-Status von Release Notes)</li>
            </ul>
            <p className="mt-2">
              Diese Daten verlassen deinen Browser nicht und werden nicht an unsere
              Server übermittelt (außer das JWT-Token bei API-Anfragen zur Authentifizierung).
            </p>
          </section>

          {/* Echtzeit-Verbindungen */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Echtzeit-Verbindungen (SSE)</h2>
            <p>
              Die App nutzt Server-Sent Events (SSE) für Echtzeit-Updates. Dabei wird
              eine dauerhafte Verbindung zwischen deinem Browser und unserem Server
              aufrechterhalten. Es werden keine zusätzlichen personenbezogenen Daten
              übertragen — nur Event-bezogene Änderungen (z.B. „Spiel hinzugefügt").
            </p>
          </section>

          {/* Drittanbieter */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Drittanbieter-Dienste</h2>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Google Analytics</h3>
            <p>
              Wir nutzen Google Analytics, einen Webanalysedienst der Google Ireland
              Limited, Gordon House, Barrow Street, Dublin 4, Irland. Google Analytics
              verwendet Cookies bzw. ähnliche Technologien, um die Nutzung unserer
              Website zu analysieren. Die erzeugten Informationen werden in der Regel
              an einen Server von Google in den USA übertragen und dort gespeichert.
              Wir nutzen die IP-Anonymisierung, sodass deine IP-Adresse von Google
              innerhalb der EU gekürzt wird. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f
              DSGVO. Du kannst die Erfassung durch Google Analytics verhindern, indem
              du ein Browser-Plugin installierst:{' '}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://tools.google.com/dlpage/gaoptout
              </a>
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Mixpanel</h3>
            <p>
              Wir nutzen Mixpanel, einen Analysedienst der Mixpanel Inc., One Front
              Street, 28th Floor, San Francisco, CA 94111, USA. Mixpanel hilft uns zu
              verstehen, wie Nutzer mit der App interagieren. Dabei werden
              Nutzungsdaten (z.B. aufgerufene Seiten, Interaktionen) erfasst und auf
              Servern von Mixpanel verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1
              lit. f DSGVO. Mehr Informationen:{' '}
              <a
                href="https://mixpanel.com/legal/privacy-policy/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Mixpanel Datenschutzrichtlinie
              </a>
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">BoardGameGeek (BGG)</h3>
            <p>
              Die App lädt Spielebilder von BoardGameGeek über unseren eigenen Server
              als Proxy. Dabei wird keine direkte Verbindung zwischen deinem Browser
              und den BGG-Servern hergestellt.
            </p>

            <h3 className="font-semibold text-gray-800 mt-4 mb-1">Buy Me a Coffee</h3>
            <p>
              Auf unserer Startseite befindet sich ein Link zu Buy Me a Coffee.
              Erst wenn du diesen Link anklickst, wirst du auf die externe Seite
              von Buy Me a Coffee weitergeleitet, die eigene Datenschutzbestimmungen hat.
            </p>
          </section>

          {/* Hosting */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Hosting</h2>
            <p>
              Die App wird auf Servern in Deutschland/EU gehostet. Alle Daten werden
              in einer PostgreSQL-Datenbank gespeichert, die ebenfalls in der EU
              betrieben wird.
            </p>
          </section>

          {/* Rechte */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Deine Rechte</h2>
            <p>Du hast folgende Rechte bezüglich deiner personenbezogenen Daten:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Auskunft</strong> (Art. 15 DSGVO) — Welche Daten wir über dich gespeichert haben</li>
              <li><strong>Berichtigung</strong> (Art. 16 DSGVO) — Korrektur unrichtiger Daten</li>
              <li><strong>Löschung</strong> (Art. 17 DSGVO) — Löschung deiner Daten</li>
              <li><strong>Einschränkung</strong> (Art. 18 DSGVO) — Einschränkung der Verarbeitung</li>
              <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Export deiner Daten</li>
              <li><strong>Widerspruch</strong> (Art. 21 DSGVO) — Widerspruch gegen die Verarbeitung</li>
            </ul>
            <p className="mt-2">
              Zur Ausübung deiner Rechte wende dich an:{' '}
              <a href="mailto:daniel@kreuzhofer.de" className="text-blue-600 hover:underline">daniel@kreuzhofer.de</a>
            </p>
            <p className="mt-2">
              Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
              zu beschweren, wenn du der Meinung bist, dass die Verarbeitung deiner
              Daten gegen die DSGVO verstößt.
            </p>
          </section>

          {/* Änderungen */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Änderungen</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an
              geänderte Rechtslagen oder Änderungen des Dienstes anzupassen. Die
              aktuelle Version findest du immer auf dieser Seite.
            </p>
            <p className="mt-2 text-gray-500">
              Stand: April 2026
            </p>
          </section>
        </div>
    </div>
  );
}

export default DatenschutzPage;
