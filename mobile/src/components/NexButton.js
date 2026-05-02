import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { THEME } from '../store/useStore';

export default function NexButton({ title, onPress, loading, style, textStyle, disabled, variant = 'primary' }) {
  const isSecondary = variant === 'secondary';
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      style={[
        styles.btn, 
        isSecondary ? styles.btnSecondary : styles.btnPrimary,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? THEME.gold : '#fff'} />
      ) : (
        <Text style={[styles.text, isSecondary ? styles.textSecondary : styles.textPrimary, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnPrimary: { backgroundColor: '#000' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  text: { fontSize: 16, fontWeight: 'bold' },
  textPrimary: { color: THEME.gold },
  textSecondary: { color: '#000' },
  disabled: { opacity: 0.5 }
});
