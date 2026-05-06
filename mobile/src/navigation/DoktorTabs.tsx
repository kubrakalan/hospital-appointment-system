import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DoktorAnaSayfaEkrani from '../screens/doktor/DoktorAnaSayfaEkrani';
import DoktorRandevularEkrani from '../screens/doktor/DoktorRandevularEkrani';
import DoktorHastalarEkrani from '../screens/doktor/DoktorHastalarEkrani';
import DoktorIstatistikEkrani from '../screens/doktor/DoktorIstatistikEkrani';
import DoktorCalismaSaatleriEkrani from '../screens/doktor/DoktorCalismaSaatleriEkrani';
import ProfilEkrani from '../screens/ProfilEkrani';
import { api } from '../api';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function DoktorTabs({ navigation }: any) {
  const [bekleyenSayi, setBekleyenSayi] = useState(0);

  useEffect(() => {
    fetchBekleyenler();
    const interval = setInterval(fetchBekleyenler, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBekleyenler() {
    try {
      const data = await api.doktorRandevular();
      const bekleyen = Array.isArray(data)
        ? data.filter((r: any) => r.Durum === 'Beklemede').length
        : 0;
      setBekleyenSayi(bekleyen);
    } catch { }
  }

  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici', 'refreshToken']);
    navigation.replace('Giris');
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#10b981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 16 }}>
            {bekleyenSayi > 0 && (
              <View style={{ position: 'relative' }}>
                <Text style={{ fontSize: 20 }}>⏳</Text>
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: '#f59e0b', borderRadius: 8,
                  minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{bekleyenSayi}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity onPress={cikisYap}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Çıkış</Text>
            </TouchableOpacity>
          </View>
        ),
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen
        name="Ana Sayfa"
        component={DoktorAnaSayfaEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="🏠" renk={color} /> }}
      />
      <Tab.Screen
        name="Randevularım"
        component={DoktorRandevularEkrani}
        options={{
          tabBarIcon: ({ color }) => <Ikon emj="📅" renk={color} />,
          tabBarBadge: bekleyenSayi > 0 ? bekleyenSayi : undefined,
        }}
      />
      <Tab.Screen
        name="Hastalarım"
        component={DoktorHastalarEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👥" renk={color} /> }}
      />
      <Tab.Screen
        name="İstatistiklerim"
        component={DoktorIstatistikEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📊" renk={color} /> }}
      />
      <Tab.Screen
        name="Çalışma Saatleri"
        component={DoktorCalismaSaatleriEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="🕐" renk={color} /> }}
      />
      <Tab.Screen
        name="Profilim"
        component={ProfilEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👤" renk={color} /> }}
      />
    </Tab.Navigator>
  );
}
