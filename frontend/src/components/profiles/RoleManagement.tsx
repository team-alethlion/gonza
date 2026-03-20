"use client";
import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/contexts/BusinessContext';
import { useProfiles, BusinessRole } from '@/contexts/ProfileContext';
import { getRolesAction, upsertRoleAction, deleteRoleAction } from '@/app/actions/profiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Shield, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const MODULES = [
    { id: 'sales', name: 'Sales', actions: ['view', 'create', 'edit', 'delete', 'refund'] },
    {
        id: 'inventory',
        name: 'Inventory',
        actions: ['view', 'create', 'edit', 'delete', 'stock_adjustment', 'view_cost_price', 'view_profit', 'view_selling_price']
    },
    { id: 'finance', name: 'Finance', actions: ['view', 'create', 'edit', 'manage_accounts'] },
    { id: 'customers', name: 'Customers', actions: ['view', 'create', 'edit', 'delete', 'manage'] },
    { id: 'messages', name: 'Messages', actions: ['view', 'create', 'edit', 'delete', 'send'] },
    { id: 'tasks', name: 'Tasks', actions: ['view', 'create', 'edit', 'delete', 'manage'] },
    { id: 'profiles', name: 'Profiles', actions: ['view', 'manage'] },
    { id: 'settings', name: 'Settings', actions: ['view', 'manage'] },
    { id: 'expenses', name: 'Expenses', actions: ['view', 'create', 'edit', 'delete'] },
    {
        id: 'dashboard',
        name: 'Dashboard',
        actions: ['view', 'view_total_sales', 'view_gross_profit', 'view_total_expenses', 'view_inventory_value', 'view_sales_types', 'view_avg_price', 'view_total_amount']
    },
];

export const RoleManagement: React.FC = () => {
    const { currentBusiness } = useBusiness();
    const { hasPermission, loadProfiles: reloadProfiles } = useProfiles();
    const [roles, setRoles] = useState<BusinessRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingRole, setEditingRole] = useState<Partial<BusinessRole> | null>(null);

    useEffect(() => {
        loadRoles();
    }, [currentBusiness?.id]);

    const loadRoles = async () => {
        if (!currentBusiness?.id) return;
        setIsLoading(true);
        try {
            const data = await getRolesAction(currentBusiness.id);
            setRoles(data as unknown as BusinessRole[]);
        } catch (error) {
            console.error('Error loading roles:', error);
            toast.error('Failed to load roles');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRole = async () => {
        if (!currentBusiness?.id || !editingRole?.name) return;

        try {
            const roleData = {
                id: editingRole.id,
                business_location_id: currentBusiness.id,
                name: editingRole.name,
                description: editingRole.description || null,
                permissions: editingRole.permissions || {},
            };

            const result = await upsertRoleAction(currentBusiness.id, roleData);

            if (!result.success) throw new Error(result.error);

            toast.success(editingRole.id ? 'Role updated' : 'Role created');

            setEditingRole(null);
            await loadRoles();
            await reloadProfiles();
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error('Failed to save role');
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!currentBusiness?.id) return;
        if (!confirm('Are you sure you want to delete this role? Profiles assigned to this role will lose their special permissions.')) return;

        try {
            const result = await deleteRoleAction(id, currentBusiness.id);
            if (!result.success) throw new Error(result.error);
            toast.success('Role deleted');
            await loadRoles();
            await reloadProfiles();
        } catch (error) {
            console.error('Error deleting role:', error);
            toast.error('Failed to delete role');
        }
    };

    const togglePermission = (moduleId: string, action: string) => {
        if (!editingRole) return;

        const currentPermissions = { ...(editingRole.permissions || {}) };
        const modulePermissions = [...(currentPermissions[moduleId] || [])];

        if (modulePermissions.includes(action)) {
            currentPermissions[moduleId] = modulePermissions.filter(a => a !== action);
        } else {
            currentPermissions[moduleId] = [...modulePermissions, action];
        }

        setEditingRole({ ...editingRole, permissions: currentPermissions });
    };

    if (!hasPermission('profiles', 'manage')) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    You do not have permission to manage roles.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Roles & Permissions</h3>
                    <p className="text-sm text-muted-foreground">Manage roles and what each profile can access.</p>
                </div>
                {!editingRole && (
                    <Button onClick={() => setEditingRole({ name: '', permissions: {} })} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Role
                    </Button>
                )}
            </div>

            {editingRole ? (
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle>{editingRole.id ? 'Edit Role' : 'Create New Role'}</CardTitle>
                        <CardDescription>Define the name and permissions for this role.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role-name">Role Name</Label>
                                <Input
                                    id="role-name"
                                    value={editingRole.name}
                                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                    placeholder="e.g. Sales Associate"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role-desc">Description</Label>
                                <Input
                                    id="role-desc"
                                    value={editingRole.description || ''}
                                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                                    placeholder="Brief description of the role's purpose"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border rounded-lg p-4 bg-muted/30">
                                {MODULES.map((module) => (
                                    <div key={module.id} className="space-y-3">
                                        <div className="font-semibold text-sm flex items-center gap-2 border-b pb-1">
                                            <Shield className="h-3 w-3 text-primary" />
                                            {module.name}
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {module.actions.map((action) => (
                                                <div key={action} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`${module.id}-${action}`}
                                                        checked={(editingRole.permissions?.[module.id] || []).includes(action)}
                                                        onCheckedChange={() => togglePermission(module.id, action)}
                                                    />
                                                    <Label
                                                        htmlFor={`${module.id}-${action}`}
                                                        className="text-xs capitalize font-normal cursor-pointer"
                                                    >
                                                        {action.replace('_', ' ')}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setEditingRole(null)} className="gap-2">
                                <X className="h-4 w-4" /> Cancel
                            </Button>
                            <Button onClick={handleSaveRole} className="gap-2">
                                <Check className="h-4 w-4" /> {editingRole.id ? 'Update Role' : 'Create Role'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <p>Loading roles...</p>
                    ) : roles.length === 0 ? (
                        <p className="text-muted-foreground col-span-full text-center py-8">No custom roles created yet.</p>
                    ) : (
                        roles.map((role) => (
                            <Card key={role.id} className="group hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{role.name}</CardTitle>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRole(role)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRole(role.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-1">{role.description || 'No description'}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {Object.keys(role.permissions).slice(0, 4).map(mod => (
                                            <span key={mod} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                                                {mod}
                                            </span>
                                        ))}
                                        {Object.keys(role.permissions).length > 4 && (
                                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                                +{Object.keys(role.permissions).length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
