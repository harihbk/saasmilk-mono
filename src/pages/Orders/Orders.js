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
} from '@ant-design/icons';
import { ordersAPI, dealersAPI, customersAPI, dealerGroupsAPI, productsAPI, debugAPI, companiesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const Orders = () => {
  const { user } = useAuth();
  
  // State management
  const [orders, setOrders] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [dealerPricing, setDealerPricing] = useState([]);
  const [stockAvailability, setStockAvailability] = useState({});
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  
  // Order creation state
  const [orderType, setOrderType] = useState('dealer'); // 'dealer' or 'customer'
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [buyerBalance, setBuyerBalance] = useState(0);
  const [orderItems, setOrderItems] = useState([]);
  
  // Global discount and adjustments
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState('percentage');
  const [customAdjustment, setCustomAdjustment] = useState({ text: '', amount: 0, type: 'fixed' });
  
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchOrders();
    fetchDealers();
    fetchCustomers();
    fetchProducts();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter]);

  // Recalculate totals whenever orderItems, globalDiscount, or customAdjustment change
  useEffect(() => {
    // This will trigger UI re-render with updated calculations
    // No need for additional state, just ensures consistent calculations
    if (orderItems.length > 0) {
      console.log('Order items changed, totals will be recalculated on next render');
    }
  }, [orderItems, globalDiscount, globalDiscountType, customAdjustment]);

  // Effect to handle discount and adjustment state updates when editing
  useEffect(() => {
    if (editingOrder && modalVisible) {
      console.log('useEffect - editingOrder changed, updating discount/adjustment values');
      console.log('editingOrder.pricing:', editingOrder.pricing);
      
      // Update global discount values
      const orderGlobalDiscount = editingOrder.pricing?.globalDiscount || 0;
      const orderGlobalDiscountType = editingOrder.pricing?.globalDiscountType || 'percentage';
      const orderCustomAdjustment = editingOrder.pricing?.customAdjustment || { text: '', amount: 0, type: 'fixed' };
      
      if (globalDiscount !== orderGlobalDiscount) {
        console.log('Updating globalDiscount from', globalDiscount, 'to', orderGlobalDiscount);
        setGlobalDiscount(orderGlobalDiscount);
      }
      
      if (globalDiscountType !== orderGlobalDiscountType) {
        console.log('Updating globalDiscountType from', globalDiscountType, 'to', orderGlobalDiscountType);
        setGlobalDiscountType(orderGlobalDiscountType);
      }
      
      if (JSON.stringify(customAdjustment) !== JSON.stringify(orderCustomAdjustment)) {
        console.log('Updating customAdjustment from', customAdjustment, 'to', orderCustomAdjustment);
        setCustomAdjustment(orderCustomAdjustment);
      }
    }
  }, [editingOrder, modalVisible]);

  // Debug functions to check database
  const checkDatabaseStatus = async () => {
    try {
      console.log('Checking database status...');
      const collectionsResponse = await debugAPI.getCollections();
      const inventoryResponse = await debugAPI.getInventory();
      
      console.log('Collections:', collectionsResponse.data);
      console.log('Inventory data:', inventoryResponse.data);
      
      const { counts } = collectionsResponse.data.data;
      const { inventory, products } = inventoryResponse.data.data;
      
      const statusMessage = `Database Status:\n` +
        `- Products: ${products.count} items\n` +
        `- Inventory: ${inventory.count} items\n` +
        `- Orders: ${counts.orders || 0} items\n` +
        `- Dealers: ${counts.dealers || 0} items`;
      
      Modal.info({
        title: 'Database Status',
        content: (
          <div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{statusMessage}</pre>
            {inventory.count === 0 && (
              <Alert 
                message="No inventory found!" 
                description="This explains why you're getting 'Product not found in inventory' error."
                type="warning" 
                style={{ marginTop: 12 }}
              />
            )}
          </div>
        ),
        width: 500
      });
      
    } catch (error) {
      console.error('Database check failed:', error);
      message.error(`Database check failed: ${error.message}`);
    }
  };

  const createSampleData = async () => {
    try {
      console.log('Creating sample inventory data...');
      const response = await debugAPI.createSampleInventory();
      console.log('Sample data creation response:', response.data);
      
      if (response.data.success) {
        message.success(`Created ${response.data.data.created} inventory items`);
        // Refresh the data
        fetchProducts();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Sample data creation failed:', error);
      message.error(`Failed to create sample data: ${error.response?.data?.message || error.message}`);
    }
  };

  const createDefaultWarehouses = async () => {
    try {
      console.log('Creating default warehouses...');
      const response = await debugAPI.createDefaultWarehouses();
      console.log('Warehouse creation response:', response.data);
      
      if (response.data.success) {
        message.success(`Created ${response.data.data.created.length} warehouses. Total: ${response.data.data.total}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Warehouse creation failed:', error);
      message.error(`Failed to create warehouses: ${error.response?.data?.message || error.message}`);
    }
  };

  const migrateInventoryWarehouses = async () => {
    try {
      console.log('Migrating inventory warehouse references...');
      const response = await debugAPI.migrateInventoryWarehouses();
      console.log('Migration response:', response.data);
      
      if (response.data.success) {
        const { migrated, failed, totalItems } = response.data.data;
        message.success(`Migration completed! ${migrated}/${totalItems} items migrated successfully. ${failed} failed.`);
        
        if (response.data.data.errors.length > 0) {
          console.error('Migration errors:', response.data.data.errors);
        }
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      message.error(`Failed to migrate inventory: ${error.response?.data?.message || error.message}`);
    }
  };

  const analyzeStockIssues = async () => {
    try {
      console.log('Analyzing stock and database issues...');
      const response = await debugAPI.getStockAnalysis();
      console.log('=== COMPREHENSIVE STOCK ANALYSIS ===');
      console.log('Full analysis data:', response.data.data);
      
      const data = response.data.data;
      
      console.log('\n📊 SUMMARY:');
      console.log(`- Products: ${data.summary.totalProducts}`);
      console.log(`- Inventory Items: ${data.summary.totalInventory}`);
      console.log(`- Warehouses: ${data.summary.totalWarehouses}`);
      console.log(`- Orders: ${data.summary.totalOrders}`);
      
      console.log('\n📦 PRODUCTS:', data.products);
      console.log('\n🏪 WAREHOUSES:', data.warehouses);
      console.log('\n📋 INVENTORY:', data.inventory);
      console.log('\n📈 STOCK ANALYSIS:', data.stockAnalysis);
      console.log('\n📝 RECENT ORDERS:', data.recentOrders);
      
      if (data.issues.length > 0) {
        console.log('\n⚠️  ISSUES FOUND:');
        data.issues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue}`);
        });
        message.warning(`Found ${data.issues.length} issues. Check console for details.`);
      } else {
        console.log('\n✅ NO MAJOR ISSUES DETECTED');
        message.success('No major stock issues detected!');
      }
      
      console.log('\n💡 RECOMMENDATIONS:');
      data.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      
    } catch (error) {
      console.error('Stock analysis failed:', error);
      message.error(`Failed to analyze stock: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        status: statusFilter || undefined,
      };

      const response = await ordersAPI.getOrders(params);
      const { orders: data, pagination: paginationData } = response.data.data;

      setOrders(data || []);
      setPagination(prev => ({
        ...prev,
        total: paginationData?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDealers = async () => {
    try {
      const response = await dealersAPI.getDealers({ limit: 100, status: 'active' });
      setDealers(response.data.data.dealers || []);
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getCustomers({ limit: 100 });
      setCustomers(response.data.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getProducts({ limit: 100, status: 'active' });
      setProducts(response.data.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchDealerPricing = async (dealerId) => {
    if (!dealerId) {
      setDealerPricing([]);
      return;
    }

    try {
      const dealer = dealers.find(d => d._id === dealerId);
      if (dealer && dealer.dealerGroup) {
        const response = await dealerGroupsAPI.getDealerGroupPricing(dealer.dealerGroup._id);
        setDealerPricing(response.data.data.pricing || []);
      }
    } catch (error) {
      console.error('Error fetching dealer pricing:', error);
      setDealerPricing([]);
    }
  };

  const handleOrderTypeChange = (type) => {
    setOrderType(type);
    setSelectedBuyer(null);
    setBuyerBalance(0);
    setDealerPricing([]);
    setOrderItems([]);
  };

  const handleBuyerChange = async (buyerId) => {
    setSelectedBuyer(buyerId);
    setOrderItems([]); // Reset order items when buyer changes
    
    if (orderType === 'dealer' && buyerId) {
      const dealer = dealers.find(d => d._id === buyerId);
      setBuyerBalance(dealer?.financialInfo?.currentBalance || 0);
      await fetchDealerPricing(buyerId);
    } else if (orderType === 'customer' && buyerId) {
      const customer = customers.find(c => c._id === buyerId);
      setBuyerBalance(customer?.accountBalance || 0);
      setDealerPricing([]); // Customers use base prices
    } else {
      setBuyerBalance(0);
      setDealerPricing([]);
    }
  };

  const getProductPrice = (productId) => {
    if (orderType === 'dealer' && dealerPricing.length > 0) {
      // Use dealer-specific pricing
      const pricing = dealerPricing.find(p => p.product._id === productId);
      if (pricing) {
        return {
          price: pricing.pricing.finalPrice,
          priceWithTax: pricing.tax.priceWithTax,
          taxRate: pricing.tax.totalTax,
          hasCustomPricing: true,
        };
      }
    }
    
    // Fallback to product base price (for customers or dealers without custom pricing)
    const product = products.find(p => p._id === productId);
    if (product) {
      const basePrice = product.price?.selling || 0;
      const taxRate = product.tax?.igst || product.tax?.cgst + product.tax?.sgst || 0;
      return {
        price: basePrice,
        priceWithTax: basePrice * (1 + taxRate / 100),
        taxRate: taxRate,
        hasCustomPricing: false,
      };
    }
    
    return { price: 0, priceWithTax: 0, taxRate: 0, hasCustomPricing: false };
  };

  const addOrderItem = () => {
    if (!selectedBuyer) {
      message.warning(`Please select a ${orderType} first`);
      return;
    }

    const newItem = {
      id: Date.now(),
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      igst: 0,
      cgst: 0,
      sgst: 0,
      taxAmount: 0,
      total: 0,
    };

    setOrderItems([...orderItems, newItem]);
  };

  const checkItemStock = async (productId, quantity) => {
    if (!productId) return null;
    
    try {
      const response = await ordersAPI.checkStock({
        items: [{ product: productId, quantity: quantity || 1 }],
        warehouse: 'Warehouse A',
        ...(editingOrder && { orderId: editingOrder._id }) // Include orderId when editing
      });
      
      const stockInfo = response.data.data.stockCheck[0];
      setStockAvailability(prev => ({
        ...prev,
        [productId]: stockInfo
      }));
      
      return stockInfo;
    } catch (error) {
      console.error('Failed to check stock for product:', productId, error);
      return null;
    }
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-fill product details when product is selected
    if (field === 'productId' && value) {
      const product = products.find(p => p._id === value);
      const pricing = getProductPrice(value);
      
      if (product) {
        // Get tax rates from product
        const igst = product.tax?.igst || 0;
        const cgst = product.tax?.cgst || 0;
        const sgst = product.tax?.sgst || 0;
        
        updatedItems[index] = {
          ...updatedItems[index],
          productName: product.name,
          unitPrice: pricing.price,
          igst: igst,
          cgst: cgst,
          sgst: sgst,
        };
        
        // Calculate totals with tax immediately after setting tax rates
        const item = updatedItems[index];
        const subtotal = (item.unitPrice || 0) * (item.quantity || 0);
        let discountAmount = 0;
        
        if (item.discountType === 'percentage') {
          discountAmount = (subtotal * (item.discount || 0)) / 100;
        } else {
          discountAmount = item.discount || 0;
        }
        
        const afterDiscount = subtotal - discountAmount;
        
        // Calculate tax amount based on IGST or CGST+SGST
        let taxAmount = 0;
        if (item.igst > 0) {
          taxAmount = (afterDiscount * item.igst) / 100;
        } else {
          taxAmount = (afterDiscount * (item.cgst + item.sgst)) / 100;
        }
        
        updatedItems[index].taxAmount = taxAmount;
        updatedItems[index].total = afterDiscount + taxAmount;
      }
    }

    // Recalculate total when any price-related field changes
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'discountType' || 
        field === 'igst' || field === 'cgst' || field === 'sgst') {
      const item = updatedItems[index];
      const subtotal = (item.unitPrice || 0) * (item.quantity || 0);
      let discountAmount = 0;
      
      if (item.discountType === 'percentage') {
        discountAmount = (subtotal * (item.discount || 0)) / 100;
      } else {
        discountAmount = item.discount || 0;
      }
      
      const afterDiscount = subtotal - discountAmount;
      
      // Calculate tax amount based on IGST or CGST+SGST
      let taxAmount = 0;
      if (item.igst > 0) {
        taxAmount = (afterDiscount * item.igst) / 100;
      } else {
        taxAmount = (afterDiscount * (item.cgst + item.sgst)) / 100;
      }
      
      updatedItems[index].taxAmount = taxAmount;
      updatedItems[index].total = afterDiscount + taxAmount;
    }

    // Check stock when product or quantity changes
    if (field === 'productId' || field === 'quantity') {
      const productId = field === 'productId' ? value : updatedItems[index].productId;
      const quantity = field === 'quantity' ? value : updatedItems[index].quantity;
      
      if (productId && quantity > 0) {
        checkItemStock(productId, quantity);
      }
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const calculateOrderTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalIgst = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let grandTotal = 0;

    orderItems.forEach(item => {
      const itemSubtotal = (item.unitPrice || 0) * (item.quantity || 0);
      subtotal += itemSubtotal;
      
      // Use the same discount calculation logic as item updates
      let discountAmount = 0;
      if (item.discountType === 'percentage') {
        discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
      } else {
        discountAmount = item.discount || 0;
      }
      totalDiscount += discountAmount;
      
      // Use pre-calculated tax amount from item (to avoid double calculation)
      const itemTaxAmount = item.taxAmount || 0;
      totalTax += itemTaxAmount;
      
      // Track individual tax components based on actual tax rates
      if (item.igst > 0) {
        totalIgst += itemTaxAmount;
      } else {
        // Calculate proportional CGST/SGST based on rates
        const totalTaxRate = (item.cgst || 0) + (item.sgst || 0);
        if (totalTaxRate > 0) {
          totalCgst += (itemTaxAmount * (item.cgst || 0)) / totalTaxRate;
          totalSgst += (itemTaxAmount * (item.sgst || 0)) / totalTaxRate;
        }
      }
      
      // Use pre-calculated item total (consistent with item calculation)
      grandTotal += (item.total || 0);
    });

    // Apply global discount
    let globalDiscountAmount = 0;
    if (globalDiscountType === 'percentage') {
      globalDiscountAmount = (grandTotal * globalDiscount) / 100;
    } else {
      globalDiscountAmount = globalDiscount || 0;
    }
    
    // Apply custom adjustment (subtract from total)
    let adjustmentAmount = 0;
    if (customAdjustment.amount && customAdjustment.text.trim()) {
      if (customAdjustment.type === 'percentage') {
        adjustmentAmount = (grandTotal * customAdjustment.amount) / 100;
      } else {
        adjustmentAmount = customAdjustment.amount || 0;
      }
    }
    
    const finalTotal = grandTotal - globalDiscountAmount - adjustmentAmount;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      totalIgst,
      totalCgst,
      totalSgst,
      grandTotal,
      globalDiscountAmount,
      adjustmentAmount,
      finalTotal,
      itemCount: orderItems.length,
      totalQuantity: orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    };
  };

  const showCreateOrderModal = () => {
    setEditingOrder(null);
    setModalVisible(true);
    setOrderType('dealer');
    setSelectedBuyer(null);
    setBuyerBalance(0);
    setOrderItems([]);
    setDealerPricing([]);
    setGlobalDiscount(0);
    setGlobalDiscountType('percentage');
    setCustomAdjustment({ text: '', amount: 0, type: 'fixed' });
    form.resetFields();
  };

  const showEditOrderModal = async (order) => {
    console.log('showEditOrderModal called with order:', order);
    setEditingOrder(order);
    
    // Set order type based on order data
    if (order.dealer) {
      setOrderType('dealer');
      const dealerId = typeof order.dealer === 'object' ? order.dealer._id : order.dealer;
      setSelectedBuyer(dealerId);
      
      // Always fetch current dealer balance for edit mode
      try {
        const response = await dealersAPI.getDealer(dealerId);
        const currentBalance = response.data.data.dealer.financialInfo?.currentBalance || 0;
        setBuyerBalance(currentBalance);
        console.log('Fetched dealer balance for edit:', currentBalance);
      } catch (error) {
        console.error('Error fetching dealer balance:', error);
        // Fallback to order data if available
        setBuyerBalance(order.dealer?.financialInfo?.currentBalance || 0);
      }
      
      await fetchDealerPricing(dealerId);
    } else if (order.customer) {
      setOrderType('customer');
      const customerId = typeof order.customer === 'object' ? order.customer._id : order.customer;
      setSelectedBuyer(customerId);
      
      // If customer data is populated, use it, otherwise set to 0
      if (typeof order.customer === 'object') {
        setBuyerBalance(order.customer.accountBalance || 0);
      } else {
        setBuyerBalance(0);
      }
    }

    // Map order items to the correct format for editing with recalculated totals
    const mappedItems = (order.items || []).map((item, index) => {
      console.log(`Mapping item ${index}:`, item); // Debug log
      
      // Recalculate item totals for consistency
      const itemSubtotal = (item.unitPrice || 0) * (item.quantity || 1);
      const discountAmount = item.discount || 0; // Assuming fixed discount for existing orders
      const afterDiscount = itemSubtotal - discountAmount;
      
      // Recalculate tax amount using stored tax rates
      let taxAmount = 0;
      if ((item.igst || 0) > 0) {
        taxAmount = (afterDiscount * (item.igst || 0)) / 100;
      } else {
        taxAmount = (afterDiscount * ((item.cgst || 0) + (item.sgst || 0))) / 100;
      }
      
      const calculatedTotal = afterDiscount + taxAmount;
      
      return {
        id: item._id || Date.now() + Math.random() + index,
        productId: item.product?._id || item.product,
        productName: item.product?.name || item.productName || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        discount: item.discount || 0,
        discountType: 'fixed', // Default since we don't store this
        igst: item.igst || 0,
        cgst: item.cgst || 0,
        sgst: item.sgst || 0,
        taxAmount: taxAmount, // Use recalculated tax amount
        total: calculatedTotal, // Use recalculated total for consistency
      };
    });
    console.log('Mapped order items:', mappedItems);
    setOrderItems(mappedItems);
    
    // Set global discount and custom adjustment from order data
    const globalDiscountValue = order.pricing?.globalDiscount || 0;
    const globalDiscountTypeValue = order.pricing?.globalDiscountType || 'percentage';
    const customAdjustmentValue = order.pricing?.customAdjustment || { text: '', amount: 0, type: 'fixed' };
    
    console.log('Setting global discount:', globalDiscountValue);
    console.log('Setting global discount type:', globalDiscountTypeValue);
    console.log('Setting custom adjustment:', customAdjustmentValue);
    
    setGlobalDiscount(globalDiscountValue);
    setGlobalDiscountType(globalDiscountTypeValue);
    setCustomAdjustment(customAdjustmentValue);
    
    // Check different possible delivery date fields
    let deliveryDateValue = null;
    if (order.shipping?.estimatedDelivery) {
      deliveryDateValue = dayjs(order.shipping.estimatedDelivery);
    } else if (order.deliveryDate) {
      deliveryDateValue = dayjs(order.deliveryDate);
    } else if (order.shipping?.deliveryDate) {
      deliveryDateValue = dayjs(order.shipping.deliveryDate);
    }
    
    console.log('Setting form values:', {
      status: order.status,
      notes: order.notes?.customer || order.notes || '',
      paymentMethod: order.payment?.method || 'cash',
      shippingMethod: order.shipping?.method || 'pickup',
      deliveryDate: deliveryDateValue,
    });
    
    // Set modal visible after all state is set
    setModalVisible(true);
    
    // Use setTimeout to ensure the modal is fully rendered before setting form values
    setTimeout(() => {
      form.setFieldsValue({
        status: order.status,
        notes: order.notes?.customer || order.notes || '',
        paymentMethod: order.payment?.method || 'cash',
        shippingMethod: order.shipping?.method || 'pickup',
        deliveryDate: deliveryDateValue,
        shippingAddress: {
          street: order.shipping?.address?.street || '',
          city: order.shipping?.address?.city || '',
          state: order.shipping?.address?.state || '',
          zipCode: order.shipping?.address?.zipCode || '',
          country: order.shipping?.address?.country || 'India',
          warehouse: order.shipping?.address?.warehouse || 'Warehouse A'
        }
      });
      
      // Force re-render of discount and adjustment values after modal is open
      console.log('Current globalDiscount state:', globalDiscountValue);
      console.log('Current customAdjustment state:', customAdjustmentValue);
    }, 200);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingOrder(null);
    setOrderType('dealer');
    setSelectedBuyer(null);
    setBuyerBalance(0);
    setOrderItems([]);
    setDealerPricing([]);
    setGlobalDiscount(0);
    setGlobalDiscountType('percentage');
    setCustomAdjustment({ text: '', amount: 0, type: 'fixed' });
    form.resetFields();
  };

  const handleSubmitOrder = async (values) => {
    if (!selectedBuyer) {
      message.error(`Please select a ${orderType}`);
      return;
    }

    if (orderItems.length === 0) {
      message.error('Please add at least one item to the order');
      return;
    }

    // Validate all items have products selected
    const invalidItems = orderItems.filter(item => !item.productId || item.quantity <= 0);
    if (invalidItems.length > 0) {
      message.error('Please complete all order items (select product and enter quantity)');
      return;
    }

    // Check stock availability before creating order
    try {
      const stockCheckData = {
        items: orderItems.map(item => ({
          product: item.productId,
          quantity: item.quantity
        })),
        warehouse: values.shippingAddress?.warehouse || 'Warehouse A',
        ...(editingOrder && { orderId: editingOrder._id }) // Include orderId when editing
      };
      
      console.log('Checking stock availability...', stockCheckData);
      const stockResponse = await ordersAPI.checkStock(stockCheckData);
      
      if (!stockResponse.data.data.allAvailable) {
        const stockIssues = stockResponse.data.data.stockCheck
          .filter(item => item.status !== 'available')
          .map(item => `${item.productName}: ${item.message}`)
          .join('\n');
        
        Modal.error({
          title: 'Insufficient Stock',
          content: (
            <div>
              <p>Cannot create order due to insufficient stock:</p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{stockIssues}</pre>
            </div>
          )
        });
        return;
      }
      
      console.log('Stock availability confirmed');
    } catch (error) {
      console.error('Stock check failed:', error);
      message.warning('Could not verify stock availability. Order may fail if items are out of stock.');
    }

    try {
      const totals = calculateOrderTotals();
      
      const orderData = {
        // Set buyer based on order type (use correct field names for model)
        ...(orderType === 'dealer' ? { dealer: selectedBuyer } : { customer: selectedBuyer }),
        
        items: orderItems.map(item => ({
          product: item.productId, // Use 'product' not 'productId' for model
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          igst: item.igst || 0,
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          taxAmount: item.taxAmount || 0,
          totalPrice: item.total || 0,
        })),
        
        orderType, // Track whether this is a dealer or customer order
        
        pricing: {
          subtotal: totals.subtotal,
          discount: totals.totalDiscount + totals.globalDiscountAmount,
          tax: totals.totalTax,
          shipping: 0,
          total: totals.finalTotal,
          globalDiscount: globalDiscount,
          globalDiscountType: globalDiscountType,
          customAdjustment: orderType === 'dealer' ? customAdjustment : null,
        },
        
        payment: {
          method: values.paymentMethod || 'cash', // Default payment method
          status: 'pending',
          paidAmount: 0,
          dueAmount: totals.grandTotal,
        },
        
        shipping: {
          method: values.shippingMethod || 'pickup', // Default to pickup to avoid address validation
          estimatedDelivery: values.deliveryDate ? values.deliveryDate.toDate() : null,
          address: {
            street: values.shippingAddress?.street || '',
            city: values.shippingAddress?.city || '',
            state: values.shippingAddress?.state || '',
            zipCode: values.shippingAddress?.zipCode || '',
            country: values.shippingAddress?.country || 'India',
          }
        },
        
        status: values.status || 'pending',
        notes: {
          customer: values.notes || '',
          internal: '',
          delivery: ''
        },
      };

      if (editingOrder) {
        await ordersAPI.updateOrder(editingOrder._id, orderData);
        message.success('Order updated successfully');
      } else {
        await ordersAPI.createOrder(orderData);
        message.success('Order created successfully');
      }

      handleModalCancel();
      fetchOrders();
    } catch (error) {
      console.error('Error saving order:', error);
      message.error(`Failed to save order: ${error.response?.data?.message || error.message}`);
    }
  };

  const showViewModal = (order) => {
    setViewingOrder(order);
    setViewModalVisible(true);
  };

  const showInvoiceModal = async (order) => {
    setViewingOrder(order);
    setInvoiceModalVisible(true);
    
    // Fetch company details for invoice
    if (user?.company && !company) {
      try {
        const response = await companiesAPI.getCompany(user.company);
        setCompany(response.data.data.company);
      } catch (error) {
        console.error('Error fetching company details for invoice:', error);
      }
    }
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    const invoiceContent = document.getElementById('invoice-content');
    
    if (printWindow && invoiceContent) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${viewingOrder?.orderNumber || 'N/A'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            td, th {
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding: 15px;
              border: 2px solid #333;
            }
            .company-logo {
              width: 50px;
              height: 50px;
              margin-right: 15px;
              border: 1px solid #333;
              border-radius: 8px;
              object-fit: cover;
            }
            .company-header {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
            }
            @media print {
              body { margin: 0; }
              @page { margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          ${invoiceContent.innerHTML}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await ordersAPI.deleteOrder(orderId);
      message.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      message.error('Failed to delete order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      processing: 'blue',
      shipped: 'cyan',
      delivered: 'green',
      completed: 'success',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      processing: 'blue', 
      partial: 'gold',
      completed: 'green',
      failed: 'red',
      refunded: 'purple',
    };
    return colors[status] || 'default';
  };

  const showPaymentModal = async (order) => {
    setPaymentModalLoading(true);
    setPaymentModalVisible(true);
    
    try {
      // Fetch the latest order data to ensure we have current payment info
      const response = await ordersAPI.getOrder(order._id);
      if (response.success && response.data?.order) {
        setPaymentOrder(response.data.order);
        console.log('Updated order data loaded:', response.data.order.payment); // Debug log
      } else {
        setPaymentOrder(order); // Fallback to current data if fetch fails
      }
    } catch (error) {
      console.error('Error fetching latest order data:', error);
      setPaymentOrder(order); // Fallback to current data if fetch fails
    } finally {
      setPaymentModalLoading(false);
    }
  };

  const handlePaymentComplete = async (values) => {
    try {
      setLoading(true);
      const { paymentMethod, paidAmount, transactionId } = values;
      
      console.log('Form values:', values); // Debug log
      
      // Don't send status - let backend determine based on amount
      const paymentData = {
        paidAmount: parseFloat(paidAmount)
      };
      
      // Only include transactionId if it's not empty
      if (transactionId && transactionId.trim() !== '') {
        paymentData.transactionId = transactionId.trim();
        console.log('Including transactionId:', transactionId.trim()); // Debug log
      } else {
        console.log('No transactionId provided'); // Debug log
      }
      
      console.log('Sending payment data:', paymentData); // Debug log
      
      await ordersAPI.updatePayment(paymentOrder._id, paymentData);
      
      const totalAmount = paymentOrder.pricing?.total || 0;
      const paid = parseFloat(paidAmount);
      
      if (paid >= totalAmount) {
        message.success('Payment completed successfully');
      } else if (paid > 0) {
        message.success(`Partial payment of ₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded`);
      }
      
      setPaymentModalVisible(false);
      setPaymentOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error completing payment:', error);
      console.error('Error details:', error.response?.data); // Debug log
      message.error('Failed to complete payment');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
      sorter: true,
    },
    {
      title: 'Buyer',
      key: 'buyer',
      render: (_, record) => {
        if (record.dealer) {
          return (
            <div>
              <TeamOutlined style={{ color: '#1890ff', marginRight: 4 }} />
              <div><strong>Dealer:</strong> {record.dealer.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {record.dealer.dealerGroup?.name}
              </div>
            </div>
          );
        } else if (record.customer) {
          return (
            <div>
              <UserOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              <div><strong>Customer:</strong> {record.customer.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {record.customer.email}
              </div>
            </div>
          );
        }
        return 'Unknown';
      },
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items) => (
        <div>
          <div><strong>{items?.length || 0}</strong> items</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Qty: {items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
          </div>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      key: 'total',
      render: (_, record) => {
        const pricing = record.pricing || {};
        const total = pricing.total || 0;
        const hasGlobalDiscount = pricing.globalDiscount > 0;
        const hasCustomAdjustment = pricing.customAdjustment?.amount > 0;
        
        return (
          <div>
            <strong style={{ color: '#52c41a' }}>
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </strong>
            {hasGlobalDiscount && (
              <div style={{ fontSize: '12px', color: '#ff7875' }}>
                Global Discount: -{pricing.globalDiscountType === 'percentage' ? `${pricing.globalDiscount}%` : `₹${pricing.globalDiscount}`}
              </div>
            )}
            {hasCustomAdjustment && (
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                {pricing.customAdjustment.text || 'Custom Adjustment'}: -₹{pricing.customAdjustment.amount}
              </div>
            )}
          </div>
        );
      },
      sorter: true,
    },
    {
      title: 'Order Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Payment Status',
      key: 'paymentStatus',
      render: (_, record) => {
        const payment = record.payment || {};
        const status = payment.status || 'pending';
        const method = payment.method || 'cash';
        const paidAmount = payment.paidAmount || 0;
        const totalAmount = record.pricing?.total || 0;
        const dueAmount = payment.dueAmount || 0;
        
        return (
          <div>
            <Tag color={getPaymentStatusColor(status)} style={{ textTransform: 'capitalize' }}>
              {status}
            </Tag>
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              <div>Method: {method}</div>
              {paidAmount > 0 && (
                <div style={{ color: '#52c41a' }}>
                  Paid: ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
              {dueAmount > 0 && (
                <div style={{ color: '#f5222d' }}>
                  Due: ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
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
            icon={<EyeOutlined />}
            onClick={() => showViewModal(record)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<FileTextOutlined />}
            onClick={() => showInvoiceModal(record)}
            title="View Invoice"
          />
          {(record.payment?.status === 'pending' || record.payment?.status === 'partial') && (
            <Button
              type="text"
              icon={<DollarOutlined />}
              onClick={() => showPaymentModal(record)}
              title={record.payment?.status === 'partial' ? "Add Payment" : "Complete Payment"}
              style={{ color: '#52c41a' }}
            />
          )}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditOrderModal(record)}
            title="Edit Order"
          />
          <Popconfirm
            title="Are you sure you want to delete this order?"
            onConfirm={() => handleDeleteOrder(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} title="Delete Order" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getBuyerOptions = () => {
    if (orderType === 'dealer') {
      return dealers.map(dealer => (
        <Option key={dealer._id} value={dealer._id}>
          <div>
            <div><strong>{dealer.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {dealer.dealerGroup?.name} • {dealer.dealerCode}
            </div>
            <div style={{ fontSize: '12px', color: dealer.financialInfo?.currentBalance > 0 ? '#f5222d' : '#52c41a' }}>
              Balance: ₹{Math.abs(dealer.financialInfo?.currentBalance || 0).toLocaleString()} 
              {dealer.financialInfo?.currentBalance !== 0 && (dealer.financialInfo?.currentBalance > 0 ? ' DR' : ' CR')}
            </div>
          </div>
        </Option>
      ));
    } else {
      return customers.map(customer => (
        <Option key={customer._id} value={customer._id}>
          <div>
            <div><strong>{customer.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {customer.email} • {customer.phone}
            </div>
            {customer.accountBalance && (
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                Balance: ₹{customer.accountBalance.toLocaleString()}
              </div>
            )}
          </div>
        </Option>
      ));
    }
  };

  const orderTotals = calculateOrderTotals();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          <ShoppingCartOutlined /> Orders Management
        </Title>
        <Space>
          <Button
            onClick={checkDatabaseStatus}
            style={{ backgroundColor: '#e6f7ff', borderColor: '#91d5ff' }}
          >
            Check DB Status
          </Button>
          <Button
            onClick={createSampleData}
            style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
          >
            Create Sample Data
          </Button>
          <Button
            onClick={createDefaultWarehouses}
            style={{ backgroundColor: '#fff7e6', borderColor: '#ffd591' }}
          >
            Create Warehouses
          </Button>
          <Button
            onClick={migrateInventoryWarehouses}
            style={{ backgroundColor: '#fff0f6', borderColor: '#ffadd2' }}
          >
            Migrate Inventory
          </Button>
          <Button
            onClick={analyzeStockIssues}
            style={{ backgroundColor: '#f0f5ff', borderColor: '#adc6ff' }}
          >
            Analyze Stock Issues
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateOrderModal}
            size="large"
          >
            Create New Order
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={orders.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={orders.filter(o => o.status === 'pending').length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Orders"
              value={orders.filter(o => o.status === 'completed').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0)}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Orders Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>Recent Orders</Text>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Manage all dealer and customer orders
            </div>
          </div>
          <Space>
            <Select
              placeholder="Filter by Status"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Option value="pending">Pending</Option>
              <Option value="processing">Processing</Option>
              <Option value="shipped">Shipped</Option>
              <Option value="delivered">Delivered</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
            <Input.Search
              placeholder="Search orders..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
          }}
          onChange={(paginationConfig) => {
            setPagination({
              current: paginationConfig.current,
              pageSize: paginationConfig.pageSize,
              total: pagination.total,
            });
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit Order Modal */}
      <Modal
        key={editingOrder ? `edit-${editingOrder._id}` : 'create-new'}
        title={
          <div>
            <ShoppingCartOutlined /> {editingOrder ? 'Edit Order' : 'Create New Order'}
            {editingOrder && (
              <span style={{ fontSize: '12px', color: '#999', marginLeft: 8 }}>
                (#{editingOrder.orderNumber})
              </span>
            )}
          </div>
        }
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={1200}
        bodyStyle={{ maxHeight: '85vh', overflowY: 'auto' }}
        destroyOnClose={true}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitOrder}
        >
          {/* Order Type and Buyer Selection */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Order Type</Text>
              </div>
              <Radio.Group 
                value={orderType} 
                onChange={(e) => handleOrderTypeChange(e.target.value)}
                style={{ width: '100%' }}
              >
                <Radio.Button value="dealer" style={{ width: '50%', textAlign: 'center' }}>
                  <TeamOutlined /> Dealer
                </Radio.Button>
                <Radio.Button value="customer" style={{ width: '50%', textAlign: 'center' }}>
                  <UserOutlined /> Customer
                </Radio.Button>
              </Radio.Group>
            </Col>
            <Col span={10}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Select {orderType === 'dealer' ? 'Dealer' : 'Customer'}</Text>
              </div>
              <Select
                style={{ width: '100%' }}
                placeholder={`Choose ${orderType}...`}
                showSearch
                value={selectedBuyer}
                onChange={handleBuyerChange}
                optionFilterProp="children"
              >
                {getBuyerOptions()}
              </Select>
            </Col>
            
            {selectedBuyer && (
              <Col span={6}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Balance</Text>
                </div>
                <Tag 
                  color={buyerBalance > 0 ? 'red' : buyerBalance < 0 ? 'green' : 'default'}
                  style={{ 
                    padding: '4px 12px', 
                    fontSize: '14px',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  ₹{Math.abs(buyerBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  {buyerBalance !== 0 && (buyerBalance > 0 ? ' DR' : ' CR')}
                </Tag>
              </Col>
            )}
          </Row>

          {/* Order Details, Payment & Shipping */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Required' }]}
                initialValue="pending"
              >
                <Select size="small">
                  <Option value="pending">Pending</Option>
                  <Option value="processing">Processing</Option>
                  <Option value="shipped">Shipped</Option>
                  <Option value="delivered">Delivered</Option>
                  <Option value="completed">Completed</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="paymentMethod"
                label="Payment"
                rules={[{ required: true, message: 'Required' }]}
                initialValue="cash"
              >
                <Select size="small">
                  <Option value="cash">Cash</Option>
                  <Option value="card">Card</Option>
                  <Option value="bank-transfer">Bank Transfer</Option>
                  <Option value="digital-wallet">Digital Wallet</Option>
                  <Option value="credit">Credit</Option>
                  <Option value="cheque">Cheque</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="shippingMethod"
                label="Shipping"
                rules={[{ required: true, message: 'Required' }]}
                initialValue="pickup"
              >
                <Select size="small">
                  <Option value="pickup">Pickup</Option>
                  <Option value="standard">Standard</Option>
                  <Option value="express">Express</Option>
                  <Option value="overnight">Overnight</Option>
                  <Option value="same-day">Same Day</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="deliveryDate"
                label="Delivery Date"
              >
                <DatePicker 
                  size="small"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Shipping Address - Only show when shipping method is not pickup */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.shippingMethod !== cur.shippingMethod}>
            {({ getFieldValue }) => {
              const method = getFieldValue('shippingMethod');
              return method && method !== 'pickup' ? (
                <>
                  <Divider orientation="left">Shipping Address</Divider>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Form.Item
                        name={['shippingAddress', 'street']}
                        label="Street Address"
                        rules={[{ required: true, message: 'Street address is required for delivery' }]}
                      >
                        <Input placeholder="Enter street address" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={['shippingAddress', 'city']}
                        label="City"
                        rules={[{ required: true, message: 'City is required for delivery' }]}
                      >
                        <Input placeholder="Enter city" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={['shippingAddress', 'state']}
                        label="State"
                        rules={[{ required: true, message: 'State is required for delivery' }]}
                      >
                        <Input placeholder="Enter state" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Form.Item
                        name={['shippingAddress', 'zipCode']}
                        label="Zip Code"
                        rules={[
                          { required: true, message: 'Zip code is required for delivery' },
                          { pattern: /^[0-9]{6}$/, message: 'Please enter valid 6-digit zip code' }
                        ]}
                      >
                        <Input placeholder="Enter zip code" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={['shippingAddress', 'country']}
                        label="Country"
                        initialValue="India"
                      >
                        <Input placeholder="Enter country" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={['shippingAddress', 'warehouse']}
                        label="Warehouse"
                        initialValue="Warehouse A"
                      >
                        <Input placeholder="Enter warehouse" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              ) : null;
            }}
          </Form.Item>

          <Divider>
            <Space>
              <ShoppingCartOutlined />
              Order Items
              <Badge count={orderItems.length} />
            </Space>
          </Divider>

          {/* Add Item Button */}
          <div style={{ marginBottom: 12 }}>
            <Button
              type="dashed"
              onClick={addOrderItem}
              icon={<PlusOutlined />}
              disabled={!selectedBuyer}
              size="small"
            >
              Add Product
            </Button>
          </div>

          {/* Order Items */}
          {orderItems.length === 0 ? (
            <Empty 
              description="No items added yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: '40px 0' }}
            />
          ) : (
            orderItems.map((item, index) => {
              const product = products.find(p => p._id === item.productId);
              const pricing = item.productId ? getProductPrice(item.productId) : { price: 0, hasCustomPricing: false };
              const stockInfo = stockAvailability[item.productId];
              
              return (
                <Card 
                  key={item.id || index}
                  size="small"
                  style={{ marginBottom: 16 }}
                  title={
                    <Space>
                      <Text strong>Item {index + 1}</Text>
                      {product && (
                        <Tag color={pricing.hasCustomPricing ? 'blue' : 'green'}>
                          {pricing.hasCustomPricing ? 'Dealer Price' : 'Base Price'}
                        </Tag>
                      )}
                      {stockInfo && (
                        <Tag 
                          color={stockInfo.status === 'available' ? 'green' : 
                                stockInfo.status === 'insufficient' ? 'orange' : 'red'}
                          style={{ fontSize: '11px' }}
                        >
                          {stockInfo.status === 'available' 
                            ? `✓ ${stockInfo.available} in stock`
                            : stockInfo.status === 'insufficient'
                            ? `⚠ Only ${stockInfo.available} available` 
                            : '✗ Out of stock'
                          }
                        </Tag>
                      )}
                    </Space>
                  }
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeOrderItem(index)}
                    >
                      Remove
                    </Button>
                  }
                >
                  <Row gutter={12}>
                    <Col span={10}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '12px' }}>Product *</Text>
                      </div>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Select product"
                        value={item.productId}
                        onChange={(value) => updateOrderItem(index, 'productId', value)}
                        showSearch
                        optionFilterProp="children"
                        size="small"
                      >
                        {products.map(product => {
                          const productPricing = getProductPrice(product._id);
                          return (
                            <Option key={product._id} value={product._id}>
                              {product.name} - ₹{productPricing?.price?.toFixed(2)}
                              {productPricing.hasCustomPricing && ' (Spl)'}
                            </Option>
                          );
                        })}
                      </Select>
                    </Col>
                    
                    <Col span={3}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '12px' }}>Qty</Text>
                      </div>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={item.quantity}
                        onChange={(value) => updateOrderItem(index, 'quantity', value)}
                        size="small"
                      />
                    </Col>
                    
                    <Col span={4}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '12px' }}>Price</Text>
                      </div>
                      <InputNumber
                        style={{ width: '100%' }}
                        value={item.unitPrice}
                        formatter={value => `₹${value}`}
                        disabled
                        size="small"
                      />
                    </Col>
                    
                    <Col span={4}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '12px' }}>Discount</Text>
                      </div>
                      <Space.Compact style={{ width: '100%' }}>
                        <InputNumber
                          style={{ width: '70%' }}
                          min={0}
                          max={item.discountType === 'percentage' ? 50 : 10000}
                          value={item.discount}
                          onChange={(value) => updateOrderItem(index, 'discount', value)}
                          size="small"
                        />
                        <Select
                          style={{ width: '30%' }}
                          value={item.discountType}
                          onChange={(value) => updateOrderItem(index, 'discountType', value)}
                          size="small"
                        >
                          <Option value="percentage">%</Option>
                          <Option value="fixed">₹</Option>
                        </Select>
                      </Space.Compact>
                    </Col>
                    
                    <Col span={3}>
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: '12px' }}>Total</Text>
                      </div>
                      <div style={{ 
                        padding: '1px 4px', 
                        backgroundColor: '#f0f2f5', 
                        borderRadius: '2px',
                        textAlign: 'center',
                        fontSize: '13px',
                        height: '24px',
                        lineHeight: '22px'
                      }}>
                        <Text strong style={{ color: '#52c41a' }}>
                          ₹{(item.total || 0).toFixed(2)}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                  
                  {/* Tax Row */}
                  <Row gutter={12} style={{ marginTop: 8 }}>
                    <Col span={4}>
                      <div style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: '12px' }}>IGST %</Text>
                      </div>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={28}
                        step={0.1}
                        value={item.igst}
                        onChange={(value) => updateOrderItem(index, 'igst', value || 0)}
                        size="small"
                        disabled={item.cgst > 0 || item.sgst > 0}
                      />
                    </Col>
                    
                    <Col span={4}>
                      <div style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: '12px' }}>CGST %</Text>
                      </div>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={14}
                        step={0.1}
                        value={item.cgst}
                        onChange={(value) => updateOrderItem(index, 'cgst', value || 0)}
                        size="small"
                        disabled={item.igst > 0}
                      />
                    </Col>
                    
                    <Col span={4}>
                      <div style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: '12px' }}>SGST %</Text>
                      </div>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={14}
                        step={0.1}
                        value={item.sgst}
                        onChange={(value) => updateOrderItem(index, 'sgst', value || 0)}
                        size="small"
                        disabled={item.igst > 0}
                      />
                    </Col>
                    
                    <Col span={4}>
                      <div style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: '12px' }}>Tax Amt</Text>
                      </div>
                      <div style={{ 
                        padding: '1px 4px', 
                        backgroundColor: '#fff7e6', 
                        borderRadius: '2px',
                        textAlign: 'center',
                        fontSize: '13px',
                        height: '24px',
                        lineHeight: '22px'
                      }}>
                        <Text style={{ color: '#fa8c16' }}>
                          ₹{(item.taxAmount || 0).toFixed(2)}
                        </Text>
                      </div>
                    </Col>
                    
                    <Col span={8}>
                      <div style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: '12px' }}>
                          Subtotal: ₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        After Discount: ₹{((item.unitPrice || 0) * (item.quantity || 0) - 
                          (item.discountType === 'percentage' 
                            ? ((item.unitPrice || 0) * (item.quantity || 0) * (item.discount || 0)) / 100
                            : (item.discount || 0))).toFixed(2)}
                      </Text>
                    </Col>
                  </Row>
                </Card>
              );
            })
          )}

          {/* Order Summary */}
          {orderItems.length > 0 && (
            <Card 
              title={
                <Space>
                  <CalculatorOutlined />
                  Order Summary
                </Space>
              }
              style={{ marginTop: 24, backgroundColor: '#fafafa' }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Total Items"
                    value={orderTotals.itemCount}
                    suffix={`(${orderTotals.totalQuantity} pcs)`}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Subtotal"
                    value={orderTotals.subtotal}
                    prefix="₹"
                    precision={2}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Discount"
                    value={orderTotals.totalDiscount}
                    prefix="- ₹"
                    precision={2}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Tax Amount"
                    value={orderTotals.totalTax}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
              </Row>
              
              <Divider style={{ margin: '12px 0' }} />
              
              {/* Global Discount Row */}
              <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <Text strong style={{ fontSize: '13px' }}>Order Discount:</Text>
                  {editingOrder && (
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      Debug: {globalDiscount} ({globalDiscountType})
                    </div>
                  )}
                </Col>
                <Col span={6}>
                  <Space.Compact style={{ width: '100%' }}>
                    <InputNumber
                      style={{ width: '70%' }}
                      min={0}
                      max={globalDiscountType === 'percentage' ? 50 : 100000}
                      value={globalDiscount}
                      onChange={(value) => {
                        console.log('GlobalDiscount onChange:', value);
                        setGlobalDiscount(value || 0);
                      }}
                      size="small"
                      placeholder="0"
                    />
                    <Select
                      style={{ width: '30%' }}
                      value={globalDiscountType}
                      onChange={(value) => {
                        console.log('GlobalDiscountType onChange:', value);
                        setGlobalDiscountType(value);
                      }}
                      size="small"
                    >
                      <Option value="percentage">%</Option>
                      <Option value="fixed">₹</Option>
                    </Select>
                  </Space.Compact>
                </Col>
                <Col span={6}>
                  <Text type="secondary">
                    -₹{orderTotals.globalDiscountAmount.toFixed(2)}
                  </Text>
                </Col>
                <Col span={6}>
                  <Statistic
                    title="After Discount"
                    value={orderTotals.grandTotal - orderTotals.globalDiscountAmount}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
              
              {/* Custom Adjustment Row */}
              {orderType === 'dealer' && (
                <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
                  <Col span={6}>
                    <Input
                      placeholder="Adjustment reason (e.g., damaged goods)"
                      value={customAdjustment.text}
                      onChange={(e) => {
                        console.log('CustomAdjustment text onChange:', e.target.value);
                        setCustomAdjustment({ ...customAdjustment, text: e.target.value });
                      }}
                      size="small"
                    />
                    {editingOrder && (
                      <div style={{ fontSize: '10px', color: '#999' }}>
                        Debug: "{customAdjustment.text}" | {customAdjustment.amount} ({customAdjustment.type})
                      </div>
                    )}
                  </Col>
                  <Col span={6}>
                    <Space.Compact style={{ width: '100%' }}>
                      <InputNumber
                        style={{ width: '70%' }}
                        min={0}
                        max={100000}
                        value={customAdjustment.amount}
                        onChange={(value) => {
                          console.log('CustomAdjustment amount onChange:', value);
                          setCustomAdjustment({ ...customAdjustment, amount: value || 0 });
                        }}
                        size="small"
                        placeholder="Amount to deduct"
                      />
                      <Select
                        style={ { width: '30%' }}
                        value={customAdjustment.type}
                        onChange={(value) => {
                          console.log('CustomAdjustment type onChange:', value);
                          setCustomAdjustment({ ...customAdjustment, type: value });
                        }}
                        size="small"
                      >
                        <Option value="percentage">%</Option>
                        <Option value="fixed">₹</Option>
                      </Select>
                    </Space.Compact>
                  </Col>
                  <Col span={6}>
                    <Text type="danger">
                      -₹{orderTotals.adjustmentAmount.toFixed(2)}
                    </Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      (Dealer adjustment)
                    </Text>
                  </Col>
                </Row>
              )}
              
              <Divider style={{ margin: '12px 0' }} />
              
              {/* Tax Breakdown */}
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <Text style={{ fontSize: '12px' }}>IGST: ₹{orderTotals.totalIgst.toFixed(2)}</Text>
                </Col>
                <Col span={6}>
                  <Text style={{ fontSize: '12px' }}>CGST: ₹{orderTotals.totalCgst.toFixed(2)}</Text>
                </Col>
                <Col span={6}>
                  <Text style={{ fontSize: '12px' }}>SGST: ₹{orderTotals.totalSgst.toFixed(2)}</Text>
                </Col>
                <Col span={6}>
                  <Text style={{ fontSize: '12px' }}>Total Tax: ₹{orderTotals.totalTax.toFixed(2)}</Text>
                </Col>
              </Row>
              
              <Divider />
              
              <Row justify="center">
                <Col>
                  <Statistic
                    title="Final Total"
                    value={orderTotals.finalTotal}
                    prefix="₹"
                    precision={2}
                    valueStyle={{ 
                      color: '#52c41a', 
                      fontSize: '28px', 
                      fontWeight: 'bold' 
                    }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* Order Notes */}
          <Form.Item
            name="notes"
            label="Order Notes (Optional)"
            style={{ marginTop: 8 }}
          >
            <TextArea 
              rows={2} 
              placeholder="Special instructions..."
              size="small"
            />
          </Form.Item>

          {/* Submit Buttons */}
          <Form.Item style={{ marginTop: 16, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                disabled={!selectedBuyer || orderItems.length === 0}
                icon={editingOrder ? <EditOutlined /> : <PlusOutlined />}
              >
                {editingOrder ? 'Update' : 'Create'} Order
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Order Modal */}
      <Modal
        title="Order Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
          <Button 
            key="invoice" 
            type="primary" 
            onClick={() => {
              setViewModalVisible(false);
              showInvoiceModal(viewingOrder);
            }}
          >
            View Invoice
          </Button>
        ]}
        width={900}
      >
        {viewingOrder && (
          <div>
            <Descriptions title="Order Information" bordered column={2}>
              <Descriptions.Item label="Order Number">
                {viewingOrder.orderNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(viewingOrder.status)}>
                  {viewingOrder.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {dayjs(viewingOrder.createdAt).format('MMM DD, YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Delivery Date">
                {viewingOrder.deliveryDate ? dayjs(viewingOrder.deliveryDate).format('MMM DD, YYYY') : 'Not specified'}
              </Descriptions.Item>
              
              {viewingOrder.dealer && (
                <>
                  <Descriptions.Item label="Dealer">
                    {viewingOrder.dealer.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dealer Group">
                    {viewingOrder.dealer.dealerGroup?.name}
                  </Descriptions.Item>
                </>
              )}
              
              {viewingOrder.customer && (
                <>
                  <Descriptions.Item label="Customer">
                    {viewingOrder.customer.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Customer Email">
                    {viewingOrder.customer.email}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Divider orientation="left">Order Items</Divider>
            <Table
              dataSource={viewingOrder.items}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Product',
                  dataIndex: 'productName',
                  key: 'productName',
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  align: 'center',
                },
                {
                  title: 'Unit Price',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  align: 'right',
                  render: (price) => `₹${(price || 0).toFixed(2)}`,
                },
                {
                  title: 'Discount',
                  key: 'discount',
                  align: 'right',
                  render: (_, record) => 
                    record.discountType === 'percentage' 
                      ? `${record.discount}%` 
                      : `₹${record.discount}`,
                },
                {
                  title: 'Total',
                  dataIndex: 'totalPrice',
                  key: 'totalPrice',
                  align: 'right',
                  render: (total) => <strong>₹{(total || 0).toFixed(2)}</strong>,
                },
              ]}
              bordered
            />

            <Row justify="end" style={{ marginTop: 16 }}>
              <Col span={8}>
                <Descriptions size="small" bordered>
                  <Descriptions.Item label="Subtotal">
                    ₹{(viewingOrder.pricing?.subtotal || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Discount">
                    ₹{(viewingOrder.pricing?.discount || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax">
                    ₹{(viewingOrder.pricing?.tax || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Grand Total">
                    <strong>₹{(viewingOrder.pricing?.total || 0).toFixed(2)}</strong>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            {(viewingOrder.notes?.customer || viewingOrder.notes) && (
              <>
                <Divider orientation="left">Notes</Divider>
                <Text>{viewingOrder.notes?.customer || viewingOrder.notes}</Text>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Invoice Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Invoice
            <Button 
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrintInvoice}
              size="small"
              className="no-print"
            >
              Print
            </Button>
          </Space>
        }
        open={invoiceModalVisible}
        onCancel={() => setInvoiceModalVisible(false)}
        footer={null}
        width={900}
        bodyStyle={{ padding: 0 }}
      >
        {viewingOrder && (
          <>
            {/* Print Styles */}
            <style jsx>{`
              @media print {
                /* Hide everything except invoice content */
                body * {
                  visibility: hidden;
                }
                
                #invoice-content,
                #invoice-content * {
                  visibility: visible;
                }
                
                #invoice-content {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0 !important;
                  padding: 15px !important;
                  font-size: 12px !important;
                  background: white !important;
                  box-shadow: none !important;
                }
                
                /* Hide modal elements */
                .ant-modal-mask,
                .ant-modal-wrap,
                .ant-modal,
                .ant-modal-content,
                .ant-modal-header,
                .ant-modal-footer,
                .ant-modal-close,
                .ant-modal-close-x {
                  display: none !important;
                }
                
                /* Clean print layout */
                @page {
                  margin: 0.5in;
                  size: A4;
                }
                
                /* Remove shadows and borders for print */
                #invoice-content * {
                  box-shadow: none !important;
                  text-shadow: none !important;
                }
                
                /* Ensure proper table layout for print */
                table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                  border: 2px solid #000 !important;
                }
                
                td, th {
                  border: 1px solid #333 !important;
                  padding: 8px !important;
                  font-size: 11px !important;
                }
                
                /* Print-specific header styling */
                #invoice-content h1,
                #invoice-content h2,
                #invoice-content h3 {
                  color: #000 !important;
                  background: none !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 10px 0 !important;
                  margin: 10px 0 !important;
                }
                
                /* Clean background for print */
                #invoice-content div {
                  background: white !important;
                  box-shadow: none !important;
                }
                
                /* Print-specific adjustments */
                .print-break {
                  page-break-before: always;
                }
                
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
            <div id="invoice-content" style={{ padding: '20px', backgroundColor: '#fff', fontFamily: 'Arial, sans-serif' }}>
            {/* Corporate Light Invoice Header */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              color: '#1e293b',
              padding: '20px',
              border: '2px solid #cbd5e1',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <Title level={2} style={{ 
                margin: 0, 
                fontWeight: 'bold', 
                textTransform: 'uppercase',
                color: '#334155',
                letterSpacing: '1px'
              }}>
TAX INVOICE
              </Title>
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#64748b', fontWeight: '500' }}>
                Professional Invoice Management System
              </div>
            </div>

            {/* Corporate Light Company and Party Details */}
            <table style={{ 
              width: '100%', 
              border: '1px solid #cbd5e1', 
              borderCollapse: 'collapse', 
              marginBottom: '15px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <tbody>
                {/* Company Details Row */}
                <tr>
                  <td style={{ 
                    width: '50%', 
                    border: '1px solid #e2e8f0', 
                    padding: '15px', 
                    verticalAlign: 'top',
                    borderRight: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '15px', 
                      marginBottom: '10px',
                      color: '#1e293b',
                      borderBottom: '1px solid #cbd5e1',
                      paddingBottom: '6px'
                    }}>
                      {/* Company Logo and Name */}
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        {company?.settings?.theme?.logo && (
                          <img 
                            src={company.settings.theme.logo} 
                            alt="Company Logo" 
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              marginRight: '15px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          {company?.name?.toUpperCase() || 'COMPANY NAME'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569' }}>
                      Address: {company?.contactInfo?.address?.street || 'Address'}, {company?.contactInfo?.address?.city || 'City'}<br />
                      State: {company?.contactInfo?.address?.state || 'State'}, PIN: {company?.contactInfo?.address?.postalCode || 'PIN'}<br />
                      Phone: {company?.contactInfo?.phone || 'Phone Number'}<br />
                      Email: {company?.contactInfo?.email || 'Email Address'}<br />
                      {company?.businessInfo?.gstNumber && (
                        <>GSTIN: <span style={{ fontWeight: '600', color: '#334155' }}>{company.businessInfo.gstNumber}</span><br /></>
                      )}
                      {company?.businessInfo?.website && (
                        <>Website: <span style={{ fontWeight: '600', color: '#334155' }}>{company.businessInfo.website}</span><br /></>
                      )}
                    </div>
                  </td>
                  <td style={{ 
                    width: '50%', 
                    border: '1px solid #e2e8f0', 
                    padding: '15px', 
                    verticalAlign: 'top',
                    backgroundColor: '#f1f5f9'
                  }}>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '14px', 
                      marginBottom: '10px',
                      color: '#1e293b',
                      borderBottom: '1px solid #cbd5e1',
                      paddingBottom: '6px'
                    }}>
Invoice Details
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569' }}>
                      Invoice No: <span style={{ fontWeight: '600', color: '#334155' }}>{viewingOrder?.orderNumber || 'N/A'}</span><br />
                      Invoice Date: <span style={{ fontWeight: '600', color: '#334155' }}>{viewingOrder?.createdAt ? dayjs(viewingOrder.createdAt).format('DD/MM/YYYY') : 'N/A'}</span><br />
                      Due Date: <span style={{ fontWeight: '600', color: '#334155' }}>{viewingOrder?.deliveryDate ? dayjs(viewingOrder.deliveryDate).format('DD/MM/YYYY') : 'N/A'}</span><br />
                      Place of Supply: <span style={{ fontWeight: '600', color: '#334155' }}>{company?.contactInfo?.address?.state || 'State'}</span><br />
                      Payment Terms: <span style={{ fontWeight: '600', color: '#334155' }}>{viewingOrder?.payment?.method || 'Cash'}</span><br />
                      Status: <span style={{ 
                        padding: '4px 10px', 
                        backgroundColor: (() => {
                          const status = viewingOrder?.status;
                          switch(status) {
                            case 'completed': return '#f0f9ff';
                            case 'pending': return '#fef3c7';
                            case 'processing': return '#eff6ff';
                            case 'shipped': return '#f0fdf4';
                            case 'cancelled': return '#fef2f2';
                            default: return '#f8fafc';
                          }
                        })(),
                        color: (() => {
                          const status = viewingOrder?.status;
                          switch(status) {
                            case 'completed': return '#0284c7';
                            case 'pending': return '#d97706';
                            case 'processing': return '#3b82f6';
                            case 'shipped': return '#10b981';
                            case 'cancelled': return '#dc2626';
                            default: return '#64748b';
                          }
                        })(),
                        border: `1px solid ${(() => {
                          const status = viewingOrder?.status;
                          switch(status) {
                            case 'completed': return '#0284c7';
                            case 'pending': return '#d97706';
                            case 'processing': return '#3b82f6';
                            case 'shipped': return '#10b981';
                            case 'cancelled': return '#dc2626';
                            default: return '#cbd5e1';
                          }
                        })()}`,
                        borderRadius: '6px',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                      }}>{viewingOrder?.status || 'Unknown'}</span>
                    </div>
                  </td>
                </tr>
                
                {/* Party Details Row */}
                <tr>
                  <td colSpan={2} style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '15px',
                    borderTop: '1px solid #cbd5e1',
                    backgroundColor: '#fefefe'
                  }}>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '14px', 
                      marginBottom: '10px',
                      color: '#1e293b',
                      borderBottom: '1px solid #cbd5e1',
                      paddingBottom: '6px'
                    }}>
                      👤 BILL TO PARTY:
                    </div>
                    {viewingOrder?.dealer ? (
                      <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569' }}>
                        <strong style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                          {viewingOrder.dealer.name || 'N/A'}
                        </strong>
                        {viewingOrder.dealer.businessName && (
                          <span style={{ color: '#64748b', fontWeight: '500' }}> ({viewingOrder.dealer.businessName})</span>
                        )}<br />
                        {viewingOrder.dealer.address && (
                          <>
                            📍 {[
                              viewingOrder.dealer.address.street,
                              viewingOrder.dealer.address.city,
                              viewingOrder.dealer.address.state && `${viewingOrder.dealer.address.state} - ${viewingOrder.dealer.address.postalCode || ''}`
                            ].filter(Boolean).join(', ')}<br />
                          </>
                        )}
                        {(viewingOrder.dealer.contactInfo?.primaryPhone || viewingOrder.dealer.contactInfo?.email) && (
                          <>
                            📞 {viewingOrder.dealer.contactInfo?.primaryPhone || 'N/A'}
                            {viewingOrder.dealer.contactInfo?.email && ` | 📧 ${viewingOrder.dealer.contactInfo.email}`}<br />
                          </>
                        )}
                        🆔 GSTIN: <span style={{ fontWeight: '600', color: '#334155' }}>{viewingOrder.dealer.gstNumber || 'N/A'}</span>
                        {viewingOrder.dealer.dealerCode && (
                          <span style={{ color: '#64748b', fontWeight: '500' }}> | 🏷️ Dealer Code: {viewingOrder.dealer.dealerCode}</span>
                        )}
                      </div>
                    ) : viewingOrder?.customer ? (
                      <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569' }}>
                        <strong style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                          {viewingOrder.customer.name || 'N/A'}
                        </strong><br />
                        {viewingOrder.customer.address && (
                          <>Address: {viewingOrder.customer.address}<br /></>
                        )}
                        {viewingOrder.customer.phone && (
                          <>Phone: {viewingOrder.customer.phone}</>
                        )}
                        {viewingOrder.customer.email && (
                          <> | Email: {viewingOrder.customer.email}</>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#ef4444', fontStyle: 'italic', fontWeight: '500' }}>
No party information available
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Corporate Light Items Table */}
            <table style={{ 
              width: '100%', 
              border: '1px solid #cbd5e1', 
              borderCollapse: 'collapse', 
              marginBottom: '15px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f1f5f9',
                  borderBottom: '2px solid #cbd5e1'
                }}>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'center', 
                    width: '50px',
                    color: '#334155'
                  }}>
S.No
                  </th>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'left',
                    color: '#334155'
                  }}>
