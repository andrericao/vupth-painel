# vupth-painel

O painel de operação do Andre (equipe Painel, prefixo ADM). Expo web + NativeWind, o mesmo Backend dos apps.

- `npm run web` — abre no navegador (staging; `EXPO_PUBLIC_API_ENV=prod` para a produção)
- `npm run build:web` — gera o `dist/` (Cloudflare Pages; `public/_redirects` manda tudo para o index)
- `npm test`, `npm run lint`, `npm run typecheck` — o pre-push roda os três (cobertura de 98%)

Regras e fila: `../vupth-docs` (aba Painel).
