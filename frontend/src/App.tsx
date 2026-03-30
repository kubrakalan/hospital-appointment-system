import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import { AuthProvider } from './AuthContext'
import AnaSayfa from './pages/AnaSayfa'
import Giris from './pages/Giris'
import Kayit from './pages/Kayit'
import HastaPaneli from './pages/HastaPaneli'
import DoktorPaneli from './pages/DoktorPaneli'
import AdminPaneli from './pages/AdminPaneli'
import ProfilSayfasi from './pages/ProfilSayfasi'
import SifreUnuttum from './pages/SifreUnuttum'
import SifreSifirla from './pages/SifreSifirla'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AnaSayfa />} />
            <Route path="/giris" element={<Giris />} />
            <Route path="/kayit" element={<Kayit />} />
            <Route path="/hasta" element={<HastaPaneli />} />
            <Route path="/doktor" element={<DoktorPaneli />} />
            <Route path="/admin" element={<AdminPaneli />} />
            <Route path="/profil" element={<ProfilSayfasi />} />
            <Route path="/sifremi-unuttum" element={<SifreUnuttum />} />
            <Route path="/sifre-sifirla" element={<SifreSifirla />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