Particulars
                  </th>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'center', 
                    width: '70px',
                    color: '#334155'
                  }}>
Qty
                  </th>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'center', 
                    width: '90px',
                    color: '#334155'
                  }}>
Rate
                  </th>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'center', 
                    width: '90px',
                    color: '#334155'
                  }}>
                    🎯 Disc.
                  </th>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'center', 
                    width: '70px',
                    color: '#334155'
                  }}>
Tax%
                  </th>
                  <th style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: '12px', 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    textAlign: 'center', 
                    width: '100px',
                    color: '#334155'
                  }}>
                    💵 Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {viewingOrder?.items?.length > 0 ? viewingOrder.items.map((item, index) => {
                  const subtotal = (item?.unitPrice || 0) * (item?.quantity || 0);
                  const discountAmount = item?.discountType === 'percentage' 
                    ? (subtotal * (item?.discount || 0)) / 100
                    : (item?.discount || 0);
                  const afterDiscount = subtotal - discountAmount;
                  const taxRate = (item?.igst || 0) + (item?.cgst || 0) + (item?.sgst || 0);
                  
                  return (
                    <tr key={item?._id || `item-${index}`} style={{
                      backgroundColor: index % 2 === 0 ? '#fefefe' : '#ffffff'
                    }}>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#64748b'
                      }}>
                        {index + 1}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px',
                        color: '#1e293b'
                      }}>
                        <div style={{ fontWeight: '600', color: '#334155' }}>
                          {item?.productName || item?.product?.name || '❓ Unknown Product'}
                        </div>
                        {item?.product?.description && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#64748b', 
                            marginTop: '3px',
                            fontStyle: 'italic'
                          }}>
                            {item.product.description}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#475569'
                      }}>
                        {item?.quantity || 0}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'right',
                        fontWeight: '600',
                        color: '#475569'
                      }}>
                        ₹{(item?.unitPrice || 0).toFixed(2)}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'right',
                        color: '#dc2626',
                        fontWeight: '600'
                      }}>
                        ₹{discountAmount.toFixed(2)}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'center',
                        fontWeight: '600',
                        color: '#475569'
                      }}>
                        {taxRate.toFixed(1)}%
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '12px', 
                        textAlign: 'right', 
                        fontWeight: '700',
                        color: '#1e293b',
                        backgroundColor: '#f8fafc'
                      }}>
                        ₹{(item?.totalPrice || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={{
                      border: '1px solid #cbd5e1',
                      padding: '20px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#dc2626',
                      fontStyle: 'italic',
                      backgroundColor: '#fef2f2'
                    }}>
No items found in this order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Corporate Light Totals Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap: '15px' }}>
              {/* Tax Summary */}
              <div style={{ width: '48%' }}>
                <table style={{ 
                  width: '100%', 
                  border: '1px solid #cbd5e1', 
                  borderCollapse: 'collapse',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#f1f5f9',
                      borderBottom: '2px solid #cbd5e1'
                    }}>
                      <th colSpan={2} style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '12px', 
                        fontSize: '13px', 
                        fontWeight: '700', 
                        textAlign: 'center',
                        color: '#334155'
                      }}>
