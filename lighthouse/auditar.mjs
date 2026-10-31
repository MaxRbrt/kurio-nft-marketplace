// ====================================================================
// 1. AUDITORIA LIGHTHOUSE
// Três medições por página e perfil, sobre o build otimizado e o cenário
// padrão dos mocks. Entrega HTML e JSON de cada uma e a mediana em
// lighthouse/relatorios/resumo.md, com versões e condições de execução.
// ====================================================================
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launch } from 'chrome-launcher';
import lighthouse, { desktopConfig } from 'lighthouse';

const PORTA = 4173;
const BASE = `http://localhost:${PORTA}`;
const MEDICOES = 3;
const PASTA = path.resolve('lighthouse/relatorios');
const PAGINAS = [
  { nome: 'inicio', caminho: '/' },
  { nome: 'detalhe', caminho: '/nfts/nft-01' },
];
const PERFIS = [
  { nome: 'mobile', config: undefined },
  { nome: 'desktop', config: desktopConfig },
];
const CATEGORIAS = ['performance', 'accessibility', 'best-practices', 'seo'];
const METAS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 };

function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);

  return ordenados[Math.floor(ordenados.length / 2)];
}

function encerrarServidor(servidor) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(servidor.pid), '/T', '/F']);

    return;
  }

  servidor.kill();
}

async function esperarServidor() {
  for (let tentativa = 0; tentativa < 60; tentativa += 1) {
    try {
      await fetch(BASE);

      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error('O preview não respondeu.');
}

// ====================================================================
// 2. MEDIÇÃO
// Navegador novo a cada medição, sem cache nem dados de sessão anteriores.
// ====================================================================
async function medir(pagina, perfil, indice) {
  const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });

  try {
    const resultado = await lighthouse(
      `${BASE}${pagina.caminho}`,
      {
        port: chrome.port,
        output: ['html', 'json'],
        logLevel: 'error',
        onlyCategories: CATEGORIAS,
      },
      perfil.config,
    );
    const base = path.join(PASTA, `${pagina.nome}-${perfil.nome}-${indice}`);

    await writeFile(`${base}.html`, resultado.report[0]);
    await writeFile(`${base}.json`, resultado.report[1]);

    const { categories, audits } = resultado.lhr;

    return {
      notas: Object.fromEntries(
        CATEGORIAS.map((categoria) => [categoria, Math.round(categories[categoria].score * 100)]),
      ),
      lcp: audits['largest-contentful-paint'].numericValue,
      cls: audits['cumulative-layout-shift'].numericValue,
      tbt: audits['total-blocking-time'].numericValue,
      versao: resultado.lhr.lighthouseVersion,
      chrome: resultado.lhr.environment.hostUserAgent,
    };
  } finally {
    await chrome.kill();
  }
}

// ====================================================================
// 3. RESUMO
// Mediana por categoria, com LCP, CLS e TBT. Abaixo da meta fica marcado,
// e a análise das causas está no ARCHITECTURE.md.
// ====================================================================
async function principal() {
  await mkdir(PASTA, { recursive: true });

  const servidor = spawn('npx', ['vite', 'preview', '--port', String(PORTA), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
  });
  const linhas = [];
  let versao = '';
  let navegador = '';

  try {
    await esperarServidor();

    for (const pagina of PAGINAS) {
      for (const perfil of PERFIS) {
        const medicoes = [];

        for (let indice = 1; indice <= MEDICOES; indice += 1) {
          medicoes.push(await medir(pagina, perfil, indice));
          console.log(`${pagina.nome} ${perfil.nome} ${indice}: ok`);
        }

        versao = medicoes[0].versao;
        navegador = medicoes[0].chrome;

        const notas = CATEGORIAS.map((categoria) => {
          const nota = mediana(medicoes.map(({ notas: valores }) => valores[categoria]));

          return nota >= METAS[categoria] ? `${nota}` : `**${nota}**`;
        });

        linhas.push(
          `| ${pagina.nome} | ${perfil.nome} | ${notas.join(' | ')} | ${Math.round(
            mediana(medicoes.map(({ lcp }) => lcp)),
          )} ms | ${mediana(medicoes.map(({ cls }) => cls)).toFixed(3)} | ${Math.round(
            mediana(medicoes.map(({ tbt }) => tbt)),
          )} ms |`,
        );
      }
    }
  } finally {
    encerrarServidor(servidor);
  }

  const pacote = JSON.parse(await readFile('package.json', 'utf8'));
  const resumo = [
    '# Auditoria Lighthouse',
    '',
    'Mediana de 3 medições por página e perfil. Em negrito: abaixo da meta (Performance e SEO 90; Accessibility e Best Practices 95).',
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...linhas,
    '',
    '## Condições',
    '',
    `- Lighthouse ${versao} (no projeto: ${pacote.devDependencies.lighthouse}).`,
    `- Navegador: ${navegador}.`,
    `- Node ${process.version}, ${os.type()} ${os.release()}, ${os.cpus().length} núcleos.`,
    '- Build otimizado (`npm run build`) servido por `vite preview`, cenário padrão dos mocks, navegador novo a cada medição.',
    '- Perfis padrão do Lighthouse: mobile com limitação simulada de rede e CPU; desktop com a configuração `desktopConfig`.',
    '',
  ].join('\n');

  await writeFile(path.join(PASTA, 'resumo.md'), resumo);
  console.log(resumo);
  process.exit(0);
}

await principal();
