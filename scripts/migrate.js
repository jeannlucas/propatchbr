#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ProPatch BR — Migrador Canônico com Proteção de Baseline e Idempotência
 * Executa migrações Drizzle suportando modo explícito de baseline para bancos legados
 * sem a tabela __drizzle_migrations pré-existente.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const postgres = require('postgres');

const EXPECTED_BASELINE_TABLES = [
  'download_logs',
  'licenses',
  'password_reset_tokens',
  'payments',
  'plans',
  'product_versions',
  'products',
  'profiles',
  'users',
];

const EXPECTED_SCHEMA = {
  download_logs: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      user_id: { type: 'uuid', nullable: 'NO' },
      product_version_id: { type: 'uuid', nullable: 'NO' },
      download_status: { type: 'text', nullable: 'NO' },
      ip_address: { type: 'text', nullable: 'YES' },
      downloaded_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'download_logs_pkey',
      'download_logs_user_id_users_id_fk',
      'download_logs_product_version_id_product_versions_id_fk',
    ],
  },
  licenses: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      user_id: { type: 'uuid', nullable: 'NO' },
      product_id: { type: 'uuid', nullable: 'NO' },
      plan_id: { type: 'uuid', nullable: 'YES' },
      license_key: { type: 'text', nullable: 'NO' },
      status: { type: 'text', nullable: 'NO' },
      starts_at: { type: 'timestamp with time zone', nullable: 'NO' },
      expires_at: { type: 'timestamp with time zone', nullable: 'NO' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
      updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'licenses_pkey',
      'licenses_license_key_unique',
      'licenses_user_id_users_id_fk',
      'licenses_product_id_products_id_fk',
      'licenses_plan_id_plans_id_fk',
    ],
  },
  password_reset_tokens: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      user_id: { type: 'uuid', nullable: 'NO' },
      token_hash: { type: 'text', nullable: 'NO' },
      expires_at: { type: 'timestamp with time zone', nullable: 'NO' },
      used_at: { type: 'timestamp with time zone', nullable: 'YES' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'password_reset_tokens_pkey',
      'password_reset_tokens_user_id_users_id_fk',
    ],
  },
  payments: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      user_id: { type: 'uuid', nullable: 'NO' },
      plan_id: { type: 'uuid', nullable: 'YES' },
      billing_id: { type: 'text', nullable: 'NO' },
      amount_cents: { type: 'integer', nullable: 'NO' },
      status: { type: 'text', nullable: 'NO' },
      payment_method: { type: 'text', nullable: 'NO' },
      metadata: { type: 'jsonb', nullable: 'YES' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
      updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'payments_pkey',
      'payments_billing_id_unique',
      'payments_user_id_users_id_fk',
      'payments_plan_id_plans_id_fk',
    ],
  },
  plans: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      product_id: { type: 'uuid', nullable: 'NO' },
      name: { type: 'text', nullable: 'NO' },
      duration_days: { type: 'integer', nullable: 'NO' },
      price_cents: { type: 'integer', nullable: 'NO' },
      active: { type: 'boolean', nullable: 'NO' },
      badge: { type: 'text', nullable: 'YES' },
      description: { type: 'text', nullable: 'YES' },
      features: { type: 'jsonb', nullable: 'NO' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
      updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'plans_pkey',
      'plans_product_id_products_id_fk',
    ],
  },
  product_versions: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      product_id: { type: 'uuid', nullable: 'NO' },
      version: { type: 'text', nullable: 'NO' },
      changelog: { type: 'text', nullable: 'YES' },
      file_name: { type: 'text', nullable: 'NO' },
      file_size_bytes: { type: 'bigint', nullable: 'YES' },
      storage_path: { type: 'text', nullable: 'NO' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'product_versions_pkey',
      'product_versions_product_id_products_id_fk',
    ],
  },
  products: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      name: { type: 'text', nullable: 'NO' },
      slug: { type: 'text', nullable: 'NO' },
      description: { type: 'text', nullable: 'YES' },
      image_url: { type: 'text', nullable: 'YES' },
      active: { type: 'boolean', nullable: 'NO' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
      updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'products_pkey',
      'products_slug_unique',
    ],
  },
  profiles: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      name: { type: 'text', nullable: 'NO' },
      avatar_url: { type: 'text', nullable: 'YES' },
      role: { type: 'text', nullable: 'NO' },
      updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'profiles_pkey',
      'profiles_id_users_id_fk',
    ],
  },
  users: {
    columns: {
      id: { type: 'uuid', nullable: 'NO' },
      email: { type: 'text', nullable: 'NO' },
      password_hash: { type: 'text', nullable: 'NO' },
      role: { type: 'text', nullable: 'NO' },
      created_at: { type: 'timestamp with time zone', nullable: 'NO' },
      updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
    },
    constraints: [
      'users_pkey',
      'users_email_unique',
    ],
  },
};

