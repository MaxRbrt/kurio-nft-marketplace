# Auditoria Lighthouse

Mediana de 3 medições por página e perfil. Em negrito: abaixo da meta (Performance e SEO 90; Accessibility e Best Practices 95).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | 92 | 100 | 100 | 100 | 3229 ms | 0.000 | 103 ms |
| inicio | desktop | 99 | 100 | 100 | 100 | 914 ms | 0.000 | 0 ms |
| detalhe | mobile | 92 | 100 | 100 | 100 | 3222 ms | 0.000 | 79 ms |
| detalhe | desktop | 99 | 100 | 100 | 100 | 911 ms | 0.000 | 0 ms |

## Condições

- Lighthouse 13.6.0 (no projeto: ^13.6.0).
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36.
- Node v24.14.0, Windows_NT 10.0.26100, 16 núcleos.
- Build otimizado (`npm run build`) servido por `vite preview`, cenário padrão dos mocks, navegador novo a cada medição.
- Perfis padrão do Lighthouse: mobile com limitação simulada de rede e CPU; desktop com a configuração `desktopConfig`.
