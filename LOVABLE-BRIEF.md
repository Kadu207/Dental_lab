# Briefing Lovable — Dental Lab System

> **Como usar:** Copie a seção **PROMPT PARA LOVABLE** abaixo e cole no chat da Lovable para iniciar o projeto.  
> Este documento contém todas as especificações técnicas e de negócio.

---

## PROMPT PARA LOVABLE (copiar e colar)

```
Crie um sistema web completo para Clínica Odontológica + Laboratório de Próteses Dentais chamado "Dental Lab".

## Stack sugerida
- React + TypeScript + Tailwind CSS
- Supabase (auth, database, storage para logo)
- Design profissional: sidebar azul escuro (#1e3a5f), área principal clara (#f4f7fb)

## Módulos obrigatórios

### 1. Dashboard
- Cards: total de trabalhos, em produção, prontos, alertas de estoque
- Tabela dos trabalhos recentes com código, paciente, tipo, status

### 2. Clientes / Pacientes (CRUD)
Campos: nome*, CPF, telefone*, e-mail, endereço, observações
→ Nome e telefone aparecem na etiqueta

### 3. Fornecedores (CRUD)
Campos: razão social*, nome fantasia, CNPJ, telefone, e-mail, contato, endereço

### 4. Estoque / Matéria-prima (CRUD)
Campos: código*, descrição*, categoria, unidade, quantidade, estoque mínimo, fornecedor, preço, localização
- Alerta visual quando quantidade <= mínimo
- Movimentação entrada/saída

### 5. Registro de Próteses (CRUD)
Ao registrar gera automaticamente:
- Código único: PROT-AAAAMMDD-XXXX (ex: PROT-20260519-0042)
- Código de barras Code128 escaneável

Campos do formulário:
- Paciente (select do cadastro) *
- Dentista: nome*, CRO, clínica
- Nome Amostra (tipo/descrição do trabalho) *
- Elementos/dentes (opcional, compõe nome amostra)
- Data entrada * (vai na etiqueta)
- Cor, material, observações internas

Status com fluxo: Recebido → Em Produção → Prova → Acabamento → Pronto → Entregue
Botão "Imprimir 3 vias" abre página de impressão

### 6. Configuração — Etiquetas / Empresa
- Nome da empresa *
- Telefone, endereço
- Upload logo PNG/JPG (se vazio, exibe iniciais)
- Tabela explicando origem dos 7 campos da etiqueta

### 7. Leitor de Código de Barras
- Campo grande central (leitor USB emula teclado + Enter)
- Busca trabalho pelo código
- Mostra paciente, trabalho, status atual
- Botão "Avançar status" no fluxo
- Histórico de mudanças de status
- Reimprimir 3 vias

## ETIQUETA — ESPECIFICAÇÃO OFICIAL (100×50 mm)

Tamanho padrão: 100mm × 50mm (impressora térmica)
3 vias por trabalho (mesmo conteúdo, faixa colorida diferente):
- VIA 1 — LABORATÓRIO (faixa azul #1e3a5f)
- VIA 2 — CLÍNICA (faixa verde #2d6a4f)
- VIA 3 — PACIENTE (faixa roxo #7b2cbf)

Layout coluna única:
┌──────────────────────────────────────┐
│       VIA 1 — LABORATÓRIO            │
│ [LOGO]  Nome da Empresa              │
│──────────────────────────────────────│
│ Paciente:     Maria Silva Santos     │
│ Telefone:     (11) 98765-4321        │
│ Nº Amostra:   PROT-20260519-0042     │
│ Nome Amostra: Coroa Zircônia — Elem 16│
│ Data:         19/05/2026             │
│ ┌──────────────────────────────────┐ │
│ │     [ CÓDIGO DE BARRAS Code128 ] │ │
│ │     PROT-20260519-0042           │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘

Campos da etiqueta:
| Campo | Origem |
| Logo | Config empresa (PNG/JPG ou iniciais) |
| Paciente | clientes.nome |
| Telefone | clientes.telefone |
| Nº Amostra | proteses.codigo (auto) |
| Nome Amostra | tipo_protese + elementos |
| Data | data_entrada |
| Código barras | Code128 do codigo |

Impressão: cada via em página separada (@page 100mm 50mm), botão imprimir no navegador.

## Menu lateral
- Dashboard
- Clientes
- Fornecedores
- Estoque
- Próteses
- Etiquetas / Empresa
- Leitor Código de Barras

## Idioma
Português (Brasil), datas dd/mm/aaaa

## Prioridade de entrega
1. Cadastros + Próteses + Etiqueta 100×50mm 3 vias
2. Leitor código de barras + fluxo status
3. Config logo empresa
4. Dashboard e alertas estoque

Interface limpa, profissional, responsiva. Modais para formulários CRUD.
```

