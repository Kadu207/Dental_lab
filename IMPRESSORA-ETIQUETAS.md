# Impressora e etiquetas 100×50 mm

## Melhor modelo recomendado

### **Zebra ZD230** (203 dpi, 4" / ~104 mm) — primeira escolha

| Critério | Detalhe |
|----------|---------|
| **Por que esta** | Largura útil ~104 mm (cobre 100 mm), Code128 nativo, driver maduro no Windows, suporte global |
| **Versão sugerida** | **ZD23042-30AC00EZ** — USB + Ethernet (rede ajuda se vários PCs imprimem) |
| **Resolução** | 203 dpi (ideal para texto 7–8 pt + barcode 10 mm de altura) |
| **Faixa de preço BR** | ~R$ 2.000–2.600 (revendas Bz Tech, Papelecia, eShop, R2 Barcode) |
| **Etiquetas** | Bobina térmica **100 mm × 50 mm**, gap conforme manual (geralmente 2–3 mm) |
| **Ribbon** | Modo **térmico direto** (sem ribbon) para etiquetas coated/thermal |

**Alternativas válidas**

| Modelo | Quando escolher |
|--------|-----------------|
| **Zebra ZD220** | Mesma família, às vezes mais barata; mesmas configurações |
| **Elgin L42 Pro / L42DT** | Prioridade suporte e assistência no Brasil |
| **TSC TE244** | Boa durabilidade em volume médio |

**Não recomendado para 100×50 mm**

- **Brother QL-820NWB** e similares (largura máx. ~62 mm) — só se mudarem o layout para `termica_50x30`.

---

## Configuração no Windows (Zebra ZD230)

1. Instalar **Zebra Setup Utilities** ou driver oficial **ZDesigner ZD230-203dpi ZPL**.
2. Criar tamanho de papel personalizado: **100 mm × 50 mm** (paisagem).
3. Preferências da impressora:
   - Método: **Direct Thermal**
   - Orientação: **Landscape** (100 mm = largura do rolo)
   - Margem: **0** em todos os lados
   - **Scale 100%** — desmarcar “Fit to page” / “Shrink oversized pages”
4. No Chrome/Edge (janela de impressão do sistema):
   - Destino: Zebra ZD230
   - Tamanho do papel: 100 × 50 mm
   - Margens: **Nenhuma**
   - Escala: **100%**
   - Gráficos de fundo: **ativado** (para faixas coloridas das vias)

---

## No Dental Lab System

1. **Configuração → Etiquetas / Empresa**: logo PNG/JPG (quadrado, ≥200×200 px).
2. Registrar prótese → **Imprimir 3 vias**.
3. São **3 páginas** (uma por via: Lab, Clínica, Paciente).
4. **Configuração → Imprimir etiqueta de teste** ou `pwsh ./infra/ops/print-test.ps1`.
5. Validar leitura no **Leitor de Código de Barras** com o mesmo `PROT-...`.

Tamanho na URL (API): `?tamanho=termica_100x50` (padrão).

---

## Ajustes de layout (maio/2026)

Calibrado em `packages/labels/src/labels.ts` para térmica 203 dpi:

- Área útil com padding reduzido (evita corte na borda inferior).
- Código de barras: altura ~10 mm, quiet zone lateral, fundo branco na impressão.
- Textos longos truncados / nome da amostra em até 2 linhas.
- `@page { size: 100mm 50mm; margin: 0 }` + cores exatas na impressão.

Se ainda cortar 1–2 mm: no driver Zebra, ative **Top of form adjustment** +1 mm ou reduza zoom para 98% **apenas** se necessário (preferir 100%).

---

## Checklist de validação com você

- [ ] Três vias impressas sem corte de texto ou barcode  
- [ ] Leitor USB lê `PROT-AAAAMMDD-XXXX` de qualquer via  
- [ ] Logo legível (não escuro demais)  
- [ ] Faixas azul / verde / roxo visíveis no topo  

Envie foto de uma etiqueta impressa + modelo exato da impressora se precisar de segunda calibração.
