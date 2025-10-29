import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ldap from "ldapjs";

/**
 * GET /api/cron/ldap-sync
 * Automatic synchronization of all active LDAP configurations
 * Called on schedule (e.g., every hour)
 */
export async function GET(req: NextRequest) {
  try {
    // Check secret key to protect cron endpoint
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[LDAP Cron] Starting scheduled sync...");

    // Get all active LDAP configurations with synchronization enabled
    const configs = await prisma.ldapConfig.findMany({
      where: {
        isActive: true,
        syncEnabled: true,
        type: "ACTIVE_DIRECTORY",
      },
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
        syncInterval: true,
        lastSyncAt: true,
      },
    });

    console.log(`[LDAP Cron] Found ${configs.length} configs to sync`);

    const results = [];

    for (const config of configs) {
      // Check if this config needs to be synced
      const shouldSync = !config.lastSyncAt || 
        (Date.now() - new Date(config.lastSyncAt).getTime()) > (config.syncInterval || 3600) * 1000;

      if (!shouldSync) {
        console.log(`[LDAP Cron] Skipping ${config.name} - synced recently`);
        continue;
      }

      console.log(`[LDAP Cron] Syncing ${config.name}...`);

      try {
        const syncResult = await syncUsersFromLdap(config);
        
        // Update last sync time
        await prisma.ldapConfig.update({
          where: { id: config.id },
          data: { lastSyncAt: new Date() },
        });

        results.push({
          configId: config.id,
          configName: config.name,
          ...syncResult,
        });

        console.log(
          `[LDAP Cron] ${config.name}: Created ${syncResult.usersCreated}, Updated ${syncResult.usersUpdated}`
        );
      } catch (error: any) {
        console.error(`[LDAP Cron] Error syncing ${config.name}:`, error.message);
        results.push({
          configId: config.id,
          configName: config.name,
          success: false,
          error: error.message,
        });
      }
    }

    console.log("[LDAP Cron] Sync completed");

    return NextResponse.json({
      success: true,
      totalConfigs: configs.length,
      results,
    });
  } catch (error: any) {
    console.error("[LDAP Cron] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync" },
      { status: 500 }
    );
  }
}

/**
 * Synchronize users from LDAP/AD
 */
async function syncUsersFromLdap(config: any): Promise<{
  success: boolean;
  usersFound: number;
  usersCreated: number;
  usersUpdated: number;
  usersDeactivated?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    const protocol = config.useSSL ? "ldaps" : "ldap";
    const ldapUrl = `${protocol}://${config.host}:${config.port || (config.useSSL ? 636 : 389)}`;

    const clientOptions: any = {
      url: ldapUrl,
      timeout: 30000,
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
        error: err.message,
      });
    });

    client.bind(config.bindDn, config.bindPassword, (bindErr) => {
      if (hasResolved) return;

      if (bindErr) {
        hasResolved = true;
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
          error: bindErr.message,
        });
        return;
      }

      const searchBase = config.userSearchBase || config.baseDn;
      const searchFilter =
        config.userSearchFilter || "(&(objectClass=user)(objectCategory=person)(!(objectClass=computer))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))";

      const searchOptions = {
        filter: searchFilter,
        scope: "sub" as const,
        sizeLimit: 500,
        paged: {
          pageSize: 100,
        },
      };

      client.search(searchBase, searchOptions, async (searchErr, searchRes) => {
        if (hasResolved) return;

        if (searchErr) {
          hasResolved = true;
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
            error: searchErr.message,
          });
          return;
        }

        const foundUsers: any[] = [];

        searchRes.on("searchEntry", (entry) => {
          try {
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

            const sAMAccountName = attributes.sAMAccountName || attributes.uid;
            
            if (!sAMAccountName) return;
            if (sAMAccountName.endsWith('$')) return; // Computers
            
            const systemAccounts = ['krbtgt', 'Guest', 'DefaultAccount'];
            if (systemAccounts.some(acc => sAMAccountName.toLowerCase().includes(acc.toLowerCase()))) {
              return;
            }

            const mail = attributes.mail || attributes.email;
            const displayName = attributes.displayName || attributes.cn;
            const userPrincipalName = attributes.userPrincipalName;
            
            const email =
              mail || userPrincipalName || `${sAMAccountName}@${config.baseDn?.replace(/DC=/g, "").replace(/,/g, ".")}`;
            const name = displayName || sAMAccountName;

            foundUsers.push({
              email,
              name,
              username: sAMAccountName,
            });
          } catch (error: any) {
            // Ignore errors processing individual entries
          }
        });

        searchRes.on("error", (err) => {
          if (err.message && err.message.includes("Size Limit Exceeded")) {
            return; // Ignore
          }
          if (hasResolved) return;
          hasResolved = true;
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

          // Synchronize users with database
          let usersCreated = 0;
          let usersUpdated = 0;
          let usersDeactivated = 0;

          const foundEmails = foundUsers.map(u => u.email);

          // Deactivate users that are no longer in AD
          const usersToDeactivate = await prisma.user.findMany({
            where: {
              tenantId: config.tenantId,
              password: "",
              email: { notIn: foundEmails },
              isActive: true,
            },
          });

          for (const user of usersToDeactivate) {
            await prisma.user.update({
              where: { id: user.id },
              data: { isActive: false },
            });
            usersDeactivated++;
          }

          // Create/update found users
          for (const ldapUser of foundUsers) {
            try {
              const existingUser = await prisma.user.findUnique({
                where: { email: ldapUser.email },
              });

              if (existingUser) {
                await prisma.user.update({
                  where: { email: ldapUser.email },
                  data: { 
                    name: ldapUser.name,
                    isActive: true, // Reactivate if was deactivated
                  },
                });
                usersUpdated++;
              } else {
                await prisma.user.create({
                  data: {
                    email: ldapUser.email,
                    name: ldapUser.name,
                    password: "",
                    role: "USER",
                    isActive: true,
                    tenantId: config.tenantId,
                  },
                });
                usersCreated++;
              }
            } catch (error: any) {
              console.error(`[LDAP Sync] Error syncing user ${ldapUser.email}:`, error.message);
            }
          }

          resolve({
            success: true,
            usersFound: foundUsers.length,
            usersCreated,
            usersUpdated,
            usersDeactivated,
          });
        });
      });
    });

    setTimeout(() => {
      if (hasResolved) return;
      hasResolved = true;
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
        error: "Sync timeout (30 seconds)",
      });
    }, 30000);
  });
}

