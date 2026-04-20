import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import KarsilamaEkrani from './src/screens/KarsilamaEkrani';
import GirisEkrani from './src/screens/GirisEkrani';
import HastaTabs from './src/navigation/HastaTabs';
import DoktorTabs from './src/navigation/DoktorTabs';
import AdminTabs from './src/navigation/AdminTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Karsilama">
        <Stack.Screen name="Karsilama" component={KarsilamaEkrani} />
        <Stack.Screen name="Giris" component={GirisEkrani} />
        <Stack.Screen name="HastaAnaSayfa" component={HastaTabs} />
        <Stack.Screen name="DoktorAnaSayfa" component={DoktorTabs} />
        <Stack.Screen name="AdminAnaSayfa" component={AdminTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
