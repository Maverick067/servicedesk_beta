/**
 * Скрипт для применения Row-Level Security (RLS) к базе данных
 * Использует Prisma для выполнения SQL команд
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyRLS() {
  console.log('🔐 Applying Row-Level Security (RLS) to PostgreSQL...\n');

  try {
    // Читаем SQL файл
    const sqlFilePath = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      'enable_rls.sql'
    );

    console.log(`📝 Reading SQL file: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Разбиваем на отдельные SQL команды (по точке с запятой)
    const sqlCommands = sqlContent
      .split(';')
      .map((cmd) => cmd.trim())
      .filter((cmd) => {
        // Пропускаем комментарии и пустые строки
        return (
          cmd.length > 0 &&
          !cmd.startsWith('--') &&
          !cmd.startsWith('/*')
        );
      });

    console.log(`📊 Found ${sqlCommands.length} SQL commands to execute\n`);

    // Выполняем каждую команду
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];

      // Пропускаем команды, которые являются только комментариями
      if (command.startsWith('CREATE') || command.startsWith('ALTER')) {
        try {
          console.log(`[${i + 1}/${sqlCommands.length}] Executing...`);
          await prisma.$executeRawUnsafe(command + ';');
          successCount++;
        } catch (error: any) {
          // Игнорируем ошибки "already exists"
          if (
            error.message.includes('already exists') ||
            error.message.includes('does not exist')
          ) {
            console.log(`  ⚠️  Skipped (already exists or not found)`);
          } else {
            console.error(`  ❌ Error: ${error.message}`);
            errorCount++;
          }
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully executed: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    // Проверяем, что RLS включен
    console.log('\n🔍 Verifying RLS status...');

    const rlsStatus: any[] = await prisma.$queryRaw`
      SELECT 
        schemaname, 
        tablename, 
        rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('tenants', 'users', 'tickets', 'categories', 'queues')
      ORDER BY tablename;
    `;

    console.log('\n📋 RLS Status:');
    console.table(rlsStatus);

    const allEnabled = rlsStatus.every((row) => row.rowsecurity === true);

    if (allEnabled) {
      console.log('\n✅ RLS is now active on all tables!');
    } else {
      console.log('\n⚠️  Warning: Some tables do not have RLS enabled');
    }

    console.log('\n⚠️  IMPORTANT: Restart your Next.js dev server:');
    console.log('   bun run dev\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем
applyRLS()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

