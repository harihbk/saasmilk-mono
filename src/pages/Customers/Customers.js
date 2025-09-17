import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Select,
  Card,
  Typography,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { customersAPI } from '../../services/api';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchCustomers();
  }, [pagination.current, pagination.pageSize, searchText, typeFilter, statusFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      };

      const response = await customersAPI.getCustomers(params);
      const { customers: data, pagination: paginationData } = response.data.data;

      setCustomers(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers(mockCustomers);
      setPagination(prev => ({ ...prev, total: mockCustomers.length }));
    } finally {
      setLoading(false);
    }
  };

  const mockCustomers = [
    {
      _id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      type: 'individual',
      status: 'active',
      addresses: [
        {
          type: 'billing',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          isDefault: true,
        }
      ],
      loyaltyPoints: 150,
      totalOrders: 12,
      totalSpent: 450.75,
      lastOrderDate: new Date(),
      createdAt: new Date(),
    },
    {
      _id: '2',
      name: 'ABC Restaurant',
      email: 'orders@abcrestaurant.com',
      phone: '+1-555-0456',
      type: 'business',
      status: 'active',
      addresses: [
        {
          type: 'billing',
          street: '456 Business Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          isDefault: true,
        }
      ],
      loyaltyPoints: 500,
      totalOrders: 45,
      totalSpent: 2340.50,
      lastOrderDate: new Date(),
      createdAt: new Date(),
    },
  ];

  const handleTableChange = (paginationConfig) => {
    setPagination(paginationConfig);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTypeFilter = (value) => {
    setTypeFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const showModal = (customer = null) => {
    setEditingCustomer(customer);
    setModalVisible(true);
    if (customer) {
      // Transform backend customer data to match frontend form structure
      const formData = {
        firstName: customer.personalInfo?.firstName || '',
        lastName: customer.personalInfo?.lastName || '',
        email: customer.personalInfo?.email || '',
        phone: customer.personalInfo?.phone?.primary || '',
        type: customer.type || 'individual',
        status: customer.status || 'active',
        address: customer.addresses?.[0] || {},
        financialInfo: customer.financialInfo || {}
      };
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingCustomer(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      // Transform frontend form data to match backend Customer model structure
      const customerData = {
        type: values.type,
        personalInfo: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: {
            primary: values.phone
          }
        },
        addresses: [
          {
            ...values.address,
            type: 'billing',
            isDefault: true,
          }
        ],
        financialInfo: values.financialInfo || {},
        status: values.status || 'active'
      };

      if (editingCustomer) {
        await customersAPI.updateCustomer(editingCustomer._id, customerData);
        message.success('Customer updated successfully');
      } else {
        await customersAPI.createCustomer(customerData);
        message.success('Customer created successfully');
      }

      setModalVisible(false);
      setEditingCustomer(null);
      form.resetFields();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Failed to save customer');
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await customersAPI.deleteCustomer(id);
      message.success('Customer deactivated successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error deactivating customer:', error);
      message.error('Failed to deactivate customer');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      inactive: 'red',
      suspended: 'orange',
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      individual: 'blue',
      business: 'purple',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            style={{ backgroundColor: getTypeColor(record.type), marginRight: 12 }}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.displayName || `${record.personalInfo?.firstName || ''} ${record.personalInfo?.lastName || ''}`.trim()}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {record.personalInfo?.email}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              <PhoneOutlined style={{ marginRight: 4 }} />
              {record.personalInfo?.phone?.primary}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getTypeColor(type)} style={{ textTransform: 'capitalize' }}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Orders',
      key: 'totalOrders',
      render: (_, record) => record.statistics?.totalOrders || 0,
      sorter: true,
    },
    {
      title: 'Total Spent',
      key: 'totalSpent',
      render: (_, record) => `₹${(record.statistics?.totalSpent || 0).toFixed(2)}`,
      sorter: true,
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_, record) => {
        const balance = record.financialInfo?.currentBalance || 0;
        const balanceType = balance < 0 ? 'Credit' : balance > 0 ? 'Debit' : 'Clear';
        const color = balance < 0 ? 'green' : balance > 0 ? 'red' : 'default';
        
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: color === 'green' ? '#52c41a' : color === 'red' ? '#f5222d' : '#666' }}>
              ₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <Tag color={color} size="small">
              {balanceType}
            </Tag>
          </div>
        );
      },
      sorter: true,
    },
    {
      title: 'Loyalty Points',
      key: 'loyaltyPoints',
      render: (_, record) => (
        <Tag color="gold">{record.loyaltyProgram?.points || 0} pts</Tag>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => {
        const address = record.addresses?.[0];
        return address ? `${address.city}, ${address.state}` : 'N/A';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          />
          <Popconfirm
            title="Are you sure you want to deactivate this customer?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const customerTypes = ['individual', 'business'];
  const statuses = ['active', 'inactive', 'suspended'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Customers</Title>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Customers"
              value={customers.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Customers"
              value={customers.filter(c => c.status === 'active').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Business Customers"
              value={customers.filter(c => c.type === 'business').length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={customers.reduce((sum, c) => sum + (c.statistics?.totalSpent || 0), 0)}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* Filters and Actions */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space>
                <Input.Search
                  placeholder="Search customers..."
                  allowClear
                  onSearch={handleSearch}
                  style={{ width: 300 }}
                />
                <Select
                  placeholder="Type"
                  allowClear
                  style={{ width: 150 }}
                  onChange={handleTypeFilter}
                >
                  {customerTypes.map(type => (
                    <Option key={type} value={type} style={{ textTransform: 'capitalize' }}>
                      {type}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Status"
                  allowClear
                  style={{ width: 150 }}
                  onChange={handleStatusFilter}
                >
                  {statuses.map(status => (
                    <Option key={status} value={status} style={{ textTransform: 'capitalize' }}>
                      {status}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                Add Customer
              </Button>
            </Col>
          </Row>
        </div>

        {/* Customers Table */}
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Customer Modal */}
      <Modal
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="type"
                label="Customer Type"
                rules={[{ required: true, message: 'Please select customer type' }]}
              >
                <Select placeholder="Select type">
                  {customerTypes.map(type => (
                    <Option key={type} value={type} style={{ textTransform: 'capitalize' }}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' }
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              {statuses.map(status => (
                <Option key={status} value={status} style={{ textTransform: 'capitalize' }}>
                  {status}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Title level={4}>Address Information</Title>
          
          <Form.Item
            name={['address', 'street']}
            label="Street Address"
            rules={[{ required: true, message: 'Please enter street address' }]}
          >
            <Input placeholder="Enter street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['address', 'city']}
                label="City"
                rules={[{ required: true, message: 'Please enter city' }]}
              >
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['address', 'state']}
                label="State"
                rules={[{ required: true, message: 'Please enter state' }]}
              >
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['address', 'zipCode']}
                label="ZIP Code"
                rules={[{ required: true, message: 'Please enter ZIP code' }]}
              >
                <Input placeholder="Enter ZIP code" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['address', 'country']}
            label="Country"
            rules={[{ required: true, message: 'Please enter country' }]}
          >
            <Input placeholder="Enter country" />
          </Form.Item>

          <Title level={4}>Financial Information</Title>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['financialInfo', 'openingBalance']}
                label="Opening Balance"
                rules={[{ type: 'number', min: 0, message: 'Opening balance cannot be negative' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  prefix="₹"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['financialInfo', 'openingBalanceType']}
                label="Balance Type"
                initialValue="debit"
              >
                <Select>
                  <Option value="debit">Debit (Customer owes)</Option>
                  <Option value="credit">Credit (Customer has balance)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['financialInfo', 'creditLimit']}
                label="Credit Limit"
                rules={[{ type: 'number', min: 0, message: 'Credit limit cannot be negative' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  min={0}
                  precision={2}
                  prefix="₹"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['financialInfo', 'creditDays']}
                label="Credit Days"
                rules={[{ type: 'number', min: 0, message: 'Credit days cannot be negative' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['financialInfo', 'discountPercentage']}
                label="Discount %"
                rules={[{ type: 'number', min: 0, max: 100, message: 'Discount must be 0-100%' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  max={100}
                  precision={2}
                  suffix="%"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;
