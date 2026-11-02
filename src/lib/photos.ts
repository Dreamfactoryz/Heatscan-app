import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export type Picked = { uri: string; width: number; height: number };

// Opens the camera or the photo library. Returns null if the person cancels or says no to access.
export async function pickPhoto(from: 'camera' | 'library'): Promise<Picked | null> {
  const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      from === 'camera' ? 'Camera access is off' : 'Photo access is off',
      'Heat Scan needs it to take photos of heat numbers, drawings and finished spools. You can turn it on in Settings.',
      [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }],
    );
    return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, exif: false };
  const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}
