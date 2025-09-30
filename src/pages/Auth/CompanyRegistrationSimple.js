import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Row,
  Col,
  Space,
  message,
  Select,
  Steps,
  Alert,
} from 'antd';
import {
  ShopOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { companiesAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CompanyRegistrationSimple = () => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Restore form values when step changes
  React.useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      form.setFieldsValue(formData);
    }
  }, [current, form, formData]);

  const steps = [
    {
      title: 'Company Info',
      description: 'Basic company details'
    },
    {
      title: 'Owner Details',
      description: 'Company owner information'
    },
    {
      title: 'Complete',
      description: 'Finish registration'
    }
  ];

  const handleNext = async () => {
    try {
      if (current === 0) {
        // Validate and get ALL form values from step 1
        await form.validateFields();
        const allFormValues = form.getFieldsValue();
        console.log('Step 1 form values:', allFormValues);
        
        // Store the entire form state
        setFormData(prev => ({...prev, ...allFormValues}));
        setCurrent(1);
      }
    } catch (error) {
      console.log('Validation failed:', error);
      message.error('Please fill in all required fields');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate step 2 fields
      await form.validateFields();
      const currentFormValues = form.getFieldsValue();
      console.log('Step 2 form values:', currentFormValues);
      
      // Combine with previous step data
      const allData = {...formData, ...currentFormValues};
      console.log('Combined form data:', allData);
      
      setLoading(true);
      
      // Transform to API format - being very careful with the data structure
      const payload = {
        name: allData.name,
        contactInfo: {
          email: allData.contactInfo?.email,
          phone: allData.contactInfo?.phone || ''
        },
        businessInfo: {
          type: allData.businessInfo?.type || 'other',
          website: allData.businessInfo?.website || '',
          description: allData.businessInfo?.description || ''
        },
        owner: {
          name: allData.owner?.name,
          email: allData.owner?.email,
          phone: allData.owner?.phone || '',
          password: allData.owner?.password
        }
      };

      console.log('Final payload to send:', JSON.stringify(payload, null, 2));
      
      // Validate payload has required fields
      if (!payload.name || !payload.contactInfo.email || !payload.owner.name || !payload.owner.email || !payload.owner.password) {
        console.error('Missing required fields in payload:', {
          name: payload.name,
          email: payload.contactInfo.email,
          ownerName: payload.owner.name,
          ownerEmail: payload.owner.email,
          ownerPassword: payload.owner.password ? 'provided' : 'missing'
        });
        message.error('Missing required fields. Please check all fields are filled.');
        setLoading(false);
        return;
      }

      console.log('Calling API with payload...');
      
      const response = await companiesAPI.createCompany(payload);
      const { company, owner } = response.data.data;
      
      message.success('Company registered successfully!');
      setCurrent(2);
      
      // Store success data
      setFormData(prev => ({
        ...prev,
        createdCompany: company,
        createdOwner: owner
      }));

    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.data?.errors) {
        // Handle validation errors from backend
        const validationErrors = error.response.data.errors;
        console.error('Validation errors:', validationErrors);
        
        const errorMessages = validationErrors.map(err => `${err.field}: ${err.message}`).join('\n');
        message.error(`Validation failed:\n${errorMessages}`);
      } else {
        message.error(error.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const prev = () => {
    // Store current form values before going back
    const currentValues = form.getFieldsValue();
    setFormData(prev => ({...prev, ...currentValues}));
    setCurrent(current - 1);
  };

  const renderStepContent = () => {
    switch (current) {
      case 0:
        return (
          <>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Company Information
            </Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Company Name"
                  rules={[
                    { required: true, message: 'Please enter company name' },
                    { min: 1, max: 100, message: 'Name must be between 1 and 100 characters' }
                  ]}
                >
                  <Input 
                    prefix={<ShopOutlined />}
                    placeholder="Enter your company name" 
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['contactInfo', 'email']}
                  label="Company Email"
                  rules={[
                    { required: true, message: 'Please enter company email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />}
                    placeholder="Enter company email" 
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['contactInfo', 'phone']}
                  label="Company Phone (Optional)"
                >
                  <Input 
                    prefix={<PhoneOutlined />}
                    placeholder="Enter company phone" 
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['businessInfo', 'type']}
                  label="Business Type"
                >
                  <Select placeholder="Select business type" size="large">
                    <Option value="dairy">Dairy</Option>
                    <Option value="food">Food & Beverage</Option>
                    <Option value="retail">Retail</Option>
                    <Option value="wholesale">Wholesale</Option>
                    <Option value="manufacturing">Manufacturing</Option>
                    <Option value="distribution">Distribution</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 1:
        return (
          <>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
              Company Owner Details
            </Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['owner', 'name']}
                  label="Owner Name"
                  rules={[
                    { required: true, message: 'Please enter owner name' },
                    { min: 2, max: 50, message: 'Name must be between 2 and 50 characters' }
                  ]}
                >
                  <Input 
                    prefix={<UserOutlined />}
                    placeholder="Enter full name" 
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['owner', 'email']}
                  label="Owner Email"
                  rules={[
                    { required: true, message: 'Please enter owner email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />}
                    placeholder="Enter email address" 
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['owner', 'password']}
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Enter password" 
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['owner', 'confirmPassword']}
                  label="Confirm Password"
                  dependencies={[['owner', 'password']]}
                  rules={[
                    { required: true, message: 'Please confirm password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue(['owner', 'password']) === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Confirm password" 
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, #52c41a, #73d13d)',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto'
            }}>
              <CheckCircleOutlined style={{ fontSize: '40px', color: 'white' }} />
            </div>
            
            <Title level={3} style={{ color: '#52c41a', marginBottom: 16 }}>
              Registration Successful!
            </Title>
            
            <Paragraph style={{ fontSize: '16px', marginBottom: 24 }}>
              Your company has been successfully registered and is ready to use.
            </Paragraph>

            {formData.createdCompany && (
              <Card style={{ textAlign: 'left', marginBottom: 24 }}>
                <Title level={5}>Company Details:</Title>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>Company Name:</Text><br />
                    <Text>{formData.createdCompany.name}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Tenant ID:</Text><br />
                    <Text code style={{ fontSize: '14px' }}>{formData.createdCompany.tenantId}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Email:</Text><br />
                    <Text>{formData.createdCompany.contactInfo?.email}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text><br />
                    <Text style={{ color: '#52c41a' }}>Active</Text>
                  </Col>
                </Row>
              </Card>
            )}

            <Alert
              message="Important: Save Your Tenant ID"
              description={`Your Tenant ID is: ${formData.createdCompany?.tenantId}. You'll need this to log in to your company workspace.`}
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Space size="large">
              <Button 
                type="primary" 
                size="large"
                onClick={() => navigate('tenant')}
                style={{ minWidth: '150px' }}
              >
                Login to Workspace
              </Button>
              <Button 
                size="large"
                onClick={() => {
                  form.resetFields();
                  setFormData({});
                  setCurrent(0);
                }}
                style={{ minWidth: '150px' }}
              >
                Register Another
              </Button>
            </Space>
          </div>
        );

      default:
        return null;
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
      <Row justify="center" style={{ width: '100%', maxWidth: '800px' }}>
        <Col xs={24} sm={22} md={20} lg={18} xl={16}>
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
                Company Registration
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Create your company workspace
              </Text>
            </div>

            <Steps 
              current={current} 
              items={steps}
              style={{ marginBottom: 32 }}
            />

            <Form form={form} layout="vertical">
              {renderStepContent()}

              <div style={{ marginTop: 32, textAlign: 'center' }}>
                {current === 0 && (
                  <Space>
                    <Link to="/tenant">
                      <Button icon={<ArrowLeftOutlined />}>
                        Back to Login
                      </Button>
                    </Link>
                    <Button type="primary" onClick={handleNext} size="large">
                      Next
                    </Button>
                  </Space>
                )}
                {current === 1 && (
                  <Space>
                    <Button onClick={prev} size="large">
                      Previous
                    </Button>
                    <Button 
                      type="primary" 
                      onClick={handleSubmit}
                      loading={loading}
                      size="large"
                    >
                      Register Company
                    </Button>
                  </Space>
                )}
                {current === 2 && (
                  <Text type="secondary">
                    Registration complete! Use the buttons above to continue.
                  </Text>
                )}
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyRegistrationSimple;