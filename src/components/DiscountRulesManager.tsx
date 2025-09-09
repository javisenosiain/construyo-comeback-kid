import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Percent, DollarSign, Users, Volume2, Calendar, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiscountRule {
  id: string;
  rule_name: string;
  rule_type: string;
  discount_type: string;
  discount_value: number;
  conditions: any;
  max_usage?: number;
  usage_count: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

const DiscountRulesManager: React.FC = () => {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'referral',
    discount_type: 'percentage',
    discount_value: 0,
    conditions: {
      min_amount: 0,
      min_previous_orders: 2,
    },
    max_usage: undefined as number | undefined,
    is_active: true,
    valid_from: '',
    valid_until: '',
  });

  useEffect(() => {
    fetchDiscountRules();
  }, []);

  const fetchDiscountRules = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching discount rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch discount rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'referral',
      discount_type: 'percentage',
      discount_value: 0,
      conditions: {
        min_amount: 0,
        min_previous_orders: 2,
      },
      max_usage: undefined,
      is_active: true,
      valid_from: '',
      valid_until: '',
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const saveRule = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const ruleData = {
        ...formData,
        user_id: userData.user.id,
        conditions: formData.conditions,
        max_usage: formData.max_usage || null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('discount_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Discount rule updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('discount_rules')
          .insert(ruleData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Discount rule created successfully',
        });
      }

      await fetchDiscountRules();
      resetForm();
    } catch (error) {
      console.error('Error saving discount rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save discount rule',
        variant: 'destructive',
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('discount_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Discount rule deleted successfully',
      });

      await fetchDiscountRules();
    } catch (error) {
      console.error('Error deleting discount rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete discount rule',
        variant: 'destructive',
      });
    }
  };

  const editRule = (rule: DiscountRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      discount_type: rule.discount_type,
      discount_value: rule.discount_value,
      conditions: typeof rule.conditions === 'string' 
        ? JSON.parse(rule.conditions) 
        : rule.conditions,
      max_usage: rule.max_usage || undefined,
      is_active: rule.is_active,
      valid_from: rule.valid_from ? rule.valid_from.split('T')[0] : '',
      valid_until: rule.valid_until ? rule.valid_until.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'referral': return <Users className="h-4 w-4" />;
      case 'repeat_client': return <Users className="h-4 w-4" />;
      case 'volume': return <Volume2 className="h-4 w-4" />;
      case 'seasonal': return <Calendar className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getRuleTypeColor = (ruleType: string) => {
    switch (ruleType) {
      case 'referral': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'repeat_client': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'volume': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      case 'seasonal': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading discount rules...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Discount Rules Manager</h2>
          <p className="text-muted-foreground">
            Create and manage automated discount rules for your invoices
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule ? 'Edit Discount Rule' : 'Create New Discount Rule'}
            </CardTitle>
            <CardDescription>
              Configure rules to automatically apply discounts to eligible invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule_name">Rule Name</Label>
                <Input
                  id="rule_name"
                  value={formData.rule_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rule_name: e.target.value
                  }))}
                  placeholder="e.g., Referral Discount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule_type">Rule Type</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    rule_type: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral Discount</SelectItem>
                    <SelectItem value="repeat_client">Repeat Client</SelectItem>
                    <SelectItem value="volume">Volume Discount</SelectItem>
                    <SelectItem value="seasonal">Seasonal Discount</SelectItem>
                    <SelectItem value="custom">Custom Rule</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    discount_type: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '0.1' : '1'}
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    discount_value: parseFloat(e.target.value) || 0
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_amount">Minimum Invoice Amount ($)</Label>
                <Input
                  id="min_amount"
                  type="number"
                  min="0"
                  value={formData.conditions.min_amount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      min_amount: parseFloat(e.target.value) || 0
                    }
                  }))}
                />
              </div>

              {formData.rule_type === 'repeat_client' && (
                <div className="space-y-2">
                  <Label htmlFor="min_previous_orders">Minimum Previous Orders</Label>
                  <Input
                    id="min_previous_orders"
                    type="number"
                    min="1"
                    value={formData.conditions.min_previous_orders}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      conditions: {
                        ...prev.conditions,
                        min_previous_orders: parseInt(e.target.value) || 2
                      }
                    }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="max_usage">Maximum Usage (optional)</Label>
                <Input
                  id="max_usage"
                  type="number"
                  min="1"
                  value={formData.max_usage || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    max_usage: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {formData.rule_type === 'seasonal' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Valid From</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        valid_from: e.target.value
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        valid_until: e.target.value
                      }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  is_active: checked
                }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveRule}>
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{rule.rule_name}</h3>
                    <Badge className={getRuleTypeColor(rule.rule_type)}>
                      {getRuleTypeIcon(rule.rule_type)}
                      <span className="ml-1 capitalize">
                        {rule.rule_type.replace('_', ' ')}
                      </span>
                    </Badge>
                    {!rule.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {rule.discount_type === 'percentage' ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {rule.discount_value}{rule.discount_type === 'percentage' ? '%' : ''}
                    </div>
                    
                    <div>
                      Usage: {rule.usage_count}
                      {rule.max_usage ? ` / ${rule.max_usage}` : ' (unlimited)'}
                    </div>

                    {rule.conditions && typeof rule.conditions === 'object' && rule.conditions.min_amount > 0 && (
                      <div>
                        Min: ${rule.conditions.min_amount}
                      </div>
                    )}
                  </div>

                  {rule.rule_type === 'seasonal' && (rule.valid_from || rule.valid_until) && (
                    <div className="text-xs text-muted-foreground">
                      Valid: {rule.valid_from ? new Date(rule.valid_from).toLocaleDateString() : 'Always'} - {rule.valid_until ? new Date(rule.valid_until).toLocaleDateString() : 'Always'}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editRule(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                No discount rules configured yet. Create your first rule to start automating discounts!
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DiscountRulesManager;