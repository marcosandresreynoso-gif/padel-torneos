# Cuadro de Padel — MARTOKEN

App standalone para gestionar torneos de padel por categoría (8va a 1ra): carga manual de parejas, sorteo automático del cuadro completo (octavos, cuartos, semis, final) y ascenso manual de categoría. Datos guardados en SQLite en el propio servidor.

## Cómo subir esto a Render (sin usar terminal, todo desde el navegador)

### Paso 1 — Subir esta carpeta a GitHub

1. Entrá a [github.com](https://github.com) e iniciá sesión (la misma cuenta que usaste para tus otros proyectos).
2. Tocá el botón verde **"New"** (o el `+` arriba a la derecha → "New repository").
3. Nombre del repositorio: `padel-torneo` (o el que quieras).
4. Dejalo en **Public** o **Private**, como prefieras. No hace falta tildar "Add a README".
5. Tocá **"Create repository"**.
6. En la pantalla siguiente, buscá el link que dice **"uploading an existing file"**.
7. Arrastrá ahí TODOS los archivos y carpetas que te dejé en `/mnt/user-data/outputs/padel-torneo` (manteniendo la estructura: `server.js`, `package.json`, `.gitignore`, y la carpeta `public/` con `index.html` adentro).
8. Abajo escribí un mensaje como "Primera versión" y tocá **"Commit changes"**.

### Paso 2 — Crear el servicio en Render

1. Entrá a [render.com](https://render.com) e iniciá sesión.
2. Tocá **"New +"** → **"Web Service"**.
3. Conectá tu cuenta de GitHub si todavía no está conectada, y elegí el repositorio `padel-torneo` que acabás de crear.
4. Completá así:
   - **Name**: `padel-torneo` (esto define la URL, va a quedar algo como `padel-torneo.onrender.com`)
   - **Region**: la más cercana (Oregon o la que ya uses)
   - **Branch**: `main`
   - **Root Directory**: dejalo vacío
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Tocá **"Create Web Service"**.

Render va a instalar las dependencias y arrancar el servidor solo. Tarda 2-3 minutos la primera vez. Cuando termine, te da la URL pública (ej: `https://padel-torneo.onrender.com`) — esa es tu app, ya funcionando.

### Importante sobre el plan Free de Render

- El plan gratuito "duerme" el servicio si no recibe tráfico por 15 minutos. La primera visita después de eso tarda ~30-50 segundos en despertar (es normal, no es un error).
- Si querés evitar eso, podés usar el mismo truco que ya tenés en agente-mar: un ping periódico desde [cron-job.org](https://cron-job.org) a `https://TU-URL.onrender.com/api/health` cada 10 minutos.
- A diferencia de Netlify, **Render no tiene límite de "créditos de build"** en el plan gratis — el límite ahí es de horas de actividad mensuales del servicio, que para un torneo de uso puntual sobra de sobra.

### Importante sobre los datos guardados

La base SQLite (`db/torneo.db`) se guarda en el disco del servicio. **En el plan Free, Render no garantiza que ese disco persista para siempre** entre reinicios del servicio (no tiene "disco persistente" gratuito). Para una app de uso puntual durante un torneo esto normalmente no es problema, porque el servicio no se reinicia solo mientras está en uso. Si más adelante querés que los datos queden garantizados para siempre (por ejemplo, para llevar el historial de varios torneos y ascensos a través de meses), avisame y le agregamos un "Persistent Disk" de Render (tiene un costo bajo mensual) o migramos a una base de datos externa gratuita (por ejemplo Turso o Supabase).

## Estructura del proyecto

```
padel-torneo/
├── server.js          → backend Express + SQLite (toda la lógica del torneo)
├── package.json       → dependencias
├── public/
│   └── index.html     → frontend (React vía CDN, sin necesidad de build)
└── db/                 → acá se crea sola la base de datos al arrancar
```

## Cómo se usa

1. Elegís la categoría arriba (8va a 1ra).
2. Cargás nombre y apellido de cada jugador/a (y compañero si es pareja) + horario.
3. Tocás "Sortear cuadro" cuando ya cargaste todas las parejas de esa categoría — arma automáticamente todas las rondas, desde la primera hasta la final, sin importar cuántas parejas haya.
4. En la pestaña "Cuadro", tocás el nombre de la pareja ganadora de cada partido y avanza sola a la siguiente ronda. Podés cargar horario, cancha y resultado.
5. Desde "Participantes", el botón de flecha hacia arriba te deja ascender manualmente a una pareja a la categoría siguiente cuando vos lo decidas.

Todo queda guardado en el servidor — no depende del navegador ni del dispositivo, así que podés administrarlo desde el celu y desde la notebook indistintamente.
