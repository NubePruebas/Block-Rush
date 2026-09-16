import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from 'react';
import {
  crearMundo,
  empezarPartida,
  etiquetaDificultad,
  mensajeOver,
  pausar,
  reanudar,
  soltar,
  tick,
  type Dificultad,
  type ModoJuego,
  type Mundo,
  type SkinId,
} from '../game/engine';
import { pintarMundo } from '../game/render';
import {
  agregarRecord,
  calificaParaTabla,
  formatearFecha,
  leerNombreGuardado,
  leerRecords,
  type RecordEntry,
} from '../game/records';
import { ACHIEVEMENTS, evaluarLogros, leerLogros, tituloLogro } from '../game/achievements';
import { skinDesbloqueada, SKINS } from '../game/skins';
import { guardarSettings, leerSettings, type Settings } from '../game/settings';
import {
  sfxDrop,
  sfxGameOver,
  sfxLogro,
  sfxPerfect,
  sfxUi,
  unlockAudio,
} from '../game/audio';
import { vibDrop, vibMiss, vibPerfect } from '../game/haptics';
import {
  compartirScore,
  fetchRanking,
  postRanking,
  trackEvent,
  type RankingEntry,
} from '../game/api';

type Panel =
  | 'menu'
  | 'howto'
  | 'records'
  | 'ranking'
  | 'logros'
  | 'ajustes'
  | 'playing'
  | 'paused'
  | 'over';

interface Hud {
  score: number;
  best: number;
  bestDiario: number;
  combo: number;
  overMsg: string;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const settings0 = leerSettings();
  const mundoRef = useRef<Mundo>(crearMundo(settings0.skin));
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastTouchRef = useRef(0);
  const sizeRef = useRef({ w: 400, h: 640, dpr: 1 });
  const panelRef = useRef<Panel>('menu');
  const settingsRef = useRef<Settings>(settings0);

  const [hud, setHud] = useState<Hud>({
    score: 0,
    best: mundoRef.current.best,
    bestDiario: mundoRef.current.bestDiario,
    combo: 0,
    overMsg: '',
  });
  const [panel, setPanel] = useState<Panel>('menu');
  const [shake, setShake] = useState(false);
  const [settings, setSettings] = useState<Settings>(settings0);
  const [modo, setModo] = useState<ModoJuego>('clasico');
  const [records, setRecords] = useState<RecordEntry[]>(() => leerRecords());
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [logros, setLogros] = useState(() => [...leerLogros()]);
  const [toasts, setToasts] = useState<string[]>([]);
  const [nombre, setNombre] = useState(() => leerNombreGuardado());
  const [guardado, setGuardado] = useState(false);
  const [puedeGuardar, setPuedeGuardar] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [onlineOk, setOnlineOk] = useState(false);

  const setPanelSafe = (p: Panel) => {
    panelRef.current = p;
    setPanel(p);
  };

  const toast = (msg: string) => {
    setToasts((t) => [...t.slice(-2), msg]);
    window.setTimeout(() => {
      setToasts((t) => t.slice(1));
    }, 2800);
  };

  const applySettings = (next: Settings) => {
    settingsRef.current = next;
    setSettings(next);
    guardarSettings(next);
  };

  const syncHud = (m: Mundo, prevFase?: string) => {
    const goingOver = m.fase === 'over' && prevFase === 'playing';
    setHud({
      score: m.score,
      best: m.best,
      bestDiario: m.bestDiario,
      combo: m.combo,
      overMsg: m.fase === 'over' ? mensajeOver(m.score, m.best) : '',
    });
    if (goingOver) {
      setShake(true);
      window.setTimeout(() => setShake(false), 380);
      setGuardado(false);
      setOnlineOk(false);
      setShareMsg('');
      setPuedeGuardar(calificaParaTabla(m.score));
      setPanelSafe('over');

      const nuevos = evaluarLogros({
        score: m.score,
        best: m.best,
        maxCombo: m.maxCombo,
        modoDiario: m.modo === 'diario',
        dificil: m.dificultad === 'dificil',
      });
      if (nuevos.length) {
        setLogros([...leerLogros()]);
        sfxLogro();
        nuevos.forEach((id) => toast(`Logro: ${tituloLogro(id)}`));
      }
      void trackEvent('partida_fin');
    }
  };

