import { Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomTabBar } from "./BottomTabBar";

/**
 * Two layout modes:
 *  - "fullscreen" pages (Home, Timer): NO AppHeader and NO max-width container — page renders edge-to-edge.
 *  - default pages: header + container + bottom tabs.
 */
const FULLSCREEN_ROUTES = ["/", "/timer"];

export const AppLayout = () => {
  const { pathname } = useLocation();
  const fullscreen = FULLSCREEN_ROUTES.includes(pathname);

  if (fullscreen) {
    return (
      <div className="min-h-screen bg-background">
        <div key={pathname} className="animate-page-in">
          <Outlet />
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main key={pathname} className="pb-safe animate-page-in mx-auto max-w-md px-4 pb-32 pt-4">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
};
