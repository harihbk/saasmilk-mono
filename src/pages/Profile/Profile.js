import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Row,
  Col,
  Avatar,
  Upload,
  Divider,
  Space,
  Tag,
  Statistic,
  Typography,
  Alert
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  SaveOutlined,
  LockOutlined,
  UploadOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const { Title, Text } = Typography;

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: user.phone,
        'address.street': user.address?.street,
        'address.city': user.address?.city,
        'address.state': user.address?.state,
        'address.zipCode': user.address?.zipCode,
        'address.country': user.address?.country
      });
    }
  }, [user, profileForm]);

  const handleProfileUpdate = async (values) => {
    setLoading(true);
    try {
      const updateData = {
        name: values.name,
        phone: values.phone,
        address: {
          street: values['address.street'],
          city: values['address.city'],
          state: values['address.state'],
          zipCode: values['address.zipCode'],
          country: values['address.country']
        }
      };

      const response = await api.put('/auth/profile', updateData);
      
      // Update user context
      updateUser(response.data.data.user);
      
      message.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values) => {
    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'red',
      manager: 'orange',
      employee: 'blue',
      customer: 'green'
    };
    return colors[role] || 'default';
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: <CrownOutlined />,
      manager: <UserOutlined />,
      employee: <UserOutlined />,
      customer: <UserOutlined />
    };
    return icons[role] || <UserOutlined />;
  };

  const getSubscriptionColor = (plan) => {
    const colors = {
      free: 'default',
      basic: 'blue',
      premium: 'gold',
      enterprise: 'purple'
    };
    return colors[plan] || 'default';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Row gutter={24}>
        {/* Profile Overview */}
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar
                size={120}
                src={user?.avatar}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff', marginBottom: '16px' }}
              />
              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                onChange={(info) => {
                  // Handle avatar upload
                  message.info('Avatar upload functionality to be implemented');
                }}
              >
                <Button icon={<UploadOutlined />} size="small">
                  Change Avatar
                </Button>
              </Upload>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={3} style={{ marginBottom: '8px' }}>
                {user?.name}
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {user?.email}
              </Text>
            </div>

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>Role</Text>
                <div style={{ marginTop: '4px' }}>
                  <Tag color={getRoleColor(user?.role)} icon={getRoleIcon(user?.role)}>
                    {user?.role?.toUpperCase()}
                  </Tag>
                </div>
              </div>

              <div>
                <Text strong>Subscription</Text>
                <div style={{ marginTop: '4px' }}>
                  <Tag color={getSubscriptionColor(user?.subscription?.plan)}>
                    {user?.subscription?.plan?.toUpperCase() || 'FREE'}
                  </Tag>
                </div>
              </div>

              <div>
                <Text strong>Member Since</Text>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: '8px' }} />
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </div>
              </div>

              <div>
                <Text strong>Last Login</Text>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: '8px' }} />
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </Text>
                </div>
              </div>
            </Space>
          </Card>

          {/* Account Statistics */}
          {user?.role !== 'customer' && (
            <Card title="Account Statistics" style={{ marginTop: '24px' }}>
              <Row gutter={16}>
                <Col span={24}>
                  <Statistic
                    title="Email Verified"
                    value={user?.isEmailVerified ? 'Yes' : 'No'}
                    valueStyle={{ 
                      color: user?.isEmailVerified ? '#3f8600' : '#cf1322',
                      fontSize: '16px'
                    }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        {/* Profile Details */}
        <Col span={16}>
          <Card
            title="Profile Information"
            extra={
              <Button
                type={editing ? 'default' : 'primary'}
                icon={editing ? <SaveOutlined /> : <EditOutlined />}
                onClick={() => {
                  if (editing) {
                    profileForm.submit();
                  } else {
                    setEditing(true);
                  }
                }}
                loading={loading}
              >
                {editing ? 'Save Changes' : 'Edit Profile'}
              </Button>
            }
          >
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileUpdate}
              disabled={!editing}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please enter your full name' }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Enter your full name"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email Address"
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="Enter your email"
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="phone"
                label="Phone Number"
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter your phone number"
                />
              </Form.Item>

              <Divider orientation="left">Address Information</Divider>

              <Form.Item
                name="address.street"
                label="Street Address"
              >
                <Input
                  prefix={<HomeOutlined />}
                  placeholder="Enter your street address"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="address.city"
                    label="City"
                  >
                    <Input placeholder="Enter city" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="address.state"
                    label="State/Province"
                  >
                    <Input placeholder="Enter state" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="address.zipCode"
                    label="Zip/Postal Code"
                  >
                    <Input placeholder="Enter zip code" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="address.country"
                label="Country"
              >
                <Input placeholder="Enter country" />
              </Form.Item>

              {editing && (
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button onClick={() => {
                      setEditing(false);
                      profileForm.resetFields();
                    }}>
                      Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Save Changes
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form>
          </Card>

          {/* Change Password */}
          <Card
            title="Change Password"
            style={{ marginTop: '24px' }}
            extra={<LockOutlined />}
          >
            <Alert
              message="Password Security"
              description="Choose a strong password with at least 6 characters, including uppercase, lowercase, and numbers."
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[{ required: true, message: 'Please enter your current password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter current password"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="newPassword"
                    label="New Password"
                    rules={[
                      { required: true, message: 'Please enter new password' },
                      { min: 6, message: 'Password must be at least 6 characters' },
                      {
                        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Password must contain uppercase, lowercase, and number'
                      }
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Enter new password"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm New Password"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Please confirm your new password' },
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
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Confirm new password"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={passwordLoading}
                  icon={<LockOutlined />}
                >
                  Change Password
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
