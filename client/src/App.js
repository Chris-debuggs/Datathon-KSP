import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';
import Search from './pages/Search';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Landing />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/chat"      element={<Chat />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/search"    element={<Search />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;