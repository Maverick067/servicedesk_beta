import ldap from "ldapjs";
import { prisma } from "./prisma";

interface LdapAuthResult {
  success: boolean;
  user?: {
    email: string;
    name: string;
    username: string;
    tenantId: string; // Добавляем tenantId
  };
  error?: string;
}

/**
 * Пытается аутентифицировать пользователя через активные LDAP конфигурации
 */
export async function authenticateWithLdap(
  email: string,
  password: string
): Promise<LdapAuthResult> {
  try {
    // Получаем все активные LDAP конфигурации
    const ldapConfigs = await prisma.ldapConfig.findMany({
      where: {
        isActive: true,
        type: "ACTIVE_DIRECTORY",
      },
      select: {
        id: true,
        host: true,
        port: true,
        useSSL: true,
        baseDn: true,
        userSearchBase: true,
        userSearchFilter: true,
        tenantId: true,
      },
    });

    if (ldapConfigs.length === 0) {
      return { success: false, error: "No active LDAP configurations" };
    }

    // Пробуем каждую конфигурацию
    for (const config of ldapConfigs) {
      const result = await tryLdapAuth(config, email, password);
      if (result.success) {
        return result;
      }
    }

    return { success: false, error: "LDAP authentication failed" };
  } catch (error: any) {
    console.error("[LDAP Auth] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Пытается аутентифицировать пользователя через конкретную LDAP конфигурацию
 */
async function tryLdapAuth(
  config: any,
  email: string,
  password: string
): Promise<LdapAuthResult> {
  return new Promise((resolve) => {
    const protocol = config.useSSL ? "ldaps" : "ldap";
    const ldapUrl = `${protocol}://${config.host}:${config.port || (config.useSSL ? 636 : 389)}`;

    const clientOptions: any = {
      url: ldapUrl,
      timeout: 5000,
      connectTimeout: 5000,
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
      console.error(`[LDAP Auth] Connection error to ${ldapUrl}:`, err.message);
      try {
        client.unbind();
      } catch (e) {
        // ignore
      }
      resolve({ success: false, error: err.message });
    });

    // Извлекаем username из email (до @)
    const username = email.split("@")[0];
    
    // Формируем User Principal Name (UPN) для AD
    const userDn = email.includes("@") ? email : `${username}@${config.baseDn?.replace(/DC=/g, "").replace(/,/g, ".")}`;

    console.log(`[LDAP Auth] Trying to authenticate ${userDn} against ${ldapUrl}`);

    // Пытаемся авторизоваться как пользователь
    client.bind(userDn, password, (bindErr) => {
      if (hasResolved) return;

      if (bindErr) {
        hasResolved = true;
        console.error(`[LDAP Auth] Bind failed for ${userDn}:`, bindErr.message);
        try {
          client.unbind();
        } catch (e) {
          // ignore
        }
        resolve({ success: false, error: bindErr.message });
        return;
      }

      console.log(`[LDAP Auth] Bind successful for ${userDn}, fetching user info...`);

      // Успешная аутентификация! Теперь получаем информацию о пользователе
      const searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${email})(mail=${email}))`;
      const searchOptions = {
        filter: searchFilter,
        scope: "sub" as const,
        sizeLimit: 1,
        attributes: ["cn", "displayName", "sAMAccountName", "mail", "userPrincipalName"],
      };

      client.search(config.userSearchBase || config.baseDn, searchOptions, (searchErr, searchRes) => {
        if (hasResolved) return;

        if (searchErr) {
          hasResolved = true;
          console.error(`[LDAP Auth] Search error:`, searchErr.message);
          try {
            client.unbind();
          } catch (e) {
            // ignore
          }
          resolve({ success: false, error: searchErr.message });
          return;
        }

        let userFound = false;

        searchRes.on("searchEntry", (entry) => {
          if (hasResolved || userFound) return;
          userFound = true;
          hasResolved = true;

          const obj = entry.object as any;
          const userEmail = obj.mail || obj.userPrincipalName || email;
          const userName = obj.displayName || obj.cn || username;

          console.log(`[LDAP Auth] User found: ${userName} (${userEmail})`);

          try {
            client.unbind();
          } catch (e) {
            // ignore
          }

          resolve({
            success: true,
            user: {
              email: userEmail,
              name: userName,
              username: obj.sAMAccountName || username,
              tenantId: config.tenantId, // Привязываем к организации
            },
          });
        });

        searchRes.on("error", (err) => {
          if (hasResolved) return;
          
          // Игнорируем "Size Limit Exceeded" если мы уже нашли пользователя
          if (userFound) return;

          hasResolved = true;
          console.error(`[LDAP Auth] Search result error:`, err.message);
          try {
            client.unbind();
          } catch (e) {
            // ignore
          }
          resolve({ success: false, error: err.message });
        });

        searchRes.on("end", () => {
          if (hasResolved) return;
          hasResolved = true;

          try {
            client.unbind();
          } catch (e) {
            // ignore
          }

          if (!userFound) {
            console.error(`[LDAP Auth] User not found in LDAP directory`);
            resolve({ success: false, error: "User not found in LDAP directory" });
          }
        });
      });
    });

    // Таймаут
    setTimeout(() => {
      if (hasResolved) return;
      hasResolved = true;
      console.log(`[LDAP Auth] Timeout for ${ldapUrl}`);
      try {
        client.unbind();
      } catch (e) {
        // ignore
      }
      resolve({ success: false, error: "Connection timeout" });
    }, 5000);
  });
}