TAX SUMMARY
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate GST breakdown from order items with null safety
                      let totalIgst = 0;
                      let totalCgst = 0;
                      let totalSgst = 0;
                      
                      viewingOrder?.items?.forEach(item => {
                        const itemSubtotal = (item?.unitPrice || 0) * (item?.quantity || 0);
                        const discountAmount = item?.discountType === 'percentage' 
                          ? (itemSubtotal * (item?.discount || 0)) / 100
                          : (item?.discount || 0);
                        const afterDiscount = itemSubtotal - discountAmount;
                        
                        if ((item?.igst || 0) > 0) {
                          totalIgst += (afterDiscount * (item?.igst || 0)) / 100;
                        } else {
                          totalCgst += (afterDiscount * (item?.cgst || 0)) / 100;
                          totalSgst += (afterDiscount * (item?.sgst || 0)) / 100;
                        }
                      });
                      
                      const hasAnyTax = totalIgst > 0 || totalCgst > 0 || totalSgst > 0;
                      
                      return (
                        <>
                          {totalIgst > 0 ? (
                            <tr style={{ backgroundColor: '#fefefe' }}>
                              <td style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '8px', 
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#475569'
                              }}>
IGST
                              </td>
                              <td style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '8px', 
                                fontSize: '11px', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: '#475569'
                              }}>
                                ₹{totalIgst.toFixed(2)}
                              </td>
                            </tr>
                          ) : null}
                          {totalCgst > 0 ? (
                            <tr style={{ backgroundColor: '#fefefe' }}>
                              <td style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '8px', 
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#475569'
                              }}>
