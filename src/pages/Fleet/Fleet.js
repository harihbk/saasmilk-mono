import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CarOutlined,
  ToolOutlined,
  CalendarOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { fleetAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Fleet = () => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [stats, setStats] = useState({});
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchVehicles();
    fetchStats();
    fetchAvailableDrivers();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fleetAPI.getVehicles();
      setVehicles(response.data.data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      message.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fleetAPI.getStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching fleet stats:', error);
    }
  };

  const fetchAvailableDrivers = async () => {
    setDriversLoading(true);
    try {
      const response = await fleetAPI.getAvailableDrivers();
      setAvailableDrivers(response.data.data.drivers || []);
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      message.error('Failed to fetch available drivers');
    } finally {
      setDriversLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const vehicleData = {
        ...values,
        registrationDate: values.registrationDate?.toDate(),
      };

      if (editingVehicle) {
        await fleetAPI.updateVehicle(editingVehicle._id, vehicleData);
        message.success('Vehicle updated successfully');
      } else {
        await fleetAPI.createVehicle(vehicleData);
        message.success('Vehicle created successfully');
      }

      setModalVisible(false);
      setEditingVehicle(null);
      form.resetFields();
      fetchVehicles();
      fetchStats();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      message.error('Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    form.setFieldsValue({
      ...vehicle,
      registrationDate: vehicle.registrationDate ? dayjs(vehicle.registrationDate) : null,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await fleetAPI.deleteVehicle(id);
      message.success('Vehicle deleted successfully');
      fetchVehicles();
      fetchStats();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      message.error('Failed to delete vehicle');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      maintenance: 'orange',
      out_of_service: 'red',
      retired: 'default',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Vehicle Details',
      key: 'details',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.vehicleNumber}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.make} {record.model} ({record.year})
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Driver',
      dataIndex: 'assignedDriver',
      key: 'assignedDriver',
      render: (driverId) => {
        if (!driverId) return 'Unassigned';
        const driver = availableDrivers.find(d => d.value === driverId);
        return driver ? driver.label : 'Unknown Driver';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Mileage',
      dataIndex: 'currentMileage',
      key: 'currentMileage',
      render: (mileage) => `${mileage || 0} km`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this vehicle?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <CarOutlined style={{ marginRight: 8 }} />
          Fleet Management
        </Title>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Vehicles"
              value={stats.totalVehicles || 0}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Vehicles"
              value={stats.activeVehicles || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Maintenance"
              value={stats.maintenanceVehicles || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Service Required"
              value={stats.serviceDueVehicles || 0}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Vehicles Table */}
      <Card
        title="Vehicles"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingVehicle(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Add Vehicle
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={vehicles}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} vehicles`,
          }}
        />
      </Card>

      {/* Add/Edit Vehicle Modal */}
      <Modal
        title={editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingVehicle(null);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
            vehicleType: 'truck',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehicleNumber"
                label="Vehicle Number"
                rules={[
                  { required: true, message: 'Please enter vehicle number' },
                ]}
              >
                <Input placeholder="e.g., MH01AB1234" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="vehicleType"
                label="Vehicle Type"
                rules={[
                  { required: true, message: 'Please select vehicle type' },
                ]}
              >
                <Select>
                  <Option value="truck">Truck</Option>
                  <Option value="van">Van</Option>
                  <Option value="car">Car</Option>
                  <Option value="motorcycle">Motorcycle</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="make"
                label="Make"
                rules={[{ required: true, message: 'Please enter make' }]}
              >
                <Input placeholder="e.g., Tata, Mahindra" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="model"
                label="Model"
                rules={[{ required: true, message: 'Please enter model' }]}
              >
                <Input placeholder="e.g., Ace Gold" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="year"
                label="Year"
                rules={[{ required: true, message: 'Please enter year' }]}
              >
                <Input type="number" placeholder="e.g., 2023" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assignedDriver" label="Assigned Driver">
                <Select
                  placeholder="Select a driver"
                  allowClear
                  loading={driversLoading}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {availableDrivers.map(driver => (
                    <Option key={driver.value} value={driver.value}>
                      {driver.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select>
                  <Option value="active">Active</Option>
                  <Option value="maintenance">Maintenance</Option>
                  <Option value="out_of_service">Out of Service</Option>
                  <Option value="retired">Retired</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="currentMileage" label="Current Mileage (km)">
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="registrationDate" label="Registration Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fuelType" label="Fuel Type">
                <Select>
                  <Option value="petrol">Petrol</Option>
                  <Option value="diesel">Diesel</Option>
                  <Option value="cng">CNG</Option>
                  <Option value="electric">Electric</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingVehicle(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Fleet;