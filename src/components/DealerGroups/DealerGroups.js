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
  ColorPicker,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  DollarOutlined,
  EyeOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { dealerGroupsAPI } from '../../services/api';
import DealerGroupPricing from '../DealerGroupPricing/DealerGroupPricing';

const { TextArea } = Input;
const { Text } = Typography;

const DealerGroups = () => {
  const [dealerGroups, setDealerGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroupForPricing, setSelectedGroupForPricing] = useState(null);
  const [selectedGroupForBalance, setSelectedGroupForBalance] = useState(null);
  const [form] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [stats, setStats] = useState({});
  const [groupPricingSummary, setGroupPricingSummary] = useState({});
  const [pricingSummary, setPricingSummary] = useState({});

  useEffect(() => {
    fetchDealerGroups();
    fetchStats();
  }, []);

  useEffect(() => {
    if (dealerGroups.length > 0) {
      fetchPricingSummary();
    }
  }, [dealerGroups]);

  const fetchDealerGroups = async () => {
    setLoading(true);
    try {
      const response = await dealerGroupsAPI.getDealerGroups({ limit: 100 });
      setDealerGroups(response.data.data.dealerGroups || []);
    } catch (error) {
      console.error('Error fetching dealer groups:', error);
      message.error('Failed to fetch dealer groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await dealerGroupsAPI.getDealerGroupStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const showModal = (group = null) => {
    setEditingGroup(group);
    setModalVisible(true);
    if (group) {
      form.setFieldsValue({
        name: group.name,
        code: group.code,
        description: group.description,
        discountPercentage: group.discountPercentage,
        creditLimit: group.creditLimit,
        creditDays: group.creditDays,
        commissionPercentage: group.commissionPercentage,
        color: group.color,
      });
    } else {
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingGroup(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      // Process color value if it exists
      const processedValues = { ...values };
      if (values.color) {
        if (typeof values.color === 'string') {
          // Handle string values (could be hex, rgb, etc.)
          if (values.color.startsWith('rgb(')) {
            // Convert rgb(r,g,b) to hex
            const rgbMatch = values.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);
              processedValues.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
          } else if (values.color.startsWith('#')) {
            // Already hex, keep as is
            processedValues.color = values.color;
          }
        } else if (typeof values.color === 'object') {
          // Handle object values
          if (values.color.metaColor) {
            const { r, g, b } = values.color.metaColor;
            processedValues.color = `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
          } else if (values.color.toHexString) {
            processedValues.color = values.color.toHexString();
          } else if (values.color.hex) {
            processedValues.color = values.color.hex;
          }
        }
      }

      if (editingGroup) {
        await dealerGroupsAPI.updateDealerGroup(editingGroup._id, processedValues);
        message.success('Dealer group updated successfully');
      } else {
        await dealerGroupsAPI.createDealerGroup(processedValues);
        message.success('Dealer group created successfully');
      }

      setModalVisible(false);
      setEditingGroup(null);
      form.resetFields();
      fetchDealerGroups();
      fetchStats();
    } catch (error) {
      console.error('Error saving dealer group:', error);
      message.error(`Failed to save dealer group: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await dealerGroupsAPI.deleteDealerGroup(id);
      message.success('Dealer group deactivated successfully');
      fetchDealerGroups();
      fetchStats();
    } catch (error) {
      console.error('Error deleting dealer group:', error);
      message.error(error.response?.data?.message || 'Failed to delete dealer group');
    }
  };

  const showPricingModal = (group) => {
    setSelectedGroupForPricing(group);
    setPricingModalVisible(true);
  };

  const showBalanceModal = (group) => {
    setSelectedGroupForBalance(group);
    setBalanceModalVisible(true);
    balanceForm.setFieldsValue({
      balanceType: 'credit',
      amount: 0,
      description: ''
    });
  };

  const handleBalanceUpdate = async (values) => {
    try {
      // This would typically update dealer group's opening balance
      console.log('Updating balance for group:', selectedGroupForBalance._id, values);
      message.success('Balance updated successfully');
      setBalanceModalVisible(false);
      setSelectedGroupForBalance(null);
      balanceForm.resetFields();
      fetchDealerGroups();
    } catch (error) {
      console.error('Error updating balance:', error);
      message.error('Failed to update balance');
    }
  };

  const fetchPricingSummary = async () => {
    try {
      const summaryPromises = dealerGroups.map(async (group) => {
        try {
          const response = await dealerGroupsAPI.getDealerGroupPricing(group._id);
          const pricing = response.data.data.pricing || [];
          
          if (pricing.length === 0) {
            return { [group._id]: { totalProducts: 0, avgFinalPrice: 0, priceRange: '₹0' } };
          }
          
          const finalPrices = pricing.map(p => p.pricing.finalPrice).filter(price => price > 0);
          const avgPrice = finalPrices.length > 0 ? finalPrices.reduce((sum, price) => sum + price, 0) / finalPrices.length : 0;
          const minPrice = finalPrices.length > 0 ? Math.min(...finalPrices) : 0;
          const maxPrice = finalPrices.length > 0 ? Math.max(...finalPrices) : 0;
          
          return {
            [group._id]: {
              totalProducts: pricing.length,
              avgFinalPrice: avgPrice,
              priceRange: finalPrices.length > 0 ? `₹${minPrice.toFixed(0)} - ₹${maxPrice.toFixed(0)}` : '₹0'
            }
          };
        } catch (error) {
          return { [group._id]: { totalProducts: 0, avgFinalPrice: 0, priceRange: '₹0' } };
        }
      });
      
      const summaryResults = await Promise.all(summaryPromises);
      const summary = summaryResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      setPricingSummary(summary);
    } catch (error) {
      console.error('Error fetching pricing summary:', error);
    }
  };

  const columns = [
    {
      title: 'Group',
      key: 'group',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: record.color || '#1890ff',
            }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Code: {record.code}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Discount',
      dataIndex: 'discountPercentage',
      key: 'discountPercentage',
      render: (value) => `${value || 0}%`,
      width: 100,
    },
    {
      title: 'Credit Limit',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      render: (value) => `₹${(value || 0).toLocaleString()}`,
      width: 120,
    },
    {
      title: 'Credit Days',
      dataIndex: 'creditDays',
      key: 'creditDays',
      render: (value) => `${value || 0} days`,
      width: 100,
    },
    {
      title: 'Commission',
      dataIndex: 'commissionPercentage',
      key: 'commissionPercentage',
      render: (value) => `${value || 0}%`,
      width: 100,
    },
    {
      title: 'Dealers',
      dataIndex: 'dealerCount',
      key: 'dealerCount',
      render: (count) => (
        <Tag color="blue" icon={<TeamOutlined />}>
          {count || 0}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Final Price Range',
      key: 'finalPriceRange',
      render: (_, record) => {
        const summary = pricingSummary[record._id];
        if (!summary || summary.totalProducts === 0) {
          return <Text type="secondary">No pricing set</Text>;
        }
        return (
          <div>
            <Text strong>{summary.priceRange}</Text>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {summary.totalProducts} products
            </div>
          </div>
        );
      },
      width: 140,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<CreditCardOutlined />}
            onClick={() => showBalanceModal(record)}
            size="small"
            title="Update Balance"
          />
          <Button
            type="text"
            icon={<ShoppingOutlined />}
            onClick={() => showPricingModal(record)}
            size="small"
            title="Manage Product Pricing"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
            title="Edit Group"
          />
          <Popconfirm
            title="Are you sure you want to deactivate this dealer group?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
              title="Delete Group"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Groups"
              value={stats.summary?.totalGroups || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Groups"
              value={stats.summary?.activeGroups || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inactive Groups"
              value={stats.summary?.inactiveGroups || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Dealers"
              value={stats.topGroups?.reduce((sum, group) => sum + (group.dealerCount || 0), 0) || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Dealer Groups</h3>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Manage dealer groups with credit terms and commission settings
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Add Dealer Group
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={dealerGroups}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* Dealer Group Modal */}
      <Modal
        title={editingGroup ? 'Edit Dealer Group' : 'Add Dealer Group'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={700}
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
                label="Group Name"
                rules={[
                  { required: true, message: 'Please enter group name' },
                  { min: 1, max: 100, message: 'Name must be between 1 and 100 characters' },
                ]}
              >
                <Input placeholder="e.g., Premium Dealers" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Group Code"
                rules={[
                  { max: 20, message: 'Code cannot be more than 20 characters' },
                  { pattern: /^[A-Z0-9]*$/, message: 'Only uppercase letters and numbers allowed' },
                ]}
                help="Optional - will be auto-generated if not provided"
              >
                <Input placeholder="e.g., PREM001" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 500, message: 'Description must be less than 500 characters' },
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="Brief description of this dealer group"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="discountPercentage"
                label="Discount Percentage"
                rules={[
                  { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  suffix="%"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="creditLimit"
                label="Credit Limit"
                rules={[
                  { type: 'number', min: 0, message: 'Must be a positive number' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  prefix="₹"
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/₹\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="creditDays"
                label="Credit Days"
                rules={[
                  { type: 'number', min: 0, message: 'Must be a positive number' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  suffix="days"
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="commissionPercentage"
                label="Commission Percentage"
                rules={[
                  { type: 'number', min: 0, max: 100, message: 'Must be between 0 and 100' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0"
                  suffix="%"
                  min={0}
                  max={100}
                  step={0.1}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Group Color"
                help="Used for visual identification"
              >
                <ColorPicker 
                  defaultValue="#1890ff"
                  format="hex"
                  showText
                  onChange={(color, hex) => {
                    // Ensure we always get a hex value
                    let hexValue = hex;
                    if (!hexValue || !hexValue.startsWith('#')) {
                      // If hex is not provided, convert from color object
                      if (color && color.toHexString) {
                        hexValue = color.toHexString();
                      } else if (typeof color === 'string' && color.startsWith('rgb(')) {
                        // Convert RGB string to hex
                        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                        if (rgbMatch) {
                          const r = parseInt(rgbMatch[1]);
                          const g = parseInt(rgbMatch[2]);
                          const b = parseInt(rgbMatch[3]);
                          hexValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        }
                      }
                    }
                    form.setFieldValue('color', hexValue);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Pricing Management Modal */}
      <Modal
        title={`Product Pricing - ${selectedGroupForPricing?.name}`}
        open={pricingModalVisible}
        onCancel={() => setPricingModalVisible(false)}
        footer={null}
        width={1400}
        destroyOnClose
      >
        {selectedGroupForPricing && (
          <DealerGroupPricing
            dealerGroupId={selectedGroupForPricing._id}
            dealerGroupName={selectedGroupForPricing.name}
          />
        )}
      </Modal>

      {/* Balance Update Modal */}
      <Modal
        title={`Update Balance - ${selectedGroupForBalance?.name}`}
        open={balanceModalVisible}
        onCancel={() => {
          setBalanceModalVisible(false);
          setSelectedGroupForBalance(null);
          balanceForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={handleBalanceUpdate}
        >
          <Form.Item
            name="balanceType"
            label="Balance Type"
            rules={[{ required: true, message: 'Please select balance type' }]}
          >
            <Select placeholder="Select balance type">
              <Select.Option value="credit">Credit (Money Owed to Group)</Select.Option>
              <Select.Option value="debit">Debit (Money Group Owes)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 0, message: 'Amount must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              prefix="₹"
              min={0}
              step={0.01}
              precision={2}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Reason for balance update..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setBalanceModalVisible(false);
                setSelectedGroupForBalance(null);
                balanceForm.resetFields();
              }}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Update Balance
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DealerGroups;