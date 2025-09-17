import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Descriptions,
  Divider,
  Badge,
  Alert,
  Collapse,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  SafetyOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  LockOutlined,
  UnlockOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { rolesAPI, usersAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [viewingRole, setViewingRole] = useState(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchRoles();
    fetchUsers();
    fetchStats();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await rolesAPI.getRoles({ limit: 100 });
      setRoles(response.data.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      message.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers({ limit: 1000 });
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await rolesAPI.getRoleStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const initializeDefaultRoles = async () => {
    try {
      const response = await rolesAPI.initializeRoles();
      message.success(`Initialized ${response.data.data.roles.length} default roles`);
      fetchRoles();
      fetchStats();
    } catch (error) {
      console.error('Error initializing roles:', error);
      message.error('Failed to initialize default roles');
    }
  };

  const showCreateRoleModal = () => {
    setEditingRole(null);
    setModalVisible(true);
    form.resetFields();
    // Set default permissions
    form.setFieldsValue({
      permissions: getDefaultPermissions()
    });
  };

  const showEditRoleModal = (role) => {
    setEditingRole(role);
    setModalVisible(true);
    form.setFieldsValue({
      displayName: role.displayName,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      permissions: role.permissions || getDefaultPermissions()
    });
  };

  const showViewModal = (role) => {
    setViewingRole(role);
    setViewModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingRole(null);
    form.resetFields();
  };

  const getDefaultPermissions = () => ({
    users: { create: false, read: false, update: false, delete: false },
    products: { create: false, read: true, update: false, delete: false },
    orders: { create: true, read: true, update: false, delete: false },
    customers: { create: false, read: true, update: false, delete: false },
    dealers: { create: false, read: true, update: false, delete: false },
    suppliers: { create: false, read: true, update: false, delete: false },
    inventory: { create: false, read: true, update: false, delete: false },
    reports: { read: true },
    settings: { create: false, read: false, update: false, delete: false },
    routes: { create: false, read: true, update: false, delete: false }
  });

  const handleSubmitRole = async (values) => {
    try {
      if (editingRole) {
        await rolesAPI.updateRole(editingRole._id, values);
        message.success('Role updated successfully');
      } else {
        await rolesAPI.createRole(values);
        message.success('Role created successfully');
      }

      handleModalCancel();
      fetchRoles();
      fetchStats();
    } catch (error) {
      console.error('Error saving role:', error);
      message.error(`Failed to save role: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await rolesAPI.deleteRole(roleId);
      message.success('Role deleted successfully');
      fetchRoles();
      fetchStats();
    } catch (error) {
      console.error('Error deleting role:', error);
      message.error(`Failed to delete role: ${error.response?.data?.message || error.message}`);
    }
  };

  const getRoleColor = (role) => {
    if (role.isSystem) {
      const colors = {
        ADMIN: 'red',
        MANAGER: 'blue',
        EMPLOYEE: 'green',
        VIEWER: 'orange',
      };
      return colors[role.name] || 'purple';
    }
    return 'cyan';
  };

  const getUsersCountForRole = (roleName) => {
    return users.filter(user => user.role === roleName.toLowerCase()).length;
  };

  const columns = [
    {
      title: 'Role',
      key: 'role',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <Tag color={getRoleColor(record)} style={{ marginRight: 8 }}>
              {record.displayName}
            </Tag>
            {record.isSystem && (
              <Badge count="System" style={{ backgroundColor: '#108ee9' }} />
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Code: <code>{record.name}</code>
          </div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: 'Users',
      key: 'users',
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
            {getUsersCountForRole(record.name)}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>assigned</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? 'Active' : 'Inactive'} 
        />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => showViewModal(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditRoleModal(record)}
            title="Edit Role"
            disabled={record.isSystem} // Prevent editing system roles permissions
          />
          {!record.isSystem && (
            <Popconfirm
              title="Are you sure you want to delete this role?"
              description="This action cannot be undone."
              onConfirm={() => handleDeleteRole(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                title="Delete Role" 
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const renderPermissionSection = (sectionName, permissions, disabled = false) => {
    const sectionPermissions = permissions[sectionName] || {};
    const actions = ['create', 'read', 'update', 'delete'];
    
    // Special case for reports which only has 'read'
    const availableActions = sectionName === 'reports' ? ['read'] : actions;

    return (
      <Panel 
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
              {sectionName}
            </span>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {availableActions.filter(action => sectionPermissions[action]).length} / {availableActions.length} permissions
            </span>
          </div>
        } 
        key={sectionName}
      >
        <Row gutter={16}>
          {availableActions.map(action => (
            <Col span={6} key={action}>
              <Form.Item
                name={['permissions', sectionName, action]}
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Checkbox disabled={disabled}>
                  <span style={{ textTransform: 'capitalize' }}>{action}</span>
                </Checkbox>
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Panel>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <SecurityScanOutlined /> Role Management
          </Title>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            Manage user roles and permissions
          </p>
        </div>
        <Space>
          <Button
            icon={<SafetyOutlined />}
            onClick={initializeDefaultRoles}
          >
            Initialize Default Roles
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateRoleModal}
          >
            Create Custom Role
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Roles"
              value={stats.summary?.totalRoles || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SecurityScanOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Roles"
              value={stats.summary?.activeRoles || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UnlockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="System Roles"
              value={stats.summary?.systemRoles || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Custom Roles"
              value={stats.summary?.customRoles || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Roles Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} roles`,
          }}
        />
      </Card>

      {/* Create/Edit Role Modal */}
      <Modal
        title={
          <div>
            <SecurityScanOutlined /> {editingRole ? 'Edit Role' : 'Create New Role'}
          </div>
        }
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
      >
        {editingRole?.isSystem && (
          <Alert
            message="System Role"
            description="You can only edit the display name and description of system roles. Permissions are managed by the system."
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitRole}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[
                  { required: true, message: 'Please enter display name' },
                  { min: 1, max: 100, message: 'Display name must be between 1 and 100 characters' }
                ]}
              >
                <Input placeholder="Enter role display name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Role Code"
                rules={[
                  !editingRole && { required: true, message: 'Please enter role code' },
                  { min: 1, max: 50, message: 'Role code must be between 1 and 50 characters' }
                ].filter(Boolean)}
              >
                <Input 
                  placeholder="e.g., CUSTOM_ROLE" 
                  disabled={!!editingRole}
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 500, message: 'Description cannot exceed 500 characters' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="Brief description of this role"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Active Status"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch 
              checkedChildren="Active" 
              unCheckedChildren="Inactive" 
            />
          </Form.Item>

          {(!editingRole?.isSystem) && (
            <>
              <Divider orientation="left">Permissions</Divider>
              <Collapse>
                {Object.keys(getDefaultPermissions()).map(section => 
                  renderPermissionSection(section, form.getFieldValue('permissions') || {})
                )}
              </Collapse>
            </>
          )}

          <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? 'Update' : 'Create'} Role
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Role Modal */}
      <Modal
        title={
          <div>
            <EyeOutlined /> Role Details
          </div>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {viewingRole && (
          <div>
            <Descriptions title="Role Information" bordered column={2}>
              <Descriptions.Item label="Display Name">{viewingRole.displayName}</Descriptions.Item>
              <Descriptions.Item label="Role Code">
                <code>{viewingRole.name}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {viewingRole.description || 'No description provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={viewingRole.isSystem ? 'blue' : 'green'}>
                  {viewingRole.isSystem ? 'System Role' : 'Custom Role'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge 
                  status={viewingRole.isActive ? 'success' : 'error'} 
                  text={viewingRole.isActive ? 'Active' : 'Inactive'} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="Users Assigned">
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                  {getUsersCountForRole(viewingRole.name)}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(viewingRole.createdAt).format('MMM DD, YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Permissions</Divider>
            <Collapse>
              {viewingRole.permissions && Object.entries(viewingRole.permissions).map(([section, perms]) => (
                <Panel 
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                        {section}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {Object.values(perms).filter(Boolean).length} permissions granted
                      </span>
                    </div>
                  } 
                  key={section}
                >
                  <Row gutter={16}>
                    {Object.entries(perms).map(([action, allowed]) => (
                      <Col span={6} key={action}>
                        <div style={{ marginBottom: 8 }}>
                          <Checkbox checked={allowed} disabled>
                            <span style={{ textTransform: 'capitalize' }}>{action}</span>
                          </Checkbox>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Panel>
              ))}
            </Collapse>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Roles;