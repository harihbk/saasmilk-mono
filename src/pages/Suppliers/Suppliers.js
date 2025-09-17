import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
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
  Rate,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { suppliersAPI, categoriesAPI } from '../../services/api';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchSuppliers();
    fetchCategories();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      const categoriesData = response.data.data.categories || [];
      setCategories(categoriesData.map(cat => cat.label)); // Use display names
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to default categories
      setCategories(['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream']);
    }
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        status: statusFilter || undefined,
      };

      const response = await suppliersAPI.getSuppliers(params);
      const { suppliers: data, pagination: paginationData } = response.data.data;

      setSuppliers(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers(mockSuppliers);
      setPagination(prev => ({ ...prev, total: mockSuppliers.length }));
    } finally {
      setLoading(false);
    }
  };

  const mockSuppliers = [
    {
      _id: '1',
      name: 'Fresh Dairy Farms',
      contactPerson: 'John Smith',
      email: 'john@freshdairy.com',
      phone: '+1-555-0123',
      address: {
        street: '123 Farm Road',
        city: 'Farmville',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
      },
      status: 'active',
      rating: 4.5,
      totalOrders: 45,
      totalValue: 12500.75,
      paymentTerms: 'Net 30',
      categories: ['Milk', 'Cream'],
      createdAt: new Date(),
    },
    {
      _id: '2',
      name: 'Organic Cheese Co.',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@organiccheese.com',
      phone: '+1-555-0456',
      address: {
        street: '456 Cheese Lane',
        city: 'Madison',
        state: 'WI',
        zipCode: '53703',
        country: 'USA',
      },
      status: 'active',
      rating: 4.8,
      totalOrders: 32,
      totalValue: 8750.25,
      paymentTerms: 'Net 15',
      categories: ['Cheese', 'Yogurt'],
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

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const showModal = (supplier = null) => {
    setEditingSupplier(supplier);
    setModalVisible(true);
    if (supplier) {
      // Transform nested API data to flat form structure
      form.setFieldsValue({
        name: supplier.companyInfo?.name,
        businessType: supplier.companyInfo?.businessType,
        legalName: supplier.companyInfo?.legalName,
        establishedYear: supplier.companyInfo?.establishedYear,
        website: supplier.companyInfo?.website,
        description: supplier.companyInfo?.description,
        contactPerson: supplier.contactInfo?.primaryContact?.name,
        contactTitle: supplier.contactInfo?.primaryContact?.title,
        email: supplier.contactInfo?.primaryContact?.email,
        phone: supplier.contactInfo?.primaryContact?.phone,
        street: supplier.addresses?.headquarters?.street,
        city: supplier.addresses?.headquarters?.city,
        state: supplier.addresses?.headquarters?.state,
        zipCode: supplier.addresses?.headquarters?.zipCode,
        country: supplier.addresses?.headquarters?.country,
        taxId: supplier.businessDetails?.taxId,
        qualityGrade: supplier.qualityStandards?.qualityGrade,
        creditRating: supplier.financialInfo?.creditRating,
        creditLimit: supplier.financialInfo?.creditLimit,
        paymentTerms: supplier.financialInfo?.paymentTerms,
        status: supplier.status
      });
    } else {
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingSupplier(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      // Transform form values to match API structure
      const supplierData = {
        companyInfo: {
          name: values.name,
          businessType: values.businessType || 'other',
          legalName: values.legalName,
          establishedYear: values.establishedYear,
          website: values.website,
          description: values.description
        },
        contactInfo: {
          primaryContact: {
            name: values.contactPerson,
            title: values.contactTitle,
            email: values.email,
            phone: values.phone
          }
        },
        addresses: {
          headquarters: {
            street: values.street || 'Not specified',
            city: values.city || 'Not specified',
            state: values.state || 'Not specified',
            zipCode: values.zipCode || '000000',
            country: values.country || 'India'
          },
          billing: {
            sameAsHeadquarters: true
          }
        },
        businessDetails: {
          taxId: values.taxId || 'TEMP' + Date.now()
        },
        qualityStandards: {
          qualityGrade: values.qualityGrade || 'B'
        },
        financialInfo: {
          creditRating: values.creditRating || 'not-rated',
          creditLimit: values.creditLimit || 0,
          paymentTerms: values.paymentTerms || 'net-30'
        },
        status: values.status || 'pending-approval'
      };

      if (editingSupplier) {
        await suppliersAPI.updateSupplier(editingSupplier._id, supplierData);
        message.success('Supplier updated successfully');
      } else {
        await suppliersAPI.createSupplier(supplierData);
        message.success('Supplier created successfully');
      }

      setModalVisible(false);
      setEditingSupplier(null);
      form.resetFields();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      message.error('Failed to save supplier: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await suppliersAPI.deleteSupplier(id);
      message.success('Supplier deactivated successfully');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deactivating supplier:', error);
      message.error('Failed to deactivate supplier');
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

  const columns = [
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.companyInfo?.name || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Contact: {record.contactInfo?.primaryContact?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.contactInfo?.primaryContact?.email || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            #{record.supplierNumber}
          </div>
        </div>
      ),
    },
    {
      title: 'Business Type',
      key: 'businessType',
      render: (_, record) => (
        <Tag color="blue" style={{ textTransform: 'capitalize' }}>
          {record.companyInfo?.businessType?.replace('-', ' ') || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <div>
          {record.addresses?.headquarters?.city}, {record.addresses?.headquarters?.state}
        </div>
      ),
    },
    {
      title: 'Quality & Rating',
      key: 'qualityRating',
      render: (_, record) => (
        <div>
          <div>
            <Tag color="green">
              {record.qualityStandards?.qualityGrade || 'N/A'}
            </Tag>
          </div>
          <Rate 
            disabled 
            defaultValue={record.performance?.rating || 0} 
            style={{ fontSize: '12px' }} 
          />
        </div>
      ),
    },
    {
      title: 'Orders',
      key: 'orders',
      render: (_, record) => (
        record.performance?.totalOrders || 0
      ),
    },
    {
      title: 'Payment Terms',
      key: 'paymentTerms',
      render: (_, record) => (
        record.financialInfo?.paymentTerms || 'N/A'
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
            title="Are you sure you want to deactivate this supplier?"
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

  const statuses = ['active', 'inactive', 'suspended'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Suppliers</Title>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Suppliers"
              value={suppliers.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Suppliers"
              value={suppliers.filter(s => s.status === 'active').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Rating"
              value={suppliers.reduce((sum, s) => sum + (s.performance?.rating || 0), 0) / suppliers.length || 0}
              precision={1}
              suffix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Purchase Value"
              value={suppliers.reduce((sum, s) => sum + (s.financialInfo?.totalPurchases || 0), 0)}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#722ed1' }}
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
                  placeholder="Search suppliers..."
                  allowClear
                  onSearch={handleSearch}
                  style={{ width: 300 }}
                />
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
                Add Supplier
              </Button>
            </Col>
          </Row>
        </div>

        {/* Suppliers Table */}
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Supplier Modal */}
      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
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
                name="businessType"
                label="Business Type"
                rules={[{ required: true, message: 'Please select business type' }]}
              >
                <Select placeholder="Select business type">
                  <Option value="dairy-farm">Dairy Farm</Option>
                  <Option value="processing-plant">Processing Plant</Option>
                  <Option value="distributor">Distributor</Option>
                  <Option value="manufacturer">Manufacturer</Option>
                  <Option value="cooperative">Cooperative</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contactPerson"
                label="Primary Contact Name"
                rules={[{ required: true, message: 'Please enter contact person name' }]}
              >
                <Input placeholder="Enter contact person name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contactTitle"
                label="Contact Title"
              >
                <Input placeholder="Manager, Director, etc." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Primary Contact Email"
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
                label="Primary Contact Phone"
                rules={[
                  { required: true, message: 'Please enter phone number' },
                  { pattern: /^\+?[1-9]\d{1,14}$/, message: 'Please enter valid phone number' }
                ]}
              >
                <Input placeholder="+919876543210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="street"
                label="Street Address"
                rules={[{ required: true, message: 'Please enter street address' }]}
              >
                <Input placeholder="Enter street address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="city"
                label="City"
                rules={[{ required: true, message: 'Please enter city' }]}
              >
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="state"
                label="State"
                rules={[{ required: true, message: 'Please enter state' }]}
              >
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="zipCode"
                label="ZIP Code"
                rules={[{ required: true, message: 'Please enter ZIP code' }]}
              >
                <Input placeholder="Enter ZIP code" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="country"
                label="Country"
                initialValue="India"
              >
                <Input placeholder="Enter country" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taxId"
                label="Tax ID"
                rules={[{ required: true, message: 'Please enter tax ID' }]}
              >
                <Input placeholder="Enter tax identification number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentTerms"
                label="Payment Terms"
                initialValue="net-30"
              >
                <Select placeholder="Select payment terms">
                  <Option value="advance">Advance Payment</Option>
                  <Option value="cod">Cash on Delivery</Option>
                  <Option value="net-7">Net 7 Days</Option>
                  <Option value="net-15">Net 15 Days</Option>
                  <Option value="net-30">Net 30 Days</Option>
                  <Option value="net-60">Net 60 Days</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="qualityGrade"
                label="Quality Grade"
                initialValue="B"
              >
                <Select placeholder="Select quality grade">
                  <Option value="A+">A+ (Excellent)</Option>
                  <Option value="A">A (Very Good)</Option>
                  <Option value="B+">B+ (Good)</Option>
                  <Option value="B">B (Average)</Option>
                  <Option value="C">C (Below Average)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="creditLimit"
                label="Credit Limit (₹)"
                initialValue={0}
              >
                <Input type="number" placeholder="Enter credit limit" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Suppliers;
