-- Smoke CRUD de isolamento por clinica_id (standalone Postgres)
-- Executa no schema dental_lab por padrao.

BEGIN;

SET search_path TO dental_lab, public;

-- Limpeza idempotente
DELETE FROM clientes WHERE id IN ('smoke-cli-a', 'smoke-cli-b');

-- CREATE com dois tenants
INSERT INTO clientes (id, clinica_id, nome, telefone, observacoes)
VALUES
  ('smoke-cli-a', 101, 'SMOKE CLIENTE TENANT A', '11999990001', 'create-a'),
  ('smoke-cli-b', 202, 'SMOKE CLIENTE TENANT B', '11999990002', 'create-b');

-- READ isolado por clinica_id
DO $$
DECLARE
  a_count INTEGER;
  b_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO a_count FROM clientes WHERE clinica_id = 101 AND nome = 'SMOKE CLIENTE TENANT A';
  SELECT COUNT(*) INTO b_count FROM clientes WHERE clinica_id = 202 AND nome = 'SMOKE CLIENTE TENANT B';

  IF a_count <> 1 THEN
    RAISE EXCEPTION 'Tenant A read falhou. count=%', a_count;
  END IF;
  IF b_count <> 1 THEN
    RAISE EXCEPTION 'Tenant B read falhou. count=%', b_count;
  END IF;
END $$;

-- UPDATE isolado
UPDATE clientes
SET observacoes = 'update-a'
WHERE clinica_id = 101 AND id = 'smoke-cli-a';

UPDATE clientes
SET observacoes = 'update-b'
WHERE clinica_id = 202 AND id = 'smoke-cli-b';

DO $$
DECLARE
  a_note TEXT;
  b_note TEXT;
BEGIN
  SELECT observacoes INTO a_note FROM clientes WHERE clinica_id = 101 AND id = 'smoke-cli-a';
  SELECT observacoes INTO b_note FROM clientes WHERE clinica_id = 202 AND id = 'smoke-cli-b';

  IF a_note <> 'update-a' THEN
    RAISE EXCEPTION 'Tenant A update falhou. observacoes=%', a_note;
  END IF;
  IF b_note <> 'update-b' THEN
    RAISE EXCEPTION 'Tenant B update falhou. observacoes=%', b_note;
  END IF;
END $$;

-- DELETE isolado
DELETE FROM clientes WHERE clinica_id = 101 AND id = 'smoke-cli-a';
DELETE FROM clientes WHERE clinica_id = 202 AND id = 'smoke-cli-b';

DO $$
DECLARE
  total_left INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_left
  FROM clientes
  WHERE id IN ('smoke-cli-a', 'smoke-cli-b');

  IF total_left <> 0 THEN
    RAISE EXCEPTION 'Delete falhou. sobrou=%', total_left;
  END IF;
END $$;

COMMIT;
