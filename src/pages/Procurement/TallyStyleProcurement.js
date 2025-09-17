import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Table,
  InputNumber,
  DatePicker,
  Space,
  Typography,
  Divider,
  message,
  AutoComplete,
  Tabs,
  Descriptions,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  PrinterOutlined,
  CalculatorOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import procurementAPI from '../../services/procurementAPI';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TallyStyleProcurement = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ key: 1 }]);
  const [calculations, setCalculations] = useState({
    grossAmount: 0,
    discountAmount: 0,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTaxAmount: 0,
    additionalCharges: 0,
    roundOff: 0,
    netAmount: 0,
  });
  const [taxRates, setTaxRates] = useState({
    cgst: 9,
    sgst: 9,
    igst: 18,
  });
  const [isInterState, setIsInterState] = useState(false);

  useEffect(() => {
    // Add authentication check
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    
    console.log('Auth check - Token:', token ? 'Present' : 'Missing');
    console.log('Auth check - Tenant:', tenantId);
    console.log('Auth context user:', user);
    
    if (!token || !tenantId) {
      console.warn('Missing authentication credentials');
      message.warning('Please ensure you are logged in to load data.');
      // Still try to load data in case user is logged in via context
    }
    
    loadSuppliers();
    loadProducts();
  }, [user]);

  useEffect(() => {
    calculateTotals();
  }, [items, taxRates, isInterState]);

  const loadSuppliers = async () => {
    try {
      console.log('Loading suppliers...');
      const response = await api.get('/suppliers');
      console.log('Suppliers response:', response.data);
      
      // Handle different response formats
      let supplierData = [];
      if (response.data.success && response.data.data) {
        supplierData = response.data.data.suppliers || response.data.data;
      } else {
        supplierData = response.data.suppliers || response.data;
      }
      
      const validSuppliers = Array.isArray(supplierData) ? supplierData : [];
      console.log('Processed suppliers:', validSuppliers.length);
      setSuppliers(validSuppliers);
    } catch (error) {
      console.error('Load suppliers error:', error);
      setSuppliers([]);
      if (error.response?.status === 401) {
        message.error('Please login to access suppliers');
      } else {
        message.error(`Failed to load suppliers: ${error.message}`);
      }
    }
  };

  const loadProducts = async () => {
    try {
      console.log('Loading products...');
      const response = await api.get('/products');
      console.log('Products response:', response.data);
      
      // Handle different response formats
      let productData = [];
      if (response.data.success && response.data.data) {
        productData = response.data.data.products || response.data.data;
      } else {
        productData = response.data.products || response.data;
      }
      
      const validProducts = Array.isArray(productData) ? productData : [];
      console.log('Processed products:', validProducts.length);
      setProducts(validProducts);
    } catch (error) {
      console.error('Load products error:', error);
      setProducts([]);
      if (error.response?.status === 401) {
        message.error('Please login to access products');
      } else {
        message.error(`Failed to load products: ${error.message}`);
      }
    }
  };

  const calculateTotals = () => {
    let grossAmount = 0;
    
    items.forEach(item => {
      if (item.quantity && item.rate) {
        grossAmount += item.quantity * item.rate;
      }
    });

    const discountAmount = form.getFieldValue('discountAmount') || 0;
    const taxableAmount = grossAmount - discountAmount;
    
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    if (isInterState) {
      // Inter-state: IGST only
      igstAmount = (taxableAmount * taxRates.igst) / 100;
    } else {
      // Intra-state: CGST + SGST
      cgstAmount = (taxableAmount * taxRates.cgst) / 100;
      sgstAmount = (taxableAmount * taxRates.sgst) / 100;
    }
    
    const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
    const additionalCharges = form.getFieldValue('additionalCharges') || 0;
    const beforeRoundOff = taxableAmount + totalTaxAmount + additionalCharges;
    const netAmount = Math.round(beforeRoundOff);
    const roundOff = netAmount - beforeRoundOff;
    
    setCalculations({
      grossAmount,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTaxAmount,
      additionalCharges,
      roundOff,
      netAmount,
    });
  };

  const addItem = () => {
    const newKey = Math.max(...items.map(item => item.key || 0)) + 1;
    setItems([...items, { key: newKey }]);
  };

  const removeItem = (key) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.key !== key));
    }
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const procurementData = {
        supplier: values.supplier,
        series: values.series || 'PO',
        referenceNumber: values.referenceNumber,
        procurementType: values.procurementType || 'purchase-order',
        priority: values.priority || 'normal',
        
        items: items
          .filter(item => item.product && item.quantity && item.rate)
          .map(item => ({
            product: item.product,
            quantity: item.quantity,
            unitPrice: item.rate,
            discount: item.discount || 0,
          })),
        
        accounting: {
          grossAmount: calculations.grossAmount,
          discountAmount: calculations.discountAmount,
          taxableAmount: calculations.taxableAmount,
          taxes: {
            cgst: {
              rate: isInterState ? 0 : taxRates.cgst,
              amount: calculations.cgstAmount,
            },
            sgst: {
              rate: isInterState ? 0 : taxRates.sgst,
              amount: calculations.sgstAmount,
            },
            igst: {
              rate: isInterState ? taxRates.igst : 0,
              amount: calculations.igstAmount,
            },
          },
          totalTaxAmount: calculations.totalTaxAmount,
          additionalCharges: values.additionalCharges ? [{
            name: 'Additional Charges',
            amount: values.additionalCharges,
          }] : [],
          roundOff: calculations.roundOff,
          netAmount: calculations.netAmount,
        },
        
        delivery: {
          expectedDate: values.expectedDate?.toISOString(),
          warehouse: values.warehouse,
        },
        
        payment: {
          terms: values.paymentTerms || 'net-30',
          method: values.paymentMethod || 'bank-transfer',
        },
        
        notes: values.notes,
      };

      await procurementAPI.create(procurementData);
      message.success('Procurement voucher created successfully!');
      form.resetFields();
      setItems([{ key: 1 }]);
      setCalculations({
        grossAmount: 0,
        discountAmount: 0,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTaxAmount: 0,
        additionalCharges: 0,
        roundOff: 0,
        netAmount: 0,
      });
    } catch (error) {
      message.error('Failed to create procurement voucher');
      console.error('Create procurement error:', error);
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    {
      title: 'S.No',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Product',
      dataIndex: 'product',
      width: 200,
      render: (value, record) => (
        <AutoComplete
          placeholder="Select Product"
          value={value}
          options={products.map(product => ({
            value: product._id,
            label: product.name,
          }))}
          onChange={(val) => updateItem(record.key, 'product', val)}
          filterOption={(inputValue, option) =>
            option.label.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
          }
        />
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      width: 100,
      render: (value, record) => (
        <InputNumber
          placeholder="Qty"
          value={value}
          onChange={(val) => updateItem(record.key, 'quantity', val)}
          min={0}
          precision={2}
        />
      ),
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      width: 100,
      render: (value, record) => (
        <InputNumber
          placeholder="Rate"
          value={value}
          onChange={(val) => updateItem(record.key, 'rate', val)}
          min={0}
          precision={2}
          formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/₹\s?|(,*)/g, '')}
        />
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 120,
      render: (_, record) => {
        const amount = (record.quantity || 0) * (record.rate || 0);
        return (
          <Text strong style={{ color: '#1890ff' }}>
            ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        );
      },
    },
    {
      title: 'Action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
          disabled={items.length === 1}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              <FileTextOutlined /> Procurement Voucher (Tally Style)
            </Title>
          </Col>
          <Col>
            <Space>
              <Tag color="blue">Series: PO</Tag>
              <Tag color="green">FY: 2024-25</Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={calculateTotals}
      >
        <Row gutter={16}>
          <Col span={16}>
            <Card title="Voucher Details" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="series" label="Series" initialValue="PO">
                    <Select>
                      <Option value="PO">Purchase Order (PO)</Option>
                      <Option value="WO">Work Order (WO)</Option>
                      <Option value="SO">Service Order (SO)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="expectedDate" label="Expected Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="referenceNumber" label="Reference No.">
                    <Input placeholder="External reference" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item 
                    name="supplier" 
                    label="Supplier" 
                    rules={[{ required: true, message: 'Please select supplier' }]}
                  >
                    <Select
                      placeholder="Select Supplier"
                      showSearch
                      optionFilterProp="children"
                    >
                      {suppliers.map(supplier => (
                        <Option key={supplier._id} value={supplier._id}>
                          {supplier.companyInfo?.name || supplier.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="priority" label="Priority" initialValue="normal">
                    <Select>
                      <Option value="low">Low</Option>
                      <Option value="normal">Normal</Option>
                      <Option value="high">High</Option>
                      <Option value="urgent">Urgent</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Inter-State">
                    <Select
                      value={isInterState}
                      onChange={setIsInterState}
                    >
                      <Option value={false}>No (CGST+SGST)</Option>
                      <Option value={true}>Yes (IGST)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Item Details" style={{ marginBottom: 16 }}>
              <Table
                dataSource={items}
                columns={itemColumns}
                pagination={false}
                size="small"
                rowKey="key"
                footer={() => (
                  <Button
                    type="dashed"
                    onClick={addItem}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Item
                  </Button>
                )}
              />
            </Card>
          </Col>

          <Col span={8}>
            <Card title="Calculation Summary" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Gross Amount">
                  <Text strong style={{ color: '#1890ff' }}>
                    ₹ {calculations.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Less: Discount">
                  <Form.Item name="discountAmount" style={{ margin: 0 }}>
                    <InputNumber
                      placeholder="0.00"
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₹\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Descriptions.Item>
                
                <Descriptions.Item label="Taxable Amount">
                  <Text strong style={{ color: '#52c41a' }}>
                    ₹ {calculations.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Descriptions.Item>
                
                {!isInterState && (
                  <>
                    <Descriptions.Item label={`CGST @ ${taxRates.cgst}%`}>
                      <Text>₹ {calculations.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={`SGST @ ${taxRates.sgst}%`}>
                      <Text>₹ {calculations.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    </Descriptions.Item>
                  </>
                )}
                
                {isInterState && (
                  <Descriptions.Item label={`IGST @ ${taxRates.igst}%`}>
                    <Text>₹ {calculations.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label="Total Tax">
                  <Text strong style={{ color: '#fa8c16' }}>
                    ₹ {calculations.totalTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Additional Charges">
                  <Form.Item name="additionalCharges" style={{ margin: 0 }}>
                    <InputNumber
                      placeholder="0.00"
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₹\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Descriptions.Item>
                
                <Descriptions.Item label="Round Off">
                  <Text style={{ color: calculations.roundOff >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    ₹ {calculations.roundOff.toFixed(2)}
                  </Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Net Amount">
                  <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                    ₹ {calculations.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Title>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Payment Terms" style={{ marginBottom: 16 }}>
              <Form.Item name="paymentTerms" label="Payment Terms" initialValue="net-30">
                <Select>
                  <Option value="advance">Advance Payment</Option>
                  <Option value="cod">Cash on Delivery</Option>
                  <Option value="net-7">Net 7 Days</Option>
                  <Option value="net-15">Net 15 Days</Option>
                  <Option value="net-30">Net 30 Days</Option>
                  <Option value="net-60">Net 60 Days</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="paymentMethod" label="Payment Method" initialValue="bank-transfer">
                <Select>
                  <Option value="bank-transfer">Bank Transfer</Option>
                  <Option value="cheque">Cheque</Option>
                  <Option value="cash">Cash</Option>
                  <Option value="credit">Credit</Option>
                </Select>
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Card style={{ marginBottom: 16 }}>
          <Form.Item name="notes" label="Notes / Remarks">
            <TextArea rows={3} placeholder="Additional notes or special instructions" />
          </Form.Item>
        </Card>

        <Card>
          <Row justify="end">
            <Col>
              <Space>
                <Button icon={<CalculatorOutlined />}>
                  Recalculate
                </Button>
                <Button icon={<PrinterOutlined />}>
                  Print Preview
                </Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  htmlType="submit"
                  loading={loading}
                  size="large"
                >
                  Save Voucher
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </Form>
    </div>
  );
};

export default TallyStyleProcurement;