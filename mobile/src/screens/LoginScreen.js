import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import axios from 'axios';

// Backend URL'ini kendi yerel IP'ne göre değiştir
const API_URL = 'http://10.0.2.2:3000/api'; 

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setToken = useStore((state) => state.setToken);
  const setUser = useStore((state) => state.setUser);

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      setToken(response.data.token);
      setUser(response.data.user);
      
      // Navigate to Home
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Hata', 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NexRide'a Hoş Geldiniz</Text>
      
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Giriş Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
