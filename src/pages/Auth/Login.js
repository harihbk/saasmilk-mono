import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  Divider,
  Alert,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  CrownOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      await login(values.email, values.password);

     
      // Navigation will be handled by the auth context
    } catch (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div style={{
                background: 'linear-gradient(135deg, #fa541c, #ff7a45)',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <CrownOutlined style={{ fontSize: '30px', color: 'white' }} />
              </div>
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                Super Admin
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Platform administration access
            </Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                {
                  required: true,
                  message: 'Please input your email!',
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email!',
                },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter your email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                {
                  required: true,
                  message: 'Please input your password!',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: '48px', fontSize: '16px' }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

       
        
          <Divider />

          <div className="auth-footer" style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="small">
              <Link to="/tenant">
                <Button
                  type="link"
                  icon={<GlobalOutlined />}
                  style={{ padding: 0, fontWeight: '500' }}
                >
                  Company Login
                </Button>
              </Link>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Access your company workspace
              </Text>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
