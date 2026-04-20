import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminIstatistikEkrani from '../screens/admin/AdminIstatistikEkrani';
import AdminRandevularEkrani from '../screens/admin/AdminRandevularEkrani';
import AdminDoktorlarEkrani from '../screens/admin/AdminDoktorlarEkrani';
import AdminHastalarEkrani from '../screens/admin/AdminHastalarEkrani';
import AdminOdemelerEkrani from '../screens/admin/AdminOdemelerEkrani';
import AdminDuyuruEkrani from '../screens/admin/AdminDuyuruEkrani';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function AdminTabs({ navigation }: any) {
  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici', 'refreshToken']);
    navigation.replace('Giris');
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#7c3aed' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={cikisYap} style={{ marginRight: 16 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Çıkış</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen
        name="İstatistikler"
        component={AdminIstatistikEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📊" renk={color} /> }}
      />
      <Tab.Screen
        name="Randevular"
        component={AdminRandevularEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📅" renk={color} /> }}
      />
      <Tab.Screen
        name="Doktorlar"
        component={AdminDoktorlarEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👨‍⚕️" renk={color} /> }}
      />
      <Tab.Screen
        name="Hastalar"
        component={AdminHastalarEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👥" renk={color} /> }}
      />
      <Tab.Screen
        name="Ödemeler"
        component={AdminOdemelerEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="💳" renk={color} /> }}
      />
      <Tab.Screen
        name="Duyuru"
        component={AdminDuyuruEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📢" renk={color} /> }}
      />
    </Tab.Navigator>
  );
}
