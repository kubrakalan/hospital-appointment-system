import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Bildirim gösterim davranışı
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function pushTokenKaydet(): Promise<string | null> {
  if (!Device.isDevice) return null; // Emülatörde çalışmaz

  const { status: mevcutDurum } = await Notifications.getPermissionsAsync();
  let finalDurum = mevcutDurum;

  if (mevcutDurum !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalDurum = status;
  }

  if (finalDurum !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MediRandevu',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await api.pushTokenKaydet(token);
    return token;
  } catch {
    return null;
  }
}

export function yerelBildirimGonder(baslik: string, govde: string) {
  Notifications.scheduleNotificationAsync({
    content: { title: baslik, body: govde, sound: true },
    trigger: null, // Anında gönder
  });
}
