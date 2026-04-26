import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3006';

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

  const bmcBase = 'https://www.buymeacoffee.com/kreuzhofer';

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="container mx-auto px-4 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
            className="w-9 h-9"
          />
          <span className="font-display italic text-[22px] text-plum-deep">
            Brettspieltreff
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          {isAuthenticated && account ? (
            <Link
              to="/events"
              className="text-sm px-4 py-2 rounded-lg bg-plum text-white font-bold hover:bg-plum-deep transition-colors"
            >
              Meine Events
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm px-4 py-2 rounded-lg border border-ink/15 text-ink hover:bg-ink/5 transition-colors"
              >
                Anmelden
              </Link>
              <a
                href={bmcBase}
                target="_blank"
                rel="noreferrer"
                className="text-sm px-4 py-2 rounded-lg bg-butter text-plum-deep font-bold hover:bg-butter-hi transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
                Spenden
              </a>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:items-center">
        {/* Left column */}
        <div>
          <p className="wg-label text-plum">
            Brettspielabende, ohne Listen-Chaos
          </p>

          <h1 className="font-display italic text-5xl sm:text-6xl lg:text-[88px] leading-[1.02] mt-5">
            <span className="text-plum-deep">Wer bringt was?</span>
            <br />
            <span className="text-sage-deep">Endlich klar.</span>
          </h1>

          <p className="font-sans text-lg leading-[1.55] max-w-[520px] mt-6 text-ink">
            Vom Stammtisch zu Hause bis zum gro&szlig;en Vereinstreffen &mdash; eine gemeinsame Liste, jeder tr&auml;gt ein, was er mitbringt oder spielen m&ouml;chte. Kostenlos, deutsch, ohne Konto.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            {isAuthenticated && account ? (
              <Link
                to="/events"
                className="inline-flex items-center gap-2 text-base px-6 py-3 rounded-lg bg-plum text-white font-bold hover:bg-plum-deep transition-colors shadow-press-plum"
              >
                Meine Events
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-base px-6 py-3 rounded-lg bg-plum text-white font-bold hover:bg-plum-deep transition-colors shadow-press-plum"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Treff erstellen
              </Link>
            )}
            <button
              onClick={() => smoothScrollTo('features')}
              className="text-base px-6 py-3 rounded-lg border border-rule text-ink-soft hover:bg-paper-lo transition-colors cursor-pointer"
            >
              Demo ansehen
            </button>
          </div>

          <p className="mt-4 text-xs text-ink-mute">
            Kein Konto n&ouml;tig f&uuml;r Teilnehmer &middot; Organisatoren melden sich kostenlos an
          </p>
        </div>

        {/* Right column — tilted card mock */}
        <div className="hidden lg:block">
          <div className="relative -rotate-[1.5deg]">
            {/* Butter sticker */}
            <span className="absolute top-[-16px] right-[-16px] rotate-[8deg] bg-butter text-plum-deep font-display italic text-[16px] font-semibold rounded-full py-2.5 px-4 shadow z-10">
              kostenlos &middot; f&uuml;r alle
            </span>

            <div className="bg-paper-hi border-[1.5px] border-rule rounded-[18px] shadow-raised p-5">
              {/* Card header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-sage" />
                <span className="wg-label">
                  Spieleabend April &middot; 23 Spiele
                </span>
              </div>

              {/* Game rows — styled like real GameCard/GameRow */}
              {[
                { name: 'Ark Nova', bggId: 342942, players: '1–4', time: '90 Min', year: '2021', rating: '8.5', status: 'verfuegbar' as const, bringer: 'LM' },
                { name: 'Brass: Birmingham', bggId: 224517, players: '2–4', time: '120 Min', year: '2018', rating: '8.6', status: 'wunsch' as const, bringer: null },
                { name: 'Cascadia', bggId: 295947, players: '1–4', time: '45 Min', year: '2021', rating: '8.1', status: 'verfuegbar' as const, bringer: 'TS' },
              ].map((game, i) => (
                <div key={game.name} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-rule-soft' : ''}`}>
                  {/* Thumbnail */}
                  <img
                    src={`${apiUrl}/api/bgg/image/${game.bggId}/micro`}
                    alt={game.name}
                    className="w-12 h-12 rounded-lg object-cover bg-paper-lo flex-shrink-0"
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${game.status === 'verfuegbar' ? 'bg-sage' : 'bg-butter'}`} />
                      <span className="font-display text-[15px] font-semibold text-ink leading-tight truncate">{game.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-ink-mute text-[11px]">
                      <span>{game.year}</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-ink-mute" />
                      <span>{game.players}</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-ink-mute" />
                      <span>{game.time}</span>
                      <span className="w-[3px] h-[3px] rounded-full bg-ink-mute" />
                      <span className="text-butter-deep font-bold">&#9733; {game.rating}</span>
                    </div>
                  </div>
                  {/* Status tag */}
                  {game.bringer ? (
                    <span className="text-[11px] font-bold bg-sage-50 text-sage-deep px-2.5 py-1 rounded-full flex-shrink-0">{game.bringer}</span>
                  ) : (
                    <span className="text-[11px] font-bold bg-butter-50 text-butter-deep px-2.5 py-1 rounded-full flex-shrink-0">Wunsch</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature row ─────────────────────────────────────────── */}
      <section id="features" className="bg-paper py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Eine Liste, alle dabei',
                body: 'Teilnehmer \u00f6ffnen den Treff per Link und Kennwort. Kein Konto, kein Aufwand.',
              },
              {
                num: '02',
                title: 'BGG-Katalog inklusive',
                body: 'Spiele werden in der Liste oder bei BoardGameGeek gefunden \u2014 mit Cover und Bewertung.',
              },
              {
                num: '03',
                title: 'Bringen oder W\u00fcnschen',
                body: 'Markiere, was du mitbringst, oder lass die Gruppe wissen, was du gern spielen w\u00fcrdest.',
              },
            ].map((card) => (
              <div key={card.num} className="bg-paper-hi border border-rule rounded-xl p-7">
                <span className="font-mono text-[11px] tracking-widest text-plum font-bold">{card.num}</span>
                <h3 className="font-display italic text-[22px] text-plum-deep mt-3">{card.title}</h3>
                <p className="text-sm text-ink-soft mt-2.5 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ───────────────────────────────────────────── */}
      <section className="bg-paper-lo py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-display italic text-3xl text-plum-deep text-center mb-12">
            So passt das zu dir.
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-paper-hi border-[1.5px] border-rule rounded-2xl p-8">
              <p className="text-ink-mute text-sm">Privat &amp; famili&auml;r</p>
              <h3 className="font-display italic text-xl text-plum-deep mt-1.5">Private Spieleabende</h3>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Du l&auml;dst Freunde zum Spieleabend ein und willst wissen, wer welche Spiele mitbringt? Erstelle einen Treff, teile den Link in der Gruppe und alle tragen ihre Spiele ein. Kein Hin-und-her-Schreiben mehr.
              </p>
            </div>
            <div className="bg-paper-hi border-[1.5px] border-rule rounded-2xl p-8">
              <p className="text-ink-mute text-sm">Verein &amp; Community</p>
              <h3 className="font-display italic text-xl text-plum-deep mt-1.5">Brettspiel-Veranstaltungen</h3>
              <p className="text-ink-soft mt-3 leading-relaxed">
                Du organisierst ein Brettspiel-Treffen f&uuml;r einen Verein oder eine Community? Verwalte mehrere Treffs, behalte den &Uuml;berblick &uuml;ber Teilnehmer und Spiele und nutze die Statistiken f&uuml;r die Planung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Detailed features ───────────────────────────────────── */}
      <section className="bg-plum-50 py-16 sm:py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-display italic text-3xl text-plum-deep text-center mb-12">
            Funktionen, die euch den Abend retten.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '\uD83C\uDFB2', title: 'BoardGameGeek-Integration', body: 'Spiele direkt aus der BGG-Datenbank mit \u00fcber 130.000 Eintr\u00e4gen suchen und hinzuf\u00fcgen.' },
              { icon: '\u26A1', title: 'Echtzeit-Updates', body: 'Alle \u00c4nderungen werden sofort bei allen Teilnehmern angezeigt \u2014 ohne Reload.' },
              { icon: '\uD83D\uDE4B', title: 'Spieler & Bringer', body: 'Teilnehmer melden Interesse an und sagen zu, Spiele mitzubringen.' },
              { icon: '\uD83D\uDCCA', title: 'Statistiken', body: '\u00dcbersicht \u00fcber Teilnehmer, Spiele, beliebteste Titel und Aktivit\u00e4tsverlauf.' },
              { icon: '\uD83D\uDDA8\uFE0F', title: 'Druckansicht', body: 'Spieleliste als kompakte Druckansicht f\u00fcr den Spieleabend.' },
              { icon: '\uD83D\uDCC5', title: 'Mehrere Treffs', body: 'Erstelle und verwalte mehrere Treffs mit eigenem Link und Kennwort.' },
            ].map((f) => (
              <div key={f.title} className="bg-paper-hi border border-rule rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{f.icon}</span>
                  <h3 className="font-display italic text-lg text-plum-deep">{f.title}</h3>
                </div>
                <p className="text-sm text-ink-soft mt-2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kaffeekassenprinzip ──────────────────────────────────── */}
      <section className="bg-paper py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-paper-hi border-l-4 border-butter rounded-2xl p-9 max-w-5xl mx-auto bg-gradient-to-br from-butter-50 to-transparent">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="text-butter-deep text-sm font-bold">Frei und werbefrei</p>
                <h2 className="font-display italic text-4xl text-plum-deep mt-2.5">
                  Kaffeekassenprinzip.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed max-w-[600px]">
                  Brettspieltreff ist und bleibt kostenlos. Wer mag, wirft etwas in die digitale Kaffeekasse &mdash; das h&auml;lt Server, Domain und Entwickler bei Laune.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={bmcBase}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-butter text-plum-deep font-bold rounded-lg px-5 py-2.5 hover:bg-butter-hi transition-colors"
                >
                  3&nbsp;&euro;
                </a>
                <a
                  href={bmcBase}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-butter text-plum-deep font-bold rounded-lg px-5 py-2.5 hover:bg-butter-hi transition-colors"
                >
                  5&nbsp;&euro;
                </a>
                <a
                  href={bmcBase}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-butter text-plum-deep font-bold rounded-lg px-5 py-2.5 hover:bg-butter-hi transition-colors"
                >
                  10&nbsp;&euro;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="bg-ink py-16 sm:py-24">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="font-display italic text-3xl text-paper-hi">
              Bereit f&uuml;r den n&auml;chsten Spielabend?
            </h2>
            <p className="text-paper-hi/70 mt-3">
              Erstelle in zwei Minuten einen Treff, teile den Link, und ihr seid startklar.
            </p>
            <Link
              to="/register"
              className="inline-block mt-8 bg-plum text-white font-bold px-8 py-3 rounded-lg hover:bg-plum-deep transition-colors"
            >
              Kostenlos registrieren
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className={`bg-ink border-t border-ink-soft text-ink-mute py-8 text-sm${!isAuthenticated ? '' : ' mt-0'}`}>
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; 2026{' '}
              <a
                href="https://danielkreuzhofer.de"
                target="_blank"
                rel="noreferrer"
                className="hover:text-paper-hi transition-colors"
              >
                Daniel Kreuzhofer
              </a>
            </p>
            <nav className="flex items-center gap-4">
              <Link to="/login" className="hover:text-paper-hi transition-colors">Anmelden</Link>
              <Link to="/register" className="hover:text-paper-hi transition-colors">Registrieren</Link>
              <Link to="/impressum" className="hover:text-paper-hi transition-colors">Impressum</Link>
              <Link to="/datenschutz" className="hover:text-paper-hi transition-colors">Datenschutz</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
