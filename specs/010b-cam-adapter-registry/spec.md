# Feature Specification: Registry CamAdapter (SDK / hot folder / agente LAN)

**Feature Branch**: `010b-cam-adapter-registry`  
**Created**: 2026-09-30  
**Status**: Draft  
**Input**: Spec 010b — Registry CamAdapter: Filesystem + Elegoo Link/SDCP + slots Medit/3Shape/Shining/fresadoras (Onda 4, fases 010.4–010.6; complementa `010-cam-pasta-paciente`)

## Contexto e relação com a spec 010

A spec `010-cam-pasta-paciente` entregou a pasta digital do paciente, anexos/scans e um registry piloto com:

- adapter **filesystem** (hot folder + marcadores de conclusão/falha);
- perfil **Elegoo Mars 5 Ultra** via hot folder (não SDCP real);
- fresadora genérica via hot folder;
- **slots reservados** (indisponíveis) para Medit, Shining e 3Shape.

Esta spec **010b** define a evolução do registry para fabricação e ingestão reais: contrato único de adapters, piloto Elegoo Link/SDCP na LAN do laboratório, slots de scanners e fresadoras prontos para ativação por parceria/SDK, e eventos de domínio opcionais. Não redesenha a pasta digital — a consome.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fabricar via hot folder (fallback universal) (Priority: P1)

O operador do laboratório escolhe um scan da pasta do paciente e envia um job de impressão ou fresagem. Quando não há SDK da máquina, o sistema usa o adapter de pasta quente (hot folder): copia o arquivo para a pasta configurada da clínica e sinaliza conclusão ou falha de forma reconhecível pelo fluxo do lab.

**Why this priority**: É o caminho sempre disponível; garante fabricação mesmo sem parceria de fabricante e é o fallback quando o adapter específico está ausente ou indisponível.

**Independent Test**: Com pasta do paciente e um scan válido, criar job print e mill pelo adapter filesystem; observar job concluído ou falho e isolamento por clínica.

**Acceptance Scenarios**:

1. **Given** paciente com scan 3D na pasta digital da clínica, **When** o operador cria um job de impressão com adapter filesystem, **Then** o arquivo chega à pasta quente da clínica e o job passa a estado de enviado/concluído conforme o sinal do adapter.
2. **Given** paciente com scan 3D, **When** o operador cria um job de fresagem com adapter filesystem (ou perfil de fresadora genérica), **Then** o job é registrado e o arquivo fica disponível na pasta quente de mill da clínica.
3. **Given** job enviado à pasta quente, **When** o sinal de falha é detectado, **Then** o job fica em estado de falha com mensagem legível ao operador, sem corromper a pasta do paciente.
4. **Given** clínica A e clínica B, **When** A cria jobs, **Then** B não lista nem acessa jobs, pastas quentes ou anexos de A.

---

### User Story 2 - Piloto Elegoo Mars 5 Ultra via Link/SDCP (Priority: P1)

O laboratório com impressora **Elegoo Mars 5 Ultra** na rede local quer enviar o job de impressão pela integração oficial (Elegoo Link / protocolo SDCP), não só por pasta. Um agente no ambiente do lab autentica-se no Dental Lab, recebe o job e conversa com a impressora na LAN; o operador acompanha status (enviado, em progresso, concluído, falha) na UI do Lab.

**Why this priority**: É o primeiro SDK real de impressão aprovado no roadmap; diferencia o piloto CAM de um stub de pasta.

**Independent Test**: Com agente autenticado na LAN e perfil de dispositivo Elegoo configurado para a clínica, criar job print no adapter Elegoo; verificar transição de status sem exigir hot folder como caminho principal.

**Acceptance Scenarios**:

1. **Given** clínica com perfil de dispositivo Elegoo Mars 5 Ultra ativo e agente LAN autenticado, **When** o operador cria job de impressão no adapter Elegoo Link/SDCP a partir de um scan da pasta do paciente, **Then** o job é aceito e muda para enviado (com referência externa quando a impressora informar).
2. **Given** job Elegoo em andamento, **When** o agente consulta status na impressora, **Then** o Lab atualiza o estado do job (em progresso / concluído / falha) de forma visível ao operador.
3. **Given** adapter Elegoo indisponível (agente offline, impressora inalcançável ou SDK não configurado), **When** o operador tenta fabricar nessa rota, **Then** o sistema oferece ou aplica fallback para filesystem com aviso explícito — não falha silenciosa.
4. **Given** instalação só em nuvem sem agente LAN, **When** a clínica lista adapters, **Then** Elegoo SDCP aparece como slot/perfil conhecido, porém indisponível para envio direto até o agente estar online (hot folder continua usável).

