import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { authService } from '../api/client';
import NexInput from '../components/NexInput';
import NexButton from '../components/NexButton';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useStore((state) => state.setToken);
  const setUser = useStore((state) => state.setUser);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
    
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      // Web ile aynı veri yapısını kaydet
      setToken(response.data.token);
      setUser(response.data.user);
      
      Alert.alert('Giriş Başarılı', `Hoş geldin, ${response.data.user.firstName}!`);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.error || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="car-sport" size={80} color="#f59e0b" />
          <Text style={styles.title}>NexRide</Text>
          <Text style={styles.subtitle}>Şehrin Yeni Nesil Ulaşım Ağı</Text>
        </View>

        <View style={styles.form}>
          <NexInput
            label="E-posta"
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <NexInput
            label="Şifre"
            placeholder="••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <NexButton 
            title="Giriş Yap" 
            onPress={handleLogin} 
            loading={loading} 
            style={{ marginTop: 10 }}
          />

          <NexButton 
            title="Hesabınız yok mu? Kayıt Olun" 
            variant="secondary"
            onPress={() => navigation.navigate('Register')} 
            style={{ marginTop: 15 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 25, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#000', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  form: { width: '100%' }
});