CGST
                              </td>
                              <td style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '8px', 
                                fontSize: '11px', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: '#475569'
                              }}>
                                ₹{totalCgst.toFixed(2)}
                              </td>
                            </tr>
                          ) : null}
                          {totalSgst > 0 ? (
                            <tr style={{ backgroundColor: '#fefefe' }}>
                              <td style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '8px', 
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#475569'
                              }}>
SGST
                              </td>
                              <td style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '8px', 
                                fontSize: '11px', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: '#475569'
                              }}>
                                ₹{totalSgst.toFixed(2)}
                              </td>
                            </tr>
                          ) : null}
                          {!hasAnyTax && (
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <td colSpan={2} style={{ 
                                border: '1px solid #e2e8f0', 
                                padding: '12px', 
                                fontSize: '11px',
                                textAlign: 'center',
                                color: '#64748b',
                                fontStyle: 'italic'
                              }}>
                                🚫 No tax applicable
                              </td>
                            </tr>
                          )}
                          <tr style={{ 
                            backgroundColor: '#1e293b',
                            color: 'white'
                          }}>
                            <td style={{ 
                              border: '1px solid #334155', 
                              padding: '10px', 
                              fontSize: '12px', 
                              fontWeight: '700'
                            }}>
Total Tax
                            </td>
                            <td style={{ 
                              border: '1px solid #334155', 
                              padding: '10px', 
                              fontSize: '12px', 
                              textAlign: 'right', 
                              fontWeight: '700'
                            }}>
                              ₹{(totalIgst + totalCgst + totalSgst).toFixed(2)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Amount Summary */}
              <div style={{ width: '48%' }}>
                <table style={{ 
                  width: '100%', 
                  border: '1px solid #cbd5e1', 
                  borderCollapse: 'collapse',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <tbody>
                    <tr style={{ 
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #cbd5e1'
                    }}>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '12px', 
                        fontSize: '12px', 
                        fontWeight: '700',
                        color: '#334155'
                      }}>
