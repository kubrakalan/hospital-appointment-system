import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import DoktorRandevularEkrani from '../screens/doktor/DoktorRandevularEkrani';
import DoktorIstatistikEkrani from '../screens/doktor/DoktorIstatistikEkrani';
import ProfilEkrani from '../screens/ProfilEkrani';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function DoktorTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#10b981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <Text
            style={{ color: '#fff', marginRight: 16, fontSize: 13, fontWeight: '600' }}
            onPress={async () => {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.multiRemove(['token', 'kullanici']);
              navigation.replace('Giris');
            }}
          >
            Çıkış
          </Text>
        ),
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen name="Randevularım" component={DoktorRandevularEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📅" renk={color} /> }} />
      <Tab.Screen name="İstatistiklerim" component={DoktorIstatistikEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📊" renk={color} /> }} />
      <Tab.Screen name="Profilim" component={ProfilEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👤" renk={color} /> }} />
    </Tab.Navigator>
  );
}
