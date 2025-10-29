import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * GET /api/tenants/[id]/custom-domain - Get custom domain settings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: tenantId } = params;

    // For TENANT_ADMIN check that this is their tenant
    if (user.role === "TENANT_ADMIN" && user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        customDomain: true,
        customDomainVerified: true,
        dnsVerificationToken: true,
        sslEnabled: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ domain: tenant });
  } catch (error) {
    console.error("[Custom Domain GET Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenants/[id]/custom-domain - Set custom domain
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: tenantId } = params;

    if (user.role === "TENANT_ADMIN" && user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { customDomain } = body;

    if (!customDomain) {
      return NextResponse.json(
        { error: "Custom domain is required" },
        { status: 400 }
      );
    }

    // Domain validation
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(customDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Check if domain is already taken
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        customDomain,
        id: {
          not: tenantId,
        },
      },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Domain is already taken" },
        { status: 400 }
      );
    }

    // Generate token for DNS verification
    const verificationToken = `onpoints-verify=${randomBytes(16).toString("hex")}`;

    // Update tenant
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain,
        customDomainVerified: false,
        dnsVerificationToken: verificationToken,
        sslEnabled: false,
      },
      select: {
        customDomain: true,
        customDomainVerified: true,
        dnsVerificationToken: true,
        sslEnabled: true,
      },
    });

    return NextResponse.json({ domain: tenant });
  } catch (error) {
    console.error("[Custom Domain POST Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenants/[id]/custom-domain/verify - Verify DNS verification
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: tenantId } = params;

    if (user.role === "TENANT_ADMIN" && user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        customDomain: true,
        dnsVerificationToken: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (!tenant.customDomain || !tenant.dnsVerificationToken) {
      return NextResponse.json(
        { error: "No custom domain configured" },
        { status: 400 }
      );
    }

    // Check DNS TXT record
    const dnsVerified = await verifyDnsRecord(
      tenant.customDomain,
      tenant.dnsVerificationToken
    );

    if (!dnsVerified) {
      return NextResponse.json(
        { error: "DNS verification failed", verified: false },
        { status: 400 }
      );
    }

    // Update verification status
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomainVerified: true,
      },
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("[Custom Domain Verify Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenants/[id]/custom-domain - Delete custom domain
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: tenantId } = params;

    if (user.role === "TENANT_ADMIN" && user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        dnsVerificationToken: null,
        sslEnabled: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Custom Domain DELETE Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Verify DNS TXT record for domain verification
 */
async function verifyDnsRecord(
  domain: string,
  expectedToken: string
): Promise<boolean> {
  try {
    // In production use dns library or external API
    // For example: Google DNS API, Cloudflare DNS API, or Node.js dns.resolveTxt()
    
    // For demo version just return true
    // In reality need to check TXT record _onpoints-verify.domain
    console.log(`[DNS Verification] Checking TXT record for ${domain}`);
    console.log(`[DNS Verification] Expected: ${expectedToken}`);
    
    // TODO: Implement real DNS verification
    // const txtRecords = await dns.resolveTxt(`_onpoints-verify.${domain}`);
    // return txtRecords.some(record => record.join('') === expectedToken);
    
    return true; // Demo mode
  } catch (error) {
    console.error("[DNS Verification Error]", error);
    return false;
  }
}

