import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import HomePage from './pages/HomePage';
import KeyVaultPage from './pages/KeyVaultPage';
import CostExplorerPage from './pages/CostExplorerPage';
import { ModeProvider } from './contexts/ModeContext';

//import { serviceManager } from './services/ServiceManager';

function App() {
  const [useMock, setUseMock] = React.useState(true);

  const toggleMockMode = () => {
    const newMode = !useMock;
    setUseMock(newMode);
    //serviceManager.setUseMock(newMode);
  };

  return (
    <ModeProvider>
      <Router>
        <div className="flex h-screen bg-gray-100">
          <Sidebar />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Header useMock={useMock} toggleMockMode={toggleMockMode} />

            <main className="flex-1 overflow-y-auto p-4">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/keyvault" element={<KeyVaultPage />} />
                <Route path="/cost" element={<CostExplorerPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ModeProvider>
  );
}

export default App;
