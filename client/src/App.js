import { HashRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import Search from './pages/Search';
import Graph from './pages/Graph';
import FIRDetail from './pages/FIRDetail';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const session = localStorage.getItem('astra_user');
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/graph" element={<ProtectedRoute><Graph /></ProtectedRoute>} />
        <Route path="/fir/:id" element={<ProtectedRoute><FIRDetail /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  );
}

export default App;