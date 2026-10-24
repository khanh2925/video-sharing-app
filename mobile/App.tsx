import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL; // ← đổi thành IP Mac của bạn



type Health = { status: string; mysqlVersion: string };

export default function App() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/health`);
      const json: Health = await res.json();
      setData(json);
    } catch (e) {
      setData(null);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
      <View style={styles.container}>
        <Text style={styles.title}>Video Sharing App</Text>

        {loading && <ActivityIndicator size="large" />}

        {data && (
            <Text style={styles.ok}>
              ✅ Backend: {data.status}{'\n'}MySQL: {data.mysqlVersion}
            </Text>
        )}

        {error && <Text style={styles.err}>❌ {error}</Text>}

        <Button title="Kiểm tra lại" onPress={checkHealth} />
        <StatusBar style="auto" />
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold' },
  ok: { fontSize: 16, color: 'green', textAlign: 'center' },
  err: { fontSize: 14, color: 'red', textAlign: 'center' },
});