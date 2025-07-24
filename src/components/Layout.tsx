import { ReactNode } from "react";
import Navigation from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-64 flex-shrink-0">
        <Navigation />
      </div>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;