import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ldap from "ldapjs";

/**
 * POST /api/ldap/[id]/sync
 * Синхронизация пользователей из Active Directory
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Получаем LDAP конфигурацию
    const ldapConfig = await prisma.ldapConfig.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        useSSL: true,
        baseDn: true,
        bindDn: true,
        bindPassword: true,
        userSearchBase: true,
        userSearchFilter: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!ldapConfig) {
      return NextResponse.json(
        { error: "LDAP configuration not found" },
        { status: 404 }
      );
    }

    // Проверяем права доступа
    if (
      session.user.role === "TENANT_ADMIN" &&
      session.user.tenantId !== ldapConfig.tenantId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!ldapConfig.isActive) {
      return NextResponse.json(
        { error: "LDAP configuration is not active" },
        { status: 400 }
      );
    }

    console.log(`[LDAP Sync] Starting sync for config: ${ldapConfig.name}`);

    // Выполняем синхронизацию
    const result = await syncUsersFromLdap(ldapConfig);

    // Обновляем время последней синхронизации
    await prisma.ldapConfig.update({
      where: { id: params.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[LDAP Sync] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync users" },
      { status: 500 }
    );
  }
}

/**
 * Синхронизирует пользователей из LDAP/AD
 */
async function syncUsersFromLdap(config: any): Promise<{
  success: boolean;
  usersFound: number;
  usersCreated: number;
  usersUpdated: number;
  users: any[];
  error?: string;
}> {
  return new Promise((resolve) => {
    const protocol = config.useSSL ? "ldaps" : "ldap";
    const ldapUrl = `${protocol}://${config.host}:${config.port || (config.useSSL ? 636 : 389)}`;

    const clientOptions: any = {
      url: ldapUrl,
      timeout: 30000, // Увеличиваем таймаут для синхронизации
      connectTimeout: 30000,
      reconnect: false,
    };

    if (config.useSSL) {
      clientOptions.tlsOptions = {
        rejectUnauthorized: false,
        requestCert: true,
        agent: false,
      };
    }

    const client = ldap.createClient(clientOptions);
    let hasResolved = false;

    client.on("error", (err) => {
      if (hasResolved) return;
      hasResolved = true;
      console.error(`[LDAP Sync] Connection error:`, err.message);
      try {
        client.unbind();
      } catch (e) {
        // ignore
      }
      resolve({
        success: false,
        usersFound: 0,
        usersCreated: 0,
        usersUpdated: 0,
        users: [],
        error: err.message,
      });
    });

    // Подключаемся с учетными данными администратора
    client.bind(config.bindDn, config.bindPassword, (bindErr) => {
      if (hasResolved) return;

      if (bindErr) {
        hasResolved = true;
        console.error(`[LDAP Sync] Bind error:`, bindErr.message);
        try {
          client.unbind();
        } catch (e) {
          // ignore
        }
        resolve({
          success: false,
          usersFound: 0,
          usersCreated: 0,
          usersUpdated: 0,
          users: [],
          error: bindErr.message,
        });
        return;
      }

      console.log(`[LDAP Sync] Bind successful, searching for users...`);

      // Ищем всех пользователей (исключаем компьютеры и отключенные аккаунты)
      const searchBase = config.userSearchBase || config.baseDn;
      const searchFilter =
        config.userSearchFilter || "(&(objectClass=user)(objectCategory=person)(!(objectClass=computer))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))";
      
      console.log(`[LDAP Sync] Search base: ${searchBase}`);
      console.log(`[LDAP Sync] Search filter: ${searchFilter}`);
      
      const searchOptions = {
        filter: searchFilter,
        scope: "sub" as const,
        sizeLimit: 500, // Ограничиваем до 500 пользователей за раз
        paged: {
          pageSize: 100, // По 100 пользователей на страницу
        },
      };

      client.search(
        searchBase,
        searchOptions,
        async (searchErr, searchRes) => {
          if (hasResolved) return;

          if (searchErr) {
            hasResolved = true;
            console.error(`[LDAP Sync] Search error:`, searchErr.message);
            try {
              client.unbind();
            } catch (e) {
              // ignore
            }
            resolve({
              success: false,
              usersFound: 0,
              usersCreated: 0,
              usersUpdated: 0,
              users: [],
              error: searchErr.message,
            });
            return;
          }

          const foundUsers: any[] = [];

          searchRes.on("searchEntry", (entry) => {
            try {
              console.log(`[LDAP Sync] Found user entry:`, entry.objectName);
              
              // Извлекаем атрибуты из entry
              const attributes: any = {};
              if (entry.attributes) {
                entry.attributes.forEach((attr: any) => {
                  const key = attr.type || attr._name;
                  const value = attr._vals?.[0] || attr.vals?.[0] || attr.value;
                  if (key && value) {
                    attributes[key] = value.toString();
                  }
                });
              }
              
              // Логируем атрибуты для отладки
              console.log(`[LDAP Sync] User attributes:`, attributes);
              
              const sAMAccountName = attributes.sAMAccountName || attributes.uid;
              const mail = attributes.mail || attributes.email;
              const displayName = attributes.displayName || attributes.cn;
              const userPrincipalName = attributes.userPrincipalName;
              
              if (!sAMAccountName) {
                console.log(`[LDAP Sync] Skipping entry - no sAMAccountName`);
                return;
              }

              // Пропускаем компьютеры (имена заканчиваются на $)
              if (sAMAccountName.endsWith('$')) {
                console.log(`[LDAP Sync] Skipping computer account: ${sAMAccountName}`);
                return;
              }

              // Пропускаем системные аккаунты
              const systemAccounts = ['krbtgt', 'Guest', 'DefaultAccount'];
              if (systemAccounts.some(acc => sAMAccountName.toLowerCase().includes(acc.toLowerCase()))) {
                console.log(`[LDAP Sync] Skipping system account: ${sAMAccountName}`);
                return;
              }
              
              const email =
                mail || userPrincipalName || `${sAMAccountName}@${config.baseDn?.replace(/DC=/g, "").replace(/,/g, ".")}`;
              const name = displayName || sAMAccountName;

              foundUsers.push({
                email,
                name,
                username: sAMAccountName,
                givenName: attributes.givenName,
                surname: attributes.sn,
              });
              
              console.log(`[LDAP Sync] Added user: ${name} (${email})`);
            } catch (error: any) {
              console.error(`[LDAP Sync] Error processing entry:`, error.message);
            }
          });

          searchRes.on("error", (err) => {
            // Игнорируем "Size Limit Exceeded" если мы уже нашли пользователей
            if (err.message && err.message.includes("Size Limit Exceeded")) {
              console.log(
                `[LDAP Sync] Size limit exceeded (OK), found ${foundUsers.length} users`
              );
              return;
            }

            if (hasResolved) return;
            hasResolved = true;

            console.error(`[LDAP Sync] Search result error:`, err.message);
            try {
              client.unbind();
            } catch (e) {
              // ignore
            }
            resolve({
              success: false,
              usersFound: foundUsers.length,
              usersCreated: 0,
              usersUpdated: 0,
              users: foundUsers,
              error: err.message,
            });
          });

          searchRes.on("end", async () => {
            if (hasResolved) return;
            hasResolved = true;

            try {
              client.unbind();
            } catch (e) {
              // ignore
            }

            console.log(`[LDAP Sync] Search completed. Found ${foundUsers.length} users`);

          // Синхронизируем пользователей с базой данных
          let usersCreated = 0;
          let usersUpdated = 0;
          let usersDeactivated = 0;

          const foundEmails = foundUsers.map(u => u.email);

          // Находим пользователей этой организации, которых больше нет в AD
          const usersToDeactivate = await prisma.user.findMany({
            where: {
              tenantId: config.tenantId,
              password: "", // Только LDAP пользователи (без локального пароля)
              email: {
                notIn: foundEmails,
              },
              isActive: true, // Деактивируем только активных
            },
            select: {
              id: true,
              email: true,
              name: true,
            },
          });

          // Деактивируем пользователей, которых больше нет в AD
          for (const user of usersToDeactivate) {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { 
                  isActive: false,
                },
              });
              usersDeactivated++;
              console.log(`[LDAP Sync] Deactivated user (removed from AD): ${user.email}`);
            } catch (error: any) {
              console.error(
                `[LDAP Sync] Error deactivating user ${user.email}:`,
                error.message
              );
            }
          }

          // Создаем/обновляем найденных пользователей
          for (const ldapUser of foundUsers) {
            try {
              const existingUser = await prisma.user.findUnique({
                where: { email: ldapUser.email },
              });

              if (existingUser) {
                // Обновляем существующего пользователя
                await prisma.user.update({
                  where: { email: ldapUser.email },
                  data: {
                    name: ldapUser.name,
                    isActive: true, // Активируем, если был деактивирован
                  },
                });
                usersUpdated++;
              } else {
                // Создаем нового пользователя
                await prisma.user.create({
                  data: {
                    email: ldapUser.email,
                    name: ldapUser.name,
                    password: "", // LDAP пользователи без пароля
                    role: "USER",
                    isActive: true,
                    tenantId: config.tenantId,
                  },
                });
                usersCreated++;
              }
            } catch (error: any) {
              console.error(
                `[LDAP Sync] Error syncing user ${ldapUser.email}:`,
                error.message
              );
            }
          }

            console.log(
              `[LDAP Sync] Completed. Created: ${usersCreated}, Updated: ${usersUpdated}, Deactivated: ${usersDeactivated}`
            );

            resolve({
              success: true,
              usersFound: foundUsers.length,
              usersCreated,
              usersUpdated,
              usersDeactivated,
              users: foundUsers.slice(0, 10), // Показываем первых 10 для превью
            });
          });
        }
      );
    });

    // Таймаут для синхронизации
    setTimeout(() => {
      if (hasResolved) return;
      hasResolved = true;
      console.log(`[LDAP Sync] Timeout`);
      try {
        client.unbind();
      } catch (e) {
        // ignore
      }
      resolve({
        success: false,
        usersFound: 0,
        usersCreated: 0,
        usersUpdated: 0,
        users: [],
        error: "Sync timeout (30 seconds)",
      });
    }, 30000);
  });
}

