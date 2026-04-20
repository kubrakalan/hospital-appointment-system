import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import RandevularEkrani from '../screens/hasta/RandevularEkrani';
import RandevuAlEkrani from '../screens/hasta/RandevuAlEkrani';
import TibbiGecmisEkrani from '../screens/hasta/TibbıGecmisEkrani';
import OdemelerEkrani from '../screens/hasta/OdemelerEkrani';
import ProfilEkrani from '../screens/ProfilEkrani';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function HastaTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0ea5e9' },
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
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen name="Randevularım" component={RandevularEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📋" renk={color} /> }} />
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
