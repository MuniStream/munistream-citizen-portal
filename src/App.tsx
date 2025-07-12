import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { PublicWorkflowCatalog } from './pages/PublicWorkflowCatalog';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/services" element={<PublicWorkflowCatalog />} />
            <Route path="/services/:id" element={<WorkflowDetail />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect to public catalog */}
            <Route path="/" element={<Navigate to="/services" replace />} />
            
            {/* Catch all - redirect to services */}
            <Route path="*" element={<Navigate to="/services" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
