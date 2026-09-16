import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {
  agregarAlRanking,
  cargarRanking,
  cargarStats,
  limpiarNombre,
  rateOk,
  registrarEvento,
  validarScore,
  type Dificultad,
  type ModoJuego,
} from './store';

const PUERTO = Number(process.env.PORT || process.env.PUERTO || 3012);
const DIFFS: Dificultad[] = ['facil', 'normal', 'dificil'];
const MODOS: ModoJuego[] = ['clasico', 'diario'];

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: true }));
app.use(express.json({ limit: '16kb' }));

app.get('/health', (_req, res) => {
  res.json({ estado: 'ok', servicio: 'block-rush', version: '1.1.0' });
});

app.get('/api/ranking', (_req, res) => {
  res.json({ ranking: cargarRanking().slice(0, 20) });
});

app.post('/api/ranking', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!rateOk(ip, 20, 60_000)) {
    return res.status(429).json({ error: 'Demasiados envíos. Espera un momento.' });
  }

  const nombre = limpiarNombre(req.body?.nombre);
  const score = validarScore(req.body?.score);
  const dificultad = req.body?.dificultad as Dificultad;
  const modo = req.body?.modo as ModoJuego;

  if (score == null) {
    return res.status(400).json({ error: 'Score inválido' });
  }
  if (!DIFFS.includes(dificultad) || !MODOS.includes(modo)) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  const ranking = agregarAlRanking({
    nombre,
    score,
    dificultad,
    modo,
    fecha: Date.now(),
  });
  registrarEvento('ranking_post');
  res.json({ ranking: ranking.slice(0, 20) });
});

app.get('/api/stats', (_req, res) => {
  const s = cargarStats();
  res.json({
    partidas: s.partidas,
    eventos: s.eventos,
    ultimaVisita: s.ultimaVisita,
  });
});

app.post('/api/stats/event', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!rateOk(`stats:${ip}`, 60, 60_000)) {
    return res.status(429).json({ ok: false });
  }
  const evento = typeof req.body?.evento === 'string' ? req.body.evento.slice(0, 40) : '';
  if (!evento || !/^[a-z0-9_]+$/i.test(evento)) {
    return res.status(400).json({ ok: false });
  }
  const s = registrarEvento(evento);
  res.json({ ok: true, partidas: s.partidas });
});

const portadaDir = path.join(__dirname, '..', '..', 'portada-juego');
if (fs.existsSync(portadaDir)) {
  app.use('/portada-juego', express.static(portadaDir, { maxAge: '7d' }));
}

const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (req, res, next) => {
    if (req.path === '/health' || req.path.startsWith('/api') || req.path.startsWith('/portada-juego')) {
      return next();
    }
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  console.warn('No está client/dist. En producción corre: npm run build');
}

app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Block Rush en http://localhost:${PUERTO}`);
});
