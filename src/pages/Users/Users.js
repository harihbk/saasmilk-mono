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
  Select,
  Switch,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Descriptions,
  Divider,
  Avatar,
  Badge,
  Tabs,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  ShieldCheckOutlined,
} from '@ant-design/icons';
import { usersAPI, rolesAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchStats();
  }, [pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter !== '' ? statusFilter === 'true' : undefined,
      };

      const response = await usersAPI.getUsers(params);
      const { users: data, pagination: paginationData } = response.data.data;

      setUsers(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await rolesAPI.getRoles({ limit: 100 });
      setRoles(response.data.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await usersAPI.getUserStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showCreateUserModal = () => {
    setEditingUser(null);
    setModalVisible(true);
    form.resetFields();
  };

  const showEditUserModal = (user) => {
    setEditingUser(user);
    setModalVisible(true);

    // Attempt to map existing role value (name or ID) to an ID from the loaded roles list
    const userRole = user.role;
    const matchingRole = roles.find(r => r._id === userRole || r.name.toLowerCase() === userRole?.toString().toLowerCase());

    form.setFieldsValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: matchingRole ? matchingRole._id : user.role, // Prefer ID
      isActive: user.isActive,
      address: user.address,
    });
  };

  const showViewModal = (user) => {
    setViewingUser(user);
    setViewModalVisible(true);
  };

  const showPasswordModal = (user) => {
    setChangingPasswordUser(user);
    setPasswordModalVisible(true);
    passwordForm.resetFields();
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handlePasswordModalCancel = () => {
    setPasswordModalVisible(false);
    setChangingPasswordUser(null);
    passwordForm.resetFields();
  };

  const handleSubmitUser = async (values) => {
    try {
      if (editingUser) {
        await usersAPI.updateUser(editingUser._id, values);
        message.success('User updated successfully');
      } else {
        await usersAPI.createUser(values);
        message.success('User created successfully');
      }

      handleModalCancel();
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error saving user:', error);
      message.error(`Failed to save user: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleChangePassword = async (values) => {
    try {
      await usersAPI.changePassword(changingPasswordUser._id, values);
      message.success('Password changed successfully');
      handlePasswordModalCancel();
    } catch (error) {
      console.error('Error changing password:', error);
      message.error(`Failed to change password: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await usersAPI.deleteUser(userId);
      message.success('User deactivated successfully');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('Failed to deactivate user');
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'red',
      manager: 'blue',
      employee: 'green',
      viewer: 'orange',
    };
    return colors[role] || 'default';
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            icon={<UserOutlined />}
            src={record.avatar}
            style={{ marginRight: 12 }}
          />
          <div>
            <div><strong>{record.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (roleVal) => {
        // Find role by ID or Name
        const matchingRole = roles.find(r => r._id === roleVal || r.name.toLowerCase() === roleVal?.toString().toLowerCase());
        const display = matchingRole ? matchingRole.displayName : roleVal;
        // Determine color based on role name if matched, else fallback
        const colorKey = matchingRole ? matchingRole.name.toLowerCase() : (roleVal?.toString().toLowerCase() || 'default');

        return (
          <Tag color={getRoleColor(colorKey)} style={{ textTransform: 'capitalize' }}>
            {display}
          </Tag>
        );
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
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
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : 'Never',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
      sorter: true,
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
            onClick={() => showEditUserModal(record)}
            title="Edit User"
          />
          <Button
            type="text"
            icon={<KeyOutlined />}
            onClick={() => showPasswordModal(record)}
            title="Change Password"
          />
          <Popconfirm
            title="Are you sure you want to deactivate this user?"
            onConfirm={() => handleDeleteUser(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Deactivate User"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          <TeamOutlined /> User Management
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateUserModal}
          size="large"
        >
          Create New User
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UnlockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inactive Users"
              value={stats.inactiveUsers || 0}
              valueStyle={{ color: '#f5222d' }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Recent Users"
              value={stats.recentUsers || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<PlusOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>All Users</Text>
          </div>
          <Space>
            <Select
              placeholder="Filter by Role"
              allowClear
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 150 }}
            >
              {roles.map(role => (
                <Option key={role.name} value={role.name.toLowerCase()}>
                  {role.displayName}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by Status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Option value="true">Active</Option>
              <Option value="false">Inactive</Option>
            </Select>
            <Input.Search
              placeholder="Search users..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
          }}
          onChange={(paginationConfig) => {
            setPagination({
              current: paginationConfig.current,
              pageSize: paginationConfig.pageSize,
              total: pagination.total,
            });
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        title={
          <div>
            <UserOutlined /> {editingUser ? 'Edit User' : 'Create New User'}
          </div>
        }
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[
                  { required: true, message: 'Please enter full name' },
                  { min: 2, max: 50, message: 'Name must be between 2 and 50 characters' }
                ]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter email address' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password placeholder="Enter password" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { pattern: /^\+?[1-9]\d{1,14}$/, message: 'Please enter a valid phone number' }
                ]}
              >
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select a role' }]}
                initialValue="employee"
              >
                <Select placeholder="Select role">
                  {roles.map(role => (
                    <Option key={role._id} value={role._id}>
                      <Tag color={getRoleColor(role.name.toLowerCase())} style={{ marginRight: 8 }}>
                        {role.displayName}
                      </Tag>
                      {role.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="isActive"
                label="Account Status"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch
                  checkedChildren="Active"
                  unCheckedChildren="Inactive"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Address Information (Optional)</Divider>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name={['address', 'street']} label="Street Address">
                <Input placeholder="Enter street address" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['address', 'city']} label="City">
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['address', 'state']} label="State">
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['address', 'zipCode']} label="Zip Code">
                <Input placeholder="Enter zip code" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update' : 'Create'} User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View User Modal */}
      <Modal
        title={
          <div>
            <EyeOutlined /> User Details
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
        {viewingUser && (
          <div>
            <Descriptions title="User Information" bordered column={2}>
              <Descriptions.Item label="Name">{viewingUser.name}</Descriptions.Item>
              <Descriptions.Item label="Email">{viewingUser.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{viewingUser.phone || 'Not provided'}</Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color={getRoleColor(viewingUser.role)}>
                  {viewingUser.role?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge
                  status={viewingUser.isActive ? 'success' : 'error'}
                  text={viewingUser.isActive ? 'Active' : 'Inactive'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Email Verified">
                <Badge
                  status={viewingUser.isEmailVerified ? 'success' : 'warning'}
                  text={viewingUser.isEmailVerified ? 'Verified' : 'Not Verified'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Last Login">
                {viewingUser.lastLogin ? dayjs(viewingUser.lastLogin).format('MMM DD, YYYY HH:mm') : 'Never'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {dayjs(viewingUser.createdAt).format('MMM DD, YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {viewingUser.address && (
              <>
                <Divider orientation="left">Address Information</Divider>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Street">
                    {viewingUser.address.street || 'Not provided'}
                  </Descriptions.Item>
                  <Descriptions.Item label="City">
                    {viewingUser.address.city || 'Not provided'}
                  </Descriptions.Item>
                  <Descriptions.Item label="State">
                    {viewingUser.address.state || 'Not provided'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Zip Code">
                    {viewingUser.address.zipCode || 'Not provided'}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={
          <div>
            <KeyOutlined /> Change Password
          </div>
        }
        open={passwordModalVisible}
        onCancel={handlePasswordModalCancel}
        footer={null}
        width={500}
      >
        {changingPasswordUser && (
          <>
            <Alert
              message={`Changing password for: ${changingPasswordUser.name}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleChangePassword}
            >
              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter new password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password placeholder="Enter new password" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm the password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Confirm new password" />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={handlePasswordModalCancel}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Change Password
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Users;