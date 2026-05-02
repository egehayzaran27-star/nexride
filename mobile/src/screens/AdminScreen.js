import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { useStore, BASE_URL } from '../store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen() {
  const token = useStore((state) => state.token);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, bookingRes] = await Promise.all([
        axios.get(`${BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/all-bookings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(userRes.data);
      setBookings(bookingRes.data);
    } catch (error) {
      console.error('Admin verisi çekilemedi:', error);
    }
  }, [token]);

  const deleteUser = async (id) => {
    Alert.alert('Emin misiniz?', 'Kullanıcı kalıcı olarak silinecek.', [
      { text: 'Vazgeç' },
      { text: 'Sil', onPress: async () => {
        try {
          await axios.delete(`${BASE_URL}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          fetchData();
        } catch (e) { Alert.alert('Hata', 'Kullanıcı silinemedi.'); }
      }}
    ]);
  };

  const cleanupDrivers = async () => {
    try {
      await axios.post(`${BASE_URL}/admin/cleanup-drivers`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Başarılı', 'Pasif sürücüler temizlendi.');
    } catch(e) { Alert.alert('Hata', 'İşlem başarısız.'); }
  };

  const fixPrices = async () => {
    Alert.prompt('Fiyat Güncelle', 'Yeni KM başı ücreti girin:', async (val) => {
      try {
        await axios.post(`${BASE_URL}/admin/fix-prices`, { kmPrice: val }, { headers: { Authorization: `Bearer ${token}` } });
        Alert.alert('Başarılı', 'Fiyatlar güncellendi.');
      } catch(e) { Alert.alert('Hata', 'Güncelleme başarısız.'); }
    });
  };

  const sendEmailTest = async () => {
    try {
      await axios.post(`${BASE_URL}/admin/test-email`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Başarılı', 'Test e-postası gönderildi.');
    } catch(e) { Alert.alert('Hata', 'E-posta gönderilemedi.'); }
  };

  const promoteUser = async (id) => {
    try {
      await axios.post(`${BASE_URL}/admin/promote`, { userId: id }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Başarılı', 'Kullanıcı Admin yapıldı.');
      fetchData();
    } catch(e) { Alert.alert('Hata', 'Yetkilendirme başarısız.'); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Yönetim Paneli</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statNum}>{users?.length || 0}</Text><Text style={styles.statLabel}>Üye</Text></View>
        <View style={styles.statCard}><Text style={styles.statNum}>{bookings?.length || 0}</Text><Text style={styles.statLabel}>Yolculuk</Text></View>
      </View>

      <View style={styles.tools}>
        <Text style={styles.sectionTitle}>Sistem Araçları</Text>
        <View style={{flexDirection:'row', gap:10, flexWrap:'wrap'}}>
          <TouchableOpacity style={styles.toolBtn} onPress={fixPrices}><Text style={styles.toolText}>Fiyatları Düzenle</Text></TouchableOpacity>
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
  toolBtn: { backgroundColor: '#333', padding: 10, borderRadius: 8, marginBottom: 5 },
  toolText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  item: { padding: 15, backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { padding: 5 }
});
