/**
 * Admin Model Pricing Screen
 *
 * Dedicated page for managing AI model pricing:
 * - View all models with their costs
 * - Sync models from Groq API
 * - Lookup known Groq pricing
 * - Apply global markup percentage
 * - Edit individual model costs
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Cpu,
  RefreshCw,
  Download,
  Edit3,
  X,
  Save,
  Percent,
  ArrowRight,
  Check,
  Info,
  DollarSign,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAdminStatsStore } from '../../stores/adminStatsStore';

// Known Groq pricing (cents per 1M tokens) - updated Feb 2025
// Source: https://groq.com/pricing/
const KNOWN_GROQ_PRICING: Record<string, { input: number; output: number }> = {
  'llama-3.3-70b-versatile': { input: 59, output: 79 },
  'llama-3.3-70b-specdec': { input: 59, output: 99 },
  'llama-3.1-70b-versatile': { input: 59, output: 79 },
  'llama-3.1-8b-instant': { input: 5, output: 8 },
  'llama-3.2-1b-preview': { input: 4, output: 4 },
  'llama-3.2-3b-preview': { input: 6, output: 6 },
  'llama-3.2-11b-vision-preview': { input: 18, output: 18 },
  'llama-3.2-90b-vision-preview': { input: 90, output: 90 },
  'llama3-70b-8192': { input: 59, output: 79 },
  'llama3-8b-8192': { input: 5, output: 8 },
  'mixtral-8x7b-32768': { input: 24, output: 24 },
  'gemma-7b-it': { input: 7, output: 7 },
  'gemma2-9b-it': { input: 20, output: 20 },
  'qwen-2.5-72b': { input: 59, output: 79 },
  'qwen-2.5-32b': { input: 29, output: 39 },
  'qwen-2.5-coder-32b': { input: 29, output: 39 },
  'deepseek-r1-distill-llama-70b': { input: 59, output: 79 },
  'deepseek-r1-distill-qwen-32b': { input: 29, output: 39 },
};

interface AIModel {
  id: string;
  name: string;
  provider: string;
  context_window: number | null;
  cost_per_million_input: number;
  cost_per_million_output: number;
  active: boolean;
  updated_at: string;
}

interface EditModalProps {
  model: AIModel | null;
  markupPercent: number;
  onClose: () => void;
  onSave: (inputCost: number, outputCost: number) => Promise<void>;
  isSaving: boolean;
}

function formatCentsPerMillion(cents: number): string {
  return `${cents}¢`;
}

function calculateEffectiveCost(baseCents: number, markupPercent: number): number {
  return Math.ceil(baseCents * (1 + markupPercent / 100));
}

function EditModal({ model, markupPercent, onClose, onSave, isSaving }: EditModalProps) {
  const [inputCost, setInputCost] = useState(
    model?.cost_per_million_input.toString() || '0'
  );
  const [outputCost, setOutputCost] = useState(
    model?.cost_per_million_output.toString() || '0'
  );

  useEffect(() => {
    if (model) {
      setInputCost(model.cost_per_million_input.toString());
      setOutputCost(model.cost_per_million_output.toString());
    }
  }, [model]);

  if (!model) return null;

  const handleSave = async () => {
    const input = parseInt(inputCost, 10) || 0;
    const output = parseInt(outputCost, 10) || 0;
    await onSave(input, output);
  };

  const knownPricing = KNOWN_GROQ_PRICING[model.id];
  const inputNum = parseInt(inputCost, 10) || 0;
  const outputNum = parseInt(outputCost, 10) || 0;
  const effectiveInput = calculateEffectiveCost(inputNum, markupPercent);
  const effectiveOutput = calculateEffectiveCost(outputNum, markupPercent);

  return (
    <Modal
      visible={!!model}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.95)', 'rgba(20, 20, 30, 0.98)']}
            style={{ padding: 24 }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Cpu size={20} color="#60a5fa" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: '700',
                    marginLeft: 10,
                  }}
                >
                  Edit Pricing
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={24} color="rgba(255,255,255,0.5)" />
              </Pressable>
            </View>

            {/* Model Name */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {model.name}
            </Text>

            {/* Known Pricing Hint */}
            {knownPricing && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Info size={16} color="#10b981" />
                <Text style={{ color: '#10b981', fontSize: 12, marginLeft: 8, flex: 1 }}>
                  Groq pricing: {knownPricing.input}¢ input / {knownPricing.output}¢ output
                </Text>
                <Pressable
                  onPress={() => {
                    setInputCost(knownPricing.input.toString());
                    setOutputCost(knownPricing.output.toString());
                  }}
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '600' }}>
                    Apply
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Input Cost */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                Input Cost (¢ per 1M tokens)
              </Text>
              <TextInput
                value={inputCost}
                onChangeText={setInputCost}
                keyboardType="numeric"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 14,
                  color: '#fff',
                  fontSize: 16,
                }}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              {markupPercent > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    With {markupPercent}% markup:
                  </Text>
                  <ArrowRight
                    size={12}
                    color="rgba(255,255,255,0.4)"
                    style={{ marginHorizontal: 4 }}
                  />
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600' }}>
                    {effectiveInput}¢
                  </Text>
                </View>
              )}
            </View>

            {/* Output Cost */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                Output Cost (¢ per 1M tokens)
              </Text>
              <TextInput
                value={outputCost}
                onChangeText={setOutputCost}
                keyboardType="numeric"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: 14,
                  color: '#fff',
                  fontSize: 16,
                }}
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              {markupPercent > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    With {markupPercent}% markup:
                  </Text>
                  <ArrowRight
                    size={12}
                    color="rgba(255,255,255,0.4)"
                    style={{ marginHorizontal: 4 }}
                  />
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600' }}>
                    {effectiveOutput}¢
                  </Text>
                </View>
              )}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                borderRadius: 14,
                backgroundColor: 'rgba(96, 165, 250, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(96, 165, 250, 0.3)',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#60a5fa" />
              ) : (
                <>
                  <Save size={18} color="#60a5fa" />
                  <Text
                    style={{
                      color: '#60a5fa',
                      fontSize: 15,
                      fontWeight: '600',
                      marginLeft: 8,
                    }}
                  >
                    Save Changes
                  </Text>
                </>
              )}
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function ModelRow({
  model,
  markupPercent,
  onEdit,
}: {
  model: AIModel;
  markupPercent: number;
  onEdit: () => void;
}) {
  const effectiveInput = calculateEffectiveCost(
    model.cost_per_million_input,
    markupPercent
  );
  const effectiveOutput = calculateEffectiveCost(
    model.cost_per_million_output,
    markupPercent
  );
  const hasKnownPricing = !!KNOWN_GROQ_PRICING[model.id];
  const hasPricing = model.cost_per_million_input > 0 || model.cost_per_million_output > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}
            numberOfLines={1}
          >
            {model.name}
          </Text>
          {hasKnownPricing && (
            <View
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: '#10b981', fontSize: 9, fontWeight: '600' }}>
                GROQ
              </Text>
            </View>
          )}
        </View>
        {model.context_window && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
            {Math.round(model.context_window / 1000)}K context
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
        {hasPricing ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>In:</Text>
              <Text style={{ color: '#60a5fa', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>
                {formatCentsPerMillion(model.cost_per_million_input)}
              </Text>
              {markupPercent > 0 && (
                <Text style={{ color: '#10b981', fontSize: 11, marginLeft: 4 }}>
                  ({effectiveInput}¢)
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Out:</Text>
              <Text style={{ color: '#c084fc', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>
                {formatCentsPerMillion(model.cost_per_million_output)}
              </Text>
              {markupPercent > 0 && (
                <Text style={{ color: '#10b981', fontSize: 11, marginLeft: 4 }}>
                  ({effectiveOutput}¢)
                </Text>
              )}
            </View>
          </>
        ) : (
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
            Not set
          </Text>
        )}
      </View>

      <Pressable
        onPress={onEdit}
        style={{
          padding: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}
        hitSlop={5}
      >
        <Edit3 size={16} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </View>
  );
}

export default function AdminPricingScreen() {
  const { settings, fetchSettings, updateSetting } = useAdminStatsStore();

  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplyingKnown, setIsApplyingKnown] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [hasMarkupChanges, setHasMarkupChanges] = useState(false);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      Alert.alert('Error', 'Failed to fetch models');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchModels(), fetchSettings()]);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const currentMarkup = typeof settings.cost_markup_percent === 'number'
      ? settings.cost_markup_percent
      : 0;
    setMarkupPercent(currentMarkup);
  }, [settings.cost_markup_percent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchModels();
    setRefreshing(false);
  };

  const syncFromGroq = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('models', {
        body: { action: 'refresh' },
      });

      if (error) throw error;

      Alert.alert('Success', `Synced ${data.count} models from Groq API`);
      await fetchModels();
    } catch (error) {
      console.error('Failed to sync models:', error);
      Alert.alert('Error', 'Failed to sync models from Groq API');
    } finally {
      setIsSyncing(false);
    }
  };

  const applyKnownPricing = async () => {
    setIsApplyingKnown(true);
    try {
      let updatedCount = 0;

      for (const model of models) {
        const knownPricing = KNOWN_GROQ_PRICING[model.id];
        if (knownPricing) {
          const { error } = await supabase
            .from('ai_models')
            .update({
              cost_per_million_input: knownPricing.input,
              cost_per_million_output: knownPricing.output,
              updated_at: new Date().toISOString(),
            })
            .eq('id', model.id);

          if (!error) updatedCount++;
        }
      }

      Alert.alert('Success', `Applied known pricing to ${updatedCount} models`);
      await fetchModels();
    } catch (error) {
      console.error('Failed to apply pricing:', error);
      Alert.alert('Error', 'Failed to apply known pricing');
    } finally {
      setIsApplyingKnown(false);
    }
  };

  const handleSaveModel = async (inputCost: number, outputCost: number) => {
    if (!editingModel) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({
          cost_per_million_input: inputCost,
          cost_per_million_output: outputCost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingModel.id);

      if (error) throw error;

      setEditingModel(null);
      await fetchModels();
    } catch (error) {
      console.error('Failed to update model:', error);
      Alert.alert('Error', 'Failed to update model pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkupChange = (value: number) => {
    setMarkupPercent(Math.round(value));
    setHasMarkupChanges(true);
  };

  const saveMarkup = async () => {
    const { error } = await updateSetting('cost_markup_percent', markupPercent);
    if (error) {
      Alert.alert('Error', 'Failed to save markup');
    } else {
      setHasMarkupChanges(false);
      Alert.alert('Success', 'Markup saved');
    }
  };

  const modelsWithPricing = models.filter(m => m.cost_per_million_input > 0);
  const modelsWithoutPricing = models.filter(m => m.cost_per_million_input === 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                }}
              >
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
                  style={{ padding: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#10b981', fontSize: 24, fontWeight: '700' }}>
                    {models.length}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                    Total Models
                  </Text>
                </LinearGradient>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(96, 165, 250, 0.3)',
                }}
              >
                <LinearGradient
                  colors={['rgba(96, 165, 250, 0.15)', 'rgba(96, 165, 250, 0.05)']}
                  style={{ padding: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#60a5fa', fontSize: 24, fontWeight: '700' }}>
                    {modelsWithPricing.length}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                    With Pricing
                  </Text>
                </LinearGradient>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                  style={{ padding: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#f59e0b', fontSize: 24, fontWeight: '700' }}>
                    {markupPercent}%
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                    Markup
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <Pressable
                onPress={syncFromGroq}
                disabled={isSyncing}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(96, 165, 250, 0.3)',
                  opacity: isSyncing ? 0.5 : 1,
                }}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                  <>
                    <RefreshCw size={16} color="#60a5fa" />
                    <Text style={{ color: '#60a5fa', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                      Sync from Groq
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={applyKnownPricing}
                disabled={isApplyingKnown}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  opacity: isApplyingKnown ? 0.5 : 1,
                }}
              >
                {isApplyingKnown ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <Download size={16} color="#10b981" />
                    <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
                      Apply Known Prices
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Global Markup */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                GLOBAL MARKUP
              </Text>
              <View
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <LinearGradient
                  colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
                  style={{ padding: 16 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Percent size={16} color="#10b981" />
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: 14,
                          marginLeft: 8,
                        }}
                      >
                        Cost Markup
                      </Text>
                    </View>
                    <Text style={{ color: '#10b981', fontSize: 18, fontWeight: '700' }}>
                      {markupPercent}%
                    </Text>
                  </View>
                  <Slider
                    value={markupPercent}
                    onValueChange={handleMarkupChange}
                    minimumValue={0}
                    maximumValue={100}
                    step={5}
                    minimumTrackTintColor="#10b981"
                    maximumTrackTintColor="rgba(255,255,255,0.1)"
                    thumbTintColor="#10b981"
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
                    Applied to all cost calculations (for infrastructure overhead)
                  </Text>

                  {hasMarkupChanges && (
                    <Pressable
                      onPress={saveMarkup}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        marginTop: 12,
                      }}
                    >
                      <Save size={16} color="#10b981" />
                      <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
                        Save Markup
                      </Text>
                    </Pressable>
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Models with Pricing */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                MODELS WITH PRICING ({modelsWithPricing.length})
              </Text>
              <View
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <LinearGradient
                  colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
                  style={{ padding: 16 }}
                >
                  {modelsWithPricing.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <DollarSign size={32} color="rgba(255,255,255,0.2)" />
                      <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
                        No models have pricing set
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                        Tap "Apply Known Prices" to set them
                      </Text>
                    </View>
                  ) : (
                    modelsWithPricing.map((model) => (
                      <ModelRow
                        key={model.id}
                        model={model}
                        markupPercent={markupPercent}
                        onEdit={() => setEditingModel(model)}
                      />
                    ))
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Models without Pricing */}
            {modelsWithoutPricing.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  MODELS WITHOUT PRICING ({modelsWithoutPricing.length})
                </Text>
                <View
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.05)', 'rgba(20, 20, 30, 0.9)']}
                    style={{ padding: 16 }}
                  >
                    {modelsWithoutPricing.map((model) => (
                      <ModelRow
                        key={model.id}
                        model={model}
                        markupPercent={markupPercent}
                        onEdit={() => setEditingModel(model)}
                      />
                    ))}
                  </LinearGradient>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <EditModal
        model={editingModel}
        markupPercent={markupPercent}
        onClose={() => setEditingModel(null)}
        onSave={handleSaveModel}
        isSaving={isSaving}
      />
    </SafeAreaView>
  );
}
