import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import apiClient from '../api/client';
import { useStore } from '../store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newKmPrice, setNewKmPrice] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [userRes, bookingRes] = await Promise.all([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/all-bookings')
      ]);
      setUsers(userRes.data);
      setBookings(bookingRes.data);
    } catch (error) {
      console.error('Admin verisi çekilemedi:', error);
    }
  }, []);

  const deleteUser = async (id) => {
    Alert.alert('Emin misiniz?', 'Kullanıcı kalıcı olarak silinecek.', [
      { text: 'Vazgeç' },
      { text: 'Sil', onPress: async () => {
        try {
          await apiClient.delete(`/admin/users/${id}`);
          fetchData();
        } catch (e) { 
          console.error('Kullanıcı silme hatası:', e);
          Alert.alert('Hata', 'Kullanıcı silinemedi.'); 
        }
      }}
    ]);
  };

  const cleanupDrivers = async () => {
    try {
      await apiClient.post('/admin/cleanup-drivers', {});
      Alert.alert('Başarılı', 'Pasif sürücüler temizlendi.');
    } catch(e) { 
      console.error('Sürücü temizleme hatası:', e);
      Alert.alert('Hata', 'İşlem başarısız.'); 
    }
  };

  const updatePrices = async () => {
    if (!newKmPrice) return Alert.alert('Hata', 'Lütfen geçerli bir fiyat girin.');
    try {
      await apiClient.post('/admin/fix-prices', { kmPrice: newKmPrice });
      Alert.alert('Başarılı', 'Fiyatlar güncellendi.');
      setShowPriceModal(false);
      setNewKmPrice('');
    } catch(e) { 
      console.error('Fiyat güncelleme hatası:', e);
      Alert.alert('Hata', 'Güncelleme başarısız.'); 
    }
  };

  const sendEmailTest = async () => {
    try {
      await apiClient.post('/api/admin/test-email', {});
      Alert.alert('Başarılı', 'Test e-postası gönderildi.');
    } catch(e) { 
      console.error('E-posta test hatası:', e);
      Alert.alert('Hata', 'E-posta gönderilemedi.'); 
    }
  };

  const promoteUser = async (id) => {
    try {
      await apiClient.post('/admin/promote', { userId: id });
      Alert.alert('Başarılı', 'Kullanıcı Admin yapıldı.');
      fetchData();
    } catch(e) { 
      console.error('Yetkilendirme hatası:', e);
      Alert.alert('Hata', 'Yetkilendirme başarısız.'); 
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Yönetim Paneli</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{users?.length || 0}</Text><Text style={styles.statLabel}>Üye</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{bookings?.length || 0}</Text><Text style={styles.statLabel}>Yolculuk</Text></View>
        </View>

        <View style={styles.tools}>
          <Text style={styles.sectionTitle}>Sistem Araçları</Text>
          <View style={{flexDirection:'row', gap:10, flexWrap:'wrap'}}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setShowPriceModal(true)}><Text style={styles.toolText}>Fiyatları Düzenle</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toolBtn, {backgroundColor:'#ff3b30'}]} onPress={cleanupDrivers}><Text style={styles.toolText}>Sürücüleri Temizle</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toolBtn, {backgroundColor:'#007AFF'}]} onPress={sendEmailTest}><Text style={styles.toolText}>E-posta Testi</Text></TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Kullanıcı Yönetimi</Text>
        {Array.isArray(users) && users.map((u) => (
          <View key={u.id} style={styles.item}>
            <View style={{flex:1}}>
              <Text style={styles.itemName}>{u.firstName} {u.lastName}</Text>
              <Text style={styles.itemSub}>{u.email} • {u.role}</Text>
            </View>
            <View style={{flexDirection:'row', gap: 10}}>
              {u.role !== 'admin' && (
                <TouchableOpacity onPress={() => promoteUser(u.id)}><Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" /></TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => deleteUser(u.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Tüm Rezervasyonlar</Text>
        {Array.isArray(bookings) && bookings.map((b) => (
          <View key={b.id} style={styles.item}>
            <View style={{flex:1}}>
              <Text style={styles.itemName}>{b.destination}</Text>
              <Text style={styles.itemSub}>₺{b.price} • {b.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showPriceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fiyat Güncelle</Text>
            <Text style={styles.modalSub}>Yeni KM başı ücreti girin:</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholder="Örn: 8.5" 
              value={newKmPrice}
              onChangeText={setNewKmPrice}
            />
            <View style={{flexDirection:'row', gap:10}}>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor:'#ccc', flex:1}]} onPress={() => setShowPriceModal(false)}>
                <Text style={styles.modalBtnText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor:'#007AFF', flex:1}]} onPress={updatePrices}>
                <Text style={styles.modalBtnText}>Güncelle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
  statNum: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  tools: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 25, elevation: 2 },
  toolBtn: { backgroundColor: '#333', padding: 10, borderRadius: 8, marginBottom: 5, paddingHorizontal: 15 },
  toolText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  item: { padding: 15, backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSub: { color: '#666', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 10, marginBottom: 20, fontSize: 16, textAlign: 'center' },
  modalBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' }
});
