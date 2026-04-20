import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RandevularEkrani from '../screens/hasta/RandevularEkrani';
import RandevuAlEkrani from '../screens/hasta/RandevuAlEkrani';
import TibbiGecmisEkrani from '../screens/hasta/TibbıGecmisEkrani';
import OdemelerEkrani from '../screens/hasta/OdemelerEkrani';
import ProfilEkrani from '../screens/ProfilEkrani';
import { api } from '../api';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function HastaTabs({ navigation }: any) {
  const [bildirimSayisi, setBildirimSayisi] = useState(0);

  useEffect(() => {
    fetchBildirimler();
    const interval = setInterval(fetchBildirimler, 60000); // Her dakika kontrol
    return () => clearInterval(interval);
  }, []);

  async function fetchBildirimler() {
    try {
      const data = await api.bildirimler();
      const okunmamis = Array.isArray(data) ? data.filter((b: any) => !b.OkunduMu).length : 0;
      setBildirimSayisi(okunmamis);
    } catch { }
  }

  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici', 'refreshToken']);
    navigation.replace('Giris');
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0ea5e9' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={cikisYap} style={{ marginRight: 16 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Çıkış</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen
        name="Randevularım"
        component={RandevularEkrani}
        options={{
          tabBarIcon: ({ color }) => <Ikon emj="📋" renk={color} />,
          tabBarBadge: bildirimSayisi > 0 ? bildirimSayisi : undefined,
        }}
      />
      <Tab.Screen name="Randevu Al" component={RandevuAlEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="➕" renk={color} /> }} />
      <Tab.Screen name="Tıbbi Geçmişim" component={TibbiGecmisEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="🗂️" renk={color} /> }} />
      <Tab.Screen name="Ödemelerim" component={OdemelerEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="💳" renk={color} /> }} />
      <Tab.Screen name="Profilim" component={ProfilEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👤" renk={color} /> }} />
    </Tab.Navigator>
  );
}
