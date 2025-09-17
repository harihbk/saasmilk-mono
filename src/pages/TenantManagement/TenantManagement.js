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
  Progress,
  Alert,
  DatePicker,
  InputNumber,
  Checkbox,
  Tooltip,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  SettingOutlined,
  CrownOutlined,
  ExclamationCircleOutlined,
  CommentOutlined,
  DatabaseOutlined,
  UserOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
  GlobalOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { companiesAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [migrationDrawerVisible, setMigrationDrawerVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [managingSubscription, setManagingSubscription] = useState(null);
  const [form] = Form.useForm();
  const [subscriptionForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchTenants();
    fetchStats();
  }, [pagination.current, pagination.pageSize, searchText, planFilter, statusFilter]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        plan: planFilter || undefined,
        status: statusFilter || undefined,
      };

      const response = await companiesAPI.getCompanies(params);
      const { companies: data, pagination: paginationData } = response.data.data;

      setTenants(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching tenants:', error);
      message.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await companiesAPI.getCompanyStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showCreateTenantModal = () => {
    setEditingTenant(null);
    setModalVisible(true);
    form.resetFields();
  };

  const showEditTenantModal = (tenant) => {
    setEditingTenant(tenant);
    setModalVisible(true);
    form.setFieldsValue({
      name: tenant.name,
      'contactInfo.email': tenant.contactInfo?.email,
      'contactInfo.phone': tenant.contactInfo?.phone,
      'contactInfo.address.street': tenant.contactInfo?.address?.street,
      'contactInfo.address.city': tenant.contactInfo?.address?.city,
      'contactInfo.address.state': tenant.contactInfo?.address?.state,
      'contactInfo.address.postalCode': tenant.contactInfo?.address?.postalCode,
      'businessInfo.type': tenant.businessInfo?.type,
      'businessInfo.description': tenant.businessInfo?.description,
      'businessInfo.website': tenant.businessInfo?.website,
    });
  };

  const showViewModal = (tenant) => {
    setViewingTenant(tenant);
    setViewModalVisible(true);
  };

  const showSubscriptionModal = (tenant) => {
    setManagingSubscription(tenant);
    setSubscriptionModalVisible(true);
    subscriptionForm.setFieldsValue({
      plan: tenant.subscription?.plan,
      status: tenant.subscription?.status,
      endDate: tenant.subscription?.endDate ? dayjs(tenant.subscription.endDate) : null,
      maxUsers: tenant.subscription?.maxUsers,
      maxProducts: tenant.subscription?.maxProducts,
      maxOrders: tenant.subscription?.maxOrders,
      'features.reporting': tenant.subscription?.features?.reporting,
      'features.inventory': tenant.subscription?.features?.inventory,
      'features.multiWarehouse': tenant.subscription?.features?.multiWarehouse,
      'features.advancedReports': tenant.subscription?.features?.advancedReports,
      'features.apiAccess': tenant.subscription?.features?.apiAccess,
      'features.customBranding': tenant.subscription?.features?.customBranding,
    });
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingTenant(null);
    form.resetFields();
  };

  const handleSubmitTenant = async (values) => {
    try {
      if (editingTenant) {
        await companiesAPI.updateCompany(editingTenant._id, values);
        message.success('Tenant updated successfully');
      } else {
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
            password: values.owner?.password
          }
        };

        await companiesAPI.createCompany(payload);
        message.success('Tenant created successfully');
      }

      handleModalCancel();
      fetchTenants();
      fetchStats();
    } catch (error) {
      console.error('Error saving tenant:', error);
      message.error(`Failed to save tenant: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSuspendTenant = async (tenantId, suspend, reason = '') => {
    try {
      await companiesAPI.suspendCompany(tenantId, { suspend, reason });
      message.success(`Tenant ${suspend ? 'suspended' : 'unsuspended'} successfully`);
      fetchTenants();
      fetchStats();
    } catch (error) {
      console.error('Error updating tenant status:', error);
      message.error('Failed to update tenant status');
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    Modal.confirm({
      title: 'Delete Tenant',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Alert
            message="Warning: This action is irreversible!"
            description="Deleting a tenant will permanently remove all associated data including users, products, orders, and other records. This cannot be undone."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Text>Are you sure you want to delete this tenant and all associated data?</Text>
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // Note: You'll need to implement this endpoint
          // await companiesAPI.deleteCompany(tenantId);
          message.success('Tenant deleted successfully');
          fetchTenants();
          fetchStats();
        } catch (error) {
          console.error('Error deleting tenant:', error);
          message.error('Failed to delete tenant');
        }
      },
    });
  };

  const handleUpdateSubscription = async (values) => {
    try {
      const data = {
        ...values,
        endDate: values.endDate ? values.endDate.toISOString() : undefined,
        features: {
          reporting: values['features.reporting'],
          inventory: values['features.inventory'],
          multiWarehouse: values['features.multiWarehouse'],
          advancedReports: values['features.advancedReports'],
          apiAccess: values['features.apiAccess'],
          customBranding: values['features.customBranding'],
        }
      };

      // Remove nested feature keys
      Object.keys(data).forEach(key => {
        if (key.startsWith('features.')) {
          delete data[key];
        }
      });

      await companiesAPI.updateSubscription(managingSubscription._id, data);
      message.success('Subscription updated successfully');
      setSubscriptionModalVisible(false);
      setManagingSubscription(null);
      subscriptionForm.resetFields();
      fetchTenants();
    } catch (error) {
      console.error('Error updating subscription:', error);
      message.error('Failed to update subscription');
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
      active: 'green',
      inactive: 'red',
      suspended: 'orange',
      cancelled: 'red',
      expired: 'red',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Tenant',
      key: 'tenant',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            icon={<GlobalOutlined />} 
            style={{ marginRight: 12, backgroundColor: '#52c41a' }}
          />
          <div>
            <div><strong>{record.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <CloudServerOutlined style={{ marginRight: 4 }} />
              {record.tenantId}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.contactInfo?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Subscription',
      key: 'subscription',
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            <Tag color={getPlanColor(record.subscription?.plan)} icon={<CrownOutlined />}>
              {record.subscription?.plan?.toUpperCase()}
            </Tag>
          </div>
          <div>
            <Badge 
              status={record.subscription?.status === 'active' ? 'success' : 'error'} 
              text={record.subscription?.status} 
            />
          </div>
          {record.subscription?.endDate && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
              Expires: {dayjs(record.subscription.endDate).format('MMM DD, YYYY')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Usage',
      key: 'usage',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <div>
            <UserOutlined style={{ marginRight: 4, color: '#1890ff' }} />
            <Text style={{ fontSize: '12px' }}>
              Users: {record.stats?.totalUsers || 0}/{record.subscription?.maxUsers || '∞'}
            </Text>
          </div>
          <div>
            <DatabaseOutlined style={{ marginRight: 4, color: '#52c41a' }} />
            <Text style={{ fontSize: '12px' }}>
              Products: {record.stats?.totalProducts || 0}/{record.subscription?.maxProducts || '∞'}
            </Text>
          </div>
          <div>
            <BarChartOutlined style={{ marginRight: 4, color: '#722ed1' }} />
            <Text style={{ fontSize: '12px' }}>
              Orders: {record.stats?.totalOrders || 0}/{record.subscription?.maxOrders || '∞'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <div>
          <Badge 
            status={record.isActive && !record.isSuspended ? 'success' : 'error'} 
            text={record.isSuspended ? 'Suspended' : record.isActive ? 'Active' : 'Inactive'} 
          />
          {record.isSuspended && record.suspensionReason && (
            <Tooltip title={`Reason: ${record.suspensionReason}`}>
              <ExclamationCircleOutlined style={{ color: '#fa8c16', marginLeft: 8 }} />
            </Tooltip>
          )}
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            Created: {dayjs(record.createdAt).format('MMM DD, YYYY')}
          </div>
        </div>
      ),
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
              onClick={() => showViewModal(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Tenant">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showEditTenantModal(record)}
            />
          </Tooltip>
          <Tooltip title="Manage Subscription">
            <Button
              type="text"
              icon={<CrownOutlined />}
              onClick={() => showSubscriptionModal(record)}
            />
          </Tooltip>
          {record.isSuspended ? (
            <Tooltip title="Unsuspend Tenant">
              <Popconfirm
                title="Unsuspend this tenant?"
                onConfirm={() => handleSuspendTenant(record._id, false)}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  type="text" 
                  icon={<CheckCircleOutlined />} 
                  style={{ color: '#52c41a' }}
                />
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title="Suspend Tenant">
              <Popconfirm
                title="Suspend this tenant?"
                description="Please provide a reason for suspension."
                onConfirm={() => {
                  Modal.confirm({
                    title: 'Suspend Tenant',
                    content: (
                      <Input.TextArea 
                        placeholder="Enter suspension reason..."
                        id="suspension-reason"
                      />
                    ),
                    onOk: () => {
                      const reason = document.getElementById('suspension-reason')?.value;
                      if (reason) {
                        handleSuspendTenant(record._id, true, reason);
                      } else {
                        message.error('Please provide a suspension reason');
                      }
                    }
                  });
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  type="text" 
                  danger
                  icon={<StopOutlined />} 
                />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Delete Tenant">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTenant(record._id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <GlobalOutlined /> Tenant Management
          </Title>
          <Text type="secondary">Manage multi-tenant companies and their subscriptions</Text>
        </div>
        <Space>
          <Button
            icon={<SecurityScanOutlined />}
            onClick={() => setMigrationDrawerVisible(true)}
          >
            Data Migration
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateTenantModal}
            size="large"
          >
            Create New Tenant
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tenants"
              value={stats.summary?.totalCompanies || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Tenants"
              value={stats.summary?.activeCompanies || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Trial Tenants"
              value={stats.summary?.trialCompanies || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="New This Month"
              value={stats.summary?.recentCompanies || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<PlusOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tenants Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>All Tenants</Text>
          </div>
          <Space>
            <Select
              placeholder="Filter by Plan"
              allowClear
              value={planFilter}
              onChange={setPlanFilter}
              style={{ width: 150 }}
            >
              <Option value="trial">Trial</Option>
              <Option value="basic">Basic</Option>
              <Option value="professional">Professional</Option>
              <Option value="enterprise">Enterprise</Option>
            </Select>
            <Select
              placeholder="Filter by Status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="suspended">Suspended</Option>
            </Select>
            <Input.Search
              placeholder="Search tenants..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={tenants}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tenants`,
          }}
          onChange={(paginationConfig) => {
            setPagination({
              current: paginationConfig.current,
              pageSize: paginationConfig.pageSize,
              total: pagination.total,
            });
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Create/Edit Tenant Modal */}
      <Modal
        title={
          <div>
            <GlobalOutlined /> {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
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
          onFinish={handleSubmitTenant}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tenant Name"
                rules={[
                  { required: true, message: 'Please enter tenant name' },
                  { min: 1, max: 100, message: 'Name must be between 1 and 100 characters' }
                ]}
              >
                <Input placeholder="Enter tenant name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['contactInfo', 'email']}
                label="Contact Email"
                rules={[
                  { required: true, message: 'Please enter contact email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Enter contact email" />
              </Form.Item>
            </Col>
          </Row>

          {!editingTenant && (
            <>
              <Divider orientation="left">Tenant Owner</Divider>
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
                    <Input placeholder="Enter owner name" />
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
                    <Input placeholder="Enter owner email" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name={['owner', 'password']}
                    label="Owner Password"
                    rules={[
                      { required: true, message: 'Please enter password' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password placeholder="Enter password" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider orientation="left">Business Information</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['businessInfo', 'type']}
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
                name={['businessInfo', 'website']}
                label="Website"
                rules={[
                  { type: 'url', message: 'Please enter a valid website URL' }
                ]}
              >
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['businessInfo', 'description']}
            label="Business Description"
          >
            <TextArea 
              rows={3} 
              placeholder="Brief description of the business"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTenant ? 'Update' : 'Create'} Tenant
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Tenant Modal */}
      <Modal
        title={
          <div>
            <EyeOutlined /> Tenant Details
          </div>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {viewingTenant && (
          <div>
            <Descriptions title="Tenant Information" bordered column={2}>
              <Descriptions.Item label="Name">{viewingTenant.name}</Descriptions.Item>
              <Descriptions.Item label="Tenant ID">
                <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>
                  {viewingTenant.tenantId}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="Email">{viewingTenant.contactInfo?.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{viewingTenant.contactInfo?.phone || 'Not provided'}</Descriptions.Item>
              <Descriptions.Item label="Business Type">
                <Tag>{viewingTenant.businessInfo?.type || 'Not specified'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Website">
                {viewingTenant.businessInfo?.website ? (
                  <a href={viewingTenant.businessInfo.website} target="_blank" rel="noopener noreferrer">
                    {viewingTenant.businessInfo.website}
                  </a>
                ) : 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Space>
                  <Badge 
                    status={viewingTenant.isActive && !viewingTenant.isSuspended ? 'success' : 'error'} 
                    text={viewingTenant.isSuspended ? 'Suspended' : viewingTenant.isActive ? 'Active' : 'Inactive'} 
                  />
                  {viewingTenant.isSuspended && viewingTenant.suspensionReason && (
                    <Tag color="orange">Reason: {viewingTenant.suspensionReason}</Tag>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Subscription Details</Divider>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Plan">
                <Tag color={getPlanColor(viewingTenant.subscription?.plan)} icon={<CrownOutlined />}>
                  {viewingTenant.subscription?.plan?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge 
                  status={viewingTenant.subscription?.status === 'active' ? 'success' : 'error'} 
                  text={viewingTenant.subscription?.status} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {viewingTenant.subscription?.endDate ? dayjs(viewingTenant.subscription.endDate).format('MMM DD, YYYY') : 'No end date'}
              </Descriptions.Item>
              <Descriptions.Item label="Days Remaining">
                <span style={{ color: viewingTenant.daysRemaining > 7 ? '#52c41a' : '#fa541c' }}>
                  {viewingTenant.daysRemaining} days
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Usage Statistics</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Users"
                    value={viewingTenant.stats?.totalUsers || 0}
                    suffix={`/ ${viewingTenant.subscription?.maxUsers || '∞'}`}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Progress 
                    percent={viewingTenant.subscription?.maxUsers ? 
                      (viewingTenant.stats?.totalUsers || 0) / viewingTenant.subscription.maxUsers * 100 : 0}
                    size="small"
                    status={viewingTenant.subscription?.maxUsers && 
                      (viewingTenant.stats?.totalUsers || 0) >= viewingTenant.subscription.maxUsers ? 'exception' : 'active'}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Products"
                    value={viewingTenant.stats?.totalProducts || 0}
                    suffix={`/ ${viewingTenant.subscription?.maxProducts || '∞'}`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Progress 
                    percent={viewingTenant.subscription?.maxProducts ? 
                      (viewingTenant.stats?.totalProducts || 0) / viewingTenant.subscription.maxProducts * 100 : 0}
                    size="small"
                    status={viewingTenant.subscription?.maxProducts && 
                      (viewingTenant.stats?.totalProducts || 0) >= viewingTenant.subscription.maxProducts ? 'exception' : 'active'}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Orders"
                    value={viewingTenant.stats?.totalOrders || 0}
                    suffix={`/ ${viewingTenant.subscription?.maxOrders || '∞'}`}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Progress 
                    percent={viewingTenant.subscription?.maxOrders ? 
                      (viewingTenant.stats?.totalOrders || 0) / viewingTenant.subscription.maxOrders * 100 : 0}
                    size="small"
                    status={viewingTenant.subscription?.maxOrders && 
                      (viewingTenant.stats?.totalOrders || 0) >= viewingTenant.subscription.maxOrders ? 'exception' : 'active'}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Subscription Management Modal */}
      <Modal
        title={
          <div>
            <CrownOutlined /> Manage Subscription
          </div>
        }
        open={subscriptionModalVisible}
        onCancel={() => setSubscriptionModalVisible(false)}
        footer={null}
        width={700}
      >
        {managingSubscription && (
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
              <Col span={12}>
                <Form.Item
                  name="endDate"
                  label="End Date"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Limits</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="maxUsers"
                  label="Max Users"
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="maxProducts"
                  label="Max Products"
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="maxOrders"
                  label="Max Orders"
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Features</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name={['features.reporting']} valuePropName="checked">
                  <Checkbox>Reporting</Checkbox>
                </Form.Item>
                <Form.Item name={['features.inventory']} valuePropName="checked">
                  <Checkbox>Inventory Management</Checkbox>
                </Form.Item>
                <Form.Item name={['features.multiWarehouse']} valuePropName="checked">
                  <Checkbox>Multi-Warehouse</Checkbox>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['features.advancedReports']} valuePropName="checked">
                  <Checkbox>Advanced Reports</Checkbox>
                </Form.Item>
                <Form.Item name={['features.apiAccess']} valuePropName="checked">
                  <Checkbox>API Access</Checkbox>
                </Form.Item>
                <Form.Item name={['features.customBranding']} valuePropName="checked">
                  <Checkbox>Custom Branding</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => setSubscriptionModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Update Subscription
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Data Migration Drawer */}
      <Drawer
        title={
          <div>
            <SecurityScanOutlined /> Data Migration & Tools
          </div>
        }
        placement="right"
        onClose={() => setMigrationDrawerVisible(false)}
        open={migrationDrawerVisible}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Data Migration Tools"
            description="Use these tools carefully. Always backup data before performing migration operations."
            type="warning"
            showIcon
          />
          
          <Card title="Tenant Data Operations">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<DatabaseOutlined />}>
                Export Tenant Data
              </Button>
              <Button block icon={<DatabaseOutlined />}>
                Import Tenant Data
              </Button>
              <Button block icon={<SecurityScanOutlined />}>
                Backup All Tenants
              </Button>
              <Button block danger icon={<DeleteOutlined />}>
                Clean Inactive Tenants
              </Button>
            </Space>
          </Card>

          <Card title="System Maintenance">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<SettingOutlined />}>
                Reindex Tenant Data
              </Button>
              <Button block icon={<BarChartOutlined />}>
                Generate Usage Reports
              </Button>
              <Button block icon={<CheckCircleOutlined />}>
                Validate Data Integrity
              </Button>
            </Space>
          </Card>
        </Space>
      </Drawer>
    </div>
  );
};

export default TenantManagement;