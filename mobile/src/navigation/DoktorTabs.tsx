import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DoktorRandevularEkrani from '../screens/doktor/DoktorRandevularEkrani';
import DoktorIstatistikEkrani from '../screens/doktor/DoktorIstatistikEkrani';
import DoktorCalismaSaatleriEkrani from '../screens/doktor/DoktorCalismaSaatleriEkrani';
import ProfilEkrani from '../screens/ProfilEkrani';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function DoktorTabs({ navigation }: any) {
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
          <TouchableOpacity onPress={cikisYap} style={{ marginRight: 16 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Çıkış</Text>
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen
        name="Randevularım"
        component={DoktorRandevularEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📅" renk={color} /> }}
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
