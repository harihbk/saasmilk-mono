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
  Descriptions,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CarOutlined,
  ToolOutlined,
  CalendarOutlined,
  DollarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { fleetAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Fleet = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [viewingVehicle, setViewingVehicle] = useState(null);
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
      // Extract summary stats and also fetch service due vehicles
      const statsData = response.data.data || {};
      setStats(statsData.summary || {});

      // Fetch service due vehicles count
      try {
        const serviceDueResponse = await fleetAPI.getServiceDue({ days: 30 });
        setStats(prev => ({
          ...prev,
          serviceDueVehicles: serviceDueResponse.data.data.summary?.total || 0
        }));
      } catch (err) {
        console.error('Error fetching service due vehicles:', err);
      }
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
    setSubmitting(true);
    try {
      const vehicleData = {
        ...values,
        registrationDate: values.registrationDate?.toDate(),
        // Convert currentMileage to currentOdometer for backend
        currentOdometer: parseInt(values.currentMileage) || 0,
        // Add mileage field with value and unit if provided
        mileage: values.fuelEfficiency ? {
          value: parseFloat(values.fuelEfficiency),
          unit: 'kmpl'
        } : undefined,
      };

      // Remove frontend-only fields
      delete vehicleData.currentMileage;
      delete vehicleData.fuelEfficiency;

      if (editingVehicle) {
        await fleetAPI.updateVehicle(editingVehicle._id, vehicleData);
        message.success('Vehicle updated successfully');
      } else {
        await fleetAPI.createVehicle(vehicleData);
        message.success('Vehicle added successfully');
      }

      setModalVisible(false);
      setEditingVehicle(null);
      form.resetFields();
      await Promise.all([fetchVehicles(), fetchStats()]);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save vehicle. Please try again.';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (vehicle) => {
    try {
      setLoading(true);
      const response = await fleetAPI.getVehicle(vehicle._id);
      setViewingVehicle(response.data.data.vehicle);
      setViewModalVisible(true);
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      message.error('Failed to fetch vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    // Prepare form values with proper field mapping
    const formValues = {
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      fuelType: vehicle.fuelType,
      notes: vehicle.notes,
      // Map assignedDriver - handle both string ID and object formats
      assignedDriver: vehicle.assignedDriver?._id || vehicle.assignedDriver || undefined,
      // Map date fields
      registrationDate: vehicle.registrationDate ? dayjs(vehicle.registrationDate) : null,
      // Map backend fields to frontend fields
      currentMileage: vehicle.currentOdometer || 0,
      fuelEfficiency: vehicle.mileage?.value || null,
    };
    form.setFieldsValue(formValues);
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
      inactive: 'default',
      maintenance: 'orange',
      breakdown: 'red',
      sold: 'purple',
      accident: 'red'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Vehicle Details',
      key: 'details',
      fixed: 'left',
      width: 200,
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
      render: (assignedDriver) => {
        if (!assignedDriver) return 'Unassigned';
        // Handle both object (populated) and string (ID only) formats
        if (typeof assignedDriver === 'object') {
          return assignedDriver.name || assignedDriver.email || 'Unknown Driver';
        }
        // If it's just an ID string, try to find it in availableDrivers
        const driver = availableDrivers.find(d => d.value === assignedDriver);
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
      title: 'Odometer',
      dataIndex: 'currentOdometer',
      key: 'currentOdometer',
      render: (odometer) => `${odometer || 0} km`,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              style={{ padding: '4px 8px' }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ padding: '4px 8px' }}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this vehicle?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{ padding: '4px 8px' }}
              />
            </Tooltip>
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
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card hoverable>
            <Statistic
              title="Total"
              value={stats.totalVehicles || 0}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card hoverable>
            <Statistic
              title="Active"
              value={stats.activeVehicles || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card hoverable>
            <Statistic
              title="Maintenance"
              value={stats.maintenanceVehicles || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card hoverable>
            <Statistic
              title="Breakdown"
              value={stats.breakdownVehicles || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card hoverable>
            <Statistic
              title="Service Due"
              value={stats.serviceDueVehicles || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card hoverable>
            <Statistic
              title="Utilization"
              value={stats.utilizationRate || 0}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
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
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} vehicles`,
            pageSizeOptions: ['10', '20', '50', '100']
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
                <Select placeholder="Select vehicle type">
                  <Option value="truck">Truck</Option>
                  <Option value="van">Van</Option>
                  <Option value="pickup">Pickup</Option>
                  <Option value="bike">Bike</Option>
                  <Option value="auto">Auto</Option>
                  <Option value="tempo">Tempo</Option>
                  <Option value="container">Container</Option>
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
                label="Manufacturing Year"
                rules={[
                  { required: true, message: 'Please enter year' },
                  {
                    type: 'number',
                    min: 1990,
                    max: new Date().getFullYear() + 1,
                    message: `Year must be between 1990 and ${new Date().getFullYear() + 1}`,
                    transform: (value) => Number(value)
                  }
                ]}
              >
                <Input type="number" placeholder="e.g., 2023" min="1990" max={new Date().getFullYear() + 1} />
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
                <Select placeholder="Select status">
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="maintenance">Under Maintenance</Option>
                  <Option value="breakdown">Breakdown</Option>
                  <Option value="sold">Sold</Option>
                  <Option value="accident">Accident</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="currentMileage"
                label="Odometer Reading (km)"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    message: 'Odometer reading must be positive',
                    transform: (value) => Number(value)
                  }
                ]}
              >
                <Input type="number" placeholder="0" min="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="fuelEfficiency"
                label="Fuel Efficiency (km/l)"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    max: 100,
                    message: 'Please enter valid fuel efficiency',
                    transform: (value) => Number(value)
                  }
                ]}
              >
                <Input type="number" placeholder="15" step="0.1" min="0" max="100" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="registrationDate" label="Registration Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fuelType" label="Fuel Type">
                <Select placeholder="Select fuel type" allowClear>
                  <Option value="petrol">Petrol</Option>
                  <Option value="diesel">Diesel</Option>
                  <Option value="cng">CNG</Option>
                  <Option value="electric">Electric</Option>
                  <Option value="hybrid">Hybrid</Option>
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
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* View Vehicle Modal */}
      <Modal
        title="Vehicle Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingVehicle(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setViewingVehicle(null);
          }}>
            Close
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setViewModalVisible(false);
              handleEdit(viewingVehicle);
            }}
          >
            Edit
          </Button>
        ]}
        width={800}
      >
        {viewingVehicle && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Vehicle Number" span={1}>
                {viewingVehicle.vehicleNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                <Tag color={getStatusColor(viewingVehicle.status)}>
                  {viewingVehicle.status?.replace('_', ' ').toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Type" span={1}>
                {viewingVehicle.vehicleType}
              </Descriptions.Item>
              <Descriptions.Item label="Make & Model" span={1}>
                {viewingVehicle.make} {viewingVehicle.model}
              </Descriptions.Item>
              <Descriptions.Item label="Year" span={1}>
                {viewingVehicle.year}
              </Descriptions.Item>
              <Descriptions.Item label="Fuel Type" span={1}>
                {viewingVehicle.fuelType || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Current Odometer" span={1}>
                {viewingVehicle.currentOdometer || 0} km
              </Descriptions.Item>
              <Descriptions.Item label="Fuel Efficiency" span={1}>
                {viewingVehicle.mileage?.value ? `${viewingVehicle.mileage.value} ${viewingVehicle.mileage.unit}` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Driver" span={2}>
                {viewingVehicle.assignedDriver?.name || 'Unassigned'}
                {viewingVehicle.assignedDriver?.email && ` (${viewingVehicle.assignedDriver.email})`}
              </Descriptions.Item>
              <Descriptions.Item label="Registration Date" span={1}>
                {viewingVehicle.registrationDate
                  ? dayjs(viewingVehicle.registrationDate).format('DD/MM/YYYY')
                  : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Condition" span={1}>
                {viewingVehicle.condition || 'N/A'}
              </Descriptions.Item>
              {viewingVehicle.insurance?.expiryDate && (
                <Descriptions.Item label="Insurance Expiry" span={1}>
                  {dayjs(viewingVehicle.insurance.expiryDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {viewingVehicle.pollution?.expiryDate && (
                <Descriptions.Item label="Pollution Cert Expiry" span={1}>
                  {dayjs(viewingVehicle.pollution.expiryDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {viewingVehicle.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {viewingVehicle.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {viewingVehicle.maintenanceHistory && viewingVehicle.maintenanceHistory.length > 0 && (
              <>
                <Divider />
                <Title level={5}>Recent Maintenance History</Title>
                <Table
                  dataSource={viewingVehicle.maintenanceHistory.slice(0, 5)}
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'serviceDate',
                      render: (date) => dayjs(date).format('DD/MM/YYYY')
                    },
                    {
                      title: 'Type',
                      dataIndex: 'maintenanceType'
                    },
                    {
                      title: 'Cost',
                      dataIndex: 'cost',
                      render: (cost) => `₹${cost || 0}`
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      render: (status) => (
                        <Tag color={status === 'completed' ? 'green' : 'orange'}>
                          {status?.toUpperCase()}
                        </Tag>
                      )
                    }
                  ]}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                />
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default Fleet;