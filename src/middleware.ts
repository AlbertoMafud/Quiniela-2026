import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-edge";

// OJO: con directorio `src/`, Next.js busca el middleware en `src/middleware.ts`
// (no en la raíz). El antiguo `middleware.ts` de la raíz nunca corría; la auth
// dependía solo de los layouts. Aquí el gate vuelve a vivir + el `?next`.
const PUBLIC_PATHS = ["/login", "/registro", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token, process.env.SESSION_SECRET);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplica a todo excepto: _next, favicon, archivos públicos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|manifest|webmanifest)$).*)",
  ],
};
