import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import AdminIstatistikEkrani from '../screens/admin/AdminIstatistikEkrani';
import AdminRandevularEkrani from '../screens/admin/AdminRandevularEkrani';
import AdminDoktorlarEkrani from '../screens/admin/AdminDoktorlarEkrani';

const Tab = createBottomTabNavigator();

function Ikon({ emj, renk }: { emj: string; renk: string }) {
  return <Text style={{ fontSize: 18, color: renk }}>{emj}</Text>;
}

export default function AdminTabs({ navigation }: any) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#7c3aed' },
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
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 58 },
      }}
    >
      <Tab.Screen name="İstatistikler" component={AdminIstatistikEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📊" renk={color} /> }} />
      <Tab.Screen name="Randevular" component={AdminRandevularEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="📅" renk={color} /> }} />
      <Tab.Screen name="Doktorlar" component={AdminDoktorlarEkrani}
        options={{ tabBarIcon: ({ color }) => <Ikon emj="👨‍⚕️" renk={color} /> }} />
    </Tab.Navigator>
  );
}
