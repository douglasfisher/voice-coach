import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronDown, ChevronRight, Check } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { AvatarLibraryItem } from '../../../types/wizard';

interface AvatarLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (publicUrl: string, storagePath: string) => void;
}

type GenderFilter = 'all' | 'male' | 'female';
type ViewMode = 'grid' | 'batches';

interface BatchGroup {
  batchId: string;
  items: AvatarLibraryItem[];
  usedItem: AvatarLibraryItem | null;
  prompt: string | null;
  createdAt: string;
}

export function AvatarLibraryModal({ visible, onClose, onSelect }: AvatarLibraryModalProps) {
  const [allItems, setAllItems] = useState<AvatarLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<GenderFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('batches');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchLibrary();
    }
  }, [visible]);

  const fetchLibrary = async () => {
    setLoading(true);
    // Fetch ALL avatars (including used ones) to show batch context
    const { data, error } = await supabase
      .from('avatar_library')
      .select('*')
      .eq('is_hi_res', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllItems(data as AvatarLibraryItem[]);
    }
    setLoading(false);
  };

  const filtered = filter === 'all'
    ? allItems
    : allItems.filter((i) => i.gender === filter);

  // Only unused items for grid view
  const unusedFiltered = filtered.filter((i) => !i.used_by_persona_id);

  // Group into batches
  const batches = useCallback((): BatchGroup[] => {
    const batchMap = new Map<string, AvatarLibraryItem[]>();
    const noBatch: AvatarLibraryItem[] = [];

    for (const item of filtered) {
      if (item.generation_batch_id) {
        const existing = batchMap.get(item.generation_batch_id) || [];
        existing.push(item);
        batchMap.set(item.generation_batch_id, existing);
      } else {
        noBatch.push(item);
      }
    }

    const groups: BatchGroup[] = [];
    for (const [batchId, items] of batchMap) {
      const usedItem = items.find((i) => i.used_by_persona_id) || null;
      groups.push({
        batchId,
        items,
        usedItem,
        prompt: items[0]?.prompt || null,
        createdAt: items[0]?.created_at || '',
      });
    }

    // Add unbatched items as individual "batches"
    for (const item of noBatch) {
      groups.push({
        batchId: item.id,
        items: [item],
        usedItem: item.used_by_persona_id ? item : null,
        prompt: item.prompt,
        createdAt: item.created_at,
      });
    }

    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return groups;
  }, [filtered])();

  const handleSelect = (item: AvatarLibraryItem) => {
    if (item.used_by_persona_id) return; // Can't select used avatars
    onSelect(item.public_url, item.storage_path);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.92)',
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
            paddingBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
            Avatar Library
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        {/* Filter row */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
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

          <View style={{ flex: 1 }} />

          {/* View mode toggle */}
          {(['grid', 'batches'] as ViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: viewMode === mode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: viewMode === mode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: viewMode === mode ? '#a855f7' : 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  fontWeight: viewMode === mode ? '600' : '400',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : viewMode === 'grid' ? (
          /* Grid view — unused only */
          unusedFiltered.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                No unused avatars in the library
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {unusedFiltered.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelect(item)}
                    style={{
                      width: '31.5%',
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
                ))}
              </View>
            </ScrollView>
          )
        ) : (
          /* Batch view */
          batches.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                No avatars in the library
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
              {batches.map((batch) => {
                const isExpanded = expandedBatch === batch.batchId;
                const hasUsed = !!batch.usedItem;
                const availableCount = batch.items.filter((i) => !i.used_by_persona_id).length;

                return (
                  <View
                    key={batch.batchId}
                    style={{
                      marginBottom: 12,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderWidth: 1,
                      borderColor: hasUsed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Batch header */}
                    <Pressable
                      onPress={() => setExpandedBatch(isExpanded ? null : batch.batchId)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                        : <ChevronRight size={14} color="rgba(255,255,255,0.4)" />}

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
                            Set of {batch.items.length}
                          </Text>
                          {hasUsed && (
                            <View
                              style={{
                                backgroundColor: 'rgba(74, 222, 128, 0.15)',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ color: '#4ade80', fontSize: 9, fontWeight: '600' }}>
                                IN USE
                              </Text>
                            </View>
                          )}
                          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                            {availableCount} available
                          </Text>
                        </View>
                        <Text
                          style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {new Date(batch.createdAt).toLocaleDateString()}
                          {batch.items[0]?.gender ? ` · ${batch.items[0].gender}` : ''}
                          {batch.items[0]?.ethnicity ? ` · ${batch.items[0].ethnicity}` : ''}
                        </Text>
                      </View>

                      {/* Preview thumbnails */}
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {batch.items.slice(0, 3).map((item) => (
                          <Image
                            key={item.id}
                            source={{ uri: item.public_url }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: item.used_by_persona_id
                                ? 'rgba(74, 222, 128, 0.4)'
                                : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </View>
                    </Pressable>

                    {/* Expanded batch — show all images */}
                    {isExpanded && (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: 12,
                          paddingTop: 0,
                        }}
                      >
                        {batch.items.map((item) => {
                          const isUsed = !!item.used_by_persona_id;
                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => !isUsed && handleSelect(item)}
                              disabled={isUsed}
                              style={{
                                width: '47%',
                                aspectRatio: 896 / 1152,
                                borderRadius: 10,
                                overflow: 'hidden',
                                borderWidth: 2,
                                borderColor: isUsed
                                  ? 'rgba(74, 222, 128, 0.5)'
                                  : 'rgba(255,255,255,0.1)',
                                opacity: isUsed ? 0.7 : 1,
                              }}
                            >
                              <Image
                                source={{ uri: item.public_url }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                              {isUsed && (
                                <View
                                  style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    borderRadius: 12,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Check size={10} color="#4ade80" />
                                  <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '600' }}>
                                    Used
                                  </Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )
        )}
      </View>
    </Modal>
  );
}
