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
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  CalendarOutlined,
  DollarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { fleetMaintenanceAPI, fleetAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const FleetMaintenance = () => {
  const [loading, setLoading] = useState(false);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [stats, setStats] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchMaintenanceRecords();
    fetchVehicles();
    fetchStats();
  }, []);

  const fetchMaintenanceRecords = async () => {
    setLoading(true);
    try {
      const response = await fleetMaintenanceAPI.getMaintenanceRecords();
      setMaintenanceRecords(response.data.data.maintenanceRecords || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      message.error('Failed to fetch maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fleetAPI.getVehicles();
      setVehicles(response.data.data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fleetMaintenanceAPI.getStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const maintenanceData = {
        vehicle: values.vehicle,
        maintenanceType: values.maintenanceType,
        serviceCategory: values.serviceCategory,
        title: values.title,
        description: values.description,
        scheduledDate: values.scheduledDate?.toISOString(),
        serviceProvider: {
          name: values.serviceProviderName,
          type: values.serviceProviderType,
          contact: values.serviceProviderContact
        },
        preServiceCondition: {
          odometer: values.odometer || 0
        },
        totalCost: values.totalCost || 0,
        paymentDetails: {
          method: values.paymentMethod
        },
        priority: values.priority || 'medium',
        nextServiceDate: values.nextServiceDate?.toISOString(),
        nextServiceOdometer: values.nextServiceOdometer
      };

      if (editingRecord) {
        await fleetMaintenanceAPI.updateMaintenanceRecord(editingRecord._id, maintenanceData);
        message.success('Maintenance record updated successfully');
      } else {
        await fleetMaintenanceAPI.createMaintenanceRecord(maintenanceData);
        message.success('Maintenance record created successfully');
      }

      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      fetchMaintenanceRecords();
      fetchStats();
    } catch (error) {
      console.error('Error saving maintenance record:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save maintenance record';
      message.error(errorMessage);
      
      // Log detailed error for debugging
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        error.response.data.errors.forEach(err => {
          message.error(`${err.param}: ${err.msg}`);
        });
      }
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      vehicle: record.vehicle?._id || record.vehicle,
      maintenanceType: record.maintenanceType,
      serviceCategory: record.serviceCategory,
      title: record.title,
      description: record.description,
      scheduledDate: record.scheduledDate ? dayjs(record.scheduledDate) : null,
      totalCost: record.totalCost,
      odometer: record.preServiceCondition?.odometer,
      paymentMethod: record.paymentDetails?.method,
      serviceProviderName: record.serviceProvider?.name,
      serviceProviderType: record.serviceProvider?.type,
      serviceProviderContact: record.serviceProvider?.contact,
      priority: record.priority,
      nextServiceDate: record.nextServiceDate ? dayjs(record.nextServiceDate) : null,
      nextServiceOdometer: record.nextServiceOdometer,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await fleetMaintenanceAPI.deleteMaintenanceRecord(id);
      message.success('Maintenance record deleted successfully');
      fetchMaintenanceRecords();
      fetchStats();
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      message.error('Failed to delete maintenance record');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'blue',
      in_progress: 'orange',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const getTypeColor = (type) => {
    const colors = {
      routine: 'green',
      preventive: 'blue',
      corrective: 'orange',
      emergency: 'red',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.vehicle?.vehicleNumber || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.vehicle?.make} {record.vehicle?.model}
          </div>
        </div>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Type',
      dataIndex: 'maintenanceType',
      key: 'maintenanceType',
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {type?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Scheduled Date',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      render: (date) => date ? dayjs(date).format('MMM DD, YYYY') : 'N/A',
      sorter: (a, b) => dayjs(a.scheduledDate).unix() - dayjs(b.scheduledDate).unix(),
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
      title: 'Total Cost',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost) => cost ? `₹${cost.toLocaleString()}` : 'N/A',
    },
    {
      title: 'Service Provider',
      key: 'serviceProvider',
      render: (_, record) => record.serviceProvider?.name || 'N/A',
      ellipsis: true,
    },
    {
      title: 'Service Recommendation',
      dataIndex: 'nextServiceDate',
      key: 'nextServiceDate',
      render: (date) => {
        if (!date) return 'Not specified';
        const isOverdue = dayjs(date).isBefore(dayjs());
        return (
          <span style={{ color: isOverdue ? '#f5222d' : 'inherit' }}>
            {dayjs(date).format('MMM DD, YYYY')}
            {isOverdue && ' (Schedule soon)'}
          </span>
        );
      },
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
            title="Are you sure you want to delete this maintenance record?"
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
          <ToolOutlined style={{ marginRight: 8 }} />
          Fleet Maintenance
        </Title>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Records"
              value={stats.totalRecords || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completedRecords || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgressRecords || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Cost"
              value={stats.totalCost || 0}
              prefix="₹"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Maintenance Records Table */}
      <Card
        title="Maintenance Records"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Add Maintenance Record
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={maintenanceRecords}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
          }}
        />
      </Card>

      {/* Add/Edit Maintenance Record Modal */}
      <Modal
        title={editingRecord ? 'Edit Maintenance Record' : 'Add New Maintenance Record'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
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
            status: 'scheduled',
            maintenanceType: 'routine_service',
            serviceCategory: 'preventive',
            priority: 'medium',
            paymentMethod: 'cash',
            serviceProviderType: 'local_garage',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehicle"
                label="Vehicle"
                rules={[
                  { required: true, message: 'Please select a vehicle' },
                ]}
              >
                <Select
                  placeholder="Select vehicle"
                  showSearch
                  optionFilterProp="children"
                >
                  {vehicles.map(vehicle => (
                    <Option key={vehicle._id} value={vehicle._id}>
                      {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maintenanceType"
                label="Maintenance Type"
                rules={[
                  { required: true, message: 'Please select maintenance type' },
                ]}
              >
                <Select>
                  <Option value="routine_service">Routine Service</Option>
                  <Option value="oil_change">Oil Change</Option>
                  <Option value="tire_change">Tire Change</Option>
                  <Option value="brake_service">Brake Service</Option>
                  <Option value="engine_repair">Engine Repair</Option>
                  <Option value="transmission_repair">Transmission Repair</Option>
                  <Option value="electrical_repair">Electrical Repair</Option>
                  <Option value="body_repair">Body Repair</Option>
                  <Option value="painting">Painting</Option>
                  <Option value="ac_service">AC Service</Option>
                  <Option value="battery_replacement">Battery Replacement</Option>
                  <Option value="filter_change">Filter Change</Option>
                  <Option value="coolant_service">Coolant Service</Option>
                  <Option value="alignment">Alignment</Option>
                  <Option value="balancing">Balancing</Option>
                  <Option value="suspension_repair">Suspension Repair</Option>
                  <Option value="clutch_repair">Clutch Repair</Option>
                  <Option value="fuel_system">Fuel System</Option>
                  <Option value="exhaust_repair">Exhaust Repair</Option>
                  <Option value="inspection">Inspection</Option>
                  <Option value="emergency_repair">Emergency Repair</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="serviceCategory"
                label="Service Category"
                rules={[
                  { required: true, message: 'Please select service category' },
                ]}
              >
                <Select>
                  <Option value="preventive">Preventive</Option>
                  <Option value="corrective">Corrective</Option>
                  <Option value="predictive">Predictive</Option>
                  <Option value="emergency">Emergency</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[
                  { required: true, message: 'Please select priority' },
                ]}
              >
                <Select>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, message: 'Please enter a title' },
              { max: 200, message: 'Title must be less than 200 characters' }
            ]}
          >
            <Input placeholder="Brief title for the maintenance work" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please enter description' },
              { max: 1000, message: 'Description must be less than 1000 characters' }
            ]}
          >
            <TextArea rows={3} placeholder="Describe the maintenance work..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scheduledDate"
                label="Scheduled Date"
                rules={[
                  { required: true, message: 'Please select scheduled date' },
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="totalCost"
                label="Total Cost (₹)"
                rules={[
                  { required: true, message: 'Please enter total cost' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="odometer"
                label="Current Odometer Reading"
                rules={[
                  { required: true, message: 'Please enter current odometer reading' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Current mileage"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                rules={[
                  { required: true, message: 'Please select payment method' },
                ]}
              >
                <Select>
                  <Option value="cash">Cash</Option>
                  <Option value="card">Card</Option>
                  <Option value="upi">UPI</Option>
                  <Option value="bank_transfer">Bank Transfer</Option>
                  <Option value="cheque">Cheque</Option>
                  <Option value="credit">Credit</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="serviceProviderName"
                label="Service Provider Name"
                rules={[
                  { required: true, message: 'Please enter service provider name' },
                ]}
              >
                <Input placeholder="Workshop/Mechanic name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="serviceProviderType"
                label="Service Provider Type"
                rules={[
                  { required: true, message: 'Please select service provider type' },
                ]}
              >
                <Select>
                  <Option value="authorized_dealer">Authorized Dealer</Option>
                  <Option value="local_garage">Local Garage</Option>
                  <Option value="company_workshop">Company Workshop</Option>
                  <Option value="roadside_assistance">Roadside Assistance</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="serviceProviderContact" label="Contact">
                <Input placeholder="Phone/Email" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Service Recommendation</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nextServiceDate"
                label="Recommended Service Date"
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  placeholder="When should service be scheduled"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nextServiceOdometer"
                label="Service at Odometer"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Service at this mileage"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingRecord(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRecord ? 'Update Record' : 'Add Record'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FleetMaintenance;