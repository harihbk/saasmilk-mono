import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Descriptions,
  Tooltip,
  Timeline,
  Empty,
  Divider,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  BankOutlined,
  CreditCardOutlined,
  DollarOutlined,
  HistoryOutlined,
  TransactionOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { dealersAPI, dealerGroupsAPI } from '../../services/api';
import routesAPI from '../../services/routesAPI';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const Dealers = () => {
  const [dealers, setDealers] = useState([]);
  const [dealerGroups, setDealerGroups] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [dealerTransactions, setDealerTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [form] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchDealers();
    fetchDealerGroups();
    fetchRoutes();
    fetchStats();
  }, []);

  // This useEffect is no longer needed since we handle form population in showModal
  // useEffect(() => {
  //   // Form population is now handled directly in showModal function
  // }, [editingDealer, modalVisible, form]);

  const fetchDealers = async (params = {}) => {
    setLoading(true);
    try {
      const response = await dealersAPI.getDealers({ limit: 100, ...params });
      const dealersData = response.data.data.dealers || [];
      setDealers(dealersData);
    } catch (error) {
      console.error('Error fetching dealers:', error);
      message.error('Failed to fetch dealers');
    } finally {
      setLoading(false);
    }
  };

  const fetchDealerGroups = async () => {
    try {
      const response = await dealerGroupsAPI.getActiveDealerGroups();
      setDealerGroups(response.data.data.dealerGroups || []);
    } catch (error) {
      console.error('Error fetching dealer groups:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await routesAPI.getAll({ status: 'active', limit: 100 });
      setRoutes(response.data.data.routes || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await dealersAPI.getDealerStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showModal = (dealer = null) => {
    console.log('showModal called with dealer:', dealer); // Debug log
    
    setEditingDealer(dealer);
    setModalVisible(true);
    
    // Reset form and set defaults when creating new dealer
    if (!dealer) {
      form.resetFields();
      form.setFieldsValue({
        contactInfo: {},
        address: {},
        financialInfo: {
          openingBalance: 0,
          openingBalanceType: 'credit',
          creditLimit: 0,
          creditDays: 0,
          discountPercentage: 0,
        }
      });
    }
  };

  // Function to populate form values for editing
  const populateFormForEdit = (dealer) => {
    if (!dealer) return;
    
    console.log('populateFormForEdit: Dealer data received:', dealer);
    console.log('populateFormForEdit: Financial info:', dealer.financialInfo);
    
    const formValues = {
      name: dealer.name || '',
      businessName: dealer.businessName || '',
      dealerGroup: dealer.dealerGroup?._id || dealer.dealerGroup || '',
      route: dealer.route?._id || dealer.route || '',
      contactInfo: {
        primaryPhone: dealer.contactInfo?.primaryPhone || '',
        secondaryPhone: dealer.contactInfo?.secondaryPhone || '',
        email: dealer.contactInfo?.email || '',
        whatsapp: dealer.contactInfo?.whatsapp || '',
      },
      address: {
        street: dealer.address?.street || '',
        city: dealer.address?.city || '',
        state: dealer.address?.state || '',
        postalCode: dealer.address?.postalCode || '',
        landmark: dealer.address?.landmark || '',
      },
      financialInfo: {
        openingBalance: dealer.financialInfo?.openingBalance || 0,
        openingBalanceType: dealer.financialInfo?.openingBalanceType || 'credit',
        creditLimit: dealer.financialInfo?.creditLimit || 0,
        creditDays: dealer.financialInfo?.creditDays || 0,
        discountPercentage: dealer.financialInfo?.discountPercentage || 0,
        panNumber: dealer.financialInfo?.panNumber || '',
        gstNumber: dealer.financialInfo?.gstNumber || '',
      },
    };
    
    console.log('populateFormForEdit: Form values to set:', formValues);
    console.log('populateFormForEdit: Financial info to set:', formValues.financialInfo);
    
    // Don't reset fields, just set the values
    form.setFieldsValue(formValues);
    
    // Double-check the values were set
    setTimeout(() => {
      const currentValues = form.getFieldsValue();
      console.log('populateFormForEdit: Current form values after setting:', currentValues);
      console.log('populateFormForEdit: Current financial info after setting:', currentValues.financialInfo);
    }, 200);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingDealer(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      console.log('Form values received:', values); // Debug log
      
      // Ensure nested objects are properly structured even if some fields are missing
      const dealerData = {
        name: values.name,
        businessName: values.businessName,
        dealerGroup: values.dealerGroup,
        route: values.route,
        contactInfo: {
          primaryPhone: values.contactInfo?.primaryPhone || '',
          secondaryPhone: values.contactInfo?.secondaryPhone || '',
          email: values.contactInfo?.email || '',
          whatsapp: values.contactInfo?.whatsapp || '',
        },
        address: {
          street: values.address?.street || '',
          city: values.address?.city || '',
          state: values.address?.state || '',
          postalCode: values.address?.postalCode || '',
          landmark: values.address?.landmark || '',
        },
        financialInfo: {
          openingBalance: values.financialInfo?.openingBalance || 0,
          openingBalanceType: values.financialInfo?.openingBalanceType || 'credit',
          creditLimit: values.financialInfo?.creditLimit || 0,
          creditDays: values.financialInfo?.creditDays || 0,
          discountPercentage: values.financialInfo?.discountPercentage || 0,
          // Only include PAN and GST numbers if they have actual values
          ...(values.financialInfo?.panNumber && values.financialInfo.panNumber.trim() && {
            panNumber: values.financialInfo.panNumber.trim()
          }),
          ...(values.financialInfo?.gstNumber && values.financialInfo.gstNumber.trim() && {
            gstNumber: values.financialInfo.gstNumber.trim()
          }),
        },
      };

      console.log('Structured dealer data:', dealerData); // Debug log

      if (editingDealer) {
        console.log('Updating dealer with ID:', editingDealer._id);
        console.log('Update data:', dealerData);
        const response = await dealersAPI.updateDealer(editingDealer._id, dealerData);
        console.log('Update response:', response);
        message.success('Dealer updated successfully');
      } else {
        console.log('Creating new dealer:', dealerData);
        const response = await dealersAPI.createDealer(dealerData);
        console.log('Create response:', response);
        message.success('Dealer created successfully');
      }

      setModalVisible(false);
      setEditingDealer(null);
      form.resetFields();
      fetchDealers();
      fetchStats();
    } catch (error) {
      console.error('Error saving dealer:', error);
      console.error('Error details:', error.response?.data);
      message.error(`Failed to save dealer: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await dealersAPI.deleteDealer(id);
      message.success('Dealer deactivated successfully');
      fetchDealers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting dealer:', error);
      message.error(error.response?.data?.message || 'Failed to delete dealer');
    }
  };

  const showBalanceModal = (dealer) => {
    setSelectedDealer(dealer);
    setBalanceModalVisible(true);
    balanceForm.resetFields();
  };

  const handleBalanceUpdate = async (values) => {
    try {
      await dealersAPI.updateDealerBalance(selectedDealer._id, values);
      message.success('Balance updated successfully');
      setBalanceModalVisible(false);
      balanceForm.resetFields();
      fetchDealers();
      fetchStats();
    } catch (error) {
      console.error('Error updating balance:', error);
      message.error('Failed to update balance');
    }
  };

  const showDetails = async (dealer) => {
    setSelectedDealer(dealer);
    setDetailModalVisible(true);
    await fetchDealerTransactions(dealer._id);
  };

  const fetchDealerTransactions = async (dealerId) => {
    setTransactionLoading(true);
    try {
      // Fetch detailed dealer info with transactions
      const response = await dealersAPI.getDealer(dealerId);
      const dealerData = response.data.data;
      
      // Process transactions with proper formatting
      const transactions = (dealerData.transactions || []).map(transaction => ({
        key: transaction._id,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        balanceAfter: transaction.balanceAfter,
        reference: transaction.reference,
        createdAt: transaction.date
      }));
      
      // Sort by date (newest first)
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setDealerTransactions(transactions);
    } catch (error) {
      console.error('Error fetching dealer transactions:', error);
      message.error('Failed to fetch transaction history');
    } finally {
      setTransactionLoading(false);
    }
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'red';    // Positive = dealer owes us = debit = red
    if (balance < 0) return 'green';  // Negative = dealer has credit = credit = green
    return 'default';
  };

  const getBalanceIcon = (balance) => {
    if (balance > 0) return <DollarOutlined />;
    if (balance < 0) return <CreditCardOutlined />;
    return <BankOutlined />;
  };

  const columns = [
    {
      title: 'Dealer',
      key: 'dealer',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.dealerCode}
          </div>
          {record.businessName && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.businessName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Group',
      dataIndex: 'dealerGroup',
      key: 'dealerGroup',
      render: (group) => (
        <Tag color={group?.color || 'blue'}>
          {group?.name}
        </Tag>
      ),
    },
    {
      title: 'Route',
      dataIndex: 'route',
      key: 'route',
      render: (route) => route ? (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#666' }}>
            {route.code}
          </div>
          <div>{route.name}</div>
        </div>
      ) : (
        <span style={{ color: '#ccc' }}>No route assigned</span>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            <PhoneOutlined /> {record.contactInfo.primaryPhone}
          </div>
          {record.contactInfo.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <MailOutlined /> {record.contactInfo.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            {record.address.city}, {record.address.state}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {record.address.postalCode}
          </div>
        </div>
      ),
    },
    {
      title: 'Current Balance',
      key: 'balance',
      render: (_, record) => {
        const balance = record.financialInfo?.currentBalance || 0;
        return (
          <Tag color={getBalanceColor(balance)} icon={getBalanceIcon(balance)}>
            ₹{Math.abs(balance).toLocaleString()}
            {balance !== 0 && (balance > 0 ? ' DR' : ' CR')}
          </Tag>
        );
      },
      sorter: (a, b) => (a.financialInfo?.currentBalance || 0) - (b.financialInfo?.currentBalance || 0),
    },
    {
      title: 'Credit Limit',
      dataIndex: ['financialInfo', 'creditLimit'],
      key: 'creditLimit',
      render: (value) => `₹${(value || 0).toLocaleString()}`,
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          active: 'green',
          inactive: 'red',
          suspended: 'orange',
          pending_approval: 'blue',
        };
        return (
          <Tag color={colors[status] || 'default'}>
            {status?.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => showDetails(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Update Balance">
            <Button
              type="text"
              icon={<DollarOutlined />}
              onClick={() => showBalanceModal(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                console.log('Edit button clicked for dealer:', record);
                showModal(record);
              }}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to deactivate this dealer?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Dealers"
              value={stats.summary?.totalDealers || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Dealers"
              value={stats.summary?.activeDealers || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Credit"
              value={stats.summary?.totalCredit || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix="₹"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Debit"
              value={stats.summary?.totalDebit || 0}
              valueStyle={{ color: '#f5222d' }}
              prefix="₹"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Dealers</h3>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Manage dealer information and opening balances
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Add Dealer
          </Button>
        </div>

        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Filter by Group"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => {
                setFilters({ ...filters, dealerGroup: value });
                fetchDealers({ dealerGroup: value });
              }}
            >
              {dealerGroups.map(group => (
                <Option key={group.value} value={group.value}>
                  {group.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => {
                setFilters({ ...filters, status: value });
                fetchDealers({ status: value });
              }}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="suspended">Suspended</Option>
              <Option value="pending_approval">Pending Approval</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by Balance"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => {
                setFilters({ ...filters, balanceType: value });
                fetchDealers({ balanceType: value });
              }}
            >
              <Option value="credit">Credit Balance</Option>
              <Option value="debit">Debit Balance</Option>
              <Option value="balanced">Zero Balance</Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={dealers}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} dealers`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Add/Edit Dealer Modal */}
      <Modal
        title={editingDealer ? 'Edit Dealer' : 'Add Dealer'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={900}
        key={editingDealer?._id || 'new'}
        afterOpenChange={(open) => {
          if (open && editingDealer) {
            // Populate form values after modal is fully opened
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
              setTimeout(() => {
                populateFormForEdit(editingDealer);
              }, 50);
            });
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Tabs defaultActiveKey="basic">
            <Tabs.TabPane tab="Basic Information" key="basic" forceRender={true}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Dealer Name"
                    rules={[{ required: true, message: 'Please enter dealer name' }]}
                  >
                    <Input placeholder="Enter dealer name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="businessName"
                    label="Business Name"
                  >
                    <Input placeholder="Enter business name" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="dealerGroup"
                label="Dealer Group"
                rules={[{ required: true, message: 'Please select dealer group' }]}
              >
                <Select placeholder="Select dealer group">
                  {dealerGroups.map(group => (
                    <Option key={group.value} value={group.value}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: group.color,
                          }}
                        />
                        {group.label}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="route"
                label="Delivery Route"
              >
                <Select placeholder="Select delivery route" allowClear>
                  {routes.map(route => (
                    <Option key={route._id} value={route._id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {route.code}
                        </div>
                        <div>{route.name}</div>
                        {route.city && (
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            ({route.city})
                          </div>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Contact Information" key="contact" forceRender={true}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'primaryPhone']}
                    label="Primary Phone"
                    rules={[{ required: true, message: 'Please enter primary phone' }]}
                  >
                    <Input placeholder="Enter primary phone" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'secondaryPhone']}
                    label="Secondary Phone"
                  >
                    <Input placeholder="Enter secondary phone" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'email']}
                    label="Email"
                    rules={[{ type: 'email', message: 'Please enter valid email' }]}
                  >
                    <Input placeholder="Enter email address" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'whatsapp']}
                    label="WhatsApp Number"
                  >
                    <Input placeholder="Enter WhatsApp number" />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Address" key="address" forceRender={true}>
              <Form.Item
                name={['address', 'street']}
                label="Street Address"
                rules={[{ required: true, message: 'Please enter street address' }]}
              >
                <TextArea rows={2} placeholder="Enter street address" />
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
                    name={['address', 'postalCode']}
                    label="Postal Code"
                    rules={[
                      { required: true, message: 'Please enter postal code' },
                      { pattern: /^[0-9]{6}$/, message: 'Please enter valid 6-digit postal code' }
                    ]}
                  >
                    <Input placeholder="Enter postal code" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name={['address', 'landmark']}
                label="Landmark"
              >
                <Input placeholder="Enter landmark (optional)" />
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Financial Information" key="financial" forceRender={true}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['financialInfo', 'openingBalance']}
                    label="Opening Balance"
                    rules={[{ required: true, message: 'Please enter opening balance' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0.00"
                      prefix="₹"
                      min={0}
                      step={0.01}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['financialInfo', 'openingBalanceType']}
                    label="Balance Type"
                    rules={[{ required: true, message: 'Please select balance type' }]}
                  >
                    <Select placeholder="Select balance type">
                      <Option value="credit">Credit (Amount owed to dealer)</Option>
                      <Option value="debit">Debit (Amount dealer owes)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['financialInfo', 'creditLimit']}
                    label="Credit Limit"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      prefix="₹"
                      min={0}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₹\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['financialInfo', 'creditDays']}
                    label="Credit Days"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      suffix="days"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['financialInfo', 'discountPercentage']}
                    label="Discount %"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      suffix="%"
                      min={0}
                      max={100}
                      step={0.1}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['financialInfo', 'panNumber']}
                    label="PAN Number"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value || value.trim() === '') {
                            return Promise.resolve(); // Allow empty values
                          }
                          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
                            return Promise.reject(new Error('Please enter valid PAN number (e.g., ABCDE1234F)'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Input placeholder="ABCDE1234F (optional)" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['financialInfo', 'gstNumber']}
                    label="GST Number"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value || value.trim() === '') {
                            return Promise.resolve(); // Allow empty values
                          }
                          if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
                            return Promise.reject(new Error('Please enter valid GST number (e.g., 22ABCDE1234F1Z5)'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Input placeholder="22ABCDE1234F1Z5 (optional)" />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>
          </Tabs>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingDealer ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Balance Update Modal */}
      <Modal
        title={`Update Balance - ${selectedDealer?.name}`}
        open={balanceModalVisible}
        onCancel={() => setBalanceModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={handleBalanceUpdate}
        >
          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              prefix="₹"
              min={0}
              step={0.01}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Transaction Type"
            rules={[{ required: true, message: 'Please select transaction type' }]}
          >
            <Select placeholder="Select transaction type">
              <Option value="credit">Credit (Add to balance)</Option>
              <Option value="debit">Debit (Deduct from balance)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Enter description for this transaction" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setBalanceModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Update Balance
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Dealer Details Modal */}
      <Modal
        title={`Dealer Details - ${selectedDealer?.name}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setDealerTransactions([]);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false);
            setDealerTransactions([]);
          }}>
            Close
          </Button>
        ]}
        width={900}
      >
        {selectedDealer && (
          <Tabs defaultActiveKey="details">
            <Tabs.TabPane tab="Basic Details" key="details">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Dealer Code">{selectedDealer.dealerCode}</Descriptions.Item>
                <Descriptions.Item label="Business Name">{selectedDealer.businessName || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Group">
                  <Tag color={selectedDealer.dealerGroup?.color}>
                    {selectedDealer.dealerGroup?.name}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Route">
                  {selectedDealer.route ? (
                    <div>
                      <div><strong>{selectedDealer.route.code}</strong> - {selectedDealer.route.name}</div>
                      {selectedDealer.route.city && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {selectedDealer.route.city}, {selectedDealer.route.state}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#ccc' }}>No route assigned</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={selectedDealer.status === 'active' ? 'green' : 'red'}>
                    {selectedDealer.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Primary Phone">{selectedDealer.contactInfo.primaryPhone}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedDealer.contactInfo.email || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>
                  {selectedDealer.fullAddress}
                </Descriptions.Item>
                <Descriptions.Item label="Current Balance">
                  <Tag color={getBalanceColor(selectedDealer.financialInfo.currentBalance)}>
                    ₹{Math.abs(selectedDealer.financialInfo.currentBalance).toLocaleString()}
                    {selectedDealer.financialInfo.currentBalance !== 0 && 
                      (selectedDealer.financialInfo.currentBalance > 0 ? ' DR' : ' CR')
                    }
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Opening Balance">
                  {selectedDealer.financialInfo?.openingBalanceType === 'credit' ? (
                    <Tag color="green">
                      ₹{(selectedDealer.financialInfo?.openingBalance || 0).toLocaleString()} CR
                    </Tag>
                  ) : (
                    <Tag color="red">
                      ₹{(selectedDealer.financialInfo?.openingBalance || 0).toLocaleString()} DR
                    </Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Credit Limit">
                  ₹{(selectedDealer.financialInfo.creditLimit || 0).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Credit Days">{selectedDealer.financialInfo?.creditDays || 0} days</Descriptions.Item>
                <Descriptions.Item label="PAN Number">{selectedDealer.financialInfo.panNumber || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="GST Number">{selectedDealer.financialInfo.gstNumber || 'N/A'}</Descriptions.Item>
              </Descriptions>
            </Tabs.TabPane>
            
            <Tabs.TabPane 
              tab={
                <Space>
                  <HistoryOutlined />
                  Transaction History
                  {dealerTransactions.length > 0 && (
                    <Tag color="blue">{dealerTransactions.length}</Tag>
                  )}
                </Space>
              } 
              key="transactions"
            >
              <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Total Credits"
                      value={dealerTransactions
                        .filter(t => t.type === 'credit')
                        .reduce((sum, t) => sum + t.amount, 0)
                      }
                      prefix="₹"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Total Debits"
                      value={dealerTransactions
                        .filter(t => t.type === 'debit')
                        .reduce((sum, t) => sum + t.amount, 0)
                      }
                      prefix="₹"
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Transactions"
                      value={dealerTransactions.length}
                      prefix={<TransactionOutlined />}
                    />
                  </Col>
                </Row>
              </div>
              
              <Divider />
              
              {transactionLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Space direction="vertical">
                    <HistoryOutlined style={{ fontSize: '24px' }} />
                    <Text>Loading transaction history...</Text>
                  </Space>
                </div>
              ) : dealerTransactions.length > 0 ? (
                <Timeline mode="left">
                  {dealerTransactions.map((transaction, index) => (
                    <Timeline.Item
                      key={transaction.key}
                      color={transaction.type === 'credit' ? 'green' : 'red'}
                      dot={transaction.type === 'credit' ? <RiseOutlined /> : <FallOutlined />}
                      label={
                        <Text type="secondary">
                          {new Date(transaction.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Text>
                      }
                    >
                      <Card size="small" style={{ marginBottom: 8 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ fontSize: '16px' }}>
                              {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                            </Text>
                            <Tag color={transaction.type === 'credit' ? 'green' : 'red'}>
                              {transaction.type.toUpperCase()}
                            </Tag>
                          </div>
                          <Text>{transaction.description}</Text>
                          {transaction.reference && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Reference: {transaction.reference.id || transaction.reference}
                            </Text>
                          )}
                          {transaction.balanceAfter !== undefined && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Balance After: ₹{Math.abs(transaction.balanceAfter).toLocaleString()}
                              {transaction.balanceAfter > 0 ? ' DR' : transaction.balanceAfter < 0 ? ' CR' : ''}
                            </Text>
                          )}
                        </Space>
                      </Card>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No transaction history found"
                />
              )}
            </Tabs.TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
};

export default Dealers;