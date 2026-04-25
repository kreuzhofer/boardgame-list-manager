import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

export function LandingPage() {
  const { isAuthenticated, account } = useAuth();

  useEffect(() => {
    document.title = 'Brettspieltreff — Spieleabende einfach organisieren';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brettspieltreff</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated && account ? (
            <Link
              to="/events"
              className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              Meine Events
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                Anmelden
              </Link>
              <Link
                to="/register"
                className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg bg-white text-blue-700 font-medium hover:bg-blue-50 transition-colors"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-3xl">
        <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
          Spieleabende einfach organisieren
        </h2>
        <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          Erstelle Events, teile sie mit deinen Teilnehmern und verwalte Spielelisten
          gemeinsam &mdash; in Echtzeit. Kostenlos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="inline-block text-lg px-8 py-3 rounded-lg bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors shadow-lg"
          >
            Jetzt loslegen
          </Link>
          <button
            onClick={() => smoothScrollTo('features')}
            className="inline-block text-lg px-8 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Mehr erfahren
          </button>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="bg-white text-gray-800 py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <h3 className="text-3xl font-bold text-center mb-12">So funktioniert's</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">1</div>
              <h4 className="text-lg font-semibold">Event erstellen</h4>
              <p className="text-gray-600">
                Erstelle ein Event mit Name, Datum und Ort. Du bekommst einen
                teilbaren Link und ein Passwort für deine Teilnehmer.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">2</div>
              <h4 className="text-lg font-semibold">Link teilen</h4>
              <p className="text-gray-600">
                Teile den Event-Link und das Passwort mit deinen Teilnehmern.
                Jeder kann sich mit einem Namen anmelden und Spiele eintragen.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-2xl font-bold">3</div>
              <h4 className="text-lg font-semibold">Gemeinsam planen</h4>
              <p className="text-gray-600">
                Teilnehmer tragen Spiele ein, melden Interesse an und sagen zu,
                welche Spiele sie mitbringen. Alles in Echtzeit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 text-gray-800 py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <h3 className="text-3xl font-bold text-center mb-12">Für wen ist das?</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-8 space-y-4">
              <h4 className="text-xl font-semibold text-blue-700">Private Spieleabende</h4>
              <p className="text-gray-600">
                Du lädst Freunde zum Spieleabend ein und willst wissen, wer welche
                Spiele mitbringt? Erstelle ein Event, teile den Link in der Gruppe und
                alle können ihre Spiele eintragen. Kein Hin-und-her-Schreiben mehr.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-8 space-y-4">
              <h4 className="text-xl font-semibold text-blue-700">Brettspiel-Veranstaltungen</h4>
              <p className="text-gray-600">
                Du organisierst ein Brettspiel-Treffen für einen Verein oder eine
                Community? Verwalte mehrere Events, behalte den Überblick über
                Teilnehmer und Spiele und nutze die Statistiken für die Planung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Detail */}
      <section className="bg-blue-50 text-gray-800 py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <h3 className="text-3xl font-bold text-center mb-12">Funktionen von Brettspieltreff</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🎲', title: 'BoardGameGeek-Integration', desc: 'Spiele direkt aus der BGG-Datenbank mit über 130.000 Einträgen suchen und hinzufügen. BGG ist die weltweit größte Brettspiel-Community.' },
              { icon: '⚡', title: 'Echtzeit-Updates', desc: 'Alle Änderungen werden sofort bei allen Teilnehmern angezeigt, ohne die Seite neu laden zu müssen.' },
              { icon: '🙋', title: 'Spieler & Bringer', desc: 'Teilnehmer können Interesse anmelden und zusagen, Spiele mitzubringen.' },
              { icon: '📊', title: 'Statistiken', desc: 'Übersicht über Teilnehmer, Spiele, beliebteste Titel und Aktivitätsverlauf.' },
              { icon: '🖨️', title: 'Druckansicht', desc: 'Spieleliste als kompakte Druckansicht für den Spieleabend.' },
              { icon: '📅', title: 'Mehrere Events', desc: 'Erstelle und verwalte mehrere Events mit eigenem Link und Passwort.' },
            ].map((feature) => (
              <div key={feature.title} className="bg-white border border-gray-200 rounded-lg p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{feature.icon}</span>
                  <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                </div>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donate / Support */}
      <section className="bg-blue-700 text-white py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6">
          <h3 className="text-3xl font-bold">Kostenlos. Für alle.</h3>
          <p className="text-lg text-white/80 max-w-xl mx-auto">
            Brettspieltreff ist komplett kostenlos. Wenn es dir gefällt und du die
            Weiterentwicklung unterstützen möchtest, freuen wir uns über eine
            freiwillige Spende.
          </p>
          <a
            href="https://www.buymeacoffee.com/kreuzhofer"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-lg px-8 py-3 rounded-lg bg-yellow-400 text-gray-900 font-bold hover:bg-yellow-300 transition-colors shadow-lg"
          >
            Spende einen Kaffee
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6">
          <h3 className="text-3xl font-bold">Bereit für deinen nächsten Spieleabend?</h3>
          <p className="text-white/70">
            Registriere dich kostenlos und erstelle dein erstes Event in wenigen Minuten.
          </p>
          <Link
            to="/register"
            className="inline-block text-lg px-8 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg"
          >
            Kostenlos registrieren
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 py-8 text-sm">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()}{' '}
              <a
                href="https://danielkreuzhofer.de"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-4 hover:text-white"
              >
                Daniel Kreuzhofer
              </a>
            </p>
            <nav className="flex items-center gap-4">
              <Link to="/login" className="hover:text-white transition-colors">Anmelden</Link>
              <Link to="/register" className="hover:text-white transition-colors">Registrieren</Link>
              <a href="/impressum" className="hover:text-white transition-colors">Impressum</a>
              <a href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
