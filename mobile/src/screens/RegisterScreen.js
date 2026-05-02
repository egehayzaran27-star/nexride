import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../api/client';
import NexInput from '../components/NexInput';
import NexButton from '../components/NexButton';
import { THEME } from '../store/useStore';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateTC = (tc) => {
    if (tc.length !== 11) return false;
    let sumOdd = 0, sumEven = 0;
    for (let i = 0; i < 9; i++) {
      if (i % 2 === 0) sumOdd += parseInt(tc[i]);
      else sumEven += parseInt(tc[i]);
    }
    let check1 = (sumOdd * 7 - sumEven) % 10;
    if (check1 !== parseInt(tc[9])) return false;
    let total = 0;
    for (let i = 0; i < 10; i++) total += parseInt(tc[i]);
    if (total % 10 !== parseInt(tc[10])) return false;
    return true;
  };

  const handleRegister = async () => {
    if (!tcNo || !validateTC(tcNo)) return Alert.alert('Hata', 'Geçerli bir 11 haneli TC Kimlik No giriniz.');
    if (!email || !password || !firstName || !lastName) return Alert.alert('Hata', 'Tüm alanları doldurun.');
    
    setLoading(true);
    try {
      await authService.register({ firstName, lastName, email, password, tcNo, role: 'user' });
      Alert.alert('Başarılı', 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.error || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Ionicons name="car-sport" size={60} color={THEME.gold} />
        <Text style={styles.title}>NexRide'a Katıl</Text>
        <Text style={styles.sub}>Şehrin en güvenli ağına adım at.</Text>
      </View>

      <View style={styles.form}>
        <NexInput label="Adınız" value={firstName} onChangeText={setFirstName} placeholder="Örn: Ahmet" />
        <NexInput label="Soyadınız" value={lastName} onChangeText={setLastName} placeholder="Örn: Yılmaz" />
        <NexInput label="E-posta" value={email} onChangeText={setEmail} placeholder="ahmet@email.com" keyboardType="email-address" />
        <NexInput label="TC Kimlik No" value={tcNo} onChangeText={setTcNo} placeholder="11 Haneli" keyboardType="numeric" />
        <NexInput label="Şifre" value={password} onChangeText={setPassword} placeholder="••••••" secureTextEntry />

        <NexButton 
          title="Kayıt Ol" 
          onPress={handleRegister} 
          loading={loading} 
          style={{ marginTop: 20 }} 
        />

        <NexButton 
          title="Zaten hesabın var mı? Giriş Yap" 
          variant="secondary"
          onPress={() => navigation.navigate('Login')} 
          style={{ marginTop: 15 }} 
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 10, color: '#000' },
  sub: { color: '#666', marginTop: 5 },
  form: { padding: 25 }
});
