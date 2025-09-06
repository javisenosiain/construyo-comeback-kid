import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calculator, Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PricingRule {
  id?: string;
  project_type: string;
  base_price: number;
  price_per_unit?: number;
  unit_type?: string;
  currency: string;
  is_active: boolean;
}

const PricingRulesManager = () => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<PricingRule>({
    project_type: '',
    base_price: 0,
    price_per_unit: 0,
    unit_type: 'sqft',
    currency: 'GBP',
    is_active: true,
  });
  const { user } = useAuth();

  const projectTypes = [
    'kitchen',
    'bathroom',
    'extension',
    'loft_conversion',
    'landscaping',
    'plumbing',
    'electrical',
    'heating',
    'flooring',
    'roofing',
    'windows',
    'doors',
    'painting',
    'tiling',
    'other'
  ];

  const unitTypes = [
    'sqft',
    'sqm',
    'room',
    'linear_ft',
    'linear_m',
    'hour',
    'day',
    'project'
  ];

  useEffect(() => {
    if (user) {
      fetchPricingRules();
    }
  }, [user]);

  const fetchPricingRules = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('user_id', user?.id)
        .order('project_type');

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
      toast.error('Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async (rule: PricingRule) => {
    if (!user) return;

    try {
      if (rule.id) {
        // Update existing rule
        const { error } = await supabase
          .from('pricing_rules')
          .update({
            project_type: rule.project_type,
            base_price: rule.base_price,
            price_per_unit: rule.price_per_unit,
            unit_type: rule.unit_type,
            currency: rule.currency,
            is_active: rule.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rule.id);

        if (error) throw error;
        
        setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
        setEditing(null);
        toast.success('Pricing rule updated successfully');
      } else {
        // Create new rule
        const { data, error } = await supabase
          .from('pricing_rules')
          .insert({
            user_id: user.id,
            project_type: rule.project_type,
            base_price: rule.base_price,
            price_per_unit: rule.price_per_unit,
            unit_type: rule.unit_type,
            currency: rule.currency,
            is_active: rule.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        
        setRules(prev => [...prev, data]);
        setNewRule({
          project_type: '',
          base_price: 0,
          price_per_unit: 0,
          unit_type: 'sqft',
          currency: 'GBP',
          is_active: true,
        });
        toast.success('Pricing rule created successfully');
      }
    } catch (error) {
      console.error('Error saving pricing rule:', error);
      toast.error('Failed to save pricing rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success('Pricing rule deleted successfully');
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      toast.error('Failed to delete pricing rule');
    }
  };

  const calculateEstimate = (rule: PricingRule, units: number = 100) => {
    const unitCost = (rule.price_per_unit || 0) * units;
    return rule.base_price + unitCost;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pricing rules...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Pricing Rules Manager
          </CardTitle>
          <CardDescription>
            Set up automatic pricing rules for different project types to streamline invoice generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add New Rule */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="w-4 h-4" />
                Add New Pricing Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Project Type</Label>
                  <Select
                    value={newRule.project_type}
                    onValueChange={(value) =>
                      setNewRule(prev => ({ ...prev, project_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Base Price (£)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newRule.base_price || ''}
                    onChange={(e) =>
                      setNewRule(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Price per Unit (£)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newRule.price_per_unit || ''}
                    onChange={(e) =>
                      setNewRule(prev => ({ ...prev, price_per_unit: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Type</Label>
                  <Select
                    value={newRule.unit_type}
                    onValueChange={(value) =>
                      setNewRule(prev => ({ ...prev, unit_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={newRule.currency}
                    onValueChange={(value) =>
                      setNewRule(prev => ({ ...prev, currency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newRule.is_active}
                    onCheckedChange={(checked) =>
                      setNewRule(prev => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={() => saveRule(newRule)}
                  disabled={!newRule.project_type || newRule.base_price <= 0}
                >
                  Add Pricing Rule
                </Button>
                
                {newRule.price_per_unit && newRule.price_per_unit > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Example (100 {newRule.unit_type}): £{calculateEstimate(newRule, 100).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Existing Pricing Rules</h3>
            
            {rules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No pricing rules configured yet. Add your first rule above.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="pt-6">
                      {editing === rule.id ? (
                        // Edit mode
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Project Type</Label>
                              <Select
                                value={rule.project_type}
                                onValueChange={(value) =>
                                  setRules(prev => prev.map(r =>
                                    r.id === rule.id ? { ...r, project_type: value } : r
                                  ))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {projectTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Base Price (£)</Label>
                              <Input
                                type="number"
                                value={rule.base_price}
                                onChange={(e) =>
                                  setRules(prev => prev.map(r =>
                                    r.id === rule.id 
                                      ? { ...r, base_price: parseFloat(e.target.value) || 0 }
                                      : r
                                  ))
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Price per Unit (£)</Label>
                              <Input
                                type="number"
                                value={rule.price_per_unit || ''}
                                onChange={(e) =>
                                  setRules(prev => prev.map(r =>
                                    r.id === rule.id 
                                      ? { ...r, price_per_unit: parseFloat(e.target.value) || 0 }
                                      : r
                                  ))
                                }
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveRule(rule)}
                              size="sm"
                            >
                              Save Changes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditing(null)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {rule.project_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <Badge variant={rule.is_active ? "default" : "secondary"}>
                                {rule.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Base: £{rule.base_price.toLocaleString()}
                              {rule.price_per_unit && rule.price_per_unit > 0 && (
                                <span> + £{rule.price_per_unit}/{rule.unit_type}</span>
                              )}
                            </div>
                            {rule.price_per_unit && rule.price_per_unit > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Example (100 {rule.unit_type}): £{calculateEstimate(rule, 100).toLocaleString()}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditing(rule.id || null)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rule.id && deleteRule(rule.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingRulesManager;
