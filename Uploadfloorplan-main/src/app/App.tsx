import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import UploadSuccessPage from "./pages/UploadSuccessPage";
import ResultsPage from "./pages/ResultsPage";
import DashboardPage from "./pages/DashboardPage";
import PricingPage from "./pages/PricingPage";

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Render the appropriate page based on current path
  switch (currentPath) {
    case '/dashboard':
      return <DashboardPage />;
    case '/pricing':
      return <PricingPage />;
    case '/upload-success':
      return <UploadSuccessPage />;
    case '/results':
      return <ResultsPage />;
    default:
      return <HomePage />;
  }
}
