#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ProPatch BR — Migrador Canônico com Proteção de Baseline e Idempotência
 * Executa migrações Drizzle suportando baseline automático para bancos legados
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

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ ERRO: DATABASE_URL não definida.');
    process.exit(1);
  }

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

      // 2. Garantir schema drizzle e verificar existência de __drizzle_migrations
      await tx`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
      const [tableCheck] = await tx`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
        ) as exists;
      `;

      if (!tableCheck.exists) {
        console.log('ℹ️ Tabela drizzle.__drizzle_migrations não encontrada. Inspecionando schema public...');
        await tx`
          CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
          );
        `;

        const publicTables = await tx`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' ORDER BY table_name;
        `;
        const names = publicTables.map((t) => t.table_name);

        if (names.length === 0) {
          console.log('ℹ️ Banco de dados vazio. Nenhuma ação de baseline necessária.');
        } else {
          // Verificar equivalência com o baseline esperado
          const matches =
            EXPECTED_BASELINE_TABLES.length === names.length &&
            EXPECTED_BASELINE_TABLES.every((t) => names.includes(t));

          if (!matches) {
            console.error('❌ DIVERGÊNCIA ESTRUTURAL DETECTADA!');
            console.error('   Tabelas no banco:', names);
            console.error('   Tabelas esperadas:', EXPECTED_BASELINE_TABLES);
            throw new Error(
              'O banco possui tabelas que não correspondem ao baseline homologado. Abortando deploy fail-closed.'
            );
          }

          console.log('✅ Equivalência estrutural comprovada! Registrando baseline para migração 0000...');
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
          console.log(`✅ Baseline registrado com sucesso: hash=${hash0}, created_at=${entry0.when}`);
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
    console.error('❌ Falha na execução das migrações:', error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

runMigrations();