---

### User Story 3 - Consultar registry e escolher adapter (Priority: P1)

Supervisor ou operador com permissão vê quais adapters estão instalados, quais capacidades cada um oferece (ingestão de scan, impressão, fresagem, status) e quais estão realmente disponíveis naquela clínica.

**Why this priority**: Sem transparência do registry, o lab não sabe se deve usar pasta, Elegoo ou esperar parceria de scanner.

**Independent Test**: Listar adapters autenticado por clínica; validar presença de filesystem (disponível), Elegoo (disponível só com configuração/agente), mill genérico, e slots Medit/Shining/3Shape marcados conforme disponibilidade.

**Acceptance Scenarios**:

1. **Given** usuário autenticado com permissão de produção/CAM, **When** consulta o registry, **Then** vê pelo menos: filesystem, Elegoo Mars 5 Ultra (Link/SDCP ou perfil), fresadora genérica, Medit Open API, Shining Open Platform, 3Shape Unite — cada um com capacidades e flag de disponibilidade.
2. **Given** adapter em slot reservado (sem SDK/parceria ativa), **When** o operador tenta criar job nele, **Then** recebe erro claro de indisponibilidade (não job “fantasma” concluído).
3. **Given** dual-mode (standalone ou embedded), **When** lista adapters ou cria job, **Then** o isolamento por clínica e as políticas de acesso permanecem os mesmos (sem vazamento entre tenants).

---

### User Story 4 - Slots de scanners (Medit / Shining / 3Shape) (Priority: P2)

O produto reserva e documenta o caminho para ingestão de cases/scans via Medit Link Open API, Shining Open Platform e 3Shape Unite Web Service. Enquanto a parceria/SDK não estiver liberada, o slot existe no registry com onboarding documentado; scans continuam entrando por upload manual na pasta do paciente. Quando a parceria for ativada na clínica, o adapter passa a importar para a mesma pasta digital (sem segundo repositório).

**Why this priority**: Alinha o Lab ao modelo de ERP dental (plugar SDKs quando existirem); não bloqueia o piloto de fabricação.

**Independent Test**: Registry expõe os três slots; tentativa de ingestão sem credenciais falha com mensagem de onboarding; com modo “ativado” simulado/configurado, um case de teste aterrissa como anexo na pasta do paciente correto.

**Acceptance Scenarios**:

1. **Given** slots Medit, Shining e 3Shape no registry, **When** a clínica ainda não tem parceria/credenciais, **Then** `available=false` (ou equivalente) e a UI/docs apontam para o onboarding — upload manual na pasta permanece o caminho operacional.
2. **Given** clínica com adapter de scanner ativado e credenciais válidas (quando liberado), **When** um case/scan é importado, **Then** o arquivo vira anexo na pasta digital daquele paciente, no tenant correto.
3. **Given** tentativa de importar case de paciente/clínica incorretos, **When** o adapter resolve o destino, **Then** a importação é rejeitada ou exigida associação explícita — nunca grava no tenant errado.

---

### User Story 5 - Perfis de fresadora e dispositivos por clínica (Priority: P2)

O laboratório cadastra perfis de dispositivo (impressora Elegoo, fresadora genérica Roland/imes/vhf via pasta, futuros SDKs) por clínica: tipo de adapter, pasta quente ou endpoint, e se o agente LAN é necessário. Jobs usam o perfil escolhido; credenciais sensíveis não aparecem em logs nem na UI em texto claro.

**Why this priority**: Sem perfis por clínica, o registry global não reflete a realidade de cada lab.

**Independent Test**: Criar/editar perfil filesystem mill e perfil Elegoo; criar job apontando ao perfil; confirmar mascaramento de segredos na listagem.

**Acceptance Scenarios**:

1. **Given** admin/gestor da clínica, **When** cadastra perfil de fresadora genérica com pasta quente, **Then** jobs mill podem usar esse perfil e o arquivo cai na pasta configurada.
2. **Given** perfil com credencial/endpoint, **When** listado na UI ou logs de aplicação, **Then** segredos estão mascarados ou omitidos.
3. **Given** perfil de marca específica sem SDK público (Roland, imes, vhf etc.), **When** a clínica fabrica, **Then** o caminho suportado nesta onda é filesystem/hot folder (slot de SDK futuro pode existir, mas não é obrigatório implementar o SDK do fabricante).

---

### User Story 6 - Agente on-prem e eventos de domínio (Priority: P3)

