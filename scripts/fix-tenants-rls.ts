import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTenantsRLS() {
  console.log('🔧 Fixing RLS for tenants table...\n');

  try {
    // Принудительно включаем RLS для tenants
    await prisma.$executeRaw`ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY`;

    console.log('✅ RLS enabled for tenants table');

    // Проверяем статус
    const status: any[] = await prisma.$queryRaw`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'tenants'
    `;

    console.log('\n📋 Status:');
    console.table(status);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixTenantsRLS();

