# Auditoria Lighthouse

Mediana de 3 medições por página e perfil. Em negrito: abaixo da meta (Performance e SEO 90; Accessibility e Best Practices 95).

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | **84** | 100 | 100 | 100 | 3992 ms | 0.001 | 82 ms |
| inicio | desktop | 98 | 100 | 100 | 100 | 1079 ms | 0.002 | 0 ms |
| detalhe | mobile | **84** | 100 | 100 | 100 | 3947 ms | 0.040 | 34 ms |
| detalhe | desktop | 98 | 100 | 100 | 100 | 1080 ms | 0.000 | 0 ms |

## Condições

- Lighthouse 13.6.0 (no projeto: ^13.6.0).
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/144.0.0.0 Safari/537.36.
- Node v24.14.0, Windows_NT 10.0.26100, 16 núcleos.
- Build otimizado (`npm run build`) servido por `vite preview`, cenário padrão dos mocks, navegador novo a cada medição.
- Perfis padrão do Lighthouse: mobile com limitação simulada de rede e CPU; desktop com a configuração `desktopConfig`.
