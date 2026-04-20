import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import KarsilamaEkrani from './src/screens/KarsilamaEkrani';
import GirisEkrani from './src/screens/GirisEkrani';
import KayitEkrani from './src/screens/KayitEkrani';
import SifremiUnuttumEkrani from './src/screens/SifremiUnuttumEkrani';
import HastaTabs from './src/navigation/HastaTabs';
import DoktorTabs from './src/navigation/DoktorTabs';
import AdminTabs from './src/navigation/AdminTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
        initialRouteName="Karsilama"
      >
        <Stack.Screen name="Karsilama" component={KarsilamaEkrani} />
        <Stack.Screen name="Giris" component={GirisEkrani} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Kayit" component={KayitEkrani} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SifremiUnuttum" component={SifremiUnuttumEkrani} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="HastaAnaSayfa" component={HastaTabs} />
        <Stack.Screen name="DoktorAnaSayfa" component={DoktorTabs} />
        <Stack.Screen name="AdminAnaSayfa" component={AdminTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
