import React, { useState, useEffect } from 'react';
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
  Select,
  Steps,
  Spin,
  Tag,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CrownOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

const CompanyRegistrationEnhanced = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [nextTenantId, setNextTenantId] = useState('');
  const [loadingTenantId, setLoadingTenantId] = useState(true);
  const [registrationResult, setRegistrationResult] = useState(null);
  const navigate = useNavigate();

  // Fetch next available tenant ID on component mount
  useEffect(() => {
    fetchNextTenantId();
  }, []);

  const fetchNextTenantId = async () => {
    try {
      setLoadingTenantId(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/companies/next-tenant-id`);
      if (response.data.success) {
        setNextTenantId(response.data.data.nextTenantId);
      }
    } catch (error) {
      console.error('Error fetching next tenant ID:', error);
      message.error('Unable to fetch company ID. Please try again.');
    } finally {
      setLoadingTenantId(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Debug: Log form values
      console.log('Form values:', {
        ...values,
        password: values.password ? '[PROVIDED]' : '[MISSING]',
        confirmPassword: values.confirmPassword ? '[PROVIDED]' : '[MISSING]'
      });

      const requestData = {
        companyName: values.companyName,
        email: values.email,
        ownerName: values.ownerName,
        password: values.password,
        phone: values.phone,
        businessType: values.businessType,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          country: values.country || 'India',
          postalCode: values.postalCode
        }
      };

      // Debug: Log request data
      console.log('Request data:', {
        ...requestData,
        password: requestData.password ? '[PROVIDED]' : '[MISSING]'
      });

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const endpoint = `${apiUrl}/api/companies/register`;
      
      console.log('Making request to:', endpoint);
      
      const response = await axios.post(endpoint, requestData);

      if (response.data.success) {
        setRegistrationResult(response.data.data);
        setCurrentStep(1);
        message.success('Company registered successfully!');
      } else {
        message.error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/tenant');
  };

  const steps = [
    {
      title: 'Company Registration',
      content: 'Register your company',
    },
    {
      title: 'Registration Complete',
      content: 'Your company has been registered successfully',
    },
  ];

  if (currentStep === 1 && registrationResult) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #52c41a 0%, #1890ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Row justify="center" style={{ width: '100%', maxWidth: '800px' }}>
          <Col xs={24} sm={20} md={18} lg={16}>
            <Card
              style={{
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                borderRadius: '12px',
                border: 'none'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <CheckCircleOutlined 
                  style={{ 
                    fontSize: '64px', 
                    color: '#52c41a',
                    marginBottom: '16px'
                  }} 
                />
                <Title level={2} style={{ margin: '0 0 8px 0', color: '#1a1a1a' }}>
                  Registration Successful!
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  Your company has been registered and is ready to use
                </Text>
              </div>

              <Alert
                message="Company Details"
                description={
                  <div>
                    <Row gutter={[16, 8]}>
                      <Col span={12}>
                        <Text strong>Company Name:</Text>
                      </Col>
                      <Col span={12}>
                        <Text>{registrationResult.company.name}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong>Company ID:</Text>
                      </Col>
                      <Col span={12}>
                        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                          {registrationResult.company.tenantId}
                        </Tag>
                      </Col>
                      <Col span={12}>
                        <Text strong>Email:</Text>
                      </Col>
                      <Col span={12}>
                        <Text>{registrationResult.company.email}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong>Plan:</Text>
                      </Col>
                      <Col span={12}>
                        <Tag color="green">{registrationResult.company.plan.toUpperCase()}</Tag>
                      </Col>
                      <Col span={12}>
                        <Text strong>Trial Ends:</Text>
                      </Col>
                      <Col span={12}>
                        <Text>{new Date(registrationResult.company.trialEndsAt).toLocaleDateString()}</Text>
                      </Col>
                    </Row>
                  </div>
                }
                type="success"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <Alert
                message="Login Instructions"
                description={
                  <div>
                    <Paragraph>
                      <Text strong>To access your company workspace:</Text>
                    </Paragraph>
                    <ol style={{ paddingLeft: '20px' }}>
                      <li>Go to the <Link to="/tenant">Tenant Login</Link> page</li>
                      <li>Enter your Company ID: <Tag color="blue">{registrationResult.company.tenantId}</Tag></li>
                      <li>Enter your email: <Text code>{registrationResult.user.email}</Text></li>
                      <li>Enter the password you just created</li>
                    </ol>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />

              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size="large">
                  <Button
                    type="primary"
                    size="large"
                    icon={<LoginOutlined />}
                    onClick={handleLoginRedirect}
                    style={{
                      borderRadius: '8px',
                      height: '48px',
                      minWidth: '200px',
                      background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                      border: 'none',
                      fontWeight: '600'
                    }}
                  >
                    Go to Login
                  </Button>
                  
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Save your Company ID ({registrationResult.company.tenantId}) - you'll need it to login
                    </Text>
                  </div>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: '900px' }}>
        <Col xs={24} sm={22} md={20} lg={18}>
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
                <ShopOutlined style={{ fontSize: '40px', color: 'white' }} />
              </div>
              <Title level={2} style={{ margin: '0 0 8px 0', color: '#1a1a1a' }}>
                Register Your Company
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Create your company workspace and get started
              </Text>
            </div>

            <Steps current={currentStep} style={{ marginBottom: '32px' }}>
              {steps.map(item => (
                <Step key={item.title} title={item.title} />
              ))}
            </Steps>

            {/* Next Tenant ID Display */}
            <Alert
              message="Your Company ID"
              description={
                <div style={{ textAlign: 'center' }}>
                  {loadingTenantId ? (
                    <Spin size="small" />
                  ) : (
                    <div>
                      <Text>Your company will be assigned ID: </Text>
                      <Tag color="blue" style={{ fontSize: '16px', padding: '6px 12px', marginLeft: '8px' }}>
                        {nextTenantId}
                      </Tag>
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          This ID will be used for tenant login
                        </Text>
                      </div>
                    </div>
                  )}
                </div>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={form}
              name="company_registration"
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="companyName"
                    label="Company Name"
                    rules={[
                      { required: true, message: 'Please enter your company name!' },
                      { min: 2, max: 100, message: 'Company name must be between 2 and 100 characters!' }
                    ]}
                  >
                    <Input
                      prefix={<ShopOutlined />}
                      placeholder="Enter your company name"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="businessType"
                    label="Business Type"
                    rules={[{ required: true, message: 'Please select business type!' }]}
                  >
                    <Select
                      placeholder="Select business type"
                      style={{ borderRadius: '8px' }}
                    >
                      <Option value="dairy">Dairy</Option>
                      <Option value="food">Food & Beverage</Option>
                      <Option value="retail">Retail</Option>
                      <Option value="other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="ownerName"
                    label="Owner/Admin Name"
                    rules={[
                      { required: true, message: 'Please enter owner name!' },
                      { min: 2, max: 50, message: 'Name must be between 2 and 50 characters!' }
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Enter owner/admin name"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { required: true, message: 'Please enter email address!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="Enter email address"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: 'Please enter password!' },
                      { min: 6, message: 'Password must be at least 6 characters!' },
                      {
                        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Password must contain uppercase, lowercase, and number!'
                      }
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Enter password"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="confirmPassword"
                    label="Confirm Password"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Confirm password"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="phone"
                label="Phone Number (Optional)"
                rules={[
                  {
                    pattern: /^\+?[1-9]\d{1,14}$/,
                    message: 'Please enter a valid phone number!'
                  }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter phone number"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Divider>Address Information (Optional)</Divider>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="city" label="City">
                    <Input placeholder="Enter city" style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="state" label="State">
                    <Input placeholder="Enter state" style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: '16px', marginTop: '24px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  style={{
                    borderRadius: '8px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                    border: 'none',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Creating Company...' : 'Register Company'}
                </Button>
              </Form.Item>

              <Divider style={{ margin: '24px 0' }}>
                <Text type="secondary">Already have an account?</Text>
              </Divider>

              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size="small">
                  <Link to="/tenant">
                    <Button
                      type="link"
                      icon={<LoginOutlined />}
                      style={{ padding: 0, fontWeight: '500' }}
                    >
                      Company Login
                    </Button>
                  </Link>
                  <Link to="/saas-admin/login">
                    <Button
                      type="link"
                      icon={<CrownOutlined />}
                      style={{ padding: 0, fontWeight: '500', color: '#722ed1' }}
                    >
                      SaaS Admin Login
                    </Button>
                  </Link>
                </Space>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyRegistrationEnhanced;
