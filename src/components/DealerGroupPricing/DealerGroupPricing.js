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
  Divider,
  Tooltip,
  Badge,
  Typography,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  SyncOutlined,
  CopyOutlined,
  PercentageOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { dealerGroupsAPI, productsAPI } from '../../services/api';

const { Option } = Select;
const { Text } = Typography;

const DealerGroupPricing = ({ dealerGroupId, dealerGroupName }) => {
  const [pricing, setPricing] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsWithoutPricing, setProductsWithoutPricing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [stats, setStats] = useState({});
  const [allDealerGroups, setAllDealerGroups] = useState([]);
  const [selectedBulkAction, setSelectedBulkAction] = useState(null);

  useEffect(() => {
    if (dealerGroupId) {
      fetchPricing();
      fetchAllDealerGroups();
    }
  }, [dealerGroupId]);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const response = await dealerGroupsAPI.getDealerGroupPricing(dealerGroupId);
      const data = response.data.data;
      
      setPricing(data.pricing || []);
      setProductsWithoutPricing(data.productsWithoutPricing || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching pricing:', error);
      message.error('Failed to fetch pricing data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDealerGroups = async () => {
    try {
      const response = await dealerGroupsAPI.getDealerGroups({ limit: 100 });
      const groups = response.data.data.dealerGroups || [];
      // Filter out the current group from the list
      const otherGroups = groups.filter(group => group._id !== dealerGroupId);
      setAllDealerGroups(otherGroups);
    } catch (error) {
      console.error('Error fetching dealer groups:', error);
      message.error('Failed to fetch dealer groups for bulk operations');
    }
  };

  const showModal = (pricingItem = null) => {
    setEditingPricing(pricingItem);
    setModalVisible(true);
    
    if (pricingItem) {
      // Editing existing pricing
      form.setFieldsValue({
        product: pricingItem.product._id,
        'pricing.basePrice': pricingItem.pricing.basePrice,
        'pricing.sellingPrice': pricingItem.pricing.sellingPrice,
        'pricing.discountType': pricingItem.pricing.discountType,
        'pricing.discountValue': pricingItem.pricing.discountValue,
        'tax.igst': pricingItem.tax.igst,
        'tax.cgst': pricingItem.tax.cgst,
        'tax.sgst': pricingItem.tax.sgst,
        minOrderQuantity: pricingItem.minOrderQuantity,
        maxOrderQuantity: pricingItem.maxOrderQuantity,
        notes: pricingItem.notes,
      });
    } else {
      // Adding new pricing
      form.resetFields();
      form.setFieldsValue({
        'pricing.discountType': 'percentage',
        minOrderQuantity: 1,
      });
    }
  };

  const handleProductSelect = (productId) => {
    // Find the selected product to auto-populate fields
    const selectedProduct = productsWithoutPricing.find(p => p._id === productId);
    
    if (selectedProduct) {
      // Auto-populate fields with product data
      const updates = {
        'pricing.discountType': 'percentage',
        minOrderQuantity: 1,
      };

      // Auto-populate base price from product cost price
      if (selectedProduct.price?.cost) {
        updates['pricing.basePrice'] = selectedProduct.price.cost;
      }

      // Auto-populate selling price from product selling price
      if (selectedProduct.price?.selling) {
        updates['pricing.sellingPrice'] = selectedProduct.price.selling;
      } else if (selectedProduct.price?.mrp) {
        updates['pricing.sellingPrice'] = selectedProduct.price.mrp;
      }

      // Auto-populate tax rates from product
      if (selectedProduct.tax) {
        if (selectedProduct.tax.igst) {
          updates['tax.igst'] = selectedProduct.tax.igst;
          updates['tax.cgst'] = 0;
          updates['tax.sgst'] = 0;
        } else {
          updates['tax.igst'] = 0;
          updates['tax.cgst'] = selectedProduct.tax.cgst || selectedProduct.tax.gst || 0;
          updates['tax.sgst'] = selectedProduct.tax.sgst || selectedProduct.tax.gst || 0;
        }
      }

      // Auto-populate minimum order quantity (default to 1 if not available)
      updates.minOrderQuantity = selectedProduct.packaging?.minOrderQty || 1;

      // Auto-populate maximum order quantity if available
      if (selectedProduct.packaging?.maxOrderQty) {
        updates.maxOrderQuantity = selectedProduct.packaging.maxOrderQty;
      }

      form.setFieldsValue(updates);
      message.success('Product data auto-populated successfully');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingPricing(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      const pricingData = {
        product: values.product,
        pricing: {
          basePrice: values['pricing.basePrice'],
          sellingPrice: values['pricing.sellingPrice'],
          discountType: values['pricing.discountType'],
          discountValue: values['pricing.discountValue'] || 0,
        },
        tax: {
          igst: values['tax.igst'] || 0,
          cgst: values['tax.cgst'] || 0,
          sgst: values['tax.sgst'] || 0,
        },
        minOrderQuantity: values.minOrderQuantity || 1,
        maxOrderQuantity: values.maxOrderQuantity,
        notes: values.notes,
      };

      if (editingPricing) {
        await dealerGroupsAPI.updateDealerGroupPricing(
          dealerGroupId, 
          editingPricing._id, 
          pricingData
        );
        message.success('Pricing updated successfully');
      } else {
        await dealerGroupsAPI.setDealerGroupPricing(dealerGroupId, pricingData);
        message.success('Pricing added successfully');
      }

      setModalVisible(false);
      setEditingPricing(null);
      form.resetFields();
      fetchPricing();
    } catch (error) {
      console.error('Error saving pricing:', error);
      message.error(`Failed to save pricing: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (pricingId) => {
    try {
      await dealerGroupsAPI.deleteDealerGroupPricing(dealerGroupId, pricingId);
      message.success('Pricing deleted successfully');
      fetchPricing();
    } catch (error) {
      console.error('Error deleting pricing:', error);
      message.error('Failed to delete pricing');
    }
  };

  const handleBulkAction = async (values) => {
    try {
      const response = await dealerGroupsAPI.bulkUpdatePricing(dealerGroupId, {
        action: values.action,
        data: values.data
      });
      
      const result = response.data.data;
      let successMessage = 'Bulk action completed successfully';
      
      // Provide specific feedback based on action type
      switch (values.action) {
        case 'update_discount':
          successMessage = `Discount updated for ${result.updated || 0} products`;
          break;
        case 'update_tax':
          successMessage = `Tax rates updated for ${result.updated || 0} products`;
          break;
        case 'copy_from_group':
          successMessage = `Pricing copied for ${result.copied || 0} products`;
          break;
        case 'sync_with_products':
          successMessage = `Pricing synced for ${result.synced || 0} products`;
          break;
      }
      
      message.success(successMessage);
      setBulkModalVisible(false);
      bulkForm.resetFields();
      setSelectedBulkAction(null);
      fetchPricing();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      const errorMessage = error.response?.data?.message || 'Failed to perform bulk action';
      message.error(errorMessage);
    }
  };

  const calculateFinalPrice = (sellingPrice, discountType, discountValue) => {
    if (!sellingPrice || !discountValue) return sellingPrice || 0;
    
    if (discountType === 'percentage') {
      return sellingPrice - (sellingPrice * discountValue / 100);
    } else {
      return sellingPrice - discountValue;
    }
  };

  const calculatePriceWithTax = (finalPrice, tax) => {
    const totalTax = tax.igst > 0 ? tax.igst : (tax.cgst + tax.sgst);
    return finalPrice * (1 + totalTax / 100);
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.product.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            SKU: {record.product.sku} | Brand: {record.product.brand}
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: 'Base Price',
      dataIndex: ['pricing', 'basePrice'],
      key: 'basePrice',
      render: (price) => `₹${price?.toFixed(2)}`,
      width: 100,
    },
    {
      title: 'Selling Price',
      dataIndex: ['pricing', 'sellingPrice'],
      key: 'sellingPrice',
      render: (price) => `₹${price?.toFixed(2)}`,
      width: 110,
    },
    {
      title: 'Discount',
      key: 'discount',
      render: (_, record) => {
        const { discountType, discountValue } = record.pricing;
        if (discountValue > 0) {
          return (
            <Tag color="orange" icon={<PercentageOutlined />}>
              {discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`}
            </Tag>
          );
        }
        return <Tag color="default">No Discount</Tag>;
      },
      width: 120,
    },
    {
      title: 'Final Price',
      dataIndex: ['pricing', 'finalPrice'],
      key: 'finalPrice',
      render: (price, record) => {
        const margin = price - record.pricing.basePrice;
        const marginPercent = record.pricing.basePrice > 0 ? 
          ((margin / record.pricing.basePrice) * 100).toFixed(1) : 0;
        
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>₹{price?.toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: margin >= 0 ? '#52c41a' : '#f5222d' }}>
              Margin: ₹{margin?.toFixed(2)} ({marginPercent}%)
            </div>
          </div>
        );
      },
      width: 120,
    },
    {
      title: 'Tax',
      key: 'tax',
      render: (_, record) => {
        const { igst, cgst, sgst, totalTax } = record.tax;
        return (
          <div>
            {igst > 0 ? (
              <Tag color="blue">IGST: {igst}%</Tag>
            ) : (
              <>
                {cgst > 0 && <Tag color="green" size="small">CGST: {cgst}%</Tag>}
                {sgst > 0 && <Tag color="green" size="small">SGST: {sgst}%</Tag>}
              </>
            )}
            <div style={{ fontSize: '11px', marginTop: 2 }}>
              Total: {totalTax}%
            </div>
          </div>
        );
      },
      width: 150,
    },
    {
      title: 'Price with Tax',
      dataIndex: ['tax', 'priceWithTax'],
      key: 'priceWithTax',
      render: (price) => (
        <Text strong style={{ color: '#1890ff' }}>
          ₹{price?.toFixed(2)}
        </Text>
      ),
      width: 120,
    },
    {
      title: 'MOQ',
      dataIndex: 'minOrderQuantity',
      key: 'minOrderQuantity',
      width: 60,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Badge 
          status={record.isActive ? 'success' : 'error'} 
          text={record.isActive ? 'Active' : 'Inactive'}
        />
      ),
      width: 80,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Pricing">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => showModal(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this pricing?"
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
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0 }}>Product Pricing - {dealerGroupName}</h3>
        <p style={{ margin: '4px 0 0 0', color: '#666' }}>
          Manage product-specific pricing, discounts, and tax rates for this dealer group
        </p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={stats.totalProducts || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="With Pricing"
              value={stats.productsWithPricing || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Without Pricing"
              value={stats.productsWithoutPricing || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Coverage"
              value={stats.totalProducts > 0 ? 
                ((stats.productsWithPricing / stats.totalProducts) * 100).toFixed(1) : 0
              }
              valueStyle={{ color: '#722ed1' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* Alert for products without pricing */}
      {stats.productsWithoutPricing > 0 && (
        <Alert
          message={`${stats.productsWithoutPricing} products don't have pricing configured`}
          description="Consider adding pricing for all products to ensure complete coverage."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        {/* Action Bar */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              Add Product Pricing
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={() => setBulkModalVisible(true)}
            >
              Bulk Actions
            </Button>
          </Space>
        </div>

        {/* Pricing Table */}
        <Table
          columns={columns}
          dataSource={pricing}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Add/Edit Pricing Modal */}
      <Modal
        title={editingPricing ? 'Edit Product Pricing' : 'Add Product Pricing'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="product"
            label="Product"
            rules={[{ required: true, message: 'Please select a product' }]}
            help={!editingPricing ? "Select a product to auto-populate pricing and tax fields" : undefined}
          >
            <Select
              placeholder="Select product"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              disabled={editingPricing} // Can't change product when editing
              onChange={editingPricing ? undefined : handleProductSelect} // Only auto-populate when adding new
            >
              {(editingPricing ? [editingPricing.product] : productsWithoutPricing).map(product => (
                <Option key={product._id} value={product._id}>
                  {product.name} - {product.sku}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider>Pricing Information</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pricing.basePrice"
                label="Base Price (Cost)"
                rules={[{ required: true, message: 'Please enter base price' }]}
                help={!editingPricing ? "Auto-populated from product cost price" : undefined}
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
                name="pricing.sellingPrice"
                label="Selling Price"
                rules={[{ required: true, message: 'Please enter selling price' }]}
                help={!editingPricing ? "Auto-populated from product selling price" : undefined}
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
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pricing.discountType"
                label="Discount Type"
              >
                <Select placeholder="Select discount type">
                  <Option value="percentage">Percentage (%)</Option>
                  <Option value="fixed">Fixed Amount (₹)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pricing.discountValue"
                label="Discount Value"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Tax Information</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="tax.igst"
                label="IGST (%)"
                help={!editingPricing ? "Auto-populated from product tax rates" : "For inter-state sales"}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  onChange={(value) => {
                    if (value > 0) {
                      form.setFieldsValue({ 'tax.cgst': 0, 'tax.sgst': 0 });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tax.cgst"
                label="CGST (%)"
                help={!editingPricing ? "Auto-populated from product tax rates" : "For intra-state sales"}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  onChange={(value) => {
                    if (value > 0) {
                      form.setFieldsValue({ 'tax.igst': 0, 'tax.sgst': value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="tax.sgst"
                label="SGST (%)"
                help={!editingPricing ? "Auto-populated from product tax rates" : "For intra-state sales"}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  precision={2}
                  onChange={(value) => {
                    if (value > 0) {
                      form.setFieldsValue({ 'tax.igst': 0, 'tax.cgst': value });
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Order Settings</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minOrderQuantity"
                label="Minimum Order Quantity"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1"
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxOrderQuantity"
                label="Maximum Order Quantity"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Unlimited"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Add any notes about this pricing"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingPricing ? 'Update' : 'Add'} Pricing
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal
        title="Bulk Pricing Actions"
        open={bulkModalVisible}
        onCancel={() => {
          setBulkModalVisible(false);
          bulkForm.resetFields();
          setSelectedBulkAction(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkAction}
        >
          <Form.Item
            name="action"
            label="Action"
            rules={[{ required: true, message: 'Please select an action' }]}
          >
            <Select 
              placeholder="Select bulk action"
              onChange={(value) => setSelectedBulkAction(value)}
            >
              <Option value="update_discount">Update Discount for All Products</Option>
              <Option value="update_tax">Update Tax Rates for All Products</Option>
              <Option value="sync_with_products">Sync with Product Base Prices</Option>
              <Option value="copy_from_group">Copy from Another Group</Option>
            </Select>
          </Form.Item>

          <Form.Item
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.action !== currentValues.action
            }
          >
            {({ getFieldValue }) => {
              const action = getFieldValue('action');
              
              if (action === 'update_discount') {
                return (
                  <>
                    <Form.Item 
                      name={['data', 'discountType']} 
                      label="Discount Type"
                      rules={[{ required: true, message: 'Please select discount type' }]}
                    >
                      <Select placeholder="Select discount type">
                        <Option value="percentage">Percentage (%)</Option>
                        <Option value="fixed">Fixed Amount (₹)</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item 
                      name={['data', 'discountValue']} 
                      label="Discount Value"
                      rules={[
                        { required: true, message: 'Please enter discount value' },
                        { type: 'number', min: 0, message: 'Discount value must be positive' }
                      ]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        placeholder="0"
                        min={0} 
                        step={0.01}
                        precision={2}
                      />
                    </Form.Item>
                  </>
                );
              }
              
              if (action === 'update_tax') {
                return (
                  <>
                    <Alert
                      message="Tax Rate Update"
                      description="Use either IGST (for inter-state) OR CGST+SGST (for intra-state). Don't use both."
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item 
                          name={['data', 'igst']} 
                          label="IGST (%)"
                          help="For inter-state sales"
                        >
                          <InputNumber 
                            style={{ width: '100%' }} 
                            placeholder="0"
                            min={0} 
                            max={100}
                            step={0.01}
                            precision={2}
                            onChange={(value) => {
                              if (value > 0) {
                                bulkForm.setFieldsValue({ 
                                  'data.cgst': 0, 
                                  'data.sgst': 0 
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item 
                          name={['data', 'cgst']} 
                          label="CGST (%)"
                          help="For intra-state sales"
                        >
                          <InputNumber 
                            style={{ width: '100%' }} 
                            placeholder="0"
                            min={0} 
                            max={100}
                            step={0.01}
                            precision={2}
                            onChange={(value) => {
                              if (value > 0) {
                                bulkForm.setFieldsValue({ 
                                  'data.igst': 0,
                                  'data.sgst': value 
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item 
                          name={['data', 'sgst']} 
                          label="SGST (%)"
                          help="For intra-state sales"
                        >
                          <InputNumber 
                            style={{ width: '100%' }} 
                            placeholder="0"
                            min={0} 
                            max={100}
                            step={0.01}
                            precision={2}
                            onChange={(value) => {
                              if (value > 0) {
                                bulkForm.setFieldsValue({ 
                                  'data.igst': 0,
                                  'data.cgst': value 
                                });
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }
              
              if (action === 'copy_from_group') {
                return (
                  <>
                    <Alert
                      message="Copy Pricing from Another Group"
                      description="This will copy all pricing settings from the selected group to the current group. Existing pricing will be overwritten."
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Form.Item 
                      name={['data', 'sourceGroupId']} 
                      label="Source Dealer Group"
                      rules={[{ required: true, message: 'Please select a source group' }]}
                    >
                      <Select placeholder="Select source group" showSearch>
                        {allDealerGroups.map(group => (
                          <Option key={group._id} value={group._id}>
                            {group.name} ({group.code})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </>
                );
              }

              if (action === 'sync_with_products') {
                return (
                  <Alert
                    message="Sync with Product Base Prices"
                    description="This will update all pricing in this group to match the base prices and tax rates from the product catalog. Any custom pricing will be overwritten."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                );
              }
              
              return null;
            }}
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setBulkModalVisible(false);
                bulkForm.resetFields();
                setSelectedBulkAction(null);
              }}>Cancel</Button>
              <Popconfirm
                title="Are you sure you want to execute this bulk action?"
                description="This action will affect multiple products and cannot be undone easily."
                onConfirm={() => bulkForm.submit()}
                okText="Yes, Execute"
                cancelText="Cancel"
                disabled={!selectedBulkAction}
              >
                <Button 
                  type="primary" 
                  htmlType="submit"
                  disabled={!selectedBulkAction}
                >
                  Execute Action
                </Button>
              </Popconfirm>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DealerGroupPricing;