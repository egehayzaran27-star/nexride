import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { useStore, THEME } from '../store/useStore';

export default function PaymentMethodsScreen() {
  const user = useStore(s => s.user);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Card Input States
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/wallet/payment-methods/${user.id}`);
      setMethods(res.data || []);
    } catch (e) {
      console.error('Ödeme yöntemleri yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  const handleAddCard = async () => {
    if (!cardName || !cardNumber || !expiry || !cvv) return Alert.alert('Hata', 'Tüm alanları doldurun.');
    
    try {
      await apiClient.post('/wallet/payment-methods', {
        userId: user.id, cardName, cardNumber, expiry, cvv
      });
      
      Alert.alert('Başarılı', 'Kartınız kaydedildi.');
      setShowModal(false);
      fetchMethods();
    } catch (e) {
      console.error('Kart kaydetme hatası:', e);
      Alert.alert('Hata', 'Kart kaydedilemedi.');
    }
  };

  const deleteCard = async (id) => {
    Alert.alert('Onay', 'Bu kartı silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç' },
      { text: 'Sil', onPress: async () => {
        try {
          await apiClient.delete(`/wallet/payment-methods/${id}`);
          fetchMethods();
        } catch(e) {
          console.error('Kart silme hatası:', e);
        }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50 }}>
        <Text style={styles.title}>Ödeme Yöntemlerim</Text>
        <Text style={styles.sub}>Yolculuklarınızda kullanacağınız kartları buradan yönetebilirsiniz.</Text>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add-circle" size={24} color="#000" />
          <Text style={styles.addBtnText}>Yeni Kart Ekle</Text>
        </TouchableOpacity>

        {loading ? <ActivityIndicator size="large" color="#f59e0b" style={{marginTop:30}} /> : (
          <View style={{marginTop:20}}>
            {methods.length > 0 ? methods.map(m => (
              <View key={m.id} style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <Ionicons name="card" size={24} color="#f59e0b" />
                  <TouchableOpacity onPress={() => deleteCard(m.id)}>
                    <Ionicons name="trash-outline" size={20} color="red" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardNum}>**** **** **** {m.cardNumber?.slice(-4)}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardName}>{m.cardName}</Text>
                  <Text style={styles.cardExp}>{m.expiry}</Text>
                </View>
              </View>
            )) : <Text style={styles.empty}>Kayıtlı kart bulunmuyor.</Text>}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kart Bilgilerini Girin</Text>
            <TextInput style={styles.input} placeholder="Kart Üzerindeki İsim" value={cardName} onChangeText={setCardName} />
            <TextInput style={styles.input} placeholder="Kart Numarası (16 Hane)" value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" maxLength={16} />
            <View style={{flexDirection:'row', gap:10}}>
              <TextInput style={[styles.input, {flex:1}]} placeholder="AA/YY" value={expiry} onChangeText={setExpiry} maxLength={5} />
              <TextInput style={[styles.input, {flex:1}]} placeholder="CVV" value={cvv} onChangeText={setCvv} keyboardType="numeric" maxLength={3} />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddCard}>
              <Text style={styles.saveBtnText}>Güvenle Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancel}><Text style={{color:'red'}}>Vazgeç</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#000' },
  sub: { color: '#666', marginTop: 5, marginBottom: 25 },
  addBtn: { backgroundColor: '#f59e0b', padding: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addBtnText: { fontWeight: 'bold', fontSize: 16 },
  cardItem: { backgroundColor: '#000', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cardNum: { color: '#fff', fontSize: 20, letterSpacing: 2, marginBottom: 20, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardName: { color: '#aaa', fontSize: 14 },
  cardExp: { color: '#aaa', fontSize: 14 },
  empty: { textAlign: 'center', color: '#999', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', padding: 15, borderRadius: 12, marginBottom: 15, backgroundColor: '#f9f9f9' },
  saveBtn: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16 },
  cancel: { marginTop: 15, alignItems: 'center' }
});
