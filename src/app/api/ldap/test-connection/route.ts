import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ldap from "ldapjs";

/**
 * POST /api/ldap/test-connection
 * Тестирование подключения к Active Directory
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Только ADMIN и TENANT_ADMIN могут тестировать подключения
    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "TENANT_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      serverAddress, 
      domain, 
      adminUsername, 
      adminPassword,
      port = 389,
      useSSL = false 
    } = body;

    if (!serverAddress || !domain || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Все поля обязательны для заполнения" },
        { status: 400 }
      );
    }

    // Формируем URL для LDAP
    const protocol = useSSL ? "ldaps" : "ldap";
    const ldapUrl = `${protocol}://${serverAddress}:${port}`;

    // Формируем Base DN из домена
    const baseDn = `DC=${domain.split('.').join(',DC=')}`;
    
    // Формируем Bind DN (полный логин администратора)
    const bindDn = `${adminUsername}@${domain}`;

    // Логируем попытку подключения
    console.log(`[LDAP Test] Attempting to connect to ${ldapUrl}`);
    console.log(`[LDAP Test] Base DN: ${baseDn}`);
    console.log(`[LDAP Test] Bind DN: ${bindDn}`);

    return new Promise((resolve) => {
      const clientOptions: any = {
        url: ldapUrl,
        timeout: 5000,
        connectTimeout: 5000,
        reconnect: false,
      };

      // Если используется SSL, добавляем опции TLS
      if (useSSL) {
        clientOptions.tlsOptions = {
          rejectUnauthorized: false, // Разрешаем самоподписанные сертификаты
          requestCert: true,
          agent: false,
        };
      }

      const client = ldap.createClient(clientOptions);

      let hasResolved = false;

      // Обработчик ошибок подключения
      client.on("error", (err) => {
        if (hasResolved) return;
        hasResolved = true;

        console.error("[LDAP Test] Connection error:", err.message);
        
        try {
          client.unbind();
        } catch (e) {
          // ignore
        }

        let errorMessage = "Не удалось подключиться к серверу";
        
        if (err.message.includes("ENOTFOUND")) {
          errorMessage = `Сервер не найден. Проверьте адрес: ${serverAddress}`;
        } else if (err.message.includes("ETIMEDOUT") || err.message.includes("ECONNREFUSED")) {
          errorMessage = `Сервер недоступен. Проверьте адрес и порт: ${serverAddress}:${port}`;
        } else if (err.message.includes("ECONNRESET")) {
          errorMessage = "Соединение разорвано. Попробуйте использовать другой порт (636 для SSL)";
        } else {
          errorMessage = `Ошибка подключения: ${err.message}`;
        }

        resolve(
          NextResponse.json(
            {
              success: false,
              error: errorMessage,
            },
            { status: 400 }
          )
        );
      });

      // Пытаемся подключиться с учетными данными администратора
      client.bind(bindDn, adminPassword, (bindErr) => {
        if (hasResolved) return;

        if (bindErr) {
          hasResolved = true;
          console.error("[LDAP Test] Bind error:", bindErr.message);
          
          try {
            client.unbind();
          } catch (e) {
            // ignore
          }

          let errorMessage = "Неверный логин или пароль";
          
          if (bindErr.message.includes("InvalidCredentials")) {
            errorMessage = "Неверный логин или пароль. Проверьте учетные данные администратора";
          } else if (bindErr.message.includes("timeout")) {
            errorMessage = "Превышено время ожидания. Проверьте адрес сервера и порт";
          } else {
            errorMessage = `Ошибка аутентификации: ${bindErr.message}`;
          }

          resolve(
            NextResponse.json(
              {
                success: false,
                error: errorMessage,
              },
              { status: 400 }
            )
          );
          return;
        }

        console.log("[LDAP Test] Bind successful, searching for users...");

        // Успешная аутентификация! Теперь попробуем найти пользователей
        const searchOptions = {
          filter: "(&(objectClass=user)(objectCategory=person)(!(objectClass=computer))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))", // Исключаем компьютеры и отключенных пользователей
          scope: "sub" as const,
          sizeLimit: 5, // Уменьшаем лимит для теста
          paged: {
            pageSize: 5, // Используем пагинацию
          },
        };

        client.search(baseDn, searchOptions, (searchErr, searchRes) => {
          if (hasResolved) return;

          if (searchErr) {
            hasResolved = true;
            console.error("[LDAP Test] Search error:", searchErr.message);
            
            try {
              client.unbind();
            } catch (e) {
              // ignore
            }

            resolve(
              NextResponse.json(
                {
                  success: false,
                  error: `Ошибка поиска пользователей: ${searchErr.message}`,
                },
                { status: 400 }
              )
            );
            return;
          }

          let usersCount = 0;
          const sampleUsers: any[] = [];

          searchRes.on("searchEntry", (entry) => {
            usersCount++;
            
            if (sampleUsers.length < 5) {
              try {
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
                
                sampleUsers.push({
                  cn: attributes.cn || attributes.displayName || "N/A",
                  username: attributes.sAMAccountName || attributes.uid || "N/A",
                  email: attributes.mail || attributes.userPrincipalName || "N/A",
                });
              } catch (error: any) {
                console.error(`[LDAP Test] Error processing entry:`, error.message);
              }
            }
          });

          searchRes.on("error", (err) => {
            if (hasResolved) return;

            console.error("[LDAP Test] Search result error:", err.message);
            
            // "Size Limit Exceeded" - это нормально для теста, мы всё равно нашли пользователей
            if (err.message && err.message.includes("Size Limit Exceeded")) {
              console.log("[LDAP Test] Size limit exceeded (OK for test), found users:", usersCount);
              // Не помечаем как resolved, пусть продолжит и завершится в 'end'
              return;
            }

            hasResolved = true;
            
            try {
              client.unbind();
            } catch (e) {
              // ignore
            }

            resolve(
              NextResponse.json(
                {
                  success: false,
                  error: `Ошибка при получении результатов: ${err.message}`,
                },
                { status: 400 }
              )
            );
          });

          searchRes.on("end", (result) => {
            if (hasResolved) return;
            hasResolved = true;

            try {
              client.unbind();
            } catch (e) {
              // ignore
            }

            console.log(`[LDAP Test] Search completed. Found ${usersCount} users`);

            if (result?.status === 0) {
              // Успех!
              resolve(
                NextResponse.json({
                  success: true,
                  message: "Подключение успешно установлено",
                  usersCount,
                  sampleUsers: sampleUsers.slice(0, 3), // Показываем первых 3
                  config: {
                    baseDn,
                    bindDn,
                    ldapUrl,
                  },
                })
              );
            } else {
              resolve(
                NextResponse.json(
                  {
                    success: false,
                    error: `Поиск завершился с ошибкой (код: ${result?.status})`,
                  },
                  { status: 400 }
                )
              );
            }
          });
        });
      });

      // Таймаут на случай зависания (уменьшили до 5 сек)
      setTimeout(() => {
        if (hasResolved) return;
        hasResolved = true;

        console.log("[LDAP Test] Connection timeout");

        try {
          client.unbind();
        } catch (e) {
          // ignore
        }

        resolve(
          NextResponse.json(
            {
              success: false,
              error: "Превышено время ожидания подключения (5 сек). Проверьте адрес сервера и доступность порта.",
            },
            { status: 408 }
          )
        );
      }, 5000);
    });
  } catch (error: any) {
    console.error("Error testing LDAP connection:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}

