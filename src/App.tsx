import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import StaffManagement from "./pages/StaffManagement";
import StudentManagement from "./pages/StudentManagement";
import GateTerminal from "./pages/GateTerminal";
import AccessLogs from "./pages/AccessLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/staff" element={<Layout><StaffManagement /></Layout>} />
          <Route path="/students" element={<Layout><StudentManagement /></Layout>} />
          <Route path="/gate" element={<GateTerminal />} />
          <Route path="/logs" element={<Layout><AccessLogs /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