---

## CONTEXTO DO PROJETO

| Item | Detalhe |
|------|---------|
| **Nome** | Dental Lab System |
| **Tipo** | SaaS interno — clínica + laboratório protético |
| **Usuários** | Recepção, laboratório, gestão |
| **Idioma** | Português (BR) |
| **Projeto origem** | `C:\Users\carlo\projects\dental-lab-system` |
| **Retorno previsto** | Integrar código Lovable de volta ao monorepo local |

---

## ARQUITETURA ATUAL (referência local)

```
dental-lab-system/
├── packages/labels/     ← Módulo etiquetas (@dental/labels)
├── apps/api/            ← Express + SQLite
└── apps/web/            ← React + Vite
```

**Na Lovable:** usar Supabase em vez de SQLite. Manter mesma lógica de negócio.

---

## BANCO DE DADOS (schema Supabase)

### `clientes`
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | uuid PK | sim |
| nome | text | sim |
| cpf | text | |
| telefone | text | sim (etiqueta) |
| email | text | |
| endereco | text | |
| observacoes | text | |
| created_at | timestamptz | sim |

### `fornecedores`
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | uuid PK | sim |
| razao_social | text | sim |
| nome_fantasia | text | |
| cnpj | text | |
| telefone | text | |
| email | text | |
| contato | text | |
| endereco | text | |
| observacoes | text | |
| created_at | timestamptz | sim |

### `estoque`
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | uuid PK | sim |
| codigo | text UNIQUE | sim |
| descricao | text | sim |
| categoria | text | default 'Geral' |
| unidade | text | default 'un' |
| quantidade | numeric | default 0 |
| quantidade_minima | numeric | default 0 |
| fornecedor_id | uuid FK | |
| preco_unitario | numeric | |
| localizacao | text | |
| created_at | timestamptz | sim |

### `proteses`
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | uuid PK | sim |
| codigo | text UNIQUE | sim (PROT-AAAAMMDD-XXXX) |
| codigo_barras | text UNIQUE | sim (= codigo) |
| paciente_id | uuid FK clientes | sim |
| dentista_nome | text | sim |
| dentista_cro | text | |
| dentista_clinica | text | |
| tipo_protese | text | sim (= nome amostra) |
| dentes | text | |
| cor | text | |
| material | text | |
| observacoes | text | |
| data_entrada | date | sim |
| data_prevista_entrega | date | |
| status | text | default 'recebido' |
| created_at | timestamptz | sim |

### `status_historico`
| Coluna | Tipo | Obrigatório |
|--------|------|-------------|
| id | uuid PK | sim |
| protese_id | uuid FK | sim |
| status | text | sim |
| observacao | text | |
| created_at | timestamptz | sim |

### `lab_config` (singleton ou config)
| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| nome | text |
| telefone | text |
| endereco | text |
| logo_url | text (Supabase Storage ou base64) |

---

## FLUXO DE STATUS (próteses)

```
recebido → em_producao → prova → acabamento → pronto → entregue
```

Labels PT:
- recebido = Recebido
- em_producao = Em Produção
- prova = Prova
- acabamento = Acabamento
- pronto = Pronto
- entregue = Entregue

Ao registrar prótese: status inicial `recebido` + entrada no histórico.

---

## GERAÇÃO DE CÓDIGO

Formato: `PROT-{YYYYMMDD}-{SEQ4}`

Exemplo: `PROT-20260519-0042`

- SEQ = contador do dia (0001, 0002...)
- Code128 com o mesmo valor do código
- Biblioteca sugerida: `bwip-js` ou equivalente browser

---

## API ENDPOINTS (referência — Lovable pode usar Supabase direto)

