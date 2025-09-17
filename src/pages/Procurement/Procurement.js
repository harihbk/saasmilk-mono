import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Select,
  Card,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Descriptions,
  Divider,
  Alert,
  Badge,
  Tabs,
  Radio,
  Empty,
  Spin,
  Progress,
  Timeline,
  Tooltip,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  PrinterOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  TeamOutlined,
  MinusCircleOutlined,
  CalculatorOutlined,
  DollarOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import procurementAPI from '../../services/procurementAPI';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const Procurement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create, edit, view
  const [selectedProcurement, setSelectedProcurement] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalForm] = Form.useForm();

  // Check if we should open create modal or apply filters based on route
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    
    if (location.pathname === '/procurement/create') {
      // Will open create modal after data loads
      setTimeout(() => handleCreate(), 500);
    } else if (status) {
      setFilters({ status });
    }
  }, [location]);

  // Load data on component mount
  useEffect(() => {
    loadProcurements(filters);
    loadStats();
    loadSuppliers();
    loadProducts();
    loadWarehouses();
    loadUsers();
  }, [filters]);

  // Debug form values when modal opens
  useEffect(() => {
    if (modalVisible && modalMode === 'edit') {
      console.log('Modal opened for edit, current form values:', form.getFieldsValue());
    }
  }, [modalVisible, modalMode, form]);

  const loadProcurements = async (params = {}) => {
    setLoading(true);
    try {
      const response = await procurementAPI.getAll({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
        ...params,
      });

      const procurementData = response.data.data?.procurements || response.data.procurements || [];
      const paginationData = response.data.data?.pagination || response.data.pagination || {};
      
      setProcurements(Array.isArray(procurementData) ? procurementData : []);
      setPagination({
        ...pagination,
        total: paginationData.total || 0,
        current: paginationData.page || 1,
      });
    } catch (error) {
      message.error('Failed to load procurements');
      console.error('Load procurements error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await procurementAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      // Handle different response formats
      const suppliers = response.data.data?.suppliers || response.data.suppliers || response.data.data || response.data || [];
      setSuppliers(Array.isArray(suppliers) ? suppliers : []);
    } catch (error) {
      console.error('Load suppliers error:', error);
      setSuppliers([]);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      // Handle different response formats
      const products = response.data.data?.products || response.data.products || response.data.data || response.data || [];
      setProducts(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error('Load products error:', error);
      setProducts([]);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      // Handle different response formats
      const warehouses = response.data.data?.warehouses || response.data.warehouses || response.data.data || response.data || [];
      setWarehouses(Array.isArray(warehouses) ? warehouses : []);
    } catch (error) {
      console.error('Load warehouses error:', error);
      setWarehouses([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      // Handle different response formats
      const users = response.data.data?.users || response.data.users || response.data.data || response.data || [];
      setUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Load users error:', error);
      setUsers([]);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedProcurement(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedProcurement(record);
    
    console.log('Editing record:', record);
    
    // Extract IDs from populated objects safely
    const getSupplierId = (supplier) => {
      if (!supplier) return undefined;
      return typeof supplier === 'string' ? supplier : supplier._id;
    };
    
    const getProductId = (product) => {
      if (!product) return undefined;
      return typeof product === 'string' ? product : product._id;
    };
    
    const getWarehouseId = (warehouse) => {
      if (!warehouse) return undefined;
      return typeof warehouse === 'string' ? warehouse : warehouse._id;
    };
    
    // Prepare form values matching the form structure
    const formValues = {
      supplier: getSupplierId(record.supplier),
      procurementType: record.procurementType || 'purchase-order',
      priority: record.priority || 'normal',
      notes: record.notes || '',
      items: record.items?.map(item => ({
        product: getProductId(item.product),
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0
      })) || [{ product: '', quantity: 1, unitPrice: 0 }]
    };
    
    // Handle nested delivery fields
    if (record.delivery) {
      formValues.delivery = {};
      
      if (record.delivery.expectedDate) {
        try {
          const deliveryDate = dayjs(record.delivery.expectedDate);
          if (deliveryDate.isValid()) {
            formValues.delivery.expectedDate = deliveryDate;
          }
        } catch (error) {
          console.warn('Invalid delivery date:', record.delivery.expectedDate);
        }
      }
      
      if (record.delivery.warehouse) {
        formValues.delivery.warehouse = getWarehouseId(record.delivery.warehouse);
      }
    }
    
    console.log('Setting form values:', formValues);
    form.resetFields();
    form.setFieldsValue(formValues);
    setModalVisible(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedProcurement(record);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const formData = {
        ...values,
        delivery: {
          ...values.delivery,
          expectedDate: values.delivery?.expectedDate?.toISOString(),
        },
        payment: {
          ...values.payment,
          dueDate: values.payment?.dueDate?.toISOString(),
        },
      };

      if (modalMode === 'create') {
        await procurementAPI.create(formData);
        message.success('Procurement created successfully');
      } else if (modalMode === 'edit') {
        await procurementAPI.update(selectedProcurement._id, formData);
        message.success('Procurement updated successfully');
      }

      setModalVisible(false);
      loadProcurements();
      loadStats();
    } catch (error) {
      message.error(`Failed to ${modalMode} procurement`);
      console.error(`${modalMode} procurement error:`, error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await procurementAPI.delete(id);
      message.success('Procurement deleted successfully');
      loadProcurements();
      loadStats();
    } catch (error) {
      message.error('Failed to delete procurement');
      console.error('Delete procurement error:', error);
    }
  };

  const handleApproval = (record) => {
    setSelectedProcurement(record);
    setApprovalModalVisible(true);
    approvalForm.resetFields();
  };

  const handleApprovalSubmit = async (values) => {
    try {
      if (!selectedProcurement) return;
      
      // Update procurement status directly
      await procurementAPI.update(selectedProcurement._id, {
        status: values.decision === 'approve' ? 'approved' : 'rejected',
        notes: values.notes
      });
      
      message.success(`Procurement ${values.decision === 'approve' ? 'approved' : 'rejected'} successfully`);
      setApprovalModalVisible(false);
      loadProcurements();
      loadStats();
    } catch (error) {
      message.error('Failed to process approval');
      console.error('Approval error:', error);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'draft': 'default',
      'pending-approval': 'gold',
      'approved': 'green',
      'sent-to-supplier': 'blue',
      'acknowledged': 'cyan',
      'in-production': 'purple',
      'ready-to-ship': 'orange',
      'shipped': 'geekblue',
      'partially-received': 'lime',
      'received': 'green',
      'quality-check': 'yellow',
      'completed': 'success',
      'cancelled': 'default',
      'rejected': 'error',
    };
    return statusColors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': 'green',
      'normal': 'blue',
      'high': 'orange',
      'urgent': 'red',
      'critical': 'error',
    };
    return priorityColors[priority] || 'default';
  };

  const columns = [
    {
      title: 'Procurement #',
      dataIndex: 'procurementNumber',
      key: 'procurementNumber',
      fixed: 'left',
      width: 150,
      render: (text, record) => (
        <Button
          type="link"
          onClick={() => handleView(record)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: ['supplier', 'companyInfo', 'name'],
      key: 'supplier',
      width: 200,
      render: (text) => (
        <Space>
          <ShopOutlined />
          <Text>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'procurementType',
      key: 'procurementType',
      width: 120,
      render: (type) => (
        <Tag>{type?.replace('-', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.replace('-', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Total Value',
      dataIndex: ['pricing', 'total'],
      key: 'total',
      width: 120,
      render: (value, record) => (
        <Text strong>
          {record.pricing?.currency || 'INR'} {value?.toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Expected Date',
      dataIndex: ['delivery', 'expectedDate'],
      key: 'expectedDate',
      width: 120,
      render: (date) => {
        if (!date) return '-';
        try {
          const dateObj = dayjs(date);
          return dateObj.isValid() ? dateObj.format('DD-MM-YYYY') : '-';
        } catch (error) {
          console.warn('Invalid date:', date);
          return '-';
        }
      },
    },
    {
      title: 'Progress',
      dataIndex: 'completionPercentage',
      key: 'progress',
      width: 100,
      render: (progress) => (
        <Progress
          percent={progress || 0}
          size="small"
          status={progress === 100 ? 'success' : 'active'}
        />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => {
        if (!date) return '-';
        try {
          const dateObj = dayjs(date);
          return dateObj.isValid() ? dateObj.format('DD-MM-YYYY') : '-';
        } catch (error) {
          console.warn('Invalid created date:', date);
          return '-';
        }
      },
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
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={['completed', 'cancelled'].includes(record.status)}
            />
          </Tooltip>
          {record.status === 'pending-approval' && (
            <Tooltip title="Approve/Reject">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApproval(record)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this procurement?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                disabled={!['draft', 'cancelled', 'rejected'].includes(record.status)}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const renderStatistics = () => (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Procurements"
            value={stats.statusCounts?.reduce((sum, item) => sum + item.count, 0) || 0}
            prefix={<ShoppingCartOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Total Value"
            value={stats.totalValue || 0}
            precision={0}
            prefix="₹"
            suffix="INR"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Pending Approvals"
            value={stats.statusCounts?.find(s => s._id === 'pending-approval')?.count || 0}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="Overdue"
            value={stats.overdueProcurements || 0}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderFilters = () => (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <Option value="draft">Draft</Option>
            <Option value="pending-approval">Pending Approval</Option>
            <Option value="approved">Approved</Option>
            <Option value="sent-to-supplier">Sent to Supplier</Option>
            <Option value="in-production">In Production</Option>
            <Option value="shipped">Shipped</Option>
            <Option value="received">Received</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Filter by Priority"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => setFilters({ ...filters, priority: value })}
          >
            <Option value="low">Low</Option>
            <Option value="normal">Normal</Option>
            <Option value="high">High</Option>
            <Option value="urgent">Urgent</Option>
            <Option value="critical">Critical</Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Filter by Supplier"
            allowClear
            showSearch
            style={{ width: '100%' }}
            onChange={(value) => setFilters({ ...filters, supplier: value })}
            optionFilterProp="children"
          >
            {Array.isArray(suppliers) && suppliers.map(supplier => (
              <Option key={supplier._id} value={supplier._id}>
                {supplier.companyInfo?.name || supplier.name || 'Unknown Supplier'}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Button
            type="primary"
            onClick={() => loadProcurements(filters)}
            style={{ width: '100%' }}
          >
            Apply Filters
          </Button>
        </Col>
      </Row>
    </Card>
  );

  const renderForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      disabled={modalMode === 'view'}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="supplier"
            label="Supplier"
            rules={[{ required: true, message: 'Please select a supplier' }]}
          >
            <Select
              placeholder="Select supplier"
              showSearch
              optionFilterProp="children"
            >
              {Array.isArray(suppliers) && suppliers.map(supplier => (
                <Option key={supplier._id} value={supplier._id}>
                  {supplier.companyInfo?.name || supplier.name || 'Unknown Supplier'}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="procurementType"
            label="Procurement Type"
            initialValue="purchase-order"
          >
            <Select placeholder="Select type">
              <Option value="purchase-order">Purchase Order</Option>
              <Option value="contract">Contract</Option>
              <Option value="spot-buy">Spot Buy</Option>
              <Option value="emergency">Emergency</Option>
              <Option value="bulk">Bulk</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="priority"
            label="Priority"
            initialValue="normal"
          >
            <Select placeholder="Select priority">
              <Option value="low">Low</Option>
              <Option value="normal">Normal</Option>
              <Option value="high">High</Option>
              <Option value="urgent">Urgent</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['delivery', 'expectedDate']}
            label="Expected Delivery Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name={['delivery', 'warehouse']}
        label="Delivery Warehouse"
      >
        <Select
          placeholder="Select warehouse"
          allowClear
        >
          {Array.isArray(warehouses) && warehouses.map(warehouse => (
            <Option key={warehouse._id} value={warehouse._id}>
              {warehouse.name || 'Unknown Warehouse'}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Divider>Items</Divider>
      
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Card key={key} style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'product']}
                      label="Product"
                      rules={[{ required: true, message: 'Please select product' }]}
                    >
                      <Select
                        placeholder="Select product"
                        showSearch
                        optionFilterProp="children"
                      >
                        {Array.isArray(products) && products.map(product => (
                          <Option key={product._id} value={product._id}>
                            {product.name || 'Unknown Product'}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      label="Quantity"
                      rules={[{ required: true, message: 'Please enter quantity' }]}
                    >
                      <InputNumber
                        min={1}
                        style={{ width: '100%' }}
                        placeholder="Quantity"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'unitPrice']}
                      label="Unit Price"
                      rules={[{ required: true, message: 'Please enter unit price' }]}
                    >
                      <InputNumber
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="Unit Price"
                        prefix="₹"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Form.Item label=" ">
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                Add Item
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>

      <Form.Item name="notes" label="Notes">
        <TextArea rows={3} placeholder="Add any additional notes or requirements" />
      </Form.Item>
    </Form>
  );

  // Show analytics view if on analytics route
  if (location.pathname === '/procurement/analytics') {
    return (
      <div>
        <Title level={2}>Procurement Analytics</Title>
        {renderStatistics()}
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>Procurement Trends</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Card>
                <Text>Monthly procurement volume and trends will be displayed here</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Text>Supplier performance metrics will be displayed here</Text>
              </Card>
            </Col>
          </Row>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Procurement Management</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          New Procurement
        </Button>
      </div>

      {renderStatistics()}
      {renderFilters()}

      <Card>
        <Table
          dataSource={procurements}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} procurements`,
          }}
          onChange={(paginationConfig) => {
            setPagination(paginationConfig);
            loadProcurements();
          }}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title={
          modalMode === 'create'
            ? 'Create New Procurement'
            : modalMode === 'edit'
            ? 'Edit Procurement'
            : 'Procurement Details'
        }
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={modalMode === 'view' ? [
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        ] : [
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {modalMode === 'create' ? 'Create' : 'Update'}
          </Button>,
        ]}
      >
        {modalMode === 'view' && selectedProcurement ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Procurement #">
              {selectedProcurement.procurementNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedProcurement.status)}>
                {selectedProcurement.status?.replace('-', ' ').toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Supplier">
              {selectedProcurement.supplier?.companyInfo?.name}
            </Descriptions.Item>
            <Descriptions.Item label="Priority">
              <Tag color={getPriorityColor(selectedProcurement.priority)}>
                {selectedProcurement.priority?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Total Value">
              ₹{selectedProcurement.pricing?.total?.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Expected Date">
              {(() => {
                const date = selectedProcurement.delivery?.expectedDate;
                if (!date) return '-';
                try {
                  const dateObj = dayjs(date);
                  return dateObj.isValid() ? dateObj.format('DD-MM-YYYY') : '-';
                } catch (error) {
                  console.warn('Invalid expected date:', date);
                  return '-';
                }
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Progress">
              <Progress
                percent={selectedProcurement.completionPercentage || 0}
                size="small"
              />
            </Descriptions.Item>
          </Descriptions>
        ) : (
          renderForm()
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        title="Approve/Reject Procurement"
        visible={approvalModalVisible}
        onCancel={() => setApprovalModalVisible(false)}
        onOk={() => approvalForm.submit()}
        width={600}
      >
        {selectedProcurement && (
          <>
            <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Procurement Number">
                {selectedProcurement.procurementNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Supplier">
                {selectedProcurement.supplier?.companyInfo?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                ₹ {selectedProcurement.accounting?.netAmount || selectedProcurement.pricing?.total || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Date">
                {(() => {
                  const date = selectedProcurement.delivery?.expectedDate;
                  if (!date) return '-';
                  try {
                    const dateObj = dayjs(date);
                    return dateObj.isValid() ? dateObj.format('DD-MM-YYYY') : '-';
                  } catch (error) {
                    console.warn('Invalid approval date:', date);
                    return '-';
                  }
                })()}
              </Descriptions.Item>
            </Descriptions>
            
            <Form
              form={approvalForm}
              onFinish={handleApprovalSubmit}
              layout="vertical"
            >
              <Form.Item
                name="decision"
                label="Decision"
                rules={[{ required: true, message: 'Please select a decision' }]}
              >
                <Radio.Group>
                  <Radio value="approve" style={{ color: '#52c41a' }}>
                    <CheckCircleOutlined /> Approve
                  </Radio>
                  <Radio value="reject" style={{ color: '#ff4d4f' }}>
                    <CloseCircleOutlined /> Reject
                  </Radio>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item
                name="notes"
                label="Comments/Notes"
                rules={[{ required: true, message: 'Please add comments' }]}
              >
                <TextArea rows={4} placeholder="Add your approval/rejection comments..." />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Procurement;