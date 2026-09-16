# Block Rush

Juego arcade de apilar bloques. Misma base que **Kroma** y **Jaque**:

- Cliente: **React + TypeScript + Vite**
- Servidor: **Express** (`/health`, ranking online, analytics)
- Listo para **Render**

## Funciones

- Menú: Jugar, Diario, Cómo jugar, Récords, Online, Logros, Ajustes
- Dificultad Fácil / Normal / Difícil
- Combo perfecto (+puntos extra)
- Sonido + vibración
- Skins Neón / Madera / Hielo (desbloqueo por best)
- Pausa (P / Esc)
- Compartir score
- Ranking local + online
- Espacio de anuncios (se puede ocultar en Ajustes)
- Eventos básicos en `/api/stats`

## Controles

| Acción | Entrada |
|--------|---------|
| Soltar | Click, toque o **Espacio** |
| Pausa | Botón, **P** o **Esc** |
| Reiniciar | **Otra vez** o **R** |

## Desarrollo

```bash
cd C:\BlockRush
npm --prefix server install
npm --prefix client install
npm run dev
```

- Juego: http://localhost:5176  
- Health: http://localhost:3012/health  
- Ranking: http://localhost:3012/api/ranking  

## Producción / Render

```bash
npm run build
npm start
```

`render.yaml` ya apunta a `npm run build` + `npm start` + health `/health`.
