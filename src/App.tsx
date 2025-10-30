import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { PublicWorkflowCatalog } from './pages/PublicWorkflowCatalog';
import { DocumentsPage } from './pages/DocumentsPage';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { WorkflowStartPage } from './pages/WorkflowStartPage';
import { TrackingPage } from './pages/TrackingPage';
import { MyEntitiesPage } from './pages/MyEntitiesPage';
import { EntityDetailPage } from './pages/EntityDetailPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Routes>
            {/* Public routes */}
            <Route path="/services" element={<PublicWorkflowCatalog />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/services/:id" element={<WorkflowDetail />} />
            <Route path="/start/:workflowId" element={<WorkflowStartPage />} />
            <Route path="/track/:instanceId" element={<TrackingPage />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/my-entities" 
              element={
                <ProtectedRoute>
                  <MyEntitiesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/entity/:entityId" 
              element={
                <ProtectedRoute>
                  <EntityDetailPage />
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
  </CustomThemeProvider>
  );
}

export default App;
