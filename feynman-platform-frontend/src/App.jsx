// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout'; // 引入Layout
import ProtectedRoute from './components/ProtectedRoute'; // 引入
import KnowledgePointFormPage from './pages/KnowledgePointFormPage'; // 引入
import FeynmanRecordPage from './pages/FeynmanRecordPage'; // 引入
import QuizPage from './pages/QuizPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 公共路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* 受保护的路由 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          {/* 未来其他的受保护页面也可以放在这里 */}
        </Route>
      </Route>
    </Routes>
  );
}
export default App;
