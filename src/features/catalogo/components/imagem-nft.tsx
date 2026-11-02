import type { ComponentProps } from 'react';

type PropsImagemNft = Omit<ComponentProps<'img'>, 'src' | 'srcSet'> & {
  url: string;
  sizes: string;
};

// ====================================================================
// 1. IMAGEM RESPONSIVA
// O navegador escolhe entre 320, 640 e 960 px de largura pelo tamanho
// exibido. Largura e altura reservam o espaço e evitam salto de layout.
// Imagem que só aparece em um layout usa 1px no outro: escondida, ela ainda
// é baixada, e assim fica com o menor arquivo em vez de competir com o LCP.
// ====================================================================
export function ImagemNft({ url, sizes, alt = '', ...props }: PropsImagemNft) {
  const base = url.replace(/-\d+\.webp$/, '');

  return (
    <img
      src={`${base}-640.webp`}
      srcSet={`${base}-320.webp 320w, ${base}-640.webp 640w, ${base}-960.webp 960w`}
      sizes={sizes}
      alt={alt}
      {...props}
    />
  );
}