O agente `dental-lab-cam-agent` (ou equivalente) roda na LAN, autentica no Lab, sincroniza jobs/anexos necessários e executa adapters locais (SDCP, pastas UNC). Opcionalmente, jobs e importações emitem eventos de domínio para automações (N8N), de forma não bloqueante e idempotente.

**Why this priority**: Necessário para SDCP real, mas pode seguir o piloto Elegoo; eventos são extensão EDD alinhada à spec 012.

**Independent Test**: Agente com token válido puxa um job pendente e reporta status; falha de webhook N8N não reverte o job.

**Acceptance Scenarios**:

1. **Given** agente com credencial válida da clínica, **When** há job Elegoo pendente de envio local, **Then** o agente obtém o payload/arquivo, envia à impressora e reporta status ao Lab.
2. **Given** credencial inválida ou clínica divergente, **When** o agente chama a API, **Then** acesso é negado.
3. **Given** integrações habilitadas, **When** job CAM conclui ou falha, **Then** pode emitir evento de domínio (`cam_job_*`) sem bloquear a conclusão do job se o webhook externo falhar.
4. **Given** modo embedded, **When** eventos CAM disparam, **Then** seguem a mesma política de gate das demais integrações (não duplicar CRM por padrão).

---

### Edge Cases

- Adapter solicitado não existe no registry → erro claro; não cair em adapter errado sem aviso.
- Adapter existe mas `available=false` → recusa criação do job (exceto documentação de slot).
- Arquivo de scan ausente/corrompido no storage → job não marca sucesso; mensagem acionável.
- Agente online mas impressora desligada → timeout/falha explícita; job não fica “enviado” eterno sem política de timeout documentada.
- Dois jobs simultâneos para a mesma impressora → fila ou rejeição controlada (não sobrescrever arquivo sem rastreio).
- Soft-delete do paciente/anexo → jobs novos não usam anexo removido; histórico de jobs já criados permanece auditável.
- Path traversal / IDs maliciosos em pastas quentes → rejeitados (continuidade do hardening 013).
- Clínica sem storage configurado → falha previsível na criação do job, sem expor caminhos internos de outros tenants.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST manter um registry único de adapters CAM com identificador, rótulo, capacidades (`ingest` | `print` | `mill` | `status` quando aplicável) e disponibilidade efetiva por instalação/clínica.
- **FR-002**: O registry MUST incluir e manter: `filesystem` (sempre elegível como fallback), Elegoo Link/SDCP (piloto print Mars 5 Ultra), fresadora genérica (mill via pasta), e slots `medit_open_api`, `shining_open_platform`, `threeshape_unite`.
- **FR-003**: O adapter filesystem MUST continuar sendo o fallback universal: hot folder por clínica/adapter, com sinalização de conclusão e falha compreensível pelo fluxo de jobs.
- **FR-004**: Quando o adapter escolhido estiver ausente ou indisponível, o sistema MUST informar o operador e MUST permitir fallback explícito para filesystem (nunca silencioso).
- **FR-005**: O piloto Elegoo MUST permitir envio de job de impressão e consulta de status via agente na LAN do laboratório (Elegoo Link / SDCP), atualizando o job no Lab.
- **FR-006**: Jobs CAM MUST permanecer vinculados a paciente (pasta), clínica e, quando informado, prótese/peça; MUST filtrar sempre por clínica (multi-tenant).
- **FR-007**: Slots Medit / Shining / 3Shape MUST existir no registry mesmo sem SDK ativo; ativação MUST depender de configuração/parceria e, quando ativos, MUST depositar scans na pasta digital do paciente (spec 010).
- **FR-008**: Perfis de dispositivo por clínica MUST permitir associar tipo de adapter, capacidade e destino (pasta quente e/ou endpoint/agente); segredos MUST NÃO aparecer em logs nem em respostas de listagem em claro.
- **FR-009**: Fresadoras de marcas sem API pública (ex.: Roland, imes, vhf) MUST ser suportadas nesta onda via filesystem/hot folder; slots de SDK futuros MAY existir como reservados.
- **FR-010**: Operações de listagem de adapters, criação/consulta de jobs e gestão de perfis MUST exigir autenticação e política RBAC adequada (produção/prótese/clientes conforme padrão do Lab); downloads/arquivos MUST usar canal autenticado.
- **FR-011**: O agente on-prem MUST autenticar-se no Lab, operar só no escopo da clínica autorizada e ser o executor dos adapters que exigem rede local.
- **FR-012**: Eventos de domínio CAM (`cam_asset_imported`, `cam_job_sent` / `cam_job_done` / `cam_job_fail` ou nomenclatura equivalente) MUST ser opcionais, idempotentes e não bloqueantes, alinhados ao gate de integrações existente.
- **FR-013**: Dual-mode (standalone e embedded) MUST preservar isolamento por clínica e headers/contexto de tenant; embedded NÃO altera o contrato do registry.
- **FR-014**: Documentação de onboarding (Elegoo agente/SDCP + slots Medit/Shining/3Shape) MUST permanecer alinhada a `docs/CAM-CONNECTOR.md` ao concluir a implementação desta spec.

