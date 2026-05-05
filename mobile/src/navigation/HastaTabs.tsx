import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnaSayfaEkrani from '../screens/hasta/AnaSayfaEkrani';
import RandevularEkrani from '../screens/hasta/RandevularEkrani';
import RandevuAlEkrani from '../screens/hasta/RandevuAlEkrani';
import TibbiGecmisEkrani from '../screens/hasta/TibbıGecmisEkrani';
import SaglikTakibiEkrani from '../screens/hasta/SaglikTakibiEkrani';
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
    const interval = setInterval(fetchBildirimler, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBildirimler() {
    try {
      const data = await api.bildirimler();
      const okunmamis = Array.isArray(data) ? data.filter((b: any) => !b.Okundu).length : 0;
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Bildirimler')} style={{ position: 'relative' }}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
              {bildirimSayisi > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: '#ef4444', borderRadius: 8,
                  minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{bildirimSayisi}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={cikisYap}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Çıkış</Text>
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen name="Ana Sayfa" component={AnaSayfaEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="🏠" renk={color} /> }} />
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
      <Tab.Screen name="Sağlık" component={SaglikTakibiEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="❤️" renk={color} /> }} />
      <Tab.Screen name="Ödemelerim" component={OdemelerEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="💳" renk={color} /> }} />
      <Tab.Screen name="Profilim" component={ProfilEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👤" renk={color} /> }} />
    </Tab.Navigator>
  );
}