  useEffect(() => {
    void trackEvent('visita');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const h = Math.max(360, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);

    let alive = true;
    const loop = (ts: number) => {
      if (!alive) return;
      const last = lastTsRef.current || ts;
      const dt = Math.min(32, ts - last);
      lastTsRef.current = ts;

      const m = mundoRef.current;
      const prevFase = m.fase;
      const prevScore = m.score;
      const prevBest = m.best;
      const prevCombo = m.combo;

      tick(m, dt);
      const { w, h } = sizeRef.current;
      pintarMundo(ctx, m, w, h);

      if (
        m.fase !== prevFase ||
        m.score !== prevScore ||
        m.best !== prevBest ||
        m.combo !== prevCombo
      ) {
        syncHud(m, prevFase);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const play = (modoOverride?: ModoJuego) => {
    unlockAudio();
    sfxUi();
    const s = settingsRef.current;
    const skin: SkinId = skinDesbloqueada(s.skin) ? s.skin : 'neon';
    const mJuego = modoOverride ?? modo;
    setModo(mJuego);
    empezarPartida(mundoRef.current, {
      dificultad: s.dificultad,
      modo: mJuego,
      skin,
    });
    setGuardado(false);
    setPuedeGuardar(false);
    setPanelSafe('playing');
    syncHud(mundoRef.current);
    void trackEvent('partida_inicio');
    if (mJuego === 'diario') {
      const nuevos = evaluarLogros({
        score: 0,
        best: mundoRef.current.best,
        maxCombo: 0,
        modoDiario: true,
        dificil: s.dificultad === 'dificil',
      });
      if (nuevos.length) {
        setLogros([...leerLogros()]);
        toast(`Logro: ${tituloLogro(nuevos[0]!)}`);
      }
    }
  };

  const irMenu = () => {
    mundoRef.current.fase = 'start';
    setPanelSafe('menu');
    syncHud(mundoRef.current);
  };

  const togglePausa = () => {
    const m = mundoRef.current;
    if (m.fase === 'playing') {
      pausar(m);
      setPanelSafe('paused');
      sfxUi();
    } else if (m.fase === 'paused') {
      reanudar(m);
      setPanelSafe('playing');
      sfxUi();
    }
  };

  const verRecords = () => {
    sfxUi();
    setRecords(leerRecords());
    setPanelSafe('records');
  };

  const verRanking = async () => {
    sfxUi();
    setPanelSafe('ranking');
    setRanking(await fetchRanking());
  };

  const verLogros = () => {
    sfxUi();
    setLogros([...leerLogros()]);
    setPanelSafe('logros');
  };

  const guardarLocalYOnline = async (e?: FormEvent) => {
    e?.preventDefault();
    if (guardado) return;
    const m = mundoRef.current;
    if (m.score <= 0) return;

    const entraLocal = calificaParaTabla(m.score);
    if (entraLocal) {
      setRecords(agregarRecord(nombre, m.score));
    }
    setGuardado(true);
    setPuedeGuardar(false);
    sfxUi();

    const online = await postRanking({
      nombre,
      score: m.score,
      dificultad: m.dificultad,
      modo: m.modo,
    });
    if (online.length) {
      setRanking(online);
      setOnlineOk(true);
      toast(entraLocal ? 'Guardado local + online' : 'Subido al ranking online');
    } else {
      toast(entraLocal ? 'Récord local guardado' : 'No se pudo subir online');
    }
  };

  const onShare = async () => {
    const m = mundoRef.current;
    const texto = `¡Hice ${m.score} puntos en Block Rush (${etiquetaDificultad(m.dificultad)}${
      m.modo === 'diario' ? ', diario' : ''
    })! ¿Puedes superarme?`;
    const r = await compartirScore(texto);
    setShareMsg(r === 'failed' ? 'No se pudo compartir' : r === 'shared' ? '¡Compartido!' : 'Copiado al portapapeles');
    void trackEvent('share');
  };

  const tryDrop = (pointerType?: string) => {
    if (panelRef.current !== 'playing') return;
    const m = mundoRef.current;
    if (m.fase !== 'playing') return;
    if (pointerType === 'touch') lastTouchRef.current = performance.now();
    else if (performance.now() - lastTouchRef.current < 450) return;

    const prev = m.fase;
    const res = soltar(m);
    if (!res.ok) return;

    const s = settingsRef.current;
    if (res.miss) {
      sfxGameOver();
      if (s.vibracion) vibMiss();
    } else if (res.perfect) {
      sfxPerfect(res.combo);
      if (s.vibracion) vibPerfect();
    } else {
      sfxDrop();
      if (s.vibracion) vibDrop();
    }
    syncHud(m, prev);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const p = panelRef.current;
        if (p === 'menu' || p === 'over') play();
        else if (p === 'playing') tryDrop();
        else if (p === 'paused') togglePausa();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (panelRef.current === 'playing' || panelRef.current === 'paused') {
          e.preventDefault();
          togglePausa();
        } else if (
          panelRef.current === 'records' ||
          panelRef.current === 'ranking' ||
          panelRef.current === 'logros' ||
          panelRef.current === 'howto' ||
          panelRef.current === 'ajustes' ||
          panelRef.current === 'over'
        ) {
          irMenu();
        }
      } else if (e.code === 'KeyR' && panelRef.current === 'over') {
        play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modo]);

  const onPointer = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (panel !== 'playing') return;
    e.preventDefault();
    tryDrop(e.pointerType);
  };

  const bestShow = modo === 'diario' || mundoRef.current.modo === 'diario' ? hud.bestDiario : hud.best;

  return (
    <div
      className={`app${panel === 'playing' || panel === 'paused' ? ' is-playing' : ''}${
        shake ? ' is-shake' : ''
      }`}
    >
      <header className="hud" hidden={panel === 'menu' || panel === 'howto' || panel === 'records' || panel === 'ranking' || panel === 'logros' || panel === 'ajustes'}>
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <span className="hud-value">{hud.score}</span>
        </div>
        <div className="hud-brand">
          BLOCK RUSH
          {hud.combo > 1 && <span className="hud-combo">x{hud.combo}</span>}
        </div>
        <div className="hud-item hud-item--right">
          <span className="hud-label">Best</span>
          <span className="hud-value">{bestShow}</span>
        </div>
      </header>

      {(panel === 'playing' || panel === 'paused') && (
        <button type="button" className="btn-pause" onClick={togglePausa} aria-label="Pausa">
          {panel === 'paused' ? '▶' : 'Ⅱ'}
        </button>
      )}

      <main className="stage" ref={wrapRef}>
        <canvas ref={canvasRef} aria-label="Área de juego Block Rush" onPointerDown={onPointer} />

        {panel === 'menu' && (
          <section className="overlay overlay--start overlay--scroll" aria-labelledby="titleStart">
            <p className="eyebrow">Arcade · Navegador</p>
            <h1 id="titleStart" className="logo">
              BLOCK
              <br />
              RUSH
            </h1>
            <p className="tagline">Apila. Corta. Supera tu récord.</p>

            <div className="chip-row">
              {(['facil', 'normal', 'dificil'] as Dificultad[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip${settings.dificultad === d ? ' is-on' : ''}`}
                  onClick={() => applySettings({ ...settings, dificultad: d })}
                >
                  {etiquetaDificultad(d)}
                </button>
              ))}
            </div>

            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => play('clasico')}>
                Jugar
              </button>
              <button type="button" className="btn btn--mint" onClick={() => play('diario')}>
                Diario
              </button>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn--ghost" onClick={() => { sfxUi(); setPanelSafe('howto'); }}>
                Cómo jugar
              </button>
              <button type="button" className="btn btn--ghost" onClick={verRecords}>
                Récords
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => void verRanking()}>
                Online
              </button>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn--ghost" onClick={verLogros}>
                Logros
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => { sfxUi(); setPanelSafe('ajustes'); }}>
                Ajustes
              </button>
            </div>
            <p className="hint">Skin: {SKINS.find((s) => s.id === settings.skin)?.nombre ?? 'Neón'}</p>
          </section>
        )}

        {panel === 'howto' && (
          <section className="overlay overlay--panel" aria-labelledby="titleHow">
            <p className="eyebrow">Tutorial</p>
            <h2 id="titleHow" className="panel-title">
              Cómo jugar
            </h2>
            <ol className="howto-list">
              <li>
                <strong>1.</strong> El bloque se mueve solo de lado a lado.
              </li>
              <li>
                <strong>2.</strong> Toca, haz click o pulsa <strong>Espacio</strong> para soltarlo.
              </li>
              <li>
                <strong>3.</strong> Si no cae alineado se corta. Si fallas del todo: Game Over. ¡Los
                perfectos dan combo y puntos extra!
              </li>
            </ol>
            <button type="button" className="btn btn--primary" onClick={() => play('clasico')}>
              Entendido, jugar
            </button>
            <button type="button" className="btn btn--ghost" onClick={irMenu} style={{ marginTop: 10 }}>
              Menú
            </button>
          </section>
        )}

        {panel === 'records' && (
          <section className="overlay overlay--panel" aria-labelledby="titleRecords">
            <p className="eyebrow">Top 10 · este dispositivo</p>
            <h2 id="titleRecords" className="panel-title">
              Récords
            </h2>
            {records.length === 0 ? (
              <p className="records-empty">Aún no hay puntuaciones.</p>
            ) : (
              <div className="records-wrap">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Score</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={`${r.nombre}-${r.fecha}-${i}`} className={i === 0 ? 'is-top' : undefined}>
                        <td>{i + 1}</td>
                        <td>{r.nombre}</td>
                        <td>{r.score}</td>
                        <td>{formatearFecha(r.fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => play()}>
                Jugar
              </button>
              <button type="button" className="btn btn--ghost" onClick={irMenu}>
                Menú
              </button>
            </div>
          </section>
        )}

        {panel === 'ranking' && (
          <section className="overlay overlay--panel" aria-labelledby="titleRank">
            <p className="eyebrow">Global · servidor</p>
            <h2 id="titleRank" className="panel-title">
              Online
            </h2>
            {ranking.length === 0 ? (
              <p className="records-empty">Sin datos aún o sin conexión al servidor.</p>
            ) : (
              <div className="records-wrap">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Score</th>
                      <th>Modo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.slice(0, 15).map((r, i) => (
                      <tr key={`${r.nombre}-${r.fecha}-${i}`} className={i === 0 ? 'is-top' : undefined}>
                        <td>{i + 1}</td>
                        <td>{r.nombre}</td>
                        <td>{r.score}</td>
                        <td>
                          {r.modo === 'diario' ? 'Diario' : etiquetaDificultad(r.dificultad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="btn-row">
              <button type="button" className="btn btn--ghost" onClick={() => void verRanking()}>
                Actualizar
              </button>
              <button type="button" className="btn btn--ghost" onClick={irMenu}>
                Menú
              </button>
            </div>
          </section>
        )}

        {panel === 'logros' && (
          <section className="overlay overlay--panel" aria-labelledby="titleAch">
            <p className="eyebrow">Colección</p>
            <h2 id="titleAch" className="panel-title">
              Logros
            </h2>
            <ul className="ach-list">
              {ACHIEVEMENTS.map((a) => {
                const on = logros.includes(a.id);
                return (
                  <li key={a.id} className={`ach-item${on ? ' is-on' : ''}`}>
                    <strong>{a.titulo}</strong>
                    <span>{a.desc}</span>
                    <em>{on ? '✓' : '·'}</em>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn--ghost" onClick={irMenu}>
              Menú
            </button>
          </section>
        )}

        {panel === 'ajustes' && (
          <section className="overlay overlay--panel" aria-labelledby="titleSet">
            <p className="eyebrow">Opciones</p>
            <h2 id="titleSet" className="panel-title">
              Ajustes
            </h2>

            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.sonido}
                onChange={(e) => applySettings({ ...settings, sonido: e.target.checked })}
              />
              Sonido
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.vibracion}
                onChange={(e) => applySettings({ ...settings, vibracion: e.target.checked })}
              />
              Vibración
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.anuncios}
                onChange={(e) => applySettings({ ...settings, anuncios: e.target.checked })}
              />
              Mostrar espacio de anuncio
            </label>

            <p className="section-label">Skin de bloques</p>
            <div className="chip-row">
              {SKINS.map((sk) => {
                const unlocked = skinDesbloqueada(sk.id, hud.best || mundoRef.current.best);
                return (
                  <button
                    key={sk.id}
                    type="button"
                    disabled={!unlocked}
                    className={`chip${settings.skin === sk.id ? ' is-on' : ''}`}
                    title={unlocked ? sk.desc : `Bloqueada: ${sk.desc}`}
                    onClick={() => unlocked && applySettings({ ...settings, skin: sk.id })}
                  >
                    {sk.nombre}
                    {!unlocked ? ' 🔒' : ''}
                  </button>
                );
              })}
            </div>
            <p className="hint">Madera ≥15 · Hielo ≥30 (best score)</p>

            <button type="button" className="btn btn--ghost" onClick={irMenu} style={{ marginTop: 16 }}>
              Menú
            </button>
          </section>
        )}

        {panel === 'paused' && (
          <section className="overlay overlay--over">
            <h2 className="panel-title">Pausa</h2>
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={togglePausa}>
                Continuar
              </button>
              <button type="button" className="btn btn--ghost" onClick={irMenu}>
                Menú
              </button>
            </div>
            <p className="hint">Esc o P para pausar / reanudar</p>
          </section>
        )}

        {panel === 'over' && (
          <section className="overlay overlay--over overlay--scroll" aria-labelledby="titleOver">
            <p className="eyebrow">Fin de partida</p>
            <h2 id="titleOver" className="over-title">
              Game Over
            </h2>
            <div className="over-stats">
              <div className="stat">
                <span className="stat-label">Score</span>
                <span className="stat-value">{hud.score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Best</span>
                <span className="stat-value">{hud.best}</span>
              </div>
            </div>
            <p className="over-msg">{hud.overMsg}</p>

            {puedeGuardar && !guardado && (
              <form className="save-form" onSubmit={(e) => void guardarLocalYOnline(e)}>
                <label className="save-label" htmlFor="nombreRecord">
                  Guarda tu récord
                </label>
                <div className="save-row">
                  <input
                    id="nombreRecord"
                    className="save-input"
                    type="text"
                    maxLength={12}
                    placeholder="Tu nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="nickname"
                  />
                  <button type="submit" className="btn btn--mint">
                    Guardar
                  </button>
                </div>
              </form>
            )}
            {!puedeGuardar && !guardado && hud.score > 0 && (
              <form className="save-form" onSubmit={(e) => void guardarLocalYOnline(e)}>
                <label className="save-label" htmlFor="nombreOnline">
                  Subir al ranking online
                </label>
                <div className="save-row">
                  <input
                    id="nombreOnline"
                    className="save-input"
                    type="text"
                    maxLength={12}
                    placeholder="Tu nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="nickname"
                  />
                  <button type="submit" className="btn btn--mint">
                    Subir
                  </button>
                </div>
              </form>
            )}
            {guardado && (
              <p className="save-ok">
                ¡Guardado!{onlineOk ? ' También en ranking online.' : ''}
              </p>
            )}

            <div className="btn-row">
              <button type="button" className="btn btn--ghost" onClick={() => void onShare()}>
                Compartir
              </button>
            </div>
            {shareMsg && <p className="hint">{shareMsg}</p>}

            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => play()}>
                Otra vez
              </button>
              <button type="button" className="btn btn--ghost" onClick={verRecords}>
                Récords
              </button>
              <button type="button" className="btn btn--ghost" onClick={irMenu}>
                Menú
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className={`footer-hint${panel === 'playing' ? ' is-visible' : ''}`}>
        <span>Espacio o toque · P / Esc pausa</span>
      </footer>

      {settings.anuncios && (
        <aside className="ad-slot" aria-label="Espacio publicitario">
          <span className="ad-label">Anuncio</span>
          <span className="ad-copy">Espacio para tu red de anuncios (AdSense / portal)</span>
        </aside>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t, i) => (
          <div key={`${t}-${i}`} className="toast">
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