### Key Entities

- **CamAdapter (registro)**: plugin lógico com id, capacidades, disponibilidade e operações de envio/status/descoberta quando couber.
- **Perfil de dispositivo (`cam_device_profiles`)**: configuração por clínica de uma máquina/pasta (tipo adapter, destino, flags de agente).
- **Configuração de adapter (`cam_adapters_config`)**: credenciais/endpoints por clínica (armazenamento seguro; nunca em log).
- **Job CAM (`cam_jobs`)**: ordem de fabricação/ingest ligando paciente, anexo/asset, prótese opcional, adapter/perfil, estados e referência externa.
- **Asset CAM (`cam_assets`)**: visão CAD/malha opcional sobre anexo da pasta do paciente.
- **Agente LAN**: processo no laboratório que executa adapters locais e sincroniza status com o Lab.
- **Pasta digital do paciente**: pré-requisito (spec 010); origem dos scans e destino das ingestões de scanner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em ambiente de aceite, 100% dos jobs filesystem print e mill de teste concluem ou falham com estado e mensagem visíveis em até 2 minutos (sem máquina real — hot folder).
- **SC-002**: Com agente LAN e impressora/simulador Elegoo disponíveis, o operador envia um job print SDCP e vê status final (sucesso ou falha explícita) sem precisar copiar arquivo manualmente para a pasta da impressora.
- **SC-003**: A listagem do registry mostra os 6 adapters nomeados (filesystem, Elegoo, mill genérico, Medit, Shining, 3Shape) com disponibilidade correta; tentativa em slot reservado é rejeitada em 100% dos casos de teste.
- **SC-004**: Em teste multi-tenant, 0 acessos cruzados a jobs, perfis ou arquivos entre clínicas A e B.
- **SC-005**: Fallback: quando Elegoo está indisponível, o operador consegue completar o mesmo cenário de fabricação via filesystem com aviso perceptível em pelo menos 95% das tentativas de teste de usabilidade interna.
- **SC-006**: Segredos de adapter/perfil não aparecem nas listagens vistas pelo operador nem nos registros de auditoria/aplicação nos cenários de teste de segurança.
- **SC-007**: Documentação CAM descreve onboarding do agente Elegoo e o estado “slot reservado vs ativado” dos três scanners; revisor de produto valida o texto sem ambiguidade de “SDK único para todo o mercado”.

## Assumptions

- A pasta digital do paciente (spec 010.1–010.2) e o registry piloto filesystem/hot folder (010.3) já existem e são reutilizados; 010b não os substitui.
- Não existe um único SDK que cubra todos os scanners/impressoras/fresadoras; o valor do produto é o registry pluggável + fallback filesystem (decisão aprovada 2026-07-19).
- Parcerias Medit / Shining / 3Shape podem permanecer como slot + documentação até liberação contratual/API; implementação completa de OAuth/SDK de cada marca só é obrigatória quando a parceria estiver disponível — a spec exige o contrato do slot e o caminho de ativação.
- Elegoo Mars 5 Ultra é o piloto de impressão SDK; outras impressoras (Formlabs, SprintRay, Phrozen…) ficam como futuros adapters no mesmo contrato.
- O agente on-prem é necessário para SDCP/pastas UNC; a API cloud sozinha não alcança impressoras na Wi‑Fi do lab.
- Eventos N8N/Chatwoot CAM são opcionais nesta onda e reutilizam o gate da spec 012.
- Fora de escopo: redesign visual completo; app nativo do fabricante; rehost de Chatwoot/N8N; PIX/financeiro; alterar o leitor de código de barras (`/scanner`).
- Build/deploy de produção só após autorização humana da fase de implementação desta spec (TDD nas tasks).

## Fora de escopo

- Refazer CRUD da pasta digital / upload de anexos (já coberto por 010).
- Implementação completa dos SDKs Medit/Shining/3Shape sem liberação de API/parceria.
- SDKs proprietários de fresadoras quando o fabricante não publica API — permanece hot folder.
- Aplicativo mobile nativo; ChiTuBox como produto embutido (apenas menção como possível ferramenta na LAN via agente/pasta).
- Pagamentos, NF-e e financeiro (spec 009).
