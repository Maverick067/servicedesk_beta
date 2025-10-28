/**
 * Тесты для проверки изоляции данных между tenants (RLS)
 * 
 * Эти тесты проверяют, что:
 * 1. Пользователи могут видеть только данные своего tenant
 * 2. Глобальные админы видят все данные
 * 3. RLS работает на уровне базы данных
 */

import { PrismaClient } from '@prisma/client';
import { setRLSContext, clearRLSContext } from '../src/lib/prisma-rls';

const prisma = new PrismaClient();

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface TestContext {
  tenant1Id: string;
  tenant2Id: string;
  user1Id: string;
  user2Id: string;
  adminId: string;
  ticket1Id: string;
  ticket2Id: string;
}

async function setup(): Promise<TestContext> {
  log('\n🔧 Setting up test data...', 'blue');

  // Очищаем RLS контекст для setup
  await clearRLSContext(prisma);

  // Удаляем тестовые данные если есть
  await prisma.ticket.deleteMany({
    where: {
      OR: [
        { title: { startsWith: '[RLS TEST]' } },
      ],
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['rls-test-user1@test.com', 'rls-test-user2@test.com', 'rls-test-admin@test.com'],
      },
    },
  });

  await prisma.tenant.deleteMany({
    where: {
      slug: {
        in: ['rls-test-tenant1', 'rls-test-tenant2'],
      },
    },
  });

  // Создаем тестовые tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'RLS Test Tenant 1',
      slug: 'rls-test-tenant1',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'RLS Test Tenant 2',
      slug: 'rls-test-tenant2',
    },
  });

  // Создаем пользователей
  const user1 = await prisma.user.create({
    data: {
      email: 'rls-test-user1@test.com',
      name: 'RLS Test User 1',
      password: 'test123',
      role: 'USER',
      tenantId: tenant1.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'rls-test-user2@test.com',
      name: 'RLS Test User 2',
      password: 'test123',
      role: 'USER',
      tenantId: tenant2.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'rls-test-admin@test.com',
      name: 'RLS Test Admin',
      password: 'test123',
      role: 'ADMIN',
      tenantId: null, // Глобальный админ
    },
  });

  // Создаем категории для каждого tenant
  const category1 = await prisma.category.create({
    data: {
      name: 'RLS Test Category 1',
      color: '#ff0000',
      tenantId: tenant1.id,
    },
  });

  const category2 = await prisma.category.create({
    data: {
      name: 'RLS Test Category 2',
      color: '#00ff00',
      tenantId: tenant2.id,
    },
  });

  // Создаем тикеты
  const ticket1 = await prisma.ticket.create({
    data: {
      title: '[RLS TEST] Ticket for Tenant 1',
      description: 'This ticket belongs to tenant 1',
      status: 'OPEN',
      priority: 'MEDIUM',
      tenantId: tenant1.id,
      creatorId: user1.id,
      categoryId: category1.id,
      number: 1,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: '[RLS TEST] Ticket for Tenant 2',
      description: 'This ticket belongs to tenant 2',
      status: 'OPEN',
      priority: 'MEDIUM',
      tenantId: tenant2.id,
      creatorId: user2.id,
      categoryId: category2.id,
      number: 1,
    },
  });

  log('✅ Test data created', 'green');

  return {
    tenant1Id: tenant1.id,
    tenant2Id: tenant2.id,
    user1Id: user1.id,
    user2Id: user2.id,
    adminId: admin.id,
    ticket1Id: ticket1.id,
    ticket2Id: ticket2.id,
  };
}

async function cleanup(context: TestContext) {
  log('\n🧹 Cleaning up test data...', 'blue');

  await clearRLSContext(prisma);

  // Удаляем тестовые данные
  await prisma.ticket.deleteMany({
    where: {
      id: {
        in: [context.ticket1Id, context.ticket2Id],
      },
    },
  });

  await prisma.category.deleteMany({
    where: {
      tenantId: {
        in: [context.tenant1Id, context.tenant2Id],
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: [context.user1Id, context.user2Id, context.adminId],
      },
    },
  });

  await prisma.tenant.deleteMany({
    where: {
      id: {
        in: [context.tenant1Id, context.tenant2Id],
      },
    },
  });

  log('✅ Test data cleaned up', 'green');
}

async function testTenantIsolation(context: TestContext): Promise<boolean> {
  log('\n📝 Test 1: Tenant isolation for regular users', 'blue');

  let passed = true;

  try {
    // User 1 should see only Tenant 1 tickets
    await setRLSContext(prisma, {
      tenantId: context.tenant1Id,
      isAdmin: false,
      userId: context.user1Id,
    });

    const ticketsForUser1 = await prisma.ticket.findMany();

    if (ticketsForUser1.length !== 1) {
      log(`  ❌ User 1 should see 1 ticket, but sees ${ticketsForUser1.length}`, 'red');
      passed = false;
    } else if (ticketsForUser1[0].id !== context.ticket1Id) {
      log('  ❌ User 1 sees wrong ticket', 'red');
      passed = false;
    } else {
      log('  ✅ User 1 sees only their tenant\'s ticket', 'green');
    }

    // User 2 should see only Tenant 2 tickets
    await setRLSContext(prisma, {
      tenantId: context.tenant2Id,
      isAdmin: false,
      userId: context.user2Id,
    });

    const ticketsForUser2 = await prisma.ticket.findMany();

    if (ticketsForUser2.length !== 1) {
      log(`  ❌ User 2 should see 1 ticket, but sees ${ticketsForUser2.length}`, 'red');
      passed = false;
    } else if (ticketsForUser2[0].id !== context.ticket2Id) {
      log('  ❌ User 2 sees wrong ticket', 'red');
      passed = false;
    } else {
      log('  ✅ User 2 sees only their tenant\'s ticket', 'green');
    }
  } catch (error) {
    log(`  ❌ Error: ${error}`, 'red');
    passed = false;
  }

  return passed;
}

