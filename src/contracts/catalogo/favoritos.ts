import { z } from 'zod';

// ====================================================================
// 1. FAVORITOS
// A resposta é sempre a lista completa do usuário: serve à consulta,
// à inclusão, à remoção e à reconciliação depois do otimismo.
// ====================================================================
export const favoritosSchema = z.object({ nftIds: z.array(z.string()) });
export type Favoritos = z.infer<typeof favoritosSchema>;
