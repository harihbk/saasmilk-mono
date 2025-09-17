import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Typography,
  Tag,
  Row,
  Col,
  Card,
  Select,
  InputNumber,
  Tabs,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { warehousesAPI } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [stats, setStats] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchWarehouses();
    fetchStats();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await warehousesAPI.getWarehouses({ limit: 100 });
      setWarehouses(response.data.data.warehouses || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      message.error('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await warehousesAPI.getWarehouseStats();
      setStats(response.data.data.warehouseStats || {});
    } catch (error) {
      console.error('Error fetching warehouse stats:', error);
    }
  };

  const showModal = (warehouse = null) => {
    setEditingWarehouse(warehouse);
    setModalVisible(true);
    if (warehouse) {
      form.setFieldsValue({
        name: warehouse.name,
        code: warehouse.code,
        description: warehouse.description,
        status: warehouse.status,
        address: warehouse.address,
        contact: warehouse.contact,
        capacity: warehouse.capacity,
        settings: warehouse.settings,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'active',
        capacity: {
          unit: 'kg'
        },
        settings: {
          temperatureControlled: false,
          temperatureRange: {
            unit: 'celsius'
          },
          autoReorderEnabled: false
        }
      });
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingWarehouse(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingWarehouse) {
        await warehousesAPI.updateWarehouse(editingWarehouse._id, values);
        message.success('Warehouse updated successfully');
      } else {
        await warehousesAPI.createWarehouse(values);
        message.success('Warehouse created successfully');
      }

      setModalVisible(false);
      setEditingWarehouse(null);
      form.resetFields();
      fetchWarehouses();
      fetchStats();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      message.error(`Failed to save warehouse: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await warehousesAPI.deleteWarehouse(id);
      message.success('Warehouse deleted successfully');
      fetchWarehouses();
      fetchStats();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      message.error(`Failed to delete warehouse: ${error.response?.data?.message || error.message}`);
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Tag color="blue">{text}</Tag>,
      width: 100,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => {
        const location = [
          record.address?.city,
          record.address?.state
        ].filter(Boolean).join(', ');
        return location || '-';
      },
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          {record.contact?.phone && (
            <div><PhoneOutlined /> {record.contact.phone}</div>
          )}
          {record.contact?.manager?.name && (
            <div><UserOutlined /> {record.contact.manager.name}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_, record) => {
        if (record.capacity?.maxWeight > 0) {
          return `${record.capacity.maxWeight} ${record.capacity.unit || 'kg'}`;
        }
        if (record.capacity?.maxItems > 0) {
          return `${record.capacity.maxItems} items`;
        }
        return '-';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          active: 'green',
          inactive: 'red',
          maintenance: 'orange',
          closed: 'gray'
        };
        return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      width: 100,
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
            title="Are you sure you want to delete this warehouse?"
            description="This action cannot be undone and may affect inventory records."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      width: 100,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Warehouse Management</Title>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            Manage warehouse locations and their configurations
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
        >
          Add Warehouse
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats.totalWarehouses || 0}
              </div>
              <div style={{ color: '#666' }}>Total Warehouses</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats.activeWarehouses || 0}
              </div>
              <div style={{ color: '#666' }}>Active</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa541c' }}>
                {stats.inactiveWarehouses || 0}
              </div>
              <div style={{ color: '#666' }}>Inactive</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                {stats.maintenanceWarehouses || 0}
              </div>
              <div style={{ color: '#666' }}>Maintenance</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={warehouses}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* Warehouse Modal */}
      <Modal
        title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
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
          <Tabs defaultActiveKey="basic">
            <TabPane tab="Basic Information" key="basic">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Warehouse Name"
                    rules={[
                      { required: true, message: 'Please enter warehouse name' },
                      { max: 100, message: 'Name cannot exceed 100 characters' },
                    ]}
                  >
                    <Input placeholder="e.g., Main Warehouse" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="code"
                    label="Warehouse Code"
                    rules={[
                      { required: true, message: 'Please enter warehouse code' },
                      { pattern: /^[A-Z0-9_-]+$/, message: 'Only uppercase letters, numbers, underscores, and dashes allowed' },
                      { max: 20, message: 'Code cannot exceed 20 characters' },
                    ]}
                    help="Used for referencing (e.g., WH-001, MAIN-WH)"
                  >
                    <Input placeholder="WH-001" style={{ textTransform: 'uppercase' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="Description"
                rules={[
                  { max: 500, message: 'Description cannot exceed 500 characters' },
                ]}
              >
                <TextArea rows={3} placeholder="Brief description of the warehouse" />
              </Form.Item>

              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="maintenance">Maintenance</Option>
                  <Option value="closed">Closed</Option>
                </Select>
              </Form.Item>
            </TabPane>

            <TabPane tab="Address" key="address">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name={['address', 'street']}
                    label="Street Address"
                    rules={[
                      { max: 200, message: 'Street address cannot exceed 200 characters' },
                    ]}
                  >
                    <Input placeholder="Street address" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['address', 'city']}
                    label="City"
                    rules={[
                      { max: 100, message: 'City cannot exceed 100 characters' },
                    ]}
                  >
                    <Input placeholder="City" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['address', 'state']}
                    label="State"
                    rules={[
                      { max: 100, message: 'State cannot exceed 100 characters' },
                    ]}
                  >
                    <Input placeholder="State" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['address', 'zipCode']}
                    label="ZIP Code"
                    rules={[
                      { max: 20, message: 'ZIP code cannot exceed 20 characters' },
                    ]}
                  >
                    <Input placeholder="ZIP Code" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name={['address', 'country']}
                label="Country"
                rules={[
                  { max: 100, message: 'Country cannot exceed 100 characters' },
                ]}
              >
                <Input placeholder="Country" defaultValue="India" />
              </Form.Item>
            </TabPane>

            <TabPane tab="Contact" key="contact">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['contact', 'phone']}
                    label="Phone"
                    rules={[
                      { max: 20, message: 'Phone cannot exceed 20 characters' },
                    ]}
                  >
                    <Input placeholder="Phone number" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['contact', 'email']}
                    label="Email"
                    rules={[
                      { type: 'email', message: 'Please enter a valid email' },
                      { max: 100, message: 'Email cannot exceed 100 characters' },
                    ]}
                  >
                    <Input placeholder="Email address" />
                  </Form.Item>
                </Col>
              </Row>

              <Title level={5}>Manager Information</Title>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['contact', 'manager', 'name']}
                    label="Manager Name"
                    rules={[
                      { max: 100, message: 'Name cannot exceed 100 characters' },
                    ]}
                  >
                    <Input placeholder="Manager name" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['contact', 'manager', 'phone']}
                    label="Manager Phone"
                    rules={[
                      { max: 20, message: 'Phone cannot exceed 20 characters' },
                    ]}
                  >
                    <Input placeholder="Manager phone" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['contact', 'manager', 'email']}
                    label="Manager Email"
                    rules={[
                      { type: 'email', message: 'Please enter a valid email' },
                      { max: 100, message: 'Email cannot exceed 100 characters' },
                    ]}
                  >
                    <Input placeholder="Manager email" />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Capacity" key="capacity">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['capacity', 'maxItems']}
                    label="Maximum Items"
                    rules={[
                      { type: 'number', min: 0, message: 'Must be non-negative' },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['capacity', 'maxWeight']}
                    label="Maximum Weight"
                    rules={[
                      { type: 'number', min: 0, message: 'Must be non-negative' },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      min={0}
                      step={0.1}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['capacity', 'unit']}
                    label="Weight Unit"
                  >
                    <Select>
                      <Option value="kg">Kilograms (kg)</Option>
                      <Option value="tons">Tons</Option>
                      <Option value="lbs">Pounds (lbs)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
          </Tabs>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingWarehouse ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Warehouses;