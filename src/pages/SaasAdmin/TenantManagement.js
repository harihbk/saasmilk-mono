import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Avatar,
  Typography,
  Row,
  Col,
  Statistic,
  Descriptions,
  Tabs,
  List,
  Badge,
  Popconfirm,
  Tooltip,
  DatePicker,
  InputNumber,
  Divider,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  ReloadOutlined,
  StopOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { saasAdminAPI } from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Search } = Input;

const TenantManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [stats, setStats] = useState({});
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [subscriptionForm] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    status: '',
    isActive: '',
  });

  useEffect(() => {
    fetchCompanies();
    fetchStats();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await saasAdminAPI.getTenants(params);
      const { tenants: companiesData, pagination: paginationData } = response.data.data;

      setCompanies(companiesData);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total,
      }));
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await saasAdminAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateCompany = async (values) => {
    try {
      const tenantData = {
        name: values.name,
        tenantId: values.tenantId,
        contactInfo: {
          email: values.email,
          phone: values.phone,
        },
        businessInfo: {
          type: values.businessType || 'dairy',
        },
        subscription: {
          plan: values.plan,
        }
      };

      await saasAdminAPI.createTenant(tenantData);
      message.success('Company created successfully');
      setCreateModalVisible(false);
      form.resetFields();
      fetchCompanies();
      fetchStats();
    } catch (error) {
      console.error('Error creating company:', error);
      message.error(error.response?.data?.message || 'Failed to create company');
    }
  };

  const handleEditCompany = async (values) => {
    try {
      const updateData = {
        name: values.name,
        contactInfo: {
          email: values.email,
          phone: values.phone,
          address: {
            street: values.address,
            city: values.city,
            state: values.state,
            country: values.country || 'India',
            postalCode: values.postalCode,
          }
        },
        businessInfo: {
          type: values.businessType,
          industry: values.industry,
          description: values.description,
          website: values.website,
        },
      };

      await saasAdminAPI.updateTenant(selectedCompany._id, updateData);
      message.success('Company updated successfully');
      setEditModalVisible(false);
      setSelectedCompany(null);
      editForm.resetFields();
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      console.error('Error details:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data,
        response: error.response?.data
      });
      message.error(error.response?.data?.message || 'Failed to update company');
    }
  };

  const handleSuspendCompany = async (company, suspend) => {
    try {
      await saasAdminAPI.suspendTenant(company._id, {
        isSuspended: suspend,
        reason: suspend ? 'Suspended by admin' : undefined
      });
      message.success(`Company ${suspend ? 'suspended' : 'unsuspended'} successfully`);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company status:', error);
      message.error('Failed to update company status');
    }
  };

  const handleUpdateSubscription = async (values) => {
    try {
      // Convert dayjs objects to ISO strings for dates
      const subscriptionData = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        endDate: values.endDate ? values.endDate.toISOString() : undefined
      };

      await saasAdminAPI.updateTenant(selectedCompany._id, { subscription: subscriptionData });
      message.success('Subscription updated successfully');
      setSubscriptionModalVisible(false);
      setSelectedCompany(null);
      subscriptionForm.resetFields();
      fetchCompanies();
    } catch (error) {
      console.error('Error updating subscription:', error);
      message.error('Failed to update subscription');
    }
  };

  const handleAddNote = async (values) => {
    try {
      // Note: The new tenant API doesn't support notes yet
      // This would need to be implemented in the backend if needed
      message.info('Note functionality not yet implemented for tenant management');
      setNoteModalVisible(false);
      noteForm.resetFields();
    } catch (error) {
      console.error('Error adding note:', error);
      message.error('Failed to add note');
    }
  };

  const getPlanColor = (plan) => {
    const colors = {
      trial: 'orange',
      basic: 'blue',
      professional: 'green',
      enterprise: 'purple',
    };
    return colors[plan] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
      cancelled: 'error',
      expired: 'warning',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            icon={<ShopOutlined />} 
            style={{ 
              marginRight: 12, 
              backgroundColor: getPlanColor(record.subscription?.plan) 
            }} 
          />
          <div>
            <div><strong>{record.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              ID: {record.tenantId}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Slug: {record.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.contactInfo?.email}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.contactInfo?.phone}
          </div>
        </div>
      ),
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (_, record) => (
        <Tag color={getPlanColor(record.subscription?.plan)} icon={<CrownOutlined />}>
          {record.subscription?.plan?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <div>
          <Badge 
            status={getStatusColor(record.subscription?.status)} 
            text={record.subscription?.status?.toUpperCase()} 
          />
          {record.isSuspended && (
            <div>
              <Tag color="red" size="small">SUSPENDED</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Users',
      key: 'users',
      render: (_, record) => (
        <div>
          <Text>{record.stats?.totalUsers || 0}/{record.subscription?.maxUsers || 0}</Text>
          <div style={{ width: '60px', marginTop: '4px' }}>
            <Progress
              percent={((record.stats?.totalUsers || 0) / (record.subscription?.maxUsers || 1)) * 100}
              size="small"
              showInfo={false}
              strokeColor={
                (record.stats?.totalUsers || 0) >= (record.subscription?.maxUsers || 0) 
                  ? '#ff4d4f' 
                  : '#52c41a'
              }
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Last Activity',
      key: 'lastActivity',
      render: (_, record) => 
        record.stats?.lastActivity 
          ? dayjs(record.stats.lastActivity).fromNow()
          : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={async () => {
                try {
                  const response = await saasAdminAPI.getTenant(record._id);
                  setSelectedCompany(response.data.data.tenant);
                  setViewModalVisible(true);
                } catch (error) {
                  message.error('Failed to load company details');
                }
              }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => {
                setSelectedCompany(record);
                editForm.setFieldsValue({
                  name: record.name,
                  email: record.contactInfo?.email,
                  phone: record.contactInfo?.phone,
                  address: record.contactInfo?.address?.street,
                  city: record.contactInfo?.address?.city,
                  state: record.contactInfo?.address?.state,
                  country: record.contactInfo?.address?.country,
                  postalCode: record.contactInfo?.address?.postalCode,
                  businessType: record.businessInfo?.type,
                  industry: record.businessInfo?.industry,
                  description: record.businessInfo?.description,
                  website: record.businessInfo?.website,
                });
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Manage Subscription">
            <Button 
              type="text" 
              icon={<CrownOutlined />} 
              size="small"
              onClick={() => {
                setSelectedCompany(record);
                subscriptionForm.setFieldsValue({
                  plan: record.subscription?.plan,
                  status: record.subscription?.status,
                  maxUsers: record.subscription?.maxUsers,
                  maxProducts: record.subscription?.maxProducts,
                  maxOrders: record.subscription?.maxOrders,
                  startDate: record.subscription?.startDate ? dayjs(record.subscription.startDate) : null,
                  endDate: record.subscription?.endDate ? dayjs(record.subscription.endDate) : null,
                });
                setSubscriptionModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={record.isSuspended ? 'Unsuspend' : 'Suspend'}>
            <Popconfirm
              title={`Are you sure you want to ${record.isSuspended ? 'unsuspend' : 'suspend'} this company?`}
              onConfirm={() => handleSuspendCompany(record, !record.isSuspended)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                type="text" 
                icon={record.isSuspended ? <PlayCircleOutlined /> : <StopOutlined />}
                size="small"
                danger={!record.isSuspended}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <GlobalOutlined /> Tenant Management
          </Title>
          <Text type="secondary">Manage all tenants in your SaaS platform</Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchCompanies();
              fetchStats();
            }}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create New Tenant
          </Button>
        </Space>
      </div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={stats.summary?.totalCompanies || 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.summary?.activeCompanies || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Trial"
              value={stats.summary?.trialCompanies || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Suspended"
              value={stats.summary?.suspendedCompanies || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="Search companies..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onSearch={() => fetchCompanies()}
              enterButton
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Plan"
              value={filters.plan}
              onChange={(value) => setFilters(prev => ({ ...prev, plan: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="trial">Trial</Option>
              <Option value="basic">Basic</Option>
              <Option value="professional">Professional</Option>
              <Option value="enterprise">Enterprise</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Status"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="suspended">Suspended</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="expired">Expired</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="Active Status"
              value={filters.isActive}
              onChange={(value) => setFilters(prev => ({ ...prev, isActive: value }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="true">Active</Option>
              <Option value="false">Inactive</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Button 
              type="primary" 
              onClick={fetchCompanies}
              style={{ width: '100%' }}
            >
              Apply Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Companies Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={companies}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} companies`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize,
              }));
            },
          }}
        />
      </Card>

      {/* Create Company Modal */}
      <Modal
        title="Create New Company"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCompany}
        >
          <Divider orientation="left">Company Information</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Company Name"
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tenantId"
                label="Tenant ID"
                rules={[
                  { required: true, message: 'Please enter tenant ID' },
                  { min: 2, max: 20, message: 'Tenant ID must be 2-20 characters' },
                  { pattern: /^[a-zA-Z0-9]+$/, message: 'Tenant ID must be alphanumeric' }
                ]}
              >
                <Input placeholder="TENANT001" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Company Email"
                rules={[
                  { required: true, message: 'Please enter company email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="company@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
              >
                <Input placeholder="+91-9876543210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="businessType"
                label="Business Type"
              >
                <Select placeholder="Select business type">
                  <Option value="dairy">Dairy</Option>
                  <Option value="food">Food</Option>
                  <Option value="beverage">Beverage</Option>
                  <Option value="retail">Retail</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="plan"
                label="Subscription Plan"
                rules={[{ required: true, message: 'Please select a plan' }]}
                initialValue="trial"
              >
                <Select placeholder="Select plan">
                  <Option value="trial">Trial</Option>
                  <Option value="basic">Basic</Option>
                  <Option value="professional">Professional</Option>
                  <Option value="enterprise">Enterprise</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '24px', textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Company
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Company Modal */}
      <Modal
        title="Company Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedCompany(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setSelectedCompany(null);
          }}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedCompany && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Company Name" span={2}>
              {selectedCompany.name}
            </Descriptions.Item>
            <Descriptions.Item label="Tenant ID">
              <Text code>{selectedCompany.tenantId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Slug">
              <Text code>{selectedCompany.slug}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedCompany.contactInfo?.email}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {selectedCompany.contactInfo?.phone || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Plan">
              <Tag color={getPlanColor(selectedCompany.subscription?.plan)}>
                {selectedCompany.subscription?.plan?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge 
                status={getStatusColor(selectedCompany.subscription?.status)} 
                text={selectedCompany.subscription?.status?.toUpperCase()} 
              />
              {selectedCompany.isSuspended && (
                <Tag color="red" style={{ marginLeft: 8 }}>SUSPENDED</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {dayjs(selectedCompany.createdAt).format('MMMM DD, YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Last Activity">
              {selectedCompany.stats?.lastActivity 
                ? dayjs(selectedCompany.stats.lastActivity).format('MMMM DD, YYYY HH:mm')
                : 'Never'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        title="Edit Company"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedCompany(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditCompany}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Company Name"
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Company Email"
                rules={[
                  { required: true, message: 'Please enter company email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="company@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
              >
                <Input placeholder="+91-9876543210" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="businessType"
                label="Business Type"
              >
                <Select placeholder="Select business type">
                  <Option value="dairy">Dairy</Option>
                  <Option value="food">Food</Option>
                  <Option value="beverage">Beverage</Option>
                  <Option value="retail">Retail</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '24px', textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                setSelectedCompany(null);
                editForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Company
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        title="Manage Subscription"
        open={subscriptionModalVisible}
        onCancel={() => {
          setSubscriptionModalVisible(false);
          setSelectedCompany(null);
          subscriptionForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={subscriptionForm}
          layout="vertical"
          onFinish={handleUpdateSubscription}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="plan"
                label="Subscription Plan"
                rules={[{ required: true, message: 'Please select a plan' }]}
              >
                <Select placeholder="Select plan">
                  <Option value="trial">Trial</Option>
                  <Option value="basic">Basic</Option>
                  <Option value="professional">Professional</Option>
                  <Option value="enterprise">Enterprise</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select status">
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="suspended">Suspended</Option>
                  <Option value="cancelled">Cancelled</Option>
                  <Option value="expired">Expired</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="maxUsers"
                label="Max Users"
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="Max users"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxProducts"
                label="Max Products"
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="Max products"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxOrders"
                label="Max Orders"
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="Max orders"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="Subscription End Date"
                rules={[{ required: true, message: 'Please select end date' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="Select end date"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Subscription Start Date"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="Select start date"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: '24px', textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setSubscriptionModalVisible(false);
                setSelectedCompany(null);
                subscriptionForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Subscription
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantManagement;
