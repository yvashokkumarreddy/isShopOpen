import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ShopDetailPage from './pages/ShopDetailPage';
import AddShopPage from './pages/AddShopPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="shop/:id" element={<ShopDetailPage />} />
          <Route path="add" element={<AddShopPage />} />
          <Route path="*" element={<div className="p-4 text-center">404 - Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
