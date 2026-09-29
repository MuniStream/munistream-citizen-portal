import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginDialogProvider } from './contexts/LoginDialogContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { PublicWorkflowCatalog } from './pages/PublicWorkflowCatalog';
import { DocumentsPage } from './pages/DocumentsPage';
import { WorkflowDetail } from './pages/WorkflowDetail';
import { WorkflowStartPage } from './pages/WorkflowStartPage';
import { InstanceDetail } from './pages/InstanceDetail';
import { MyEntitiesPage } from './pages/MyEntitiesPage';
import { MyInstancesPage } from './pages/MyInstancesPage';
import { EntityDetailPage } from './pages/EntityDetailPage';
import { VerificationPage } from './pages/VerificationPage';
import { NotificationPreferencesPage } from './pages/NotificationPreferencesPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <LoginDialogProvider>
        <Router>
          <div className="app">
            {/*
              Sin esto, una excepción en cualquier render desmonta el árbol entero
              y el ciudadano ve una página en blanco, sin mensaje y sin salida. Ha
              pasado al menos dos veces (el visor de entidad y el detalle del
              trámite). Arreglar cada causa es necesario; esto acota el daño de la
              siguiente.
            */}
            <ErrorBoundary nombre="rutas">
            <Routes>
            {/* Public routes */}
            <Route path="/services" element={<PublicWorkflowCatalog />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/services/:id" element={<WorkflowDetail />} />
            <Route path="/start/:workflowId" element={<WorkflowStartPage />} />
            <Route path="/instances/:id" element={<InstanceDetail />} />
            <Route path="/verify/:entityId" element={<VerificationPage />} />
            
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
              path="/instances"
              element={
                <ProtectedRoute>
                  <MyInstancesPage />
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
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <NotificationPreferencesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            
            {/* Default redirect to public catalog */}
            <Route path="/" element={<Navigate to="/services" replace />} />
            
            {/* Catch all - redirect to services */}
            <Route path="*" element={<Navigate to="/services" replace />} />
          </Routes>
            </ErrorBoundary>
        </div>
      </Router>
        </LoginDialogProvider>
    </AuthProvider>
  </CustomThemeProvider>
  );
}

export default App;
