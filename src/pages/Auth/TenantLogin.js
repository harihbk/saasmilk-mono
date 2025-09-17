import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Row,
  Col,
  Space,
  Divider,
  message,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  GlobalOutlined,
  ShopOutlined,
  LoginOutlined,
  CrownOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

const TenantLogin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password, values.tenantId);
      message.success('Login successful');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      message.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card
            style={{
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              border: 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <GlobalOutlined style={{ fontSize: '40px', color: 'white' }} />
              </div>
              <Title level={2} style={{ margin: '0 0 8px 0', color: '#1a1a1a' }}>
                Tenant Login
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Access your company workspace
              </Text>
            </div>

            <Form
              name="tenant_login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >

              <Form.Item
                name="tenantId"
                label="Company ID"
                rules={[
                  { required: true, message: 'Please input your company ID!' },
                  { min: 2, message: 'Company ID must be at least 2 characters!' }
                ]}
              >
                <Input
                  prefix={<ShopOutlined />}
                  placeholder="Enter your company ID (e.g., ACME)"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Please input your username!' },
                  { min: 3, message: 'Username must be at least 3 characters!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter your username or email"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 6, message: 'Password must be at least 6 characters!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter your password"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: '16px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  icon={<LoginOutlined />}
                  style={{
                    borderRadius: '8px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                    border: 'none',
                    fontWeight: '600'
                  }}
                >
                  Sign In to Workspace
                </Button>
              </Form.Item>

              <Divider style={{ margin: '24px 0' }}>
                <Text type="secondary">or</Text>
              </Divider>

              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size="small">
                  <Link to="/saas-admin/login">
                    <Button
                      type="link"
                      icon={<CrownOutlined />}
                      style={{ padding: 0, fontWeight: '500' }}
                    >
                      SaaS Admin Login
                    </Button>
                  </Link>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Need a company account? Contact your administrator
                  </Text>
                </Space>
              </div>
            </Form>

            <Alert
              message="Multi-Tenant Access"
              description="This login is for company users. Enter your Company ID (provided by your administrator), username/email, and password to access your company's workspace."
              type="info"
              showIcon
              style={{ 
                marginTop: '24px',
                borderRadius: '8px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd'
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TenantLogin;
