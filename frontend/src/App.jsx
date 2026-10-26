import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import Profile from './pages/Profile.jsx';
import Articles from './pages/Articles.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Movements from './pages/Movements.jsx';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          {/* Route publique de connexion */}
          <Route path="/login" element={<Login />} />

          {/* Route protégée par défaut : Tableau de bord */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Alias /dashboard protégé */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/articles"
            element={
              <ProtectedRoute allowedRoles={['admin', 'magasinier']}>
                <Articles />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fournisseurs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'magasinier']}>
                <Suppliers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mouvements"
            element={
              <ProtectedRoute allowedRoles={['admin', 'magasinier']}>
                <Movements />
              </ProtectedRoute>
            }
          />

          {/* Module Utilisateurs (Strictement réservé à l'Admin) */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Redirection des routes inconnues vers la racine */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
