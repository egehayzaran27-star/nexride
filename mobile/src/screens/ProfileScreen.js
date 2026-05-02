import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useStore } from '../store/useStore';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const setUser = useStore((state) => state.setUser);
  const navigation = useNavigation();

  const [carModel, setCarModel] = useState('');
  const [plate, setPlate] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [loading, setLoading] = useState(false);

  const applyDriver = async () => {
    if (!carModel || !plate) return Alert.alert('Hata', 'Lütfen araç marka/model ve plaka bilgilerini girin.');
    
    setLoading(true);
    try {
      await apiClient.post('/drivers/become-driver', {
        name: `${user.firstName} ${user.lastName}`,
        carModel,
        plate
      });
      
      Alert.alert('Başarılı', 'Artık bir NexRide sürücüsüsünüz! Sürücü paneline geçebilirsiniz.');
      setShowApply(false);
      // Kullanıcı rolünü güncelle
      setUser({ ...user, role: 'driver', isDriver: true });
    } catch (e) {
      Alert.alert('Hata', e.response?.data?.error || 'Başvuru sırasında bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'Vazgeç' },
      { text: 'Çıkış Yap', onPress: () => { logout(); navigation.replace('Login'); }}
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>{user?.firstName?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.menu}>
        <Text style={styles.menuTitle}>Hesap Ayarları</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Kartlarım')}>
          <Ionicons name="card-outline" size={20} color="#000" />
          <Text style={styles.menuText}>Ödeme Yöntemlerim</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        {user?.role === 'user' && (
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowApply(true)}>
            <Ionicons name="car-outline" size={20} color="#f59e0b" />
            <Text style={styles.menuText}>NexRide Sürücüsü Ol</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        )}

        <Text style={styles.menuTitle}>Kurumsal</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Hakkımızda', 'NexRide, şehir içi ulaşımı kolaylaştıran yeni nesil bir ulaşım platformudur.')}>
          <Ionicons name="information-circle-outline" size={20} color="#000" />
          <Text style={styles.menuText}>Hakkımızda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Yardım & Destek', 'Destek ekibimize destek@nexride.com adresinden ulaşabilirsiniz.')}>
          <Ionicons name="help-buoy-outline" size={20} color="#000" />
          <Text style={styles.menuText}>Yardım & Destek</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="red" />
          <Text style={[styles.menuText, { color: 'red' }]}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showApply} animationType="slide">
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowApply(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Sürücü Başvurusu</Text>
            <View style={{ width: 28 }} />
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 25 }}>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark" size={40} color="#f59e0b" style={{ marginBottom: 10 }} />
              <Text style={styles.infoTitle}>Neden Sürücü Olmalısın?</Text>
              <Text style={styles.infoText}>Kendi işinin patronu ol, esnek çalışma saatleri ile kazanmaya başla.</Text>
            </View>

            <Text style={styles.formLabel}>Araç Bilgileri</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Araç Marka / Model (Örn: Toyota Corolla)" 
              value={carModel} 
              onChangeText={setCarModel} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Araç Plakası (Örn: 06 ABC 123)" 
              value={plate} 
              onChangeText={setPlate} 
              autoCapitalize="characters"
            />

            <Text style={styles.termsTitle}>Sürücü Koşulları (driver.html)</Text>
            <Text style={styles.termsText}>
              • 21 yaşından büyük olmak{"\n"}
              • En az 2 yıllık ehliyet sahibi olmak{"\n"}
              • Sabıka kaydı bulunmamak{"\n"}
              • Aracın 10 yaşından küçük olması
            </Text>

            <TouchableOpacity style={styles.applyBtn} onPress={applyDriver} disabled={loading}>
              <Text style={styles.applyBtnText}>{loading ? 'Gönderiliyor...' : 'Başvuruyu Tamamla'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#000', padding: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  avatarTextLarge: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  email: { color: '#aaa', fontSize: 14 },
  menu: { padding: 20 },
  menuTitle: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 15, marginTop: 15, letterSpacing: 1 },
  menuItem: { backgroundColor: '#fff', padding: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 2 },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, fontWeight: '500' },
  modalContent: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 50 },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  infoCard: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 25 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  infoText: { textAlign: 'center', color: '#666', lineHeight: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#eee', padding: 15, borderRadius: 12, backgroundColor: '#f9f9f9', marginBottom: 20 },
  termsTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  termsText: { color: '#666', lineHeight: 22, marginBottom: 20 },
  applyBtn: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  applyBtnText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16 }
});
