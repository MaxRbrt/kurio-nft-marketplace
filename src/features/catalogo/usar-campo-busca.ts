import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

const ESPERA_DIGITACAO_MS = 300;

// ====================================================================
// 1. CAMPO DE BUSCA
// Só envia quando o usuário digita, depois de uma pausa e com replace:
// uma palavra não vira dez entradas de histórico. Os campos desktop e
// mobile existem juntos, e um não pode desfazer a busca do outro.
// ====================================================================
export function useCampoBusca() {
  const navigate = useNavigate();
  const buscaAtual = useSearch({ strict: false }).busca ?? '';
  const [texto, setTexto] = useState(buscaAtual);
  const [buscaAnterior, setBuscaAnterior] = useState(buscaAtual);
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (buscaAtual !== buscaAnterior) {
    setBuscaAnterior(buscaAtual);
    setTexto(buscaAtual);
  }

  useEffect(() => () => clearTimeout(espera.current), []);

  function alterarTexto(novoTexto: string) {
    setTexto(novoTexto);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      void navigate({
        to: '/',
        search: (anterior) => ({ ...anterior, busca: novoTexto || undefined, pagina: undefined }),
        replace: true,
      });
    }, ESPERA_DIGITACAO_MS);
  }

  return { texto, alterarTexto };
}
