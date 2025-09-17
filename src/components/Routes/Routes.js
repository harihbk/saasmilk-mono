import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Typography,
  Tag,
  Row,
  Col,
  Card,
  Tooltip,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UsergroupAddOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import routesAPI from '../../services/routesAPI';
import { usersAPI } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Routes = () => {
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRoutes();
    fetchUsers();
  }, []);

  const fetchRoutes = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await routesAPI.getAll({
        page,
        limit: pageSize,
      });
      setRoutes(response.data.data.routes || []);
      setPagination({
        current: page,
        pageSize,
        total: response.data.data.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching routes:', error);
      message.error('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers({ limit: 100 });
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const showModal = (route = null) => {
    setEditingRoute(route);
    setModalVisible(true);
    if (route) {
      form.setFieldsValue({
        code: route.code,
        name: route.name,
        description: route.description,
        area: route.area,
        city: route.city,
        state: route.state,
        pincode: route.pincode,
        assignedTo: route.assignedTo?._id,
        status: route.status,
        estimatedDeliveryTime: route.estimatedDeliveryTime,
        deliveryDays: route.deliveryDays || [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'active',
        estimatedDeliveryTime: 24,
        deliveryDays: [],
      });
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingRoute(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRoute) {
        await routesAPI.update(editingRoute._id, values);
        message.success('Route updated successfully');
      } else {
        await routesAPI.create(values);
        message.success('Route created successfully');
      }

      setModalVisible(false);
      setEditingRoute(null);
      form.resetFields();
      fetchRoutes(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Error saving route:', error);
      message.error(`Failed to save route: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await routesAPI.delete(id);
      message.success('Route deleted successfully');
      fetchRoutes(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Error deleting route:', error);
      message.error(`Failed to delete route: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleUpdateDealerCount = async (id) => {
    try {
      await routesAPI.updateDealerCount(id);
      message.success('Dealer count updated successfully');
      fetchRoutes(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('Error updating dealer count:', error);
      message.error('Failed to update dealer count');
    }
  };

  const handleTableChange = (newPagination) => {
    fetchRoutes(newPagination.current, newPagination.pageSize);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Route Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.description}
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
          {record.area && <div><strong>Area:</strong> {record.area}</div>}
          <div>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {record.city && record.state ? `${record.city}, ${record.state}` : record.city || record.state || 'Not specified'}
          </div>
          {record.pincode && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              PIN: {record.pincode}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (assignedTo) => assignedTo ? assignedTo.name : 'Unassigned',
    },
    {
      title: 'Dealers',
      dataIndex: 'dealerCount',
      key: 'dealerCount',
      render: (count, record) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
            {count || 0}
          </div>
          <Tooltip title="Update dealer count">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleUpdateDealerCount(record._id)}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Delivery Time',
      dataIndex: 'estimatedDeliveryTime',
      key: 'estimatedDeliveryTime',
      render: (hours) => `${hours || 24} hours`,
    },
    {
      title: 'Delivery Days',
      dataIndex: 'deliveryDays',
      key: 'deliveryDays',
      render: (days) => (
        <div>
          {days && days.length > 0 ? (
            days.map(day => (
              <Tag key={day} size="small" style={{ marginBottom: 2 }}>
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </Tag>
            ))
          ) : (
            <Text type="secondary">All days</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
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
            title="Edit Route"
          />
          <Popconfirm
            title="Are you sure you want to delete this route?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              title="Delete Route"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deliveryDayOptions = [
    { label: 'Monday', value: 'monday' },
    { label: 'Tuesday', value: 'tuesday' },
    { label: 'Wednesday', value: 'wednesday' },
    { label: 'Thursday', value: 'thursday' },
    { label: 'Friday', value: 'friday' },
    { label: 'Saturday', value: 'saturday' },
    { label: 'Sunday', value: 'sunday' },
  ];

  const stats = routes.reduce(
    (acc, route) => {
      acc.total += 1;
      acc.totalDealers += route.dealerCount || 0;
      if (route.status === 'active') acc.active += 1;
      else acc.inactive += 1;
      return acc;
    },
    { total: 0, active: 0, inactive: 0, totalDealers: 0 }
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Delivery Routes</Title>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            Manage delivery routes and assign dealers
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => showModal()}
        >
          Add Route
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats.total}
              </div>
              <div style={{ color: '#666' }}>Total Routes</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats.active}
              </div>
              <div style={{ color: '#666' }}>Active Routes</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {stats.inactive}
              </div>
              <div style={{ color: '#666' }}>Inactive Routes</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                {stats.totalDealers}
              </div>
              <div style={{ color: '#666' }}>Total Dealers</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={routes}
        rowKey="_id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} routes`,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editingRoute ? 'Edit Route' : 'Add New Route'}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={form.submit}
        okText={editingRoute ? 'Update' : 'Create'}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Route Code"
                rules={[
                  { required: !editingRoute, message: 'Please enter route code' },
                  { max: 10, message: 'Code cannot exceed 10 characters' },
                  { pattern: /^[A-Z0-9]*$/, message: 'Code can only contain uppercase letters and numbers' }
                ]}
              >
                <Input placeholder="e.g., RTE001 (auto-generated if empty)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Route Name"
                rules={[
                  { required: true, message: 'Please enter route name' },
                  { max: 100, message: 'Name cannot exceed 100 characters' }
                ]}
              >
                <Input placeholder="e.g., Downtown Route" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: 'Description cannot exceed 500 characters' }]}
          >
            <TextArea rows={3} placeholder="Brief description of the route coverage" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="area"
                label="Area/Region"
                rules={[{ max: 100, message: 'Area cannot exceed 100 characters' }]}
              >
                <Input placeholder="e.g., North Zone" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="city"
                label="City"
                rules={[{ max: 50, message: 'City cannot exceed 50 characters' }]}
              >
                <Input placeholder="e.g., Mumbai" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="state"
                label="State"
                rules={[{ max: 50, message: 'State cannot exceed 50 characters' }]}
              >
                <Input placeholder="e.g., Maharashtra" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pincode"
                label="Pincode"
                rules={[
                  { pattern: /^\d{6}$/, message: 'Please enter a valid 6-digit pincode' }
                ]}
              >
                <Input placeholder="e.g., 400001" maxLength={6} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedTo"
                label="Assigned To"
              >
                <Select placeholder="Select a user" allowClear>
                  {users.map(user => (
                    <Option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="estimatedDeliveryTime"
                label="Estimated Delivery Time (hours)"
                rules={[{ type: 'number', min: 1, message: 'Delivery time must be at least 1 hour' }]}
              >
                <Input type="number" placeholder="24" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deliveryDays"
                label="Delivery Days"
              >
                <Checkbox.Group options={deliveryDayOptions} />
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
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Routes;