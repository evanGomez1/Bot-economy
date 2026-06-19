# Bot Economy — Discord Role Bot

Bot de Discord que escucha los logs de compra de **UnbelievaBoat** y asigna roles automáticamente al usuario que realizó la compra.

## Instalación

```bash
npm install
# o
pnpm install
```

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

| Variable                    | Descripción                                          |
|-----------------------------|------------------------------------------------------|
| `DISCORD_BOT_TOKEN`         | Token del bot de Discord                             |
| `DISCORD_GUILD_ID`          | ID del servidor de Discord                           |
| `DISCORD_LOG_CHANNEL_ID`    | ID del canal donde UnbelievaBoat envía los logs      |
| `DISCORD_PURCHASE_CHANNEL_ID` | ID del canal donde el bot enviará confirmaciones   |
| `PORT`                      | Puerto del servidor HTTP (default: 3000)             |

## Uso

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm run build
npm run start
```

## Estructura

```
src/
├── bot/
│   ├── bot.ts          # Lógica del bot: parsing, asignación de roles, embeds
│   ├── config.ts       # Variables de entorno y validación
│   └── shopRoles.ts    # Mapa artículo de tienda → ID(s) de rol
├── lib/
│   └── logger.ts       # Logger con pino
├── routes/
│   ├── health.ts       # GET /api/healthz
│   └── index.ts        # Router principal
├── app.ts              # Configuración de Express
└── index.ts            # Entry point
```

## Agregar nuevos artículos

Edita `src/bot/shopRoles.ts`. El nombre debe coincidir **exactamente** (sin el emoji) con el que aparece en el embed de UnbelievaBoat:

```ts
"Nombre del Artículo": "ID_DEL_ROL",

// Para asignar múltiples roles con un artículo:
"Bundle Deal": ["ID_ROL_1", "ID_ROL_2"],
```

## Repositorio

https://github.com/evanGomez1/Bot-economy
