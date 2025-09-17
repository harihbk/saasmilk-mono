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
  Tabs,
  Alert,
  DatePicker,
  InputNumber,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
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
} from '@ant-design/icons';
import { companiesAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [managingSubscription, setManagingSubscription] = useState(null);
  const [addingNoteTo, setAddingNoteTo] = useState(null);
  const [form] = Form.useForm();
  const [subscriptionForm] = Form.useForm();
  const [noteForm] = Form.useForm();
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
    fetchCompanies();
    fetchStats();
  }, [pagination.current, pagination.pageSize, searchText, planFilter, statusFilter]);

  const fetchCompanies = async () => {
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

      setCompanies(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to fetch companies');
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

  const showCreateCompanyModal = () => {
    setEditingCompany(null);
    setModalVisible(true);
    form.resetFields();
  };

  const showEditCompanyModal = (company) => {
    setEditingCompany(company);
    setModalVisible(true);
    form.setFieldsValue({
      name: company.name,
      'contactInfo.email': company.contactInfo?.email,
      'contactInfo.phone': company.contactInfo?.phone,
      'contactInfo.address.street': company.contactInfo?.address?.street,
      'contactInfo.address.city': company.contactInfo?.address?.city,
      'contactInfo.address.state': company.contactInfo?.address?.state,
      'contactInfo.address.postalCode': company.contactInfo?.address?.postalCode,
      'businessInfo.type': company.businessInfo?.type,
      'businessInfo.description': company.businessInfo?.description,
      'businessInfo.website': company.businessInfo?.website,
    });
  };

  const showViewModal = (company) => {
    setViewingCompany(company);
    setViewModalVisible(true);
  };

  const showSubscriptionModal = (company) => {
    setManagingSubscription(company);
    setSubscriptionModalVisible(true);
    subscriptionForm.setFieldsValue({
      plan: company.subscription?.plan,
      status: company.subscription?.status,
      endDate: company.subscription?.endDate ? dayjs(company.subscription.endDate) : null,
      maxUsers: company.subscription?.maxUsers,
      maxProducts: company.subscription?.maxProducts,
      maxOrders: company.subscription?.maxOrders,
      'features.reporting': company.subscription?.features?.reporting,
      'features.inventory': company.subscription?.features?.inventory,
      'features.multiWarehouse': company.subscription?.features?.multiWarehouse,
      'features.advancedReports': company.subscription?.features?.advancedReports,
      'features.apiAccess': company.subscription?.features?.apiAccess,
      'features.customBranding': company.subscription?.features?.customBranding,
    });
  };

  const showNoteModal = (company) => {
    setAddingNoteTo(company);
    setNoteModalVisible(true);
    noteForm.resetFields();
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingCompany(null);
    form.resetFields();
  };

  const handleSubmitCompany = async (values) => {
    try {
      if (editingCompany) {
        await companiesAPI.updateCompany(editingCompany._id, values);
        message.success('Company updated successfully');
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
        message.success('Company created successfully');
      }

      handleModalCancel();
      fetchCompanies();
      fetchStats();
    } catch (error) {
      console.error('Error saving company:', error);
      message.error(`Failed to save company: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSuspendCompany = async (companyId, suspend, reason = '') => {
    try {
      await companiesAPI.suspendCompany(companyId, { suspend, reason });
      message.success(`Company ${suspend ? 'suspended' : 'unsuspended'} successfully`);
      fetchCompanies();
      fetchStats();
    } catch (error) {
      console.error('Error updating company status:', error);
      message.error('Failed to update company status');
    }
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
      fetchCompanies();
    } catch (error) {
      console.error('Error updating subscription:', error);
      message.error('Failed to update subscription');
    }
  };

  const handleAddNote = async (values) => {
    try {
      await companiesAPI.addNote(addingNoteTo._id, values);
      message.success('Note added successfully');
      setNoteModalVisible(false);
      setAddingNoteTo(null);
      noteForm.resetFields();
      fetchCompanies();
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
      title: 'Company',
      key: 'company',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            icon={<ShopOutlined />} 
            style={{ marginRight: 12, backgroundColor: '#1890ff' }}
          />
          <div>
            <div><strong>{record.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.tenantId} • {record.contactInfo?.email}
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
          <Tag color={getPlanColor(record.subscription?.plan)} style={{ marginBottom: 4 }}>
            {record.subscription?.plan?.toUpperCase()}
          </Tag>
          <div>
            <Badge 
              status={record.subscription?.status === 'active' ? 'success' : 'error'} 
              text={record.subscription?.status} 
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Users',
      dataIndex: ['stats', 'totalUsers'],
      key: 'users',
      render: (users, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
            {users || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            / {record.subscription?.maxUsers || '∞'}
          </div>
        </div>
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
          {record.subscription?.endDate && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              Expires: {dayjs(record.subscription.endDate).format('MMM DD, YYYY')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => showViewModal(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditCompanyModal(record)}
            title="Edit Company"
          />
          <Button
            type="text"
            icon={<CrownOutlined />}
            onClick={() => showSubscriptionModal(record)}
            title="Manage Subscription"
          />
          <Button
            type="text"
            icon={<CommentOutlined />}
            onClick={() => showNoteModal(record)}
            title="Add Note"
          />
          {record.isSuspended ? (
            <Popconfirm
              title="Unsuspend this company?"
              onConfirm={() => handleSuspendCompany(record._id, false)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />} 
                title="Unsuspend Company"
                style={{ color: '#52c41a' }}
              />
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Suspend this company?"
              description="Please provide a reason for suspension."
              onConfirm={() => {
                Modal.confirm({
                  title: 'Suspend Company',
                  content: (
                    <Input.TextArea 
                      placeholder="Enter suspension reason..."
                      id="suspension-reason"
                    />
                  ),
                  onOk: () => {
                    const reason = document.getElementById('suspension-reason')?.value;
                    if (reason) {
                      handleSuspendCompany(record._id, true, reason);
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
                title="Suspend Company" 
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ShopOutlined /> Company Management
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateCompanyModal}
          size="large"
        >
          Create New Company
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={stats.summary?.totalCompanies || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Companies"
              value={stats.summary?.activeCompanies || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Trial Companies"
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

      {/* Companies Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>All Companies</Text>
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
              placeholder="Search companies..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={companies}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} companies`,
          }}
          onChange={(paginationConfig) => {
            setPagination({
              current: paginationConfig.current,
              pageSize: paginationConfig.pageSize,
              total: pagination.total,
            });
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit Company Modal */}
      <Modal
        title={
          <div>
            <ShopOutlined /> {editingCompany ? 'Edit Company' : 'Create New Company'}
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
          onFinish={handleSubmitCompany}
        >
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
                <Input placeholder="Enter company name" />
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
                <Input placeholder="Enter company email" />
              </Form.Item>
            </Col>
          </Row>

          {!editingCompany && (
            <>
              <Divider orientation="left">Company Owner</Divider>
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
                {editingCompany ? 'Update' : 'Create'} Company
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Company Modal */}
      <Modal
        title={
          <div>
            <EyeOutlined /> Company Details
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
        {viewingCompany && (
          <div>
            <Descriptions title="Company Information" bordered column={2}>
              <Descriptions.Item label="Name">{viewingCompany.name}</Descriptions.Item>
              <Descriptions.Item label="Tenant ID">
                <code>{viewingCompany.tenantId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Email">{viewingCompany.contactInfo?.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{viewingCompany.contactInfo?.phone || 'Not provided'}</Descriptions.Item>
              <Descriptions.Item label="Business Type">
                <Tag>{viewingCompany.businessInfo?.type || 'Not specified'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Website">
                {viewingCompany.businessInfo?.website ? (
                  <a href={viewingCompany.businessInfo.website} target="_blank" rel="noopener noreferrer">
                    {viewingCompany.businessInfo.website}
                  </a>
                ) : 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Space>
                  <Badge 
                    status={viewingCompany.isActive && !viewingCompany.isSuspended ? 'success' : 'error'} 
                    text={viewingCompany.isSuspended ? 'Suspended' : viewingCompany.isActive ? 'Active' : 'Inactive'} 
                  />
                  {viewingCompany.isSuspended && viewingCompany.suspensionReason && (
                    <Tag color="orange">Reason: {viewingCompany.suspensionReason}</Tag>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Subscription Details</Divider>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Plan">
                <Tag color={getPlanColor(viewingCompany.subscription?.plan)}>
                  {viewingCompany.subscription?.plan?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge 
                  status={viewingCompany.subscription?.status === 'active' ? 'success' : 'error'} 
                  text={viewingCompany.subscription?.status} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {viewingCompany.subscription?.endDate ? dayjs(viewingCompany.subscription.endDate).format('MMM DD, YYYY') : 'No end date'}
              </Descriptions.Item>
              <Descriptions.Item label="Days Remaining">
                <span style={{ color: viewingCompany.daysRemaining > 7 ? '#52c41a' : '#fa541c' }}>
                  {viewingCompany.daysRemaining} days
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Usage Stats</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Users"
                    value={viewingCompany.stats?.totalUsers || 0}
                    suffix={`/ ${viewingCompany.subscription?.maxUsers || '∞'}`}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Products"
                    value={viewingCompany.stats?.totalProducts || 0}
                    suffix={`/ ${viewingCompany.subscription?.maxProducts || '∞'}`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Orders"
                    value={viewingCompany.stats?.totalOrders || 0}
                    suffix={`/ ${viewingCompany.subscription?.maxOrders || '∞'}`}
                    valueStyle={{ color: '#722ed1' }}
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

      {/* Add Note Modal */}
      <Modal
        title={
          <div>
            <CommentOutlined /> Add Note
          </div>
        }
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        footer={null}
        width={500}
      >
        {addingNoteTo && (
          <>
            <Alert
              message={`Adding note to: ${addingNoteTo.name}`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form
              form={noteForm}
              layout="vertical"
              onFinish={handleAddNote}
            >
              <Form.Item
                name="content"
                label="Note Content"
                rules={[
                  { required: true, message: 'Please enter note content' },
                  { min: 1, max: 1000, message: 'Note must be between 1 and 1000 characters' }
                ]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Enter your note here..."
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24, textAlign: 'right', marginBottom: 0 }}>
                <Space>
                  <Button onClick={() => setNoteModalVisible(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Add Note
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Companies;