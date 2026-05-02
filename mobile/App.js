import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import { useStore } from './src/store/useStore';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();

export default function App() {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token == null ? (
          // No token found, user isn't signed in
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'driver' ? (
          // Driver is signed in
          <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        ) : (
          // Passenger is signed in
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