| Método | Rota | Função |
|--------|------|--------|
| GET/POST/PUT/DELETE | /clientes | CRUD pacientes |
| GET/POST/PUT/DELETE | /fornecedores | CRUD fornecedores |
| GET/POST/PUT/DELETE | /estoque | CRUD + PATCH movimentar |
| GET | /estoque/alertas | Itens abaixo do mínimo |
| GET/POST | /proteses | Listar / criar (+ etiqueta) |
| GET | /proteses/:id/imprimir | HTML 3 vias 100×50mm |
| PATCH | /proteses/:id/status | Atualizar status |
| GET | /proteses/codigo/:codigo | Buscar por barcode |
| POST | /scanner/scan | Leitor USB |
| GET/PUT | /config/lab | Config empresa + logo |
| GET | /etiquetas/campos | Doc dos 7 campos |

---

## DESIGN SYSTEM

| Token | Valor |
|-------|-------|
| Primary | `#1e3a5f` |
| Accent | `#2d6a4f` |
| Background | `#f4f7fb` |
| Surface | `#ffffff` |
| Danger | `#c1121f` |
| Warning | `#e09f3e` |
| Via Lab | `#1e3a5f` |
| Via Clínica | `#2d6a4f` |
| Via Paciente | `#7b2cbf` |
| Font | Segoe UI / system-ui |
| Border radius | 8px |

**Layout:** sidebar 240px fixa + main content scrollável.

---

## ARQUIVOS DE REFERÊNCIA (projeto local)

Copie ou consulte estes arquivos ao retornar do Lovable:

| Arquivo | Conteúdo |
|---------|----------|
| `packages/labels/preview-etiqueta.html` | Mockup visual etiqueta 3 vias |
| `packages/labels/src/labels.ts` | Lógica HTML impressão + Code128 |
| `packages/labels/src/types.ts` | Tipos TypeScript |
| `apps/web/src/pages/*.tsx` | Telas React |
| `apps/web/src/index.css` | CSS design system |
| `apps/api/src/routes/*.ts` | Lógica API |
| `apps/api/src/db.ts` | Schema SQLite |

---

## CHECKLIST LOVABLE (entregáveis)

- [ ] Auth básico (login) — opcional fase 1
- [ ] CRUD Clientes com telefone
- [ ] CRUD Fornecedores
- [ ] CRUD Estoque + alertas
- [ ] CRUD Próteses + código auto
- [ ] Etiqueta 100×50mm — 3 vias imprimíveis
- [ ] Code128 escaneável
- [ ] Config empresa + upload logo
- [ ] Leitor barcode + avançar status
- [ ] Dashboard resumo
- [ ] Interface PT-BR
- [ ] Responsivo (tablet/desktop)

---

## QUANDO VOLTAR PARA ESTE PROJETO

1. **Exportar** código Lovable (GitHub sync recomendado)
2. **Comparar** schema Supabase ↔ SQLite local
3. **Migrar** módulo `@dental/labels` ou portar lógica de `labels.ts`
4. **Integrar** com projeto de clínica odontológica (Fase 4)
5. **Testar** impressão na impressora térmica 100×50mm real

### O que preservar do projeto local
- Lógica de etiqueta (`packages/labels`) — já testada
- Formato código `PROT-AAAAMMDD-XXXX`
- Layout 100×50mm aprovado
- Mapeamento dos 7 campos

### O que a Lovable pode melhorar
- UI/UX polida
- Auth + multi-usuário
- Supabase cloud
- Deploy produção

---

## PROMPT ADICIONAL (refinamentos pós-MVP)

Use na Lovable após a primeira versão:

```
Refine o Dental Lab:
1. Etiqueta 100×50mm: barcode 12mm altura, coluna única, logo + 5 campos + barcode na base
2. Ao criar prótese, abrir automaticamente preview de impressão 3 vias
3. Leitor barcode: foco automático no campo, avançar status com 1 clique
4. Dashboard: gráfico trabalhos por status
5. Estoque: badge vermelho quando abaixo do mínimo
6. Exportar lista de próteses CSV
```

---

*Documento gerado para handoff Lovable → Dental Lab System local*  
*Projeto: `C:\Users\carlo\projects\dental-lab-system`*
