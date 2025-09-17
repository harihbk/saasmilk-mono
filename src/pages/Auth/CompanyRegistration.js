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
  Divider,
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
  GlobalOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { companiesAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CompanyRegistration = () => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

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

  const onFinish = async (values) => {
    // First, validate that we have values from the form
    if (!values || Object.keys(values).length === 0) {
      console.log('No form values received, getting from form directly');
      values = form.getFieldsValue();
    }
    
    console.log('Form submission values:', values);
    
    // Check if this is just a step navigation, not final submission
    if (current < 1) {
      console.log('Not on final step, should not submit');
      return;
    }
    
    setLoading(true);
    
    try {
      // Transform the form values to match API expectations
      const payload = {
        name: values.name,
        contactInfo: {
          email: values.contactInfo?.email,
          phone: values.contactInfo?.phone,
          address: {
            street: values.contactInfo?.address?.street,
            city: values.contactInfo?.address?.city,
            state: values.contactInfo?.address?.state,
            postalCode: values.contactInfo?.address?.postalCode
          }
        },
        businessInfo: {
          type: values.businessInfo?.type,
          website: values.businessInfo?.website,
          description: values.businessInfo?.description
        },
        owner: {
          name: values.owner?.name,
          email: values.owner?.email,
          phone: values.owner?.phone,
          password: values.owner?.password
        }
      };

      console.log('Sending payload:', payload);

      const response = await companiesAPI.createCompany(payload);
      const { company, owner } = response.data.data;
      
      message.success('Company registered successfully!');
      
      // Move to success step
      setCurrent(2);
      
      // Store the created company info for display
      form.setFieldsValue({
        createdCompany: company,
        createdOwner: owner
      });

    } catch (error) {
      console.error('Registration error:', error);
      message.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    try {
      // Validate only current step fields
      const currentStepFields = getCurrentStepFields();
      await form.validateFields(currentStepFields);
      setCurrent(current + 1);
    } catch (error) {
      console.log('Validation failed:', error);
    }
  };

  const getCurrentStepFields = () => {
    switch (current) {
      case 0:
        return ['name', ['contactInfo', 'email'], ['contactInfo', 'phone'], ['businessInfo', 'type'], ['businessInfo', 'website'], ['businessInfo', 'description']];
      case 1:
        return [['owner', 'name'], ['owner', 'email'], ['owner', 'phone'], ['owner', 'password'], ['owner', 'confirmPassword']];
      default:
        return [];
    }
  };

  const prev = () => {
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
                  label="Company Phone"
                  rules={[
                    { pattern: /^[0-9+\-\s()]{10,15}$/, message: 'Please enter a valid phone number' }
                  ]}
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

            <Form.Item
              name={['businessInfo', 'website']}
              label="Website (Optional)"
              rules={[
                { type: 'url', message: 'Please enter a valid website URL' }
              ]}
            >
              <Input 
                placeholder="https://yourcompany.com" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name={['businessInfo', 'description']}
              label="Business Description"
            >
              <TextArea 
                rows={3} 
                placeholder="Brief description of your business"
                size="large"
              />
            </Form.Item>
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
                  name={['owner', 'phone']}
                  label="Owner Phone (Optional)"
                  rules={[
                    { pattern: /^[0-9+\-\s()]{10,15}$/, message: 'Please enter a valid phone number' }
                  ]}
                >
                  <Input 
                    prefix={<PhoneOutlined />}
                    placeholder="Enter phone number" 
                    size="large"
                  />
                </Form.Item>
              </Col>
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
            </Row>

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

            <Alert
              message="Account Setup"
              description="The owner account will be created with company admin privileges. You can add more users after registration."
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </>
        );

      case 2:
        const createdCompany = form.getFieldValue('createdCompany');
        const createdOwner = form.getFieldValue('createdOwner');
        
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

            {createdCompany && (
              <Card style={{ textAlign: 'left', marginBottom: 24 }}>
                <Title level={5}>Company Details:</Title>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>Company Name:</Text><br />
                    <Text>{createdCompany.name}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Tenant ID:</Text><br />
                    <Text code style={{ fontSize: '14px' }}>{createdCompany.tenantId}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Email:</Text><br />
                    <Text>{createdCompany.contactInfo?.email}</Text>
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
              description={`Your Tenant ID is: ${createdCompany?.tenantId}. You'll need this to log in to your company workspace.`}
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Space size="large">
              <Button 
                type="primary" 
                size="large"
                onClick={() => navigate('/tenant')}
                style={{ minWidth: '150px' }}
              >
                Login to Workspace
              </Button>
              <Button 
                size="large"
                onClick={() => {
                  form.resetFields();
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

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
            >
              {renderStepContent()}

              <div style={{ marginTop: 32, textAlign: 'center' }}>
                {current === 0 && (
                  <Space>
                    <Link to="/tenant">
                      <Button icon={<ArrowLeftOutlined />}>
                        Back to Login
                      </Button>
                    </Link>
                    <Button type="primary" onClick={next} size="large">
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
                      onClick={() => {
                        console.log('Button clicked, current step:', current);
                        console.log('Current form values:', form.getFieldsValue());
                        form.submit();
                      }}
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

export default CompanyRegistration;