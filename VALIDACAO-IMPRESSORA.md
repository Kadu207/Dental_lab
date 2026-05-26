# Validacao fisica — Zebra ZD230 / 100x50 mm

Execute na ordem. Stack: `docker compose -f docker-compose.standalone.yml up -d` em **dental-lab-system**.

## 1. Gerar etiqueta de teste (HTML)

**Opcao A — pasta irma dental-lab-system:**

```powershell
cd "C:\Users\Carlos\OneDrive\Área de Trabalho\Projetos DEV\dental-lab-system"
powershell -File .\infra\ops\print-test.ps1 -BaseUrl http://127.0.0.1:9180
```

**Opcao B — a partir do Excellence_Dental:**

```powershell
cd "C:\Users\Carlos\OneDrive\Área de Trabalho\Projetos DEV\Excellence_Dental"
powershell -File .\infra\ops\lab-print-test.ps1
```

**Opcao C — UI:** http://127.0.0.1:9180/configuracao → **Imprimir etiqueta de teste (3 vias)**

O navegador abre HTML com codigo `PROT-AAAAMMDD-TEST` e 3 vias (Lab / Clinica / Paciente).

## 2. Imprimir na Zebra ZD230

No dialogo **Imprimir** (Chrome/Edge):

| Opcao | Valor |
|--------|--------|
| Impressora | Zebra ZD230 |
| Tamanho do papel | **100 mm x 50 mm** (personalizado) |
| Orientacao | Paisagem (100 mm = largura do rolo) |
| Margens | **Nenhuma** |
| Escala | **100%** (desativar "Ajustar a pagina") |
| Graficos de fundo | **Ativado** (faixas coloridas das vias) |

Imprima **3 paginas** (uma por via).

## 3. Checklist visual (marque na etiqueta)

- [ ] Texto sem corte nas bordas superior/inferior
- [ ] Code128 legivel ( barras nao cortadas )
- [ ] Faixas azul / verde / roxo no topo
- [ ] Logo ou iniciais legiveis

Se cortar 1-2 mm: driver Zebra → **Top of form +1 mm** ou nos comentarios envie **foto** da etiqueta para ajuste em `packages/labels`.

## 4. Validar leitor USB

O codigo da etiqueta de **teste** (`PROT-...-TEST`) **nao** esta no banco — e so calibracao visual.

Para testar o **Leitor**:

1. **Próteses** → registre uma protese real → **Imprimir 3 vias**
2. Abra **Leitor de Codigo de Barras**
3. Escaneie o codigo `PROT-...` da etiqueta impressa
4. Confirme avanco de status

Ou simule digitando o codigo no campo e pressionando Enter.

## 5. Proximo passo se OK

Atualize `PRODUCAO-CHECKLIST.md` secao 5 (checklist fisico) e marque Fase 3 impressora como validada em `ETAPAS-DO-PROJETO.md`.