async function testAdminAccess(context: TestContext): Promise<boolean> {
  log('\n📝 Test 2: Global admin can see all data', 'blue');

  let passed = true;

  try {
    // Admin should see all tickets
    await setRLSContext(prisma, {
      tenantId: null,
      isAdmin: true,
      userId: context.adminId,
    });

    const allTickets = await prisma.ticket.findMany({
      where: {
        id: {
          in: [context.ticket1Id, context.ticket2Id],
        },
      },
    });

    if (allTickets.length !== 2) {
      log(`  ❌ Admin should see 2 tickets, but sees ${allTickets.length}`, 'red');
      passed = false;
    } else {
      log('  ✅ Admin sees all tenants\' tickets', 'green');
    }
  } catch (error) {
    log(`  ❌ Error: ${error}`, 'red');
    passed = false;
  }

  return passed;
}

async function testCrossTenantAccess(context: TestContext): Promise<boolean> {
  log('\n📝 Test 3: Users cannot access other tenants\' data directly', 'blue');

  let passed = true;

  try {
    // User 1 tries to access Tenant 2's ticket
    await setRLSContext(prisma, {
      tenantId: context.tenant1Id,
      isAdmin: false,
      userId: context.user1Id,
    });

    const ticket2 = await prisma.ticket.findUnique({
      where: {
        id: context.ticket2Id,
      },
    });

    if (ticket2 !== null) {
      log('  ❌ User 1 can access Tenant 2\'s ticket!', 'red');
      passed = false;
    } else {
      log('  ✅ User 1 cannot access Tenant 2\'s ticket', 'green');
    }
  } catch (error) {
    // Expected behavior - access denied
    log('  ✅ Access denied as expected', 'green');
  }

  return passed;
}

async function testCategoryIsolation(context: TestContext): Promise<boolean> {
  log('\n📝 Test 4: Category isolation between tenants', 'blue');

  let passed = true;

  try {
    // User 1 should see only Tenant 1 categories
    await setRLSContext(prisma, {
      tenantId: context.tenant1Id,
      isAdmin: false,
      userId: context.user1Id,
    });

    const categoriesForUser1 = await prisma.category.findMany();

    if (categoriesForUser1.length !== 1) {
      log(`  ❌ User 1 should see 1 category, but sees ${categoriesForUser1.length}`, 'red');
      passed = false;
    } else if (categoriesForUser1[0].tenantId !== context.tenant1Id) {
      log('  ❌ User 1 sees wrong category', 'red');
      passed = false;
    } else {
      log('  ✅ User 1 sees only their tenant\'s categories', 'green');
    }

    // User 2 should see only Tenant 2 categories
    await setRLSContext(prisma, {
      tenantId: context.tenant2Id,
      isAdmin: false,
      userId: context.user2Id,
    });

    const categoriesForUser2 = await prisma.category.findMany();

    if (categoriesForUser2.length !== 1) {
      log(`  ❌ User 2 should see 1 category, but sees ${categoriesForUser2.length}`, 'red');
      passed = false;
    } else if (categoriesForUser2[0].tenantId !== context.tenant2Id) {
      log('  ❌ User 2 sees wrong category', 'red');
      passed = false;
    } else {
      log('  ✅ User 2 sees only their tenant\'s categories', 'green');
    }
  } catch (error) {
    log(`  ❌ Error: ${error}`, 'red');
    passed = false;
  }

  return passed;
}

async function runAllTests() {
  log('\n═══════════════════════════════════════', 'blue');
  log('🧪 RLS Isolation Tests', 'blue');
  log('═══════════════════════════════════════\n', 'blue');

  let context: TestContext | null = null;
  const results: { name: string; passed: boolean }[] = [];

  try {
    // Setup
    context = await setup();

    // Run tests
    results.push({
      name: 'Tenant Isolation',
      passed: await testTenantIsolation(context),
    });

    results.push({
      name: 'Admin Access',
      passed: await testAdminAccess(context),
    });

    results.push({
      name: 'Cross-Tenant Access Prevention',
      passed: await testCrossTenantAccess(context),
    });

    results.push({
      name: 'Category Isolation',
      passed: await testCategoryIsolation(context),
    });

    // Summary
    log('\n═══════════════════════════════════════', 'blue');
    log('📊 Test Results Summary', 'blue');
    log('═══════════════════════════════════════\n', 'blue');

    results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? 'green' : 'red';
      log(`${icon} ${result.name}`, color);
    });

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;

    log('\n═══════════════════════════════════════', 'blue');

    if (passedCount === totalCount) {
      log(`\n🎉 All tests passed! (${passedCount}/${totalCount})`, 'green');
      log('\n✅ RLS isolation is working correctly!', 'green');
    } else {
      log(`\n⚠️  Some tests failed (${passedCount}/${totalCount} passed)`, 'yellow');
      log('\n❌ RLS isolation has issues!', 'red');
    }
  } catch (error) {
    log(`\n❌ Fatal error during tests: ${error}`, 'red');
    process.exit(1);
  } finally {
    // Cleanup
    if (context) {
      await cleanup(context);
    }
    await prisma.$disconnect();
  }

  // Exit with appropriate code
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests();

