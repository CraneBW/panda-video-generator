import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isScriptsWizardEnabled } from "./lib/scripts-wizard-access";

const automationEntry =
  process.env.AUTOMATION_ENTRY === "1" ||
  process.env.AUTOMATION_ENTRY === "true";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    if (automationEntry && isScriptsWizardEnabled()) {
      return NextResponse.redirect(new URL("/scripts", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/scripts")) {
    if (!isScriptsWizardEnabled()) {
      return new NextResponse(null, { status: 404 });
    }
    if (
      pathname === "/scripts" &&
      !automationEntry &&
      process.env.NODE_ENV === "development"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/scripts/:path*"],
};
