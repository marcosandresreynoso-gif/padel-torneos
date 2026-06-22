const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- Base de datos ----------
const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, 'torneo.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS parejas (
  id TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  nombre1 TEXT NOT NULL,
  nombre2 TEXT,
  horario TEXT,
  creado_en INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cuadros (
  categoria TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  actualizado_en INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`);

// ---------- Helpers ----------
const CATEGORIAS = ['8va', '7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'];

function nowId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ---------- API: Parejas ----------

// Listar todas las parejas, agrupadas por categoría
app.get('/api/parejas', (req, res) => {
  const rows = db.prepare('SELECT * FROM parejas ORDER BY creado_en ASC').all();
  const agrupado = {};
  CATEGORIAS.forEach(c => { agrupado[c] = []; });
  rows.forEach(r => {
    if (!agrupado[r.categoria]) agrupado[r.categoria] = [];
    agrupado[r.categoria].push(r);
  });
  res.json(agrupado);
});

// Crear pareja
app.post('/api/parejas', (req, res) => {
  const { categoria, nombre1, nombre2, horario } = req.body;
  if (!categoria || !CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }
  if (!nombre1 || !nombre1.trim()) {
    return res.status(400).json({ error: 'Falta el nombre del jugador 1' });
  }
  const id = nowId(categoria);
  const creado_en = Date.now();
  db.prepare(
    'INSERT INTO parejas (id, categoria, nombre1, nombre2, horario, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, categoria, nombre1.trim(), (nombre2 || '').trim() || null, (horario || '').trim() || null, creado_en);
  res.json({ id, categoria, nombre1: nombre1.trim(), nombre2: (nombre2 || '').trim() || null, horario: (horario || '').trim() || null, creado_en });
});

// Eliminar pareja
app.delete('/api/parejas/:id', (req, res) => {
  db.prepare('DELETE FROM parejas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Ascender pareja a otra categoría (manual)
app.post('/api/parejas/:id/ascender', (req, res) => {
  const { categoriaDestino } = req.body;
  if (!CATEGORIAS.includes(categoriaDestino)) {
    return res.status(400).json({ error: 'Categoría destino inválida' });
  }
  const pareja = db.prepare('SELECT * FROM parejas WHERE id = ?').get(req.params.id);
  if (!pareja) return res.status(404).json({ error: 'Pareja no encontrada' });

  const nuevoId = nowId(categoriaDestino);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM parejas WHERE id = ?').run(pareja.id);
    db.prepare(
      'INSERT INTO parejas (id, categoria, nombre1, nombre2, horario, creado_en) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(nuevoId, categoriaDestino, pareja.nombre1, pareja.nombre2, pareja.horario, Date.now());
    // El cuadro viejo de la categoría de origen queda obsoleto
    db.prepare('DELETE FROM cuadros WHERE categoria = ?').run(pareja.categoria);
  });
  tx();
  res.json({ ok: true, nuevoId, categoriaDestino });
});

// ---------- API: Cuadros ----------

// Obtener cuadro de una categoría (formato libre: el cliente decide la estructura interna)
app.get('/api/cuadros/:categoria', (req, res) => {
  const row = db.prepare('SELECT * FROM cuadros WHERE categoria = ?').get(req.params.categoria);
  if (!row) return res.json({ categoria: req.params.categoria, rondas: [] });
  const data = JSON.parse(row.data);
  res.json({ categoria: req.params.categoria, ...data });
});

// Guardar/sortear cuadro de una categoría (acepta cualquier estructura JSON del cliente)
app.put('/api/cuadros/:categoria', (req, res) => {
  const categoria = req.params.categoria;
  // Guardamos todo el body tal cual (puede tener rondas, o tipo+grupos+cuadroFinal)
  const { categoria: _omit, ...resto } = req.body || {};
  const data = JSON.stringify(resto);
  const actualizado_en = Date.now();
  db.prepare(
    `INSERT INTO cuadros (categoria, data, actualizado_en) VALUES (?, ?, ?)
     ON CONFLICT(categoria) DO UPDATE SET data = excluded.data, actualizado_en = excluded.actualizado_en`
  ).run(categoria, data, actualizado_en);
  res.json({ ok: true });
});

// Eliminar cuadro (volver a sortear desde cero)
app.delete('/api/cuadros/:categoria', (req, res) => {
  db.prepare('DELETE FROM cuadros WHERE categoria = ?').run(req.params.categoria);
  res.json({ ok: true });
});

// ---------- API: Configuración general del club ----------
app.get('/api/config', (req, res) => {
  const row = db.prepare("SELECT valor FROM config WHERE clave = 'cantidadCanchas'").get();
  res.json({ cantidadCanchas: row ? parseInt(row.valor, 10) : 1 });
});

app.put('/api/config', (req, res) => {
  const { cantidadCanchas } = req.body;
  const n = Math.max(1, Math.min(5, parseInt(cantidadCanchas, 10) || 1));
  db.prepare(
    `INSERT INTO config (clave, valor) VALUES ('cantidadCanchas', ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(String(n));
  res.json({ cantidadCanchas: n });
});

// ---------- Salud (para Render / cron-job keep-alive) ----------
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- Estáticos (frontend) ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de torneo de padel corriendo en puerto ${PORT}`);
});
