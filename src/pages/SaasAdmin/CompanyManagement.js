import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Typography,
  Alert,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  ShopOutlined,
  LockOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({});
  const [nextTenantId, setNextTenantId] = useState('');

  useEffect(() => {
    fetchCompanies();
    fetchStats();
    fetchNextTenantId();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('saas_admin_token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setCompanies(response.data.data.companies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('saas_admin_token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/companies/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchNextTenantId = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/companies/next-tenant-id`);
      if (response.data.success) {
        setNextTenantId(response.data.data.nextTenantId);
      }
    } catch (error) {
      console.error('Error fetching next tenant ID:', error);
    }
  };

  const handleCreateCompany = async (values) => {
    try {
      const token = localStorage.getItem('saas_admin_token');
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/companies/register`, {
        companyName: values.companyName,
        email: values.email,
        ownerName: values.ownerName,
        password: values.password,
        phone: values.phone,
        businessType: values.businessType,
        address: {
          city: values.city,
          state: values.state,
          country: values.country || 'India'
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        message.success('Company created successfully!');
        setModalVisible(false);
        form.resetFields();
        fetchCompanies();
        fetchStats();
        fetchNextTenantId();
      }
    } catch (error) {
      console.error('Error creating company:', error);
      message.error(error.response?.data?.message || 'Failed to create company');
    }
  };

  const handleSuspendCompany = async (companyId, suspend) => {
    try {
      const token = localStorage.getItem('saas_admin_token');
      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/saas-admin/companies/${companyId}/suspend`,
        { suspend, reason: suspend ? 'Suspended by admin' : '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        message.success(`Company ${suspend ? 'suspended' : 'unsuspended'} successfully`);
        fetchCompanies();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating company status:', error);
      message.error('Failed to update company status');
    }
  };

  const columns = [
    {
      title: 'Company ID',
      dataIndex: 'tenantId',
      key: 'tenantId',
      render: (tenantId) => (
        <Tag color="blue" style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {tenantId}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.contactInfo?.email}
          </div>
        </div>
      ),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      render: (owner) => (
        <div>
          <div>{owner?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {owner?.email}
          </div>
        </div>
      ),
    },
    {
      title: 'Plan',
      dataIndex: ['subscription', 'plan'],
      key: 'plan',
      render: (plan) => {
        const colors = {
          trial: 'orange',
          basic: 'blue',
          professional: 'green',
          enterprise: 'purple'
        };
        return <Tag color={colors[plan]}>{plan?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.isSuspended) {
          return <Tag color="red">SUSPENDED</Tag>;
        }
        if (!record.isActive) {
          return <Tag color="gray">INACTIVE</Tag>;
        }
        if (record.subscription?.status === 'active') {
          return <Tag color="green">ACTIVE</Tag>;
        }
        return <Tag color="orange">{record.subscription?.status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => {/* View details */}}
          />
          <Button
            type="text"
            icon={record.isSuspended ? <PlayCircleOutlined /> : <StopOutlined />}
            size="small"
            onClick={() => handleSuspendCompany(record._id, !record.isSuspended)}
            style={{ color: record.isSuspended ? '#52c41a' : '#ff4d4f' }}
          />
        </Space>
      ),
      width: 100,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ShopOutlined style={{ color: '#1890ff' }} /> Company Registration Management
        </Title>
        <Text type="secondary">
          View and manage company registrations (This is for viewing registered companies only)
        </Text>
        <div style={{ marginTop: 8 }}>
          <Alert
            message="Note: This page shows company registrations. For full SaaS tenant management with subscription & billing control, use the Tenant Management page."
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        </div>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={stats.totalCompanies || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Companies"
              value={stats.activeCompanies || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Trial Companies"
              value={stats.trialCompanies || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Next Company ID"
              value={nextTenantId}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Companies Table */}
      <Card
        title="Companies"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCompany(null);
              setModalVisible(true);
              form.resetFields();
            }}
          >
            Create Company
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={companies}
          loading={loading}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} companies`,
          }}
        />
      </Card>

      {/* Create/Edit Company Modal */}
      <Modal
        title={editingCompany ? 'Edit Company' : 'Create New Company'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Alert
          message="Next Company ID"
          description={
            <div>
              <Text>This company will be assigned ID: </Text>
              <Tag color="blue" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {nextTenantId}
              </Tag>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCompany}
          size="large"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="companyName"
                label="Company Name"
                rules={[
                  { required: true, message: 'Please enter company name!' },
                  { min: 2, max: 100, message: 'Company name must be between 2-100 characters!' }
                ]}
              >
                <Input
                  prefix={<ShopOutlined />}
                  placeholder="Enter company name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="businessType"
                label="Business Type"
                rules={[{ required: true, message: 'Please select business type!' }]}
              >
                <Select placeholder="Select business type">
                  <Option value="dairy">Dairy</Option>
                  <Option value="food">Food & Beverage</Option>
                  <Option value="retail">Retail</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Owner Information</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ownerName"
                label="Owner/Admin Name"
                rules={[
                  { required: true, message: 'Please enter owner name!' },
                  { min: 2, max: 50, message: 'Name must be between 2-50 characters!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter owner name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please enter email!' },
                  { type: 'email', message: 'Please enter valid email!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter email address"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
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
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number (Optional)"
                rules={[
                  {
                    pattern: /^\+?[1-9]\d{1,14}$/,
                    message: 'Please enter valid phone number!'
                  }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter phone number"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Address (Optional)</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="State">
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Company
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyManagement;
