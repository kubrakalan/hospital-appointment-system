import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import AnaSayfa from './pages/AnaSayfa'
import Giris from './pages/Giris'
import Kayit from './pages/Kayit'
import HastaPaneli from './pages/HastaPaneli'
import DoktorPaneli from './pages/DoktorPaneli'
import AdminPaneli from './pages/AdminPaneli'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AnaSayfa />} />
          <Route path="/giris" element={<Giris />} />
          <Route path="/kayit" element={<Kayit />} />
          <Route path="/hasta" element={<HastaPaneli />} />
          <Route path="/doktor" element={<DoktorPaneli />} />
          <Route path="/admin" element={<AdminPaneli />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
