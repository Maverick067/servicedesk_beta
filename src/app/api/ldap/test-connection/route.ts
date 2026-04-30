import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ldap from "ldapjs";

/**
 * POST /api/ldap/test-connection
 * Test connection to Active Directory
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

    // Only ADMIN and TENANT_ADMIN can test connections
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
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Build LDAP URL
    const protocol = useSSL ? "ldaps" : "ldap";
    const ldapUrl = `${protocol}://${serverAddress}:${port}`;

    // Build Base DN from domain
    const baseDn = `DC=${domain.split('.').join(',DC=')}`;
    
    // Build Bind DN (full admin login)
    const bindDn = `${adminUsername}@${domain}`;

    // Log connection attempt
    console.log(`[LDAP Test] Attempting to connect to ${ldapUrl}`);
    console.log(`[LDAP Test] Base DN: ${baseDn}`);
    console.log(`[LDAP Test] Bind DN: ${bindDn}`);

    return new Promise<NextResponse>((resolve) => {
      const clientOptions: any = {
        url: ldapUrl,
        timeout: 5000,
        connectTimeout: 5000,
        reconnect: false,
      };

      // If SSL is used, add TLS options
      if (useSSL) {
        clientOptions.tlsOptions = {
          rejectUnauthorized: false, // Allow self-signed certificates
          requestCert: true,
          agent: false,
        };
      }

      const client = ldap.createClient(clientOptions);

      let hasResolved = false;

      // Connection error handler
      client.on("error", (err) => {
        if (hasResolved) return;
        hasResolved = true;

        console.error("[LDAP Test] Connection error:", err.message);
        
        try {
          client.unbind();
        } catch (e) {
          // ignore
        }

        let errorMessage = "Failed to connect to server";
        
        if (err.message.includes("ENOTFOUND")) {
          errorMessage = `Server not found. Check address: ${serverAddress}`;
        } else if (err.message.includes("ETIMEDOUT") || err.message.includes("ECONNREFUSED")) {
          errorMessage = `Server unavailable. Check address and port: ${serverAddress}:${port}`;
        } else if (err.message.includes("ECONNRESET")) {
          errorMessage = "Connection reset. Try using a different port (636 for SSL)";
        } else {
          errorMessage = `Connection error: ${err.message}`;
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

      // Try to connect with admin credentials
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

          let errorMessage = "Invalid username or password";
          
          if (bindErr.message.includes("InvalidCredentials")) {
            errorMessage = "Invalid username or password. Check admin credentials";
          } else if (bindErr.message.includes("timeout")) {
            errorMessage = "Timeout exceeded. Check server address and port";
          } else {
            errorMessage = `Authentication error: ${bindErr.message}`;
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

        // Successful authentication! Now try to find users
        const searchOptions = {
          filter: "(&(objectClass=user)(objectCategory=person)(!(objectClass=computer))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))", // Exclude computers and disabled users
          scope: "sub" as const,
          sizeLimit: 5, // Reduce limit for test
          paged: {
            pageSize: 5, // Use pagination
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
                  error: `User search error: ${searchErr.message}`,
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
                // Extract attributes from entry
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
            
            // "Size Limit Exceeded" - normal for test, we still found users
            if (err.message && err.message.includes("Size Limit Exceeded")) {
              console.log("[LDAP Test] Size limit exceeded (OK for test), found users:", usersCount);
              // Don't mark as resolved, let it continue and finish in 'end'
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
                  error: `Error getting results: ${err.message}`,
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
              // Success!
              resolve(
                NextResponse.json({
                  success: true,
                  message: "Connection successfully established",
                  usersCount,
                  sampleUsers: sampleUsers.slice(0, 3), // Show first 3
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
                    error: `Search completed with error (code: ${result?.status})`,
                  },
                  { status: 400 }
                )
              );
            }
          });
        });
      });

      // Timeout in case of hanging (reduced to 5 sec)
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
              error: "Connection timeout (5 sec). Check server address and port availability.",
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

