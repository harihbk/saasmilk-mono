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
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { inventoryAPI, productsAPI, warehousesAPI, debugAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [form] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchWarehouses();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);


  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        status: statusFilter || undefined,
      };

      console.log('Fetching inventory with params:', params);
      const response = await inventoryAPI.getInventory(params);
      console.log('Inventory API response:', response.data); // Debug log
      
      if (response.data.success) {
        const { inventoryItems: data, pagination: paginationData } = response.data.data;
        console.log('Inventory items received:', data);
        console.log('Pagination data:', paginationData);
        
        setInventory(data || []);
        setPagination(prev => ({
          ...prev,
          total: paginationData?.total || 0,
        }));
      } else {
        console.error('API response not successful:', response.data);
        throw new Error(response.data.message || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      console.error('Error details:', error.response?.data);
      
      // Use empty array as fallback
      console.log('Using empty inventory data as fallback');
      setInventory([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getProducts({ limit: 100 });
      console.log('Fetched products:', response.data.data.products);
      setProducts(response.data.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([{
        _id: 'sample-product',
        name: 'Sample Product',
        sku: 'SKU-001',
        category: 'Dairy'
      }]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getActiveWarehouses();
      setWarehouses(response.data.data.warehouses || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([{
        id: 'warehouse-a',
        name: 'Warehouse A',
        code: 'WH-A',
        description: 'Main warehouse',
        location: ''
      }]);
    }
  };

  const mockInventory = [
    {
      _id: '1',
      product: {
        _id: '1',
        name: 'Whole Milk 1L',
        sku: 'WM-1L-001',
        category: 'Dairy',
      },
      stock: {
        available: 150,
        reserved: 25,
        damaged: 0,
        expired: 0,
        inTransit: 0
      },
      thresholds: {
        minimum: 50,
        maximum: 500,
        reorderPoint: 75,
        reorderQuantity: 100
      },
      location: {
        warehouse: 'Warehouse A',
        zone: 'Section 1',
        aisle: 'A1',
        shelf: '1',
        bin: '001'
      },
      batches: [{
        batchNumber: 'BATCH-001',
        quantity: 150,
        expiryDate: dayjs().add(7, 'days').toDate(),
        manufactureDate: dayjs().subtract(30, 'days').toDate(),
        receivedDate: dayjs().subtract(25, 'days').toDate()
      }],
      pricing: {
        averageCost: 45.50,
        lastPurchasePrice: 48.00,
        totalValue: 6825.00
      },
      createdAt: new Date(),
    },
    {
      _id: '2',
      product: {
        _id: '2',
        name: 'Greek Yogurt 500g',
        sku: 'GY-500G-002',
        category: 'Dairy',
      },
      stock: {
        available: 25,
        reserved: 10,
        damaged: 2,
        expired: 0,
        inTransit: 0
      },
      thresholds: {
        minimum: 30,
        maximum: 200,
        reorderPoint: 40,
        reorderQuantity: 50
      },
      location: {
        warehouse: 'Warehouse A',
        zone: 'Section 2',
        aisle: 'A2',
        shelf: '1',
        bin: '002'
      },
      batches: [{
        batchNumber: 'BATCH-002',
        quantity: 37,
        expiryDate: dayjs().add(5, 'days').toDate(),
        manufactureDate: dayjs().subtract(20, 'days').toDate(),
        receivedDate: dayjs().subtract(15, 'days').toDate()
      }],
      pricing: {
        averageCost: 85.00,
        lastPurchasePrice: 88.00,
        totalValue: 3145.00
      },
      createdAt: new Date(),
    },
  ];

  const mockProducts = [
    { _id: '1', name: 'Whole Milk 1L', sku: 'WM-1L-001' },
    { _id: '2', name: 'Greek Yogurt 500g', sku: 'GY-500G-002' },
    { _id: '3', name: 'Cheddar Cheese 250g', sku: 'CC-250G-003' },
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

  const handleProductChange = (productId) => {
    // Find the selected product
    const selectedProduct = products.find(p => p._id === productId);
    
    if (selectedProduct) {
      console.log('Selected product:', selectedProduct);
      
      // Update form fields with product data
      const fieldsToUpdate = {};
      
      if (selectedProduct.price) {
        // Set average cost to the product's cost price
        if (selectedProduct.price.cost !== undefined) {
          fieldsToUpdate.averageCost = selectedProduct.price.cost;
        }
        
        // Set last purchase price to the product's selling price
        if (selectedProduct.price.selling !== undefined) {
          fieldsToUpdate.lastPurchasePrice = selectedProduct.price.selling;
        }
      }
      
      // Set GST fields
      if (selectedProduct.tax) {
        fieldsToUpdate.igst = selectedProduct.tax.igst || 0;
        fieldsToUpdate.cgst = selectedProduct.tax.cgst || 0;
        fieldsToUpdate.sgst = selectedProduct.tax.sgst || 0;
        
        const gstTotal = (selectedProduct.tax.igst || 0) + 
                        (selectedProduct.tax.cgst || 0) + 
                        (selectedProduct.tax.sgst || 0);
        
        console.log('Product GST:', {
          igst: selectedProduct.tax.igst,
          cgst: selectedProduct.tax.cgst,
          sgst: selectedProduct.tax.sgst,
          total: gstTotal
        });
      }
      
      // Update all fields at once
      form.setFieldsValue(fieldsToUpdate);
      
      message.success(`Prices and GST loaded from product: ${selectedProduct.name}`);
    }
  };

  const showModal = (item = null) => {
    setEditingItem(item);
    setModalVisible(true);
    if (item) {
      console.log('Editing inventory item:', item);
      console.log('Product data:', item.product);
      console.log('Warehouse data:', item.location?.warehouse);
      
      const currentBatch = getCurrentBatch(item.batches);
      const formValues = {
        product: item.product?._id,
        availableStock: item.stock?.available || 0,
        reservedStock: item.stock?.reserved || 0,
        minimumStock: item.thresholds?.minimum || 0,
        maximumStock: item.thresholds?.maximum || 0,
        reorderPoint: item.thresholds?.reorderPoint || 0,
        warehouse: item.location?.warehouse?._id || item.location?.warehouse || '',
        zone: item.location?.zone || '',
        aisle: item.location?.aisle || '',
        shelf: item.location?.shelf || '',
        bin: item.location?.bin || '',
        batchNumber: currentBatch?.batchNumber || '',
        expiryDate: currentBatch?.expiryDate ? dayjs(currentBatch.expiryDate) : null,
        manufactureDate: currentBatch?.manufactureDate ? dayjs(currentBatch.manufactureDate) : null,
        averageCost: item.pricing?.averageCost || 0,
        lastPurchasePrice: item.pricing?.lastPurchasePrice || 0,
        igst: item.tax?.igst || 0,
        cgst: item.tax?.cgst || 0,
        sgst: item.tax?.sgst || 0,
      };
      
      console.log('Setting form values:', formValues);
      form.setFieldsValue(formValues);
    } else {
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      const inventoryData = {
        product: values.product,
        stock: {
          available: values.availableStock || 0,
          reserved: values.reservedStock || 0,
          damaged: 0,
          expired: 0,
          inTransit: 0
        },
        thresholds: {
          minimum: values.minimumStock || 0,
          maximum: values.maximumStock || 0,
          reorderPoint: values.reorderPoint || 0,
          reorderQuantity: values.reorderQuantity || 0
        },
        location: {
          warehouse: values.warehouse || '',
          zone: values.zone || '',
          aisle: values.aisle || '',
          shelf: values.shelf || '',
          bin: values.bin || ''
        },
        pricing: {
          averageCost: values.averageCost || 0,
          lastPurchasePrice: values.lastPurchasePrice || 0,
          totalValue: (values.availableStock || 0) * (values.averageCost || 0)
        },
        tax: {
          igst: values.igst || 0,
          cgst: values.cgst || 0,
          sgst: values.sgst || 0
        },
        batches: [{
          batchNumber: values.batchNumber || 'BATCH-' + Date.now(),
          quantity: values.availableStock || 0,
          manufactureDate: values.manufactureDate ? values.manufactureDate.toDate() : null,
          expiryDate: values.expiryDate ? values.expiryDate.toDate() : null,
          receivedDate: new Date()
        }]
      };

      console.log('Submitting inventory data:', inventoryData);

      if (editingItem) {
        console.log('Updating inventory item:', editingItem._id);
        const response = await inventoryAPI.updateInventoryItem(editingItem._id, inventoryData);
        console.log('Update response:', response.data);
        message.success('Inventory item updated successfully');
      } else {
        console.log('Creating new inventory item');
        const response = await inventoryAPI.createInventoryItem(inventoryData);
        console.log('Create response:', response.data);
        message.success('Inventory item created successfully');
      }

      setModalVisible(false);
      setEditingItem(null);
      form.resetFields();
      
      // Refresh inventory data
      console.log('Refreshing inventory data...');
      await fetchInventory();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to save inventory item';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        
        if (errorMessage.includes('already exists')) {
          errorMessage = `Inventory already exists for this product in ${values.warehouse}. Please update the existing inventory instead.`;
        } else if (errorMessage.includes('validation')) {
          errorMessage = 'Please check all required fields and try again.';
        }
      }
      
      message.error(errorMessage);
    }
  };

  const showStockMovementModal = (record) => {
    setCurrentRecord(record);
    setStockModalVisible(true);
    stockForm.resetFields();
    stockForm.setFieldsValue({
      quantity: 1,
      reason: 'Adjustment'
    });
  };

  const handleStockMovementSubmit = async (values) => {
    try {
      console.log('Stock movement form values:', values);
      
      // Validate quantity
      if (!values.quantity || values.quantity <= 0) {
        message.error('Please enter a valid quantity');
        return;
      }
      
      // Ensure quantity is an integer
      const quantity = parseInt(values.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        message.error('Quantity must be a positive number');
        return;
      }

      await inventoryAPI.addMovement(currentRecord._id, {
        type: 'in',
        quantity: quantity,
        reason: values.reason || 'Stock Adjustment',
      });
      
      message.success('Stock added successfully');
      setStockModalVisible(false);
      stockForm.resetFields();
      fetchInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update stock';
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

  const handleStockMovement = async (id, type, quantity, reason) => {
    try {
      await inventoryAPI.addMovement(id, {
        type,
        quantity,
        reason,
      });
      message.success(`Stock ${type === 'in' ? 'added' : 'removed'} successfully`);
      fetchInventory();
    } catch (error) {
      console.error('Error updating stock:', error);
      message.error('Failed to update stock');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      good: 'green',
      low: 'orange',
      critical: 'red',
      out_of_stock: 'red',
    };
    return colors[status] || 'default';
  };

  const getStockLevel = (available, min, max) => {
    if (available === 0) return { status: 'out_of_stock', percent: 0 };
    if (available <= min) return { status: 'critical', percent: Math.min((available / min) * 100, 100) };
    if (available <= min * 1.5) return { status: 'low', percent: Math.min((available / max) * 100, 100) };
    return { status: 'good', percent: Math.min((available / max) * 100, 100) };
  };

  const getInventoryStatus = (item) => {
    const totalStock = item.stock?.available || 0;
    const reserved = item.stock?.reserved || 0;
    const actualAvailable = totalStock - reserved; // Calculate actual available stock
    const minimum = item.thresholds?.minimum || 0;
    
    if (actualAvailable === 0) return 'out_of_stock';
    if (actualAvailable <= minimum) return 'critical';
    if (actualAvailable <= minimum * 1.5) return 'low';
    return 'good';
  };

  const getLocationString = (location) => {
    if (typeof location === 'string') return location;
    if (!location) return 'Unknown Location';
    
    // Handle warehouse object or string
    let warehouseName = location.warehouse;
    if (typeof location.warehouse === 'object' && location.warehouse) {
      warehouseName = `${location.warehouse.code} - ${location.warehouse.name}`;
    }
    
    let parts = [warehouseName];
    if (location.zone) parts.push(location.zone);
    if (location.aisle) parts.push(location.aisle);
    if (location.shelf) parts.push(`Shelf ${location.shelf}`);
    if (location.bin) parts.push(`Bin ${location.bin}`);
    
    return parts.join(' - ');
  };

  const getCurrentBatch = (batches) => {
    if (!batches || batches.length === 0) return null;
    // Return the batch with the earliest expiry date that still has stock
    return batches
      .filter(batch => batch.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => {
        const currentBatch = getCurrentBatch(record.batches);
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.product?.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              SKU: {record.product?.sku}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Category: {record.product?.category}
            </div>
            {currentBatch && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                Batch: {currentBatch.batchNumber}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Stock Level',
      key: 'stockLevel',
      render: (_, record) => {
        const totalStock = record.stock?.available || 0;
        const reserved = record.stock?.reserved || 0;
        const actualAvailable = totalStock - reserved; // Calculate actual available stock
        const minimum = record.thresholds?.minimum || 0;
        const maximum = record.thresholds?.maximum || 0;
        const stockLevel = getStockLevel(actualAvailable, minimum, maximum);
        
        return (
          <div>
            <div style={{ marginBottom: 4 }}>
              <strong>{actualAvailable}</strong> {maximum > 0 && `/ ${maximum}`}
              {reserved > 0 && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  ({reserved} reserved)
                </div>
              )}
            </div>
            {maximum > 0 && (
              <Progress
                percent={stockLevel.percent}
                size="small"
                status={stockLevel.status === 'good' ? 'success' : 'exception'}
                showInfo={false}
              />
            )}
            <div style={{ fontSize: '12px', color: '#666' }}>
              Available: {actualAvailable} | Reserved: {reserved}
            </div>
            {record.stock?.damaged > 0 && (
              <div style={{ fontSize: '12px', color: '#f5222d' }}>
                Damaged: {record.stock.damaged}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = getInventoryStatus(record);
        return (
          <Tag color={getStatusColor(status)} style={{ textTransform: 'capitalize' }}>
            {status.replace('_', ' ')}
          </Tag>
        );
      },
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => getLocationString(record.location),
    },
    {
      title: 'Expiry Date',
      key: 'expiryDate',
      render: (_, record) => {
        const currentBatch = getCurrentBatch(record.batches);
        if (!currentBatch?.expiryDate) return 'N/A';
        
        const date = currentBatch.expiryDate;
        const daysUntilExpiry = dayjs(date).diff(dayjs(), 'days');
        const color = daysUntilExpiry <= 3 ? 'red' : daysUntilExpiry <= 7 ? 'orange' : 'default';
        
        return (
          <div>
            <div>{dayjs(date).format('MMM DD, YYYY')}</div>
            <div style={{ fontSize: '12px', color }}>
              {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Alerts',
      key: 'alerts',
      render: (_, record) => {
        const alerts = [];
        const totalStock = record.stock?.available || 0;
        const reserved = record.stock?.reserved || 0;
        const available = totalStock - reserved; // Calculate actual available stock
        const minimum = record.thresholds?.minimum || 0;
        const currentBatch = getCurrentBatch(record.batches);
        
        // Low stock alert
        if (available <= minimum && available > 0) {
          alerts.push({
            type: 'low_stock',
            message: 'Stock below minimum level',
            severity: 'error'
          });
        }
        
        // Out of stock alert
        if (available === 0) {
          alerts.push({
            type: 'out_of_stock',
            message: 'Out of stock',
            severity: 'error'
          });
        }
        
        // Expiry warning
        if (currentBatch?.expiryDate) {
          const daysUntilExpiry = dayjs(currentBatch.expiryDate).diff(dayjs(), 'days');
          if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            alerts.push({
              type: 'expiry_warning',
              message: `Items expiring in ${daysUntilExpiry} days`,
              severity: 'warning'
            });
          } else if (daysUntilExpiry <= 0) {
            alerts.push({
              type: 'expired',
              message: 'Items expired',
              severity: 'error'
            });
          }
        }
        
        return (
          <div>
            {alerts.map((alert, index) => (
              <Tag
                key={index}
                color={alert.severity === 'error' ? 'red' : 'orange'}
                size="small"
                style={{ marginBottom: 2, display: 'block' }}
              >
                {alert.type === 'low_stock' && <WarningOutlined />}
                {alert.type === 'out_of_stock' && <ExclamationCircleOutlined />}
                {alert.type === 'expiry_warning' && <ExclamationCircleOutlined />}
                {alert.type === 'expired' && <WarningOutlined />}
                {' '}{alert.message}
              </Tag>
            ))}
          </div>
        );
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
          <Button
            type="text"
            size="small"
            onClick={() => showStockMovementModal(record)}
          >
            Add Stock
          </Button>
        </Space>
      ),
    },
  ];

  const statuses = ['good', 'low', 'critical', 'out_of_stock'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Inventory Management</Title>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: 8 }}>
          <strong>Current Items:</strong> {inventory.length} | 
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'} |
          <strong>Last Fetch:</strong> {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Alerts */}
      {inventory.length > 0 && (
        <Alert
          message="Inventory Alerts"
          description={`${inventory.filter(item => getInventoryStatus(item) === 'critical' || getInventoryStatus(item) === 'out_of_stock').length} critical alerts, ${inventory.filter(item => {
            const currentBatch = getCurrentBatch(item.batches);
            return currentBatch?.expiryDate && dayjs(currentBatch.expiryDate).diff(dayjs(), 'days') <= 7;
          }).length} expiry warnings`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Items"
              value={inventory.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={inventory.filter(i => {
                const status = getInventoryStatus(i);
                return status === 'low' || status === 'critical' || status === 'out_of_stock';
              }).length}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Stock Value"
              value={inventory.reduce((sum, i) => sum + (i.pricing?.totalValue || 0), 0)}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Expiring Soon"
              value={inventory.filter(i => {
                const currentBatch = getCurrentBatch(i.batches);
                return currentBatch?.expiryDate && dayjs(currentBatch.expiryDate).diff(dayjs(), 'days') <= 7;
              }).length}
              valueStyle={{ color: '#faad14' }}
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
                  placeholder="Search inventory..."
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
                      {status.replace('_', ' ')}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  onClick={() => {
                    console.log('Manual refresh triggered');
                    setPagination(prev => ({ ...prev, current: 1 })); // Reset to page 1
                    fetchInventory();
                  }}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => showModal()}
                >
                  Add Inventory Item
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Inventory Table */}
        <Table
          columns={columns}
          dataSource={inventory}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Inventory Modal */}
      <Modal
        title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
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
          <Form.Item
            name="product"
            label="Product"
            rules={[{ required: true, message: 'Please select product' }]}
          >
            <Select 
              placeholder="Select product" 
              showSearch
              onChange={handleProductChange}
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {products.map(product => (
                <Option key={product._id} value={product._id}>
                  {product.name} - {product.sku}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="availableStock"
                label="Available Stock"
                rules={[{ required: true, message: 'Please enter available stock' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="reservedStock"
                label="Reserved Stock"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="minimumStock"
                label="Minimum Stock"
                rules={[{ required: true, message: 'Please enter minimum stock' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="maximumStock"
                label="Maximum Stock"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="reorderPoint"
                label="Reorder Point"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="averageCost"
                label="Cost Price (₹)"
                tooltip="This will be auto-filled from product data"
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="lastPurchasePrice"
                label="Selling Price (₹)"
                tooltip="This will be auto-filled from product data"
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="igst"
                label="IGST (%)"
                tooltip="Auto-filled from product"
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="cgst"
                label="CGST (%)"
                tooltip="Auto-filled from product"
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="sgst"
                label="SGST (%)"
                tooltip="Auto-filled from product"
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="warehouse"
                label="Warehouse"
                rules={[
                  { required: true, message: 'Please select warehouse' }
                ]}
              >
                <Select placeholder="Select warehouse" allowClear>
                  {warehouses.map(warehouse => (
                    <Option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                      {warehouse.location && ` (${warehouse.location})`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="zone"
                label="Zone/Section"
              >
                <Input placeholder="e.g., Section 1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="aisle"
                label="Aisle"
              >
                <Input placeholder="e.g., A1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="shelf"
                label="Shelf"
              >
                <Input placeholder="e.g., 1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="bin"
                label="Bin"
              >
                <Input placeholder="e.g., 001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="batchNumber"
                label="Batch Number"
              >
                <Input placeholder="Auto-generated if empty" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufactureDate"
                label="Manufacture Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal
        title="Add Stock"
        open={stockModalVisible}
        onCancel={() => {
          setStockModalVisible(false);
          stockForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={stockForm}
          layout="vertical"
          onFinish={handleStockMovementSubmit}
          initialValues={{
            quantity: 1,
            reason: 'Adjustment'
          }}
        >
          <Form.Item 
            name="quantity" 
            label="Quantity" 
            rules={[
              { required: true, message: 'Please enter quantity' },
              { type: 'number', min: 1, message: 'Quantity must be at least 1' }
            ]}
          >
            <InputNumber 
              min={1} 
              style={{ width: '100%' }} 
              placeholder="Enter quantity to add"
              onChange={(value) => {
                console.log('Quantity changed:', value, typeof value);
              }}
            />
          </Form.Item>
          <Form.Item 
            name="reason" 
            label="Reason" 
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
            <Select placeholder="Select reason">
              <Option value="Purchase Order">Purchase Order</Option>
              <Option value="Production">Production</Option>
              <Option value="Return">Return</Option>
              <Option value="Adjustment">Stock Adjustment</Option>
              <Option value="Transfer In">Transfer In</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setStockModalVisible(false);
                stockForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add Stock
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
