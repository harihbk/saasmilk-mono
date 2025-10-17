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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { productsAPI, categoriesAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [priceMetrics, setPriceMetrics] = useState({
    profitMargin: 0,
    wholesaleMargin: 0,
    isValid: false
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when filters or pagination change
  useEffect(() => {
    fetchProducts();
  }, [pagination.current, pagination.pageSize, searchText, categoryFilter, statusFilter]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      const categoriesData = response.data.data.categories || response.data.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep empty array if API fails
      setCategories([]);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      };

      const response = await productsAPI.getProducts(params);
      const { products: data, pagination: paginationData } = response.data.data;

      setProducts(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      message.error('Failed to fetch products');
      // Use mock data on error
      setProducts(mockProducts);
      setPagination(prev => ({ ...prev, total: mockProducts.length }));
    } finally {
      setLoading(false);
    }
  };

  const mockProducts = [
    {
      _id: '1',
      name: 'Whole Milk 1L',
      description: 'Fresh whole milk from local farms',
      category: 'Dairy',
      brand: 'FreshMilk',
      price: 3.99,
      cost: 2.50,
      sku: 'WM-1L-001',
      status: 'active',
      currentStock: 150,
      minStock: 20,
      maxStock: 500,
      unit: 'bottle',
      expiryDate: dayjs().add(7, 'days').toDate(),
      createdAt: new Date(),
    },
    {
      _id: '2',
      name: 'Greek Yogurt 500g',
      description: 'Creamy Greek-style yogurt',
      category: 'Dairy',
      brand: 'YogurtPlus',
      price: 5.99,
      cost: 3.50,
      sku: 'GY-500G-002',
      status: 'active',
      currentStock: 75,
      minStock: 15,
      maxStock: 200,
      unit: 'container',
      expiryDate: dayjs().add(5, 'days').toDate(),
      createdAt: new Date(),
    },
    {
      _id: '3',
      name: 'Cheddar Cheese 250g',
      description: 'Aged cheddar cheese',
      category: 'Cheese',
      brand: 'CheeseWorld',
      price: 8.99,
      cost: 5.50,
      sku: 'CC-250G-003',
      status: 'active',
      currentStock: 45,
      minStock: 10,
      maxStock: 100,
      unit: 'block',
      expiryDate: dayjs().add(30, 'days').toDate(),
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

  const handleCategoryFilter = (value) => {
    setCategoryFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const calculatePriceMetrics = () => {
    const cost = form.getFieldValue('cost') || 0;
    const selling = form.getFieldValue('price') || 0;
    const wholesale = form.getFieldValue('wholesale') || 0;

    let profitMargin = 0;
    let wholesaleMargin = 0;
    let isValid = true;

    if (cost > 0 && selling > 0) {
      profitMargin = ((selling - cost) / cost * 100);
      if (selling <= cost) isValid = false;
    }

    if (cost > 0 && wholesale > 0) {
      wholesaleMargin = ((wholesale - cost) / cost * 100);
      if (wholesale <= cost || wholesale >= selling) isValid = false;
    }

    setPriceMetrics({
      profitMargin: profitMargin.toFixed(2),
      wholesaleMargin: wholesaleMargin.toFixed(2),
      isValid
    });
  };

  const showModal = (product = null) => {
    setEditingProduct(product);
    setModalVisible(true);
    // Reset price metrics
    setPriceMetrics({
      profitMargin: 0,
      wholesaleMargin: 0,
      isValid: false
    });
    if (product) {
      // Handle nested object structure properly for editing
      const priceValue = typeof product.price === 'object' ? product.price.selling : product.price;
      const costValue = typeof product.price === 'object' ? product.price.cost : product.cost;
      const wholesaleValue = typeof product.price === 'object' ? product.price.wholesale : 0;
      
      form.setFieldsValue({
        name: product.name,
        description: product.description,
        category: typeof product.category === 'object' ? product.category._id : product.category,
        brand: product.brand,
        sku: product.sku,
        barcode: product.barcode,
        unit: product.unit,
        price: priceValue,
        cost: costValue,
        wholesale: wholesaleValue,
        igst: product.tax?.igst || 0,
        cgst: product.tax?.cgst || 0,
        sgst: product.tax?.sgst || 0,
        packagingType: product.packaging?.type,
        packagingSize: product.packaging?.size?.value,
        packagingUnit: product.packaging?.size?.unit,
        status: product.status,
        minStockLevel: product.minStockLevel,
        maxStockLevel: product.maxStockLevel,
        isOrganic: product.isOrganic,
        expiryDate: product.expiryDate ? dayjs(product.expiryDate) : null,
      });
    } else {
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
    setPriceMetrics({
      profitMargin: 0,
      wholesaleMargin: 0,
      isValid: false
    });
  };

  const handleSubmit = async (values) => {
    try {
      const productData = {
        name: values.name,
        description: values.description,
        category: values.category,
        brand: values.brand,
        sku: values.sku,
        barcode: values.barcode,
        unit: values.unit,
        price: {
          cost: values.cost,
          selling: values.price,
          wholesale: values.wholesale || 0
        },
        tax: {
          igst: values.igst || 0,
          cgst: values.cgst || 0,
          sgst: values.sgst || 0
        },
        packaging: {
          type: values.packagingType,
          size: {
            value: values.packagingSize,
            unit: values.packagingUnit
          }
        },
        supplier: '507f1f77bcf86cd799439011', // Mock supplier ID for now
        status: values.status || 'active',
        minStockLevel: values.minStockLevel || 10,
        maxStockLevel: values.maxStockLevel || 1000,
        isOrganic: values.isOrganic || false,
        expiryDate: values.expiryDate ? values.expiryDate.toDate() : null,
        createdBy: '507f1f77bcf86cd799439012' // Mock user ID for now
      };

      if (editingProduct) {
        await productsAPI.updateProduct(editingProduct._id, productData);
        message.success('Product updated successfully');
      } else {
        await productsAPI.createProduct(productData);
        message.success('Product created successfully');
      }

      setModalVisible(false);
      setEditingProduct(null);
      form.resetFields();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      message.error(`Failed to save product: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await productsAPI.deleteProduct(id);
      message.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      message.error('Failed to delete product');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      inactive: 'red',
      discontinued: 'orange',
    };
    return colors[status] || 'default';
  };

  const getStockStatus = (current, min) => {
    if (current <= min) return { color: 'red', text: 'Low Stock' };
    if (current <= min * 1.5) return { color: 'orange', text: 'Medium Stock' };
    return { color: 'green', text: 'Good Stock' };
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            SKU: {record.sku}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category, record) => {
        // Handle multiple data formats
        let displayValue = 'N/A';

        // First check if record has categoryDetails (virtual field from backend)
        if (record.categoryDetails) {
          displayValue = record.categoryDetails.displayName || record.categoryDetails.name || 'N/A';
        } else if (category) {
          if (typeof category === 'object' && category !== null) {
            // If it's an object (populated from backend)
            displayValue = category.displayName || category.name || 'N/A';
          } else if (typeof category === 'string') {
            // If it's just an ID string, try to find it in categories array
            const foundCategory = categories.find(c => c._id === category);
            if (foundCategory) {
              displayValue = foundCategory.displayName || foundCategory.name;
            } else {
              // If not found in categories, use a fallback
              displayValue = 'Uncategorized';
            }
          }
        }

        return <Tag color="blue">{displayValue}</Tag>;
      },
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price, record) => {
        // Handle both number and object formats
        const priceValue = typeof price === 'object' ? price?.selling : price;
        const numPrice = typeof priceValue === 'number' ? priceValue : parseFloat(priceValue) || 0;
        
        // Calculate tax
        const igst = record.tax?.igst || 0;
        const cgst = record.tax?.cgst || 0;
        const sgst = record.tax?.sgst || 0;
        const totalTax = igst > 0 ? igst : (cgst + sgst);
        const priceWithTax = numPrice * (1 + totalTax / 100);
        
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>${numPrice.toFixed(2)}</div>
            {totalTax > 0 && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                +{totalTax}% tax = ${priceWithTax.toFixed(2)}
              </div>
            )}
          </div>
        );
      },
      sorter: true,
    },
    {
      title: 'Stock',
      key: 'stock',
      render: (_, record) => {
        const stockStatus = getStockStatus(record.currentStock, record.minStock);
        return (
          <div>
            <div>{record.currentStock} {record.unit}s</div>
            <Tag color={stockStatus.color} size="small">
              {stockStatus.text}
            </Tag>
          </div>
        );
      },
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
      title: 'Expiry',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date) => date ? dayjs(date).format('MMM DD, YYYY') : 'N/A',
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
            title="Are you sure you want to delete this product?"
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

  const statuses = ['active', 'inactive', 'discontinued'];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Products</Title>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={products.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Products"
              value={products.filter(p => p.status === 'active').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={products.filter(p => p.currentStock <= p.minStock).length}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={products.reduce((sum, p) => {
                const priceValue = typeof p.price === 'object' ? p.price?.selling : p.price;
                const numPrice = typeof priceValue === 'number' ? priceValue : parseFloat(priceValue) || 0;
                return sum + (numPrice * (p.currentStock || 0));
              }, 0)}
              precision={2}
              prefix="$"
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
                  placeholder="Search products..."
                  allowClear
                  onSearch={handleSearch}
                  style={{ width: 300 }}
                />
                <Select
                  placeholder="Category"
                  allowClear
                  style={{ width: 150 }}
                  onChange={handleCategoryFilter}
                >
                  {categories.length > 0 && 
                    categories.map(cat => (
                      <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                    ))
                  }
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
              <Space>
                <Button icon={<ExportOutlined />}>Export</Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => showModal()}
                >
                  Add Product
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Products Table */}
        <Table
          columns={columns}
          dataSource={products}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Product Modal */}
      <Modal
        title={editingProduct ? 'Edit Product' : 'Add Product'}
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
                label="Product Name"
                rules={[{ required: true, message: 'Please enter product name' }]}
              >
                <Input placeholder="Enter product name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: true, message: 'Please enter SKU' }]}
              >
                <Input placeholder="Enter SKU" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <TextArea rows={3} placeholder="Enter product description (optional)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  {categories.length > 0 && 
                    categories.map(cat => (
                      <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                    ))
                  }
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="brand"
                label="Brand"
                rules={[{ required: true, message: 'Please enter brand' }]}
              >
                <Input placeholder="Enter brand" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true, message: 'Please enter unit' }]}
              >
                <Input placeholder="e.g., bottle, container" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="price"
                label="Selling Price"
                rules={[
                  { required: true, message: 'Please enter selling price' },
                  { type: 'number', min: 0.01, message: 'Selling price must be greater than 0' },
                  { type: 'number', max: 999999.99, message: 'Selling price cannot exceed ₹999,999.99' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const costPrice = getFieldValue('cost');
                      if (value && costPrice && value <= costPrice) {
                        return Promise.reject(new Error('Selling price should be greater than cost price'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber
                  min={0.01}
                  max={999999.99}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  prefix="₹"
                  onChange={() => {
                    calculatePriceMetrics();
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="cost"
                label="Cost Price"
                rules={[
                  { required: true, message: 'Please enter cost price' },
                  { type: 'number', min: 0.01, message: 'Cost price must be greater than 0' },
                  { type: 'number', max: 999999.99, message: 'Cost price cannot exceed ₹999,999.99' },
                ]}
              >
                <InputNumber
                  min={0.01}
                  max={999999.99}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  prefix="₹"
                  onChange={() => {
                    // Trigger validation for selling price when cost changes
                    form.validateFields(['price']).catch(() => {});
                    calculatePriceMetrics();
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="wholesale"
                label="Wholesale Price"
                rules={[
                  { type: 'number', min: 0.01, message: 'Wholesale price must be greater than 0' },
                  { type: 'number', max: 999999.99, message: 'Wholesale price cannot exceed ₹999,999.99' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve(); // Optional field
                      const costPrice = getFieldValue('cost');
                      const sellingPrice = getFieldValue('price');

                      if (costPrice && value <= costPrice) {
                        return Promise.reject(new Error('Wholesale price should be greater than cost price'));
                      }
                      if (sellingPrice && value >= sellingPrice) {
                        return Promise.reject(new Error('Wholesale price should be less than selling price'));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber
                  min={0.01}
                  max={999999.99}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  prefix="₹"
                  onChange={() => {
                    // Trigger validation for related price fields
                    form.validateFields(['price']).catch(() => {});
                    calculatePriceMetrics();
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
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
          </Row>

          {/* Price Summary */}
          {(priceMetrics.profitMargin > 0 || priceMetrics.wholesaleMargin > 0) && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="Profit Margin"
                        value={priceMetrics.profitMargin}
                        suffix="%"
                        valueStyle={{
                          color: priceMetrics.profitMargin > 0 ? '#52c41a' : '#ff4d4f',
                          fontSize: '16px'
                        }}
                      />
                    </Col>
                    {priceMetrics.wholesaleMargin > 0 && (
                      <Col span={8}>
                        <Statistic
                          title="Wholesale Margin"
                          value={priceMetrics.wholesaleMargin}
                          suffix="%"
                          valueStyle={{
                            color: priceMetrics.wholesaleMargin > 0 ? '#52c41a' : '#ff4d4f',
                            fontSize: '16px'
                          }}
                        />
                      </Col>
                    )}
                    <Col span={8}>
                      <Statistic
                        title="Price Structure"
                        value={priceMetrics.isValid ? "Valid" : "Invalid"}
                        valueStyle={{
                          color: priceMetrics.isValid ? '#52c41a' : '#ff4d4f',
                          fontSize: '16px'
                        }}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          )}

          {/* Tax Information */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="igst"
                label="IGST (%)"
                help="For inter-state sales"
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  onChange={(value) => {
                    if (value > 0) {
                      form.setFieldsValue({ cgst: 0, sgst: 0 });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="cgst"
                label="CGST (%)"
                help="For intra-state sales"
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  onChange={(value) => {
                    if (value > 0) {
                      form.setFieldsValue({ igst: 0, sgst: value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="sgst"
                label="SGST (%)"
                help="For intra-state sales"
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                  onChange={(value) => {
                    if (value > 0) {
                      form.setFieldsValue({ igst: 0, cgst: value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Packaging Information */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="packagingType"
                label="Packaging Type"
                rules={[{ required: true, message: 'Please select packaging type' }]}
              >
                <Select placeholder="Select packaging type">
                  <Option value="bottle">Bottle</Option>
                  <Option value="carton">Carton</Option>
                  <Option value="pouch">Pouch</Option>
                  <Option value="can">Can</Option>
                  <Option value="jar">Jar</Option>
                  <Option value="bag">Bag</Option>
                  <Option value="bulk">Bulk</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="packagingSize"
                label="Package Size"
                rules={[{ required: true, message: 'Please enter package size' }]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="1.00"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="packagingUnit"
                label="Package Unit"
                rules={[{ required: true, message: 'Please select package unit' }]}
              >
                <Select placeholder="Select unit">
                  <Option value="ml">ml</Option>
                  <Option value="l">L</Option>
                  <Option value="g">g</Option>
                  <Option value="kg">kg</Option>
                  <Option value="oz">oz</Option>
                  <Option value="lb">lb</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Stock Information */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="minStockLevel"
                label="Minimum Stock Level"
                rules={[{ required: true, message: 'Please enter minimum stock level' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="10"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxStockLevel"
                label="Maximum Stock Level"
                rules={[{ required: true, message: 'Please enter maximum stock level' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="1000"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="barcode"
                label="Barcode"
              >
                <Input placeholder="Enter barcode (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="expiryDate"
            label="Expiry Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