Gross Amount
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '12px', 
                        fontSize: '12px', 
                        textAlign: 'right', 
                        fontWeight: '700',
                        color: '#334155'
                      }}>
                        ₹{(viewingOrder?.pricing?.subtotal || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#fefefe' }}>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px',
                        color: '#dc2626',
                        fontWeight: '600'
                      }}>
                        🎯 Less: Discount
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'right',
                        color: '#dc2626',
                        fontWeight: '600'
                      }}>
                        ₹{(viewingOrder?.pricing?.discount || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#fefefe' }}>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px',
                        color: '#475569',
                        fontWeight: '600'
                      }}>
Add: Total Tax
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: '10px', 
                        fontSize: '11px', 
                        textAlign: 'right',
                        color: '#475569',
                        fontWeight: '600'
                      }}>
                        ₹{(viewingOrder?.pricing?.tax || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ 
                      backgroundColor: '#1e293b',
                      color: '#ffffff'
                    }}>
                      <td style={{ 
                        border: '1px solid #334155', 
                        padding: '14px', 
                        fontSize: '14px', 
                        fontWeight: '700'
                      }}>
                        🏆 GRAND TOTAL
                      </td>
                      <td style={{ 
                        border: '1px solid #334155', 
                        padding: '14px', 
                        fontSize: '14px', 
                        textAlign: 'right', 
                        fontWeight: '700'
                      }}>
                        ₹{(viewingOrder?.pricing?.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Corporate Light Terms and Conditions / Notes */}
            {(viewingOrder?.notes?.customer || viewingOrder?.notes) && (
              <div style={{ 
                margin: '15px 0', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '12px', 
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  📝 REMARKS/NOTES:
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  lineHeight: '1.6',
                  padding: '15px',
                  backgroundColor: '#fefefe',
                  color: '#475569'
                }}>
                  {viewingOrder?.notes?.customer || viewingOrder?.notes || 'No remarks available'}
                </div>
              </div>
            )}

            {/* Corporate Light Amount in Words */}
            <div style={{ 
              margin: '15px 0', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                fontWeight: '700', 
                fontSize: '12px', 
                padding: '12px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                borderBottom: '1px solid #e2e8f0'
              }}>
                💬 Amount in Words:
              </div>
              <div style={{ 
                fontSize: '12px', 
                fontStyle: 'italic',
                padding: '15px',
                backgroundColor: '#fefefe',
                color: '#1e293b',
                fontWeight: '600'
              }}>
                {(() => {
                  const totalAmount = viewingOrder?.pricing?.total || 0;
                  const rupees = Math.floor(totalAmount);
                  const paise = Math.round((totalAmount % 1) * 100);
                  return `Indian Rupees ${rupees.toLocaleString('en-IN')}${paise > 0 ? ` and ${paise} Paise` : ''} Only`;
                })()}
              </div>
            </div>

            {/* Corporate Light Bank Details and Signature Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', gap: '15px' }}>
              <div style={{ 
                width: '48%', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '12px', 
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  🏦 BANK DETAILS:
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  lineHeight: '1.5',
                  padding: '15px',
                  backgroundColor: '#fefefe',
                  color: '#475569'
                }}>
                  Bank Name: <strong style={{ color: '#1e293b' }}>State Bank of India</strong><br />
                  Account No: <strong style={{ color: '#1e293b' }}>1234567890</strong><br />
                  IFSC Code: <strong style={{ color: '#1e293b' }}>SBIN0001234</strong><br />
                  Branch: <strong style={{ color: '#1e293b' }}>Milk City Branch</strong>
                </div>
              </div>
              
              <div style={{ 
                width: '48%', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px',
                overflow: 'hidden',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '12px', 
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  borderBottom: '1px solid #e2e8f0'
                }}>
AUTHORIZATION
                </div>
                <div style={{ 
                  padding: '20px 15px 15px 15px',
                  backgroundColor: '#fefefe',
                  color: '#475569',
                  minHeight: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '11px', 
                    marginBottom: '20px',
                    color: '#1e293b'
                  }}>
                    FOR {company?.name?.toUpperCase() || 'COMPANY NAME'}
                  </div>
                  <div style={{ 
                    borderTop: '1px solid #cbd5e1', 
                    paddingTop: '10px', 
                    fontSize: '10px',
                    fontWeight: '600',
                    color: '#64748b'
                  }}>
                    📝 Authorized Signatory
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate Light Footer */}
            <div style={{ 
              marginTop: '20px', 
              textAlign: 'center', 
              borderTop: '1px solid #cbd5e1', 
              paddingTop: '15px',
              fontSize: '10px',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              padding: '15px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '5px', color: '#475569' }}>
                This is a computer generated invoice and does not require signature
              </div>
              <div style={{ color: '#64748b' }}>
                Generated on {dayjs().format('DD/MM/YYYY HH:mm')} | Powered by Milk Distribution System
              </div>
            </div>
            </div>
          </>
        )}
      </Modal>

      {/* Payment Completion Modal */}
      <Modal
        title="Complete Payment"
        visible={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setPaymentOrder(null);
          setPaymentModalLoading(false);
        }}
        footer={null}
        width={600}
      >
        {paymentModalLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading latest payment information...</div>
          </div>
        ) : paymentOrder && (
          <Form
            layout="vertical"
            onFinish={handlePaymentComplete}
            initialValues={{
              paymentMethod: paymentOrder.payment?.method || 'cash',
              paidAmount: paymentOrder.payment?.dueAmount || paymentOrder.pricing?.total || 0
            }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Alert
                  type="info"
                  message={`Order: ${paymentOrder.orderNumber}`}
                  description={
                    <div>
                      <div>Total Amount: ₹{(paymentOrder.pricing?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div>Payment Method: {paymentOrder.payment?.method || 'cash'}</div>
                      <div>Current Status: {paymentOrder.payment?.status || 'pending'}</div>
                      {paymentOrder.payment?.paidAmount > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ color: '#52c41a' }}>Already Paid: ₹{(paymentOrder.payment.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          <div style={{ color: '#f5222d' }}>Remaining Due: ₹{(paymentOrder.payment.dueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                      )}
                    </div>
                  }
                  style={{ marginBottom: 20 }}
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="paymentMethod"
                  label="Payment Method"
                >
                  <Select disabled>
                    <Option value="cash">Cash</Option>
                    <Option value="card">Card</Option>
                    <Option value="bank-transfer">Bank Transfer</Option>
                    <Option value="digital-wallet">Digital Wallet</Option>
                    <Option value="credit">Credit</Option>
                    <Option value="cheque">Cheque</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="paidAmount"
                  label="Amount Received"
                  rules={[
                    { required: true, message: 'Please enter amount received' },
                    { type: 'number', min: 0, message: 'Amount must be positive' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Amount received"
                    prefix="₹"
                    min={0}
                    precision={2}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="transactionId"
                  label="Transaction ID (Optional)"
                >
                  <Input placeholder="Transaction reference number" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24} style={{ textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      setPaymentModalVisible(false);
                      setPaymentOrder(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<DollarOutlined />}
                  >
                    Complete Payment
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Orders;