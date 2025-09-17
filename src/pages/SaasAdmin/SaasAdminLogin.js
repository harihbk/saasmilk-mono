import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined, CloudServerOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { saasAdminAPI, debugAPI } from '../../services/api';
import './SaasAdminLogin.css';

const { Title, Text } = Typography;

const SaasAdminLogin = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      setError('');

      console.log('Attempting SaaS admin login with:', { email: values.email });

      // Use saasAdminAPI for login
      const response = await saasAdminAPI.login({
        email: values.email,
        password: values.password
      });

      console.log('Login response:', response.data);

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store in localStorage
        localStorage.setItem('saas_admin_token', token);
        localStorage.setItem('saas_admin_user', JSON.stringify(user));
        
        console.log('Token stored in localStorage:', localStorage.getItem('saas_admin_token'));
        console.log('User stored in localStorage:', localStorage.getItem('saas_admin_user'));
        
        setDebugInfo(`✅ Login successful! Token: ${token.substring(0, 20)}... User: ${user.name}`);
        
        // Test if the token works by making an authenticated request
        try {
          const profileResponse = await saasAdminAPI.getProfile();
          console.log('Profile test successful:', profileResponse.data);
          setDebugInfo(`✅ Token verified! Redirecting to dashboard...`);
          
          setTimeout(() => {
            navigate('/saas-admin/dashboard');
          }, 1500);
        } catch (profileError) {
          console.error('Profile test failed:', profileError);
          setDebugInfo(`⚠️ Login successful but token verification failed. Proceeding anyway...`);
          
          setTimeout(() => {
            navigate('/saas-admin/dashboard');
          }, 2000);
        }
      } else {
        setError(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('SaaS Admin login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Connection error';
      setError(`${errorMessage}. Please check if the server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setDebugInfo('Testing connection...');
      
      console.log('Testing connection using debugAPI...');
      
      const response = await debugAPI.testSaasLogin({ 
        test: true, 
        timestamp: new Date().toISOString() 
      });
      
      if (response.data.success) {
        setDebugInfo(`✅ Connection working! Server response: ${response.data.message}`);
      } else {
        setDebugInfo(`❌ Connection failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setDebugInfo(`❌ Connection test failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const testStoredToken = async () => {
    try {
      const storedToken = localStorage.getItem('saas_admin_token');
      const storedUser = localStorage.getItem('saas_admin_user');
      
      if (!storedToken) {
        setDebugInfo('❌ No token found in localStorage');
        return;
      }
      
      setDebugInfo(`🔍 Testing stored token: ${storedToken.substring(0, 20)}...`);
      
      // Test the token with a profile request
      const response = await saasAdminAPI.getProfile();
      setDebugInfo(`✅ Stored token works! User: ${JSON.parse(storedUser || '{}').name}`);
      
    } catch (error) {
      console.error('Stored token test failed:', error);
      setDebugInfo(`❌ Stored token invalid: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="saas-admin-login-container">
      <div className="saas-admin-login-content">
        <Card className="saas-admin-login-card">
          <div className="saas-admin-login-header">
            <CloudServerOutlined className="saas-admin-icon" />
            <Title level={2} className="saas-admin-title">
              SaaS Admin Portal
            </Title>
            <Text type="secondary" className="saas-admin-subtitle">
              Super Administrator Access
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

          {debugInfo && (
            <Alert
              message="Debug Info"
              description={debugInfo}
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
              action={
                <Button size="small" onClick={() => setDebugInfo('')}>
                  Clear
                </Button>
              }
            />
          )}

          <Form
            form={form}
            name="saas-admin-login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="admin@company.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter your password' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="saas-admin-login-button"
              >
                {loading ? 'Signing In...' : 'Sign In to Admin Portal'}
              </Button>
            </Form.Item>
          </Form>

          <div className="saas-admin-login-footer">
            <Space direction="vertical" align="center">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Authorized Personnel Only
              </Text>
              <Button 
                type="link" 
                size="small"
                onClick={() => navigate('/login')}
              >
                ← Back to Main Login
              </Button>
              <Button 
                type="link" 
                size="small"
                onClick={testConnection}
                style={{ color: '#1890ff' }}
              >
                🔧 Test Connection
              </Button>
              <Button 
                type="link" 
                size="small"
                onClick={testStoredToken}
                style={{ color: '#52c41a' }}
              >
                🔑 Test Token
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SaasAdminLogin;
