/**
 * Model Pricing Manager Component
 *
 * Allows admins to view and edit AI model pricing:
 * - View all models with their input/output costs
 * - Edit individual model costs
 * - Apply global markup percentage
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Cpu,
  Edit3,
  X,
  Save,
  Percent,
  DollarSign,
  ArrowRight,
} from 'lucide-react-native';

export interface AIModelPricing {
  id: string;
  name: string;
  cost_per_million_input: number;
  cost_per_million_output: number;
  context_window: number | null;
  active: boolean;
}

interface ModelPricingManagerProps {
  models: AIModelPricing[];
  markupPercent: number;
  onMarkupChange: (value: number) => void;
  onModelUpdate: (
    modelId: string,
    inputCost: number,
    outputCost: number
  ) => Promise<{ error: Error | null }>;
  isLoading?: boolean;
}

interface EditModalProps {
  model: AIModelPricing | null;
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

  if (!model) return null;

  const handleSave = async () => {
    const input = parseInt(inputCost, 10) || 0;
    const output = parseInt(outputCost, 10) || 0;
    await onSave(input, output);
  };

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
                marginBottom: 24,
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
                marginBottom: 20,
              }}
            >
              {model.name}
            </Text>

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
  model: AIModelPricing;
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
        <Text
          style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}
          numberOfLines={1}
        >
          {model.name}
        </Text>
        {model.context_window && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
            {Math.round(model.context_window / 1000)}K context
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
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

export function ModelPricingManager({
  models,
  markupPercent,
  onMarkupChange,
  onModelUpdate,
  isLoading,
}: ModelPricingManagerProps) {
  const [editingModel, setEditingModel] = useState<AIModelPricing | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (inputCost: number, outputCost: number) => {
    if (!editingModel) return;
    setIsSaving(true);
    const { error } = await onModelUpdate(editingModel.id, inputCost, outputCost);
    setIsSaving(false);
    if (error) {
      Alert.alert('Error', `Failed to update model pricing: ${error.message}`);
    } else {
      setEditingModel(null);
    }
  };

  return (
    <>
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 16,
          }}
        >
          MODEL PRICING
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
            {/* Global Markup Slider */}
            <View style={{ marginBottom: 20 }}>
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
                    Global Markup
                  </Text>
                </View>
                <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '700' }}>
                  {markupPercent}%
                </Text>
              </View>
              <Slider
                value={markupPercent}
                onValueChange={(value) => onMarkupChange(Math.round(value))}
                minimumValue={0}
                maximumValue={100}
                step={5}
                minimumTrackTintColor="#10b981"
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor="#10b981"
              />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
                Applied to all cost calculations (e.g., for infrastructure costs)
              </Text>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
                marginBottom: 16,
              }}
            />

            {/* Model List Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                MODEL
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                COST (¢/1M TOKENS)
              </Text>
            </View>

            {/* Model List */}
            {isLoading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color="#60a5fa" />
              </View>
            ) : models.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No models found
                </Text>
              </View>
            ) : (
              models.map((model) => (
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

      <EditModal
        model={editingModel}
        markupPercent={markupPercent}
        onClose={() => setEditingModel(null)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  );
}
