import { devices, type Project } from '@playwright/test';

// ====================================================================
// 1. APARELHOS DO TESTE DE RESPONSIVIDADE
// Os mesmos perfis do modo responsivo do DevTools (lista de aparelhos do
// Playwright): uma entrada por largura distinta de celular, tablet e
// dobrável, com a altura mais curta de cada largura, mais três celulares
// deitados. iPhone e iPad rodam
// no WebKit, que reproduz o Safari; Android, no Chromium. O enunciado
// pede no mínimo 390, 768 e 1440, todos incluídos. No desktop, as
// alturas são as de notebooks comuns, inclusive a baixa de 768 px. O
// 720 x 450 é o que uma tela de 1440 x 900 vira com zoom de 200%.
// ====================================================================
const APARELHOS = [
  'iPhone SE',
  'Galaxy S9+',
  'Pixel 4',
  'Galaxy S8',
  'Galaxy S24',
  'iPhone 8',
  'iPhone 13 Mini',
  'Nexus 4',
  'iPhone 14',
  'iPhone 15',
  'Pixel 5',
  'iPhone 17',
  'Pixel 7',
  'iPhone 11 Pro Max',
  'iPhone Air',
  'Pixel 9 Pro',
  'iPhone 14 Plus',
  'iPhone 15 Pro Max',
  'iPhone 17 Pro Max',
  'Pixel 9 Pro XL',
  'Galaxy A55',
  'Nexus 7',
  'Galaxy Tab S9',
  'iPad Mini',
  'iPad (gen 7)',
  'iPad Pro 11',
  'Galaxy Z Fold 6',
  'Galaxy Z Fold 7',
  'iPhone SE landscape',
  'iPhone 15 landscape',
  'Pixel 7 landscape',
];

const TELAS_DESKTOP = [
  { largura: 720, altura: 450 },
  { largura: 1024, altura: 768 },
  { largura: 1280, altura: 800 },
  { largura: 1440, altura: 900 },
];
const ARQUIVOS_RESPONSIVOS = /responsivo\/.*\.spec\.ts/;

export const PROJETOS_RESPONSIVOS: Project[] = [
  ...APARELHOS.map((aparelho) => ({
    name: `responsivo ${aparelho}`,
    testMatch: ARQUIVOS_RESPONSIVOS,
    use: { ...devices[aparelho] },
  })),
  ...TELAS_DESKTOP.map(({ largura, altura }) => ({
    name: `responsivo desktop ${largura}x${altura}`,
    testMatch: ARQUIVOS_RESPONSIVOS,
    use: { ...devices['Desktop Chrome'], viewport: { width: largura, height: altura } },
  })),
];
