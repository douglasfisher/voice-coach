import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { AvatarLibraryItem } from '../../../types/wizard';

interface AvatarLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (publicUrl: string, storagePath: string) => void;
}

type GenderFilter = 'all' | 'male' | 'female';

export function AvatarLibraryModal({ visible, onClose, onSelect }: AvatarLibraryModalProps) {
  const [items, setItems] = useState<AvatarLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<GenderFilter>('all');

  useEffect(() => {
    if (visible) {
      fetchLibrary();
    }
  }, [visible]);

  const fetchLibrary = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('avatar_library')
      .select('*')
      .is('used_by_persona_id', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as AvatarLibraryItem[]);
    }
    setLoading(false);
  };

  const filtered = filter === 'all'
    ? items
    : items.filter((i) => i.gender === filter);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          paddingTop: 60,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 16,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
            Avatar Library
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        {/* Gender filter */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
          {(['all', 'male', 'female'] as GenderFilter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: filter === f ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: filter === f ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: filter === f ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: filter === f ? '600' : '400',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              No unused avatars in the library
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            columnWrapperStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item.public_url, item.storage_path);
                  onClose();
                }}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Image
                  source={{ uri: item.public_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