async function verifyStrictEquivalence(tx) {
  const publicTables = await tx`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name;
  `;
  const names = publicTables.map((t) => t.table_name);

  // 1. Validar conjunto de tabelas
  const missingTables = EXPECTED_BASELINE_TABLES.filter((t) => !names.includes(t));
  const extraTables = names.filter((t) => !EXPECTED_BASELINE_TABLES.includes(t));
  if (missingTables.length > 0 || extraTables.length > 0) {
    throw new Error(
      `Divergência de tabelas: Ausentes=[${missingTables.join(', ')}], Extras=[${extraTables.join(', ')}]`
    );
  }

  // 2. Validar colunas, tipos e nulabilidade
  const dbCols = await tx`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, column_name;
  `;
  const dbColMap = new Map();
  for (const c of dbCols) {
    dbColMap.set(`${c.table_name}.${c.column_name}`, c);
  }

  for (const [table, tInfo] of Object.entries(EXPECTED_SCHEMA)) {
    for (const [colName, colMeta] of Object.entries(tInfo.columns)) {
      const key = `${table}.${colName}`;
      const actual = dbColMap.get(key);
      if (!actual) {
        throw new Error(`Coluna obrigatória ausente no banco: ${key}`);
      }
      if (actual.data_type !== colMeta.type) {
        throw new Error(
          `Tipo divergente em ${key}: esperado ${colMeta.type}, encontrado ${actual.data_type}`
        );
      }
      if (actual.is_nullable !== colMeta.nullable) {
        throw new Error(
          `Nulabilidade divergente em ${key}: esperado ${colMeta.nullable}, encontrado ${actual.is_nullable}`
        );
      }
    }
  }

  // 3. Validar constraints (PKs, Uniques, FKs)
  const dbConstraints = await tx`
    SELECT conname, contype, conrelid::regclass::text as table_name 
    FROM pg_constraint 
    JOIN pg_namespace n ON n.oid = connamespace 
    WHERE n.nspname = 'public' 
    ORDER BY conname;
  `;
  const dbConNames = new Set(dbConstraints.map((c) => c.conname));

  const allExpectedConstraints = Object.values(EXPECTED_SCHEMA).flatMap(
    (t) => t.constraints
  );
  for (const conName of allExpectedConstraints) {
    if (!dbConNames.has(conName)) {
      throw new Error(`Constraint obrigatória ausente no banco: ${conName}`);
    }
  }

  console.log('✅ Equivalência estrutural estrita comprovada: 9 tabelas, tipos, nulabilidade e 24 constraints conferidos.');
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ ERRO: DATABASE_URL não definida.');
    process.exit(1);
  }

  // Verificação de autorização explícita de baseline
  const isAllowBaseline =
    process.argv.includes('--allow-baseline') ||
    process.env.ALLOW_BASELINE === '1' ||
    process.env.DRIZZLE_ALLOW_BASELINE === '1';

  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  if (!fs.existsSync(journalPath)) {
    console.error(`❌ ERRO: Arquivo ${journalPath} não encontrado.`);
    process.exit(1);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  console.log('🔍 Conectando ao PostgreSQL para verificação de migrações...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql.begin(async (tx) => {
      // 1. Trava exclusiva de migração a nível de banco
      await tx`SELECT pg_advisory_xact_lock(789123456)`;

      // 2. Verificar se a tabela de migrações existe e possui registros
      const [tableCheck] = await tx`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
        ) as exists;
      `;

      let hasMigrationHistory = false;
      if (tableCheck.exists) {
        const [historyCheck] = await tx`
          SELECT count(*)::int as count FROM "drizzle"."__drizzle_migrations";
        `;
        hasMigrationHistory = historyCheck.count > 0;
      }

      if (!hasMigrationHistory) {
        // Verificar se o banco possui tabelas no schema public
        const publicTables = await tx`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' ORDER BY table_name;
        `;
        const names = publicTables.map((t) => t.table_name);

        if (names.length === 0) {
          console.log('ℹ️ Banco de dados vazio. Migrações normais liberadas a partir de 0000.');
          // Garante criação da infraestrutura de migração Drizzle
          await tx`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
          await tx`
            CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
              id SERIAL PRIMARY KEY,
              hash text NOT NULL,
              created_at bigint
            );
          `;
        } else {
          // Banco possui tabelas legadas sem histórico Drizzle
          if (!isAllowBaseline) {
            console.error('');
            console.error('❌ BASELINE NÃO AUTORIZADO (FAIL-CLOSED):');
            console.error(`   Detectadas ${names.length} tabelas no schema public sem histórico Drizzle registrado.`);
            console.error('   Tabelas encontradas:', names);
            console.error('');
            console.error('   Para registrar o baseline da migração 0000_lame_onslaught com validação estrita,');
            console.error("   execute explicitamente com a flag '--allow-baseline' ou com 'ALLOW_BASELINE=1'.");
            console.error('   Nenhuma alteração foi gravada no banco de dados. Operação abortada.');
            throw new Error('Baseline de base legada exige autorização explícita.');
          }

          console.log('🔒 Modo explícito de baseline autorizado. Iniciando validação estrita de equivalência...');
          await verifyStrictEquivalence(tx);

          // Criar infraestrutura Drizzle e registrar baseline 0000
          await tx`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
          await tx`
            CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
              id SERIAL PRIMARY KEY,
              hash text NOT NULL,
              created_at bigint
            );
          `;

          const entry0 = journal.entries.find((e) => e.tag === '0000_lame_onslaught');
          if (!entry0) {
            throw new Error('Entrada 0000_lame_onslaught não encontrada no journal Drizzle.');
          }
          const sqlFile0 = path.join(migrationsFolder, `${entry0.tag}.sql`);
          const query0 = fs.readFileSync(sqlFile0, 'utf8');
          const hash0 = crypto.createHash('sha256').update(query0).digest('hex');

          await tx`
            INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
            VALUES (${hash0}, ${entry0.when});
          `;
          console.log(`✅ Baseline da migração 0000 registrado: hash=${hash0}, created_at=${entry0.when}`);
        }
      }

      // 3. Obter última migração registrada
      const [lastMigration] = await tx`
        SELECT id, hash, created_at 
        FROM "drizzle"."__drizzle_migrations" 
        ORDER BY created_at DESC 
        LIMIT 1;
      `;

      let appliedCount = 0;
      for (const entry of journal.entries) {
        const isAlreadyApplied =
          lastMigration && Number(lastMigration.created_at) >= entry.when;

        if (isAlreadyApplied) {
          console.log(`⏩ Migração ${entry.tag} já aplicada (timestamp ${entry.when}). Pulando.`);
          continue;
        }

        console.log(`📦 Aplicando migração: ${entry.tag}...`);
        const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
        if (!fs.existsSync(sqlFile)) {
          throw new Error(`Arquivo de migração ${sqlFile} não encontrado.`);
        }

        const query = fs.readFileSync(sqlFile, 'utf8');
        const hash = crypto.createHash('sha256').update(query).digest('hex');
        const statements = query
          .split('--> statement-breakpoint')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const stmt of statements) {
          await tx.unsafe(stmt);
        }

        await tx`
          INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
          VALUES (${hash}, ${entry.when});
        `;
        console.log(`✅ Migração ${entry.tag} aplicada com sucesso!`);
        appliedCount++;
      }

      if (appliedCount === 0) {
        console.log('✨ Nenhuma migração pendente. Banco de dados está 100% atualizado.');
      } else {
        console.log(`🎉 ${appliedCount} migração(ões) aplicada(s) com sucesso!`);
      }
    });

    await sql.end();
    console.log('✅ Conexão com banco encerrada com sucesso.');
  } catch (error) {
    console.error('❌ Falha na execução das migrações:', error.message || error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

runMigrations();
