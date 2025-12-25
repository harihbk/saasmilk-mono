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
  DownloadOutlined,
} from '@ant-design/icons';
import { ordersAPI, dealersAPI, customersAPI, dealerGroupsAPI, productsAPI, debugAPI, companiesAPI, invoicesAPI } from '../../services/api';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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





  const handleConvertToInvoice = async (order) => {
    try {
      Modal.confirm({
        title: 'Generate Invoice',
        content: `Are you sure you want to generate an invoice for Order #${order.orderNumber}?`,
        onOk: async () => {
          try {
            const response = await invoicesAPI.createInvoiceFromOrder(order._id);
            if (response.data.success) {
              message.success('Invoice generated successfully');
              fetchOrders(); // Refresh orders to update UI (hide convert button)
              // Optionally redirect to invoice or show invoice details
              // For now we just stay on orders page
            }
          } catch (error) {
            console.error('Error generating invoice:', error);
            if (error.response?.data?.message) {
              message.error(error.response.data.message);
            } else {
              message.error('Failed to generate invoice');
            }
          }
        }
      });
    } catch (error) {
      console.error('Error in conversion handler:', error);
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
      let individualPricing = [];
      let groupPricing = [];

      // Fetch individual dealer pricing first
      try {
        const indResponse = await dealersAPI.getDealerPricing(dealerId);
        individualPricing = indResponse.data.data.pricing || [];
      } catch (err) {
        console.error('Error fetching individual dealer pricing:', err);
      }

      // Fetch group pricing if dealer belongs to a group
      if (dealer && dealer.dealerGroup) {
        // Handle dealerGroup being an ID or populated object
        const groupId = dealer.dealerGroup._id || dealer.dealerGroup;
        if (groupId) {
          try {
            const groupResponse = await dealerGroupsAPI.getDealerGroupPricing(groupId);
            groupPricing = groupResponse.data.data.pricing || [];
          } catch (err) {
            console.error('Error fetching dealer group pricing:', err);
          }
        }
      }

      // prioritize: Individual > Group > Base (Base is handled in getProductPrice if no entry found here)
      const pricingMap = new Map();

      // 1. Add Group Pricing (Backup)
      groupPricing.forEach(p => {
        if (p.product && p.product._id) {
          pricingMap.set(p.product._id, { ...p, _priority: 'group' });
        }
      });

      // 2. Add Individual Pricing (Override)
      individualPricing.forEach(p => {
        if (p.product && p.product._id) {
          pricingMap.set(p.product._id, { ...p, _priority: 'individual' });
        }
      });

      setDealerPricing(Array.from(pricingMap.values()));
    } catch (error) {
      console.error('Error in fetchDealerPricing:', error);
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
      setGlobalDiscount(0); // Reset for dealers (they use per-product pricing)
      await fetchDealerPricing(buyerId);
    } else if (orderType === 'customer' && buyerId) {
      const customer = customers.find(c => c._id === buyerId);
      setBuyerBalance(customer?.financialInfo?.currentBalance || 0);

      // Apply customer's default discount
      const customerDiscount = customer?.financialInfo?.discountPercentage || 0;
      if (customerDiscount > 0) {
        setGlobalDiscount(customerDiscount);
        setGlobalDiscountType('percentage');
        message.info(`Applied customer discount: ${customerDiscount}%`);
      } else {
        setGlobalDiscount(0);
      }

      setDealerPricing([]); // Customers use base prices
    } else {
      setBuyerBalance(0);
      setGlobalDiscount(0);
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

  // Helper to calculate totals from a list of items
  const calculateOrderDetailsHelper = (items) => {
    let totalLitres = 0;
    let totalKg = 0;
    let totalPackages = 0;
    let totalUnits = 0;
    const packageBreakdown = {};

    items.forEach(item => {
      // Handle both raw product object (creation) and populated product (view)
      let product = null;
      if (item.product && item.product.packaging) {
        product = item.product;
      } else if (item.productId) {
        product = products.find(p => p._id === item.productId);
      }

      const quantity = item.quantity || 0;
      let multiplier = 1;

      // Determine items per pack (multiplier)
      if (product && product.unit) {
        const parsedUnit = parseFloat(product.unit);
        if (!isNaN(parsedUnit) && parsedUnit > 0) {
          multiplier = parsedUnit;
        }
      }

      // Calculate Total Units (Base Items)
      totalUnits += quantity * multiplier;

      // Calculate Packages (Crates, Cartons, Bags, Boxes)
      if (product && product.packaging && ['crate', 'carton', 'bag', 'box'].includes(product.packaging.type)) {
        totalPackages += quantity;

        // Track breakdown
        const type = product.packaging.type; // crate, carton, etc
        packageBreakdown[type] = (packageBreakdown[type] || 0) + quantity;
      }

      if (product?.packaging?.size?.value) {
        let volume = parseFloat(product.packaging.size.value);
        const unit = product.packaging.size.unit?.toLowerCase();

        // multiplier is already calculated above, use it here too if logic requires
        // Current logic in file used:
        // if (['crate', 'carton', 'bag', 'box'].includes(product.packaging.type) && product.unit) { ... }
        // The previous logic for multiplier seems consistent with my new multiplier logic,
        // but let's stick to the existing volume calculation structure to be safe, just using the new multiplier variable if applicable for volume

        // Re-deriving multiplier strictly for volume to avoid side effects if 'unit' means something else for non-package types
        let volumeMultiplier = 1;
        if (['crate', 'carton', 'bag', 'box'].includes(product?.packaging?.type) && product?.unit) {
          const parsed = parseFloat(product.unit);
          if (!isNaN(parsed)) volumeMultiplier = parsed;
        }

        const totalSize = volume * volumeMultiplier * quantity;

        if (unit === 'ml') {
          totalLitres += totalSize / 1000;
        } else if (unit === 'l' || unit === 'liter' || unit === 'liters') {
          totalLitres += totalSize;
        } else if (unit === 'g' || unit === 'gram' || unit === 'grams') {
          totalKg += totalSize / 1000;
        } else if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
          totalKg += totalSize;
        }
      }
    });

    // If totalUnits equals totalPackages (e.g. everything is 1 per pack), we might hide it or show it.
    // User requested "bring based on products bring total no of package units".
    return { totalLitres, totalKg, totalPackages, totalUnits, packageBreakdown };
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

    // Use Helper for Units/Packages
    const { totalLitres, totalKg, totalPackages, packageBreakdown } = calculateOrderDetailsHelper(orderItems);

    // Apply global discount
    let globalDiscountAmount = 0;
    if (globalDiscountType === 'percentage') {
      globalDiscountAmount = (grandTotal * globalDiscount) / 100;
    } else {
      globalDiscountAmount = globalDiscount || 0;
    }

    // Apply custom adjustment (subtract or add based on operation)
    let adjustmentAmount = 0;
    const op = customAdjustment.operation || 'subtract';
    const isAddition = op === 'add';

    if (customAdjustment.amount && customAdjustment.text?.trim()) {
      if (customAdjustment.type === 'percentage') {
        adjustmentAmount = (grandTotal * Number(customAdjustment.amount)) / 100;
      } else {
        adjustmentAmount = Number(customAdjustment.amount) || 0;
      }
    }

    // Final total includes all discounts and adjustments
    let finalTotal = grandTotal - globalDiscountAmount;

    if (isAddition) {
      finalTotal = finalTotal + adjustmentAmount;
    } else {
      finalTotal = finalTotal - adjustmentAmount;
    }

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
      totalLitres,
      totalKg,
      totalPackages,
      packageBreakdown
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
    setCustomAdjustment({ text: '', amount: 0, type: 'fixed', operation: 'subtract' });
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
        setBuyerBalance(order.customer.financialInfo?.currentBalance || 0);
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

    // Handle notes object properly
    const notesValue = typeof order.notes === 'object' && order.notes !== null
      ? (order.notes.customer || order.notes.internal || order.notes.delivery || '')
      : (order.notes || '');

    console.log('Setting form values:', {
      status: order.status,
      notes: notesValue,
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
        notes: notesValue,
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
        packageCount: totals.totalPackages, // Store package count

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
          method: values.paymentMethod || 'Not Paid',
          status: (() => {
            const existingPaid = editingOrder ? (editingOrder.payment?.paidAmount || 0) : 0;
            const due = Math.max(0, totals.finalTotal - existingPaid);
            if (due < 1) return 'completed';
            if (existingPaid > 0) return 'partial';
            return 'pending';
          })(),
          paidAmount: editingOrder ? (editingOrder.payment?.paidAmount || 0) : 0,
          dueAmount: Math.max(0, totals.finalTotal - (editingOrder ? (editingOrder.payment?.paidAmount || 0) : 0)),
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
      // Write the basic HTML structure
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${viewingOrder?.orderNumber || 'N/A'}</title>
          <style>
             /* Add custom print overrides */
             @media print {
               @page { margin: 10mm; }
               body { -webkit-print-color-adjust: exact; }
             }
             body {
               background: white;
               padding: 20px;
             }
          </style>
        </head>
        <body>
          <div id="invoice-content">${invoiceContent.innerHTML}</div>
        </body>
        </html>
      `);

      // Copy all stylesheets from parent
      Array.from(document.querySelectorAll('style')).forEach(style => {
        printWindow.document.head.appendChild(style.cloneNode(true));
      });
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
        printWindow.document.head.appendChild(link.cloneNode(true));
      });

      printWindow.document.close();

      // Wait for resources to load then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await ordersAPI.deleteOrder(orderId);
      message.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete order';
      message.error(errorMessage);
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
          const customerName = record.customer.displayName ||
            `${record.customer.personalInfo?.firstName || ''} ${record.customer.personalInfo?.lastName || ''}`.trim() ||
            record.customer.name;

          return (
            <div>
              <UserOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              <div><strong>Customer:</strong> {customerName}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {record.customer.personalInfo?.email || record.customer.email}
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
                Via Discount: {pricing.globalDiscountType === 'percentage' ? `${pricing.globalDiscount}%` : `₹${pricing.globalDiscount}`}
              </div>
            )}
            {hasCustomAdjustment && (
              <div style={{ fontSize: '12px', color: pricing.customAdjustment.operation === 'add' ? '#faad14' : '#1890ff' }}>
                Via {pricing.customAdjustment.text || 'Adjustment'}: {pricing.customAdjustment.operation === 'add' ? '+' : '-'}₹{pricing.customAdjustment.amount}
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
            title="View Invoice"
            onClick={() => showInvoiceModal(record)}
          />
          {!record.invoice && (
            <Button
              type="text"
              icon={<FileTextOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleConvertToInvoice(record)}
              title="Convert to Invoice"
            />
          )}
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
      return customers.map(customer => {
        const displayName = customer.displayName ||
          `${customer.personalInfo?.firstName || ''} ${customer.personalInfo?.lastName || ''}`.trim() ||
          customer.name;

        return (
          <Option key={customer._id} value={customer._id}>
            <div>
              <div><strong>{displayName}</strong></div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {customer.personalInfo?.email} • {customer.personalInfo?.phone?.primary}
              </div>
              {customer.accountBalance && (
                <div style={{ fontSize: '12px', color: '#1890ff' }}>
                  Balance: ₹{customer.accountBalance.toLocaleString()}
                </div>
              )}
            </div>
          </Option>
        );
      });
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showCreateOrderModal}
          size="large"
        >
          Create New Order
        </Button>
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
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={6}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>ORDER TYPE</Text>
              </div>
              <Radio.Group
                value={orderType}
                onChange={(e) => handleOrderTypeChange(e.target.value)}
                style={{ width: '100%' }}
                buttonStyle="solid"
                size="middle"
              >
                <Radio.Button value="dealer" style={{ width: '50%', textAlign: 'center' }}>
                  <TeamOutlined /> Dealer
                </Radio.Button>
                <Radio.Button value="customer" style={{ width: '50%', textAlign: 'center' }}>
                  <UserOutlined /> Consumer
                </Radio.Button>
              </Radio.Group>
            </Col>

            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  SELECT {orderType === 'dealer' ? 'DEALER' : 'CUSTOMER'}
                </Text>
              </div>
              <Select
                style={{ width: '100%', height: '32px' }}
                placeholder={`Search & Select ${orderType === 'dealer' ? 'Dealer' : 'Customer'}...`}
                showSearch
                value={selectedBuyer}
                onChange={handleBuyerChange}
                optionFilterProp="children"
                size="middle"
                className="premium-select"
              >
                {getBuyerOptions()}
              </Select>
            </Col>

            <Col span={6}>
              {selectedBuyer ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>WALLET BALANCE</Text>
                  </div>
                  <div style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    backgroundColor: buyerBalance > 0 ? '#fff1f0' : buyerBalance < 0 ? '#f6ffed' : '#f5f5f5',
                    border: `1px solid ${buyerBalance > 0 ? '#ffa39e' : buyerBalance < 0 ? '#b7eb8f' : '#d9d9d9'}`,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: buyerBalance > 0 ? '#cf1322' : buyerBalance < 0 ? '#389e0d' : 'rgba(0,0,0,0.65)'
                  }}>
                    ₹{Math.abs(buyerBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: '12px', marginLeft: 4 }}>
                      {buyerBalance !== 0 && (buyerBalance > 0 ? 'DR' : 'CR')}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ height: '58px' }}></div> // Spacer to prevent layout shift
              )}
            </Col>
          </Row>

          {/* Order Details, Payment & Shipping */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
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

            <Col span={8}>
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

            <Col span={8}>
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
                  style={{
                    marginBottom: 16,
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  headStyle={{
                    background: '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px'
                  }}
                  title={
                    <Space>
                      <Text strong style={{ color: '#595959' }}>Item {index + 1}</Text>
                      {product && (
                        <Tag color={pricing.hasCustomPricing ? 'blue' : 'cyan'}>
                          {pricing.hasCustomPricing ? 'Different Price' : 'Base Price'}
                        </Tag>
                      )}
                      {stockInfo && (
                        <Tag
                          color={stockInfo.status === 'available' ? 'success' :
                            stockInfo.status === 'insufficient' ? 'warning' : 'error'}
                          style={{ fontSize: '11px', border: 'none' }}
                        >
                          {stockInfo.status === 'available'
                            ? `✓ ${stockInfo.available} in stock`
                            : stockInfo.status === 'insufficient'
                              ? `⚠ Only ${stockInfo.available} left`
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
                      style={{ opacity: 0.7 }}
                    >
                      Remove
                    </Button>
                  }
                >
                  <Row gutter={12} align="bottom">
                    {/* Product - Span 8 */}
                    <Col span={8}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product</Text>
                      </div>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Select product"
                        value={item.productId}
                        onChange={(value) => updateOrderItem(index, 'productId', value)}
                        showSearch
                        optionFilterProp="children"
                        size="large"
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

                    {/* Quantity - Span 4 */}
                    <Col span={4}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</Text>
                      </div>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        value={item.quantity}
                        onChange={(value) => updateOrderItem(index, 'quantity', value)}
                        size="large"
                      />
                    </Col>

                    {/* Price - Span 4 */}
                    <Col span={4}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</Text>
                      </div>
                      <InputNumber
                        value={item.unitPrice}
                        formatter={value => `₹${value}`}
                        disabled
                        size="large"
                        style={{ width: '100%', backgroundColor: '#fafafa', color: '#595959' }}
                      />
                    </Col>

                    {/* Discount - Span 4 */}
                    <Col span={4}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Discount</Text>
                      </div>
                      <Space.Compact style={{ width: '100%' }}>
                        <InputNumber
                          style={{ width: '65%' }}
                          min={0}
                          max={item.discountType === 'percentage' ? 50 : 10000}
                          value={item.discount}
                          onChange={(value) => updateOrderItem(index, 'discount', value)}
                          size="large"
                        />
                        <Select
                          style={{ width: '35%' }}
                          value={item.discountType}
                          onChange={(value) => updateOrderItem(index, 'discountType', value)}
                          size="large"
                        >
                          <Option value="percentage">%</Option>
                          <Option value="fixed">₹</Option>
                        </Select>
                      </Space.Compact>
                    </Col>

                    {/* Total - Span 4 */}
                    <Col span={4}>
                      <div style={{ marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</Text>
                      </div>
                      <div style={{
                        padding: '0 12px',
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: '6px',
                        textAlign: 'right',
                        height: '40px',
                        lineHeight: '38px',
                        width: '100%'
                      }}>
                        <Text strong style={{ color: '#389e0d', fontSize: '15px' }}>
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
                        style={{ width: '30%' }}
                        value={customAdjustment.type}
                        onChange={(value) => {
                          console.log('CustomAdjustment type onChange:', value);
                          setCustomAdjustment({ ...customAdjustment, type: value });
                        }}
                        size="small"
                      >
                        <Select.Option value="fixed">₹</Select.Option>
                        <Select.Option value="percentage">%</Select.Option>
                      </Select>
                    </Space.Compact>
                  </Col>
                  <Col span={6}>
                    <Select
                      style={{ width: '100%' }}
                      value={customAdjustment.operation || 'subtract'}
                      onChange={(value) => {
                        setCustomAdjustment({ ...customAdjustment, operation: value });
                      }}
                      size="small"
                    >
                      <Select.Option value="subtract">Deduct (-)</Select.Option>
                      <Select.Option value="add">Add Charge (+)</Select.Option>
                    </Select>
                  </Col>
                  <Col span={6}>
                    <Text type={customAdjustment.operation === 'add' ? 'warning' : 'danger'}>
                      {customAdjustment.operation === 'add' ? '+' : '-'}₹{orderTotals.adjustmentAmount.toFixed(2)}
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

              {/* Unit Totals */}
              {(orderTotals.totalLitres > 0 || orderTotals.totalKg > 0 || orderTotals.totalUnits > 0) && (
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  {orderTotals.totalLitres > 0 && (
                    <Col span={6}>
                      <Text strong style={{ fontSize: '12px' }}>Total Litres: {orderTotals.totalLitres.toFixed(2)} L</Text>
                    </Col>
                  )}
                  {orderTotals.totalKg > 0 && (
                    <Col span={6}>
                      <Text strong style={{ fontSize: '12px' }}>Total Kg: {orderTotals.totalKg.toFixed(2)} Kg</Text>
                    </Col>
                  )}
                  {orderTotals.totalUnits > 0 && (
                    <Col span={6}>
                      <Text strong style={{ fontSize: '12px' }}>Total Units: {orderTotals.totalUnits}</Text>
                    </Col>
                  )}
                </Row>
              )}

              {/* Dynamic Package Breakdown - Below Total Litres */}
              {Object.entries(orderTotals.packageBreakdown || {}).map(([type, count]) => (
                <Row key={type} gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={12}>
                    <Text strong style={{ fontSize: '13px', textTransform: 'capitalize' }}>
                      Total {type}s:
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Input
                      value={count}
                      readOnly
                      size="small"
                      style={{ fontWeight: 'bold', color: '#1890ff', textAlign: 'right' }}
                    />
                  </Col>
                </Row>
              ))}

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
        width={1100}
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
                  key: 'product',
                  render: (_, record) => {
                    const productName = record.productName ||
                      record.product?.name ||
                      record.productId?.name ||
                      'Unknown Product';
                    const sku = record.product?.sku || record.sku;

                    return (
                      <div>
                        <div style={{ fontWeight: 500 }}>{productName}</div>
                        {sku && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            SKU: {sku}
                          </div>
                        )}
                        {record.product?.taxMethod === 'inclusive' && (
                          <Tag color="purple" style={{ fontSize: '10px', marginTop: 2 }}>Inc. Tax</Tag>
                        )}
                      </div>
                    );
                  },
                },
                {
                  title: 'Packaging',
                  key: 'packaging',
                  render: (_, record) => {
                    const packaging = record.product?.packaging;
                    if (!packaging?.size?.value) return '-';
                    return (
                      <Tag color="blue">
                        {packaging.size.value} {packaging.size.unit} ({packaging.type})
                      </Tag>
                    );
                  }
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

            <Divider orientation="left">GST Breakdown</Divider>
            <Table
              dataSource={viewingOrder.items.map((item, idx) => {
                const product = item.product || {};
                const isInclusive = product.taxMethod === 'inclusive';

                // Rates
                const igstRate = item.igst || 0;
                const cgstRate = item.cgst || 0;
                const sgstRate = item.sgst || 0;
                const totalRate = igstRate + cgstRate + sgstRate;

                // Amounts
                const quantity = item.quantity || 0;
                const unitPrice = item.unitPrice || 0;
                const grossTotal = quantity * unitPrice;

                // Calculate Taxable Value
                let taxableValue = 0;
                if (isInclusive) {
                  // If Inc: Taxable = Gross / (1 + Rate/100)
                  taxableValue = grossTotal / (1 + (totalRate / 100));
                } else {
                  // If Exc: Taxable = Gross (approx, minus discount if applicable logically, but here utilizing gross basis)
                  // Wait: Backend logic `item.totalPrice` = (Qty*Price)-Disc. 
                  // Let's rely on item.totalPrice as base if exclusive? 
                  // No, usually GST is on Post-Discount value.
                  // Let's use item.totalPrice (which is after discount).
                  // BUT item.totalPrice logic in backend DOES NOT mention tax inclusion/exclusion removal.
                  // Assuming item.totalPrice is the FINAL price for line item.

                  // Let's re-calculate cleanly:
                  const totalAfterDiscount = ((item.unitPrice || 0) * (item.quantity || 0)) - (item.discount || 0); // Discount logic varies (percentage/fixed), but item.discount is usually the AMOUNT in schema? No, look at `updateOrderItem`.
                  // Actually, let's simplify and use the stored taxAmount if available as a check?
                  // Let's recalculate based on standard inclusive/exclusive formulas for display accuracy.

                  const itemTotal = (item.unitPrice || 0) * (item.quantity || 0); // Raw total
                  // Note: Discount handling is tricky without seeing full logic, but let's assume Taxable Value is Pre-Tax.

                  // Simple Logic for View: 
                  // Case 1: Exclusive. Taxable = UnitPrice * Qty. Tax = Taxable * Rate.
                  // Case 2: Inclusive. Taxable = (UnitPrice * Qty) / (1+Rate).
                }

                // Better Approach: Use the stored `taxAmount` to derive Taxable if possible, or recalculate.
                // Let's implement Recalculation based on available fields to ensure consistency.

                const baseAmount = ((item.unitPrice || 0) * (item.quantity || 0));

                // If item has discount, we should subtract it first? Usually yes.
                // item.discount IS the amount? 
                let discountAmt = 0;
                if (item.discountType === 'percentage') {
                  discountAmt = (baseAmount * (item.discount || 0)) / 100;
                } else {
                  discountAmt = item.discount || 0;
                }

                const amountAfterDiscount = baseAmount - discountAmt;

                if (isInclusive) {
                  taxableValue = amountAfterDiscount / (1 + (totalRate / 100));
                } else {
                  taxableValue = amountAfterDiscount;
                }

                return {
                  key: idx,
                  productName: product.name || 'Unknown',
                  hsn: product.hsnCode || '-',
                  taxableValue: taxableValue,
                  igstRate: igstRate,
                  igstAmount: igstRate > 0 ? (taxableValue * igstRate / 100) : 0,
                  cgstRate: cgstRate,
                  cgstAmount: cgstRate > 0 ? (taxableValue * cgstRate / 100) : 0,
                  sgstRate: sgstRate,
                  sgstAmount: sgstRate > 0 ? (taxableValue * sgstRate / 100) : 0,
                };
              })}
              pagination={false}
              size="small"
              bordered
              columns={[
                { title: 'Product', dataIndex: 'productName', key: 'productName' },
                { title: 'HSN/SAC', dataIndex: 'hsn', key: 'hsn' },
                {
                  title: 'Taxable Value',
                  dataIndex: 'taxableValue',
                  key: 'taxableValue',
                  align: 'right',
                  render: (val) => `₹${val.toFixed(2)}`
                },
                {
                  title: 'CGST',
                  children: [
                    { title: 'Rate', dataIndex: 'cgstRate', key: 'cgstRate', render: r => `${r}%`, align: 'right' },
                    { title: 'Amt', dataIndex: 'cgstAmount', key: 'cgstAmount', render: v => `₹${v.toFixed(2)}`, align: 'right' }
                  ]
                },
                {
                  title: 'SGST',
                  children: [
                    { title: 'Rate', dataIndex: 'sgstRate', key: 'sgstRate', render: r => `${r}%`, align: 'right' },
                    { title: 'Amt', dataIndex: 'sgstAmount', key: 'sgstAmount', render: v => `₹${v.toFixed(2)}`, align: 'right' }
                  ]
                },
                {
                  title: 'IGST',
                  children: [
                    { title: 'Rate', dataIndex: 'igstRate', key: 'igstRate', render: r => `${r}%`, align: 'right' },
                    { title: 'Amt', dataIndex: 'igstAmount', key: 'igstAmount', render: v => `₹${v.toFixed(2)}`, align: 'right' }
                  ]
                },
                {
                  title: 'Total Tax',
                  key: 'totalTax',
                  align: 'right',
                  render: (_, r) => <Text strong>₹{(r.cgstAmount + r.sgstAmount + r.igstAmount).toFixed(2)}</Text>
                }
              ]}
              summary={pageData => {
                let totalTaxable = 0;
                let totalTax = 0;
                pageData.forEach(({ taxableValue, cgstAmount, sgstAmount, igstAmount }) => {
                  totalTaxable += taxableValue;
                  totalTax += (cgstAmount + sgstAmount + igstAmount);
                });
                return (
                  <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">₹{totalTaxable.toFixed(2)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={6}></Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">₹{totalTax.toFixed(2)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />

            <Row justify="end" style={{ marginTop: 16 }}>
              <Col span={12}>
                <Descriptions
                  size="small"
                  bordered
                  column={1}
                  labelStyle={{ width: '140px', fontWeight: 600 }}
                  contentStyle={{ textAlign: 'right', fontWeight: 500 }}
                >
                  <Descriptions.Item label="Subtotal">
                    ₹{(viewingOrder.pricing?.subtotal || 0).toFixed(2)}
                  </Descriptions.Item>
                  {viewingOrder.pricing?.globalDiscount > 0 && (
                    <Descriptions.Item label={`Global Discount (${viewingOrder.pricing.globalDiscountType === 'percentage' ? viewingOrder.pricing.globalDiscount + '%' : 'Fixed'})`}>
                      <Text type="danger">
                        -₹{viewingOrder.pricing.globalDiscountType === 'percentage'
                          ? (((viewingOrder.pricing.subtotal + viewingOrder.pricing.tax) * viewingOrder.pricing.globalDiscount) / 100).toFixed(2)
                          : (viewingOrder.pricing.globalDiscount || 0).toFixed(2)}
                      </Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Tax">
                    ₹{(viewingOrder.pricing?.tax || 0).toFixed(2)}
                  </Descriptions.Item>
                  {viewingOrder.pricing?.customAdjustment && Number(viewingOrder.pricing.customAdjustment.amount) !== 0 && (
                    <Descriptions.Item label={viewingOrder.pricing.customAdjustment.name || viewingOrder.pricing.customAdjustment.text || "Adjustment"}>
                      <Text type={viewingOrder.pricing.customAdjustment.operation === 'add' ? 'warning' : 'success'}>
                        {viewingOrder.pricing.customAdjustment.operation === 'add' ? '+' : '-'}₹{Number(viewingOrder.pricing.customAdjustment.amount).toFixed(2)}
                      </Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Total Amount">
                    <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                      ₹{(viewingOrder.pricing?.total || 0).toFixed(2)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>

                {/* Calculated Package & Unit Totals for View Modal */}
                {(() => {
                  // Calculate totals dynamically from viewingOrder.items
                  const { totalLitres, totalKg, packageBreakdown } = calculateOrderDetailsHelper(viewingOrder.items || []);

                  return (
                    <div style={{ marginTop: 24, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>Package Summary:</Text>
                      <Row gutter={16}>
                        {totalLitres > 0 && (
                          <Col span={6}>
                            <Statistic title="Total Litres" value={totalLitres} precision={2} suffix="L" valueStyle={{ fontSize: 16 }} />
                          </Col>
                        )}
                        {totalKg > 0 && (
                          <Col span={6}>
                            <Statistic title="Total Kg" value={totalKg} precision={2} suffix="Kg" valueStyle={{ fontSize: 16 }} />
                          </Col>
                        )}

                        {/* Dynamic Package Breakdown */}
                        {Object.entries(packageBreakdown || {}).map(([type, count]) => (
                          <Col span={6} key={type}>
                            <Statistic
                              title={`Total ${type.charAt(0).toUpperCase() + type.slice(1)}s`}
                              value={count}
                              valueStyle={{ fontSize: 16, color: '#1890ff' }}
                            />
                          </Col>
                        ))}
                      </Row>
                    </div>
                  );
                })()}

              </Col>
            </Row>

            {(viewingOrder.notes?.customer || viewingOrder.notes?.internal || viewingOrder.notes?.delivery) && (
              <>
                <Divider orientation="left">Notes</Divider>
                {viewingOrder.notes?.customer && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Customer Notes: </Text>
                    <Text>{viewingOrder.notes.customer}</Text>
                  </div>
                )}
                {viewingOrder.notes?.internal && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Internal Notes: </Text>
                    <Text>{viewingOrder.notes.internal}</Text>
                  </div>
                )}
                {viewingOrder.notes?.delivery && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>Delivery Notes: </Text>
                    <Text>{viewingOrder.notes.delivery}</Text>
                  </div>
                )}
              </>
            )}
          </div>
        )
        }
      </Modal >

      {/* Invoice Modal */}
      < Modal
        title={
          < Space >
            <FileTextOutlined />
            Invoice
            < Button
              type="primary"
              icon={< PrinterOutlined />}
              onClick={handlePrintInvoice}
              size="small"
              className="no-print"
            >
              Print
            </Button >
            <Button
              type="default"
              icon={<DownloadOutlined />}
              onClick={handlePrintInvoice}
              size="small"
              className="no-print"
            >
              Download
            </Button>
          </Space >
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
            <div id="invoice-content" style={{ padding: '20px', backgroundColor: '#fff' }}>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Title level={3} style={{ margin: 0 }}>TAX INVOICE</Title>
              </div>

              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Order Number">
                  {viewingOrder.orderNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Date">
                  {dayjs(viewingOrder.createdAt).format('MMM DD, YYYY')}
                </Descriptions.Item>
                {viewingOrder.dealer && (
                  <>
                    <Descriptions.Item label="Dealer">
                      {viewingOrder.dealer.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Group">
                      {viewingOrder.dealer.dealerGroup?.name}
                    </Descriptions.Item>
                  </>
                )}
                {viewingOrder.customer && (
                  <>
                    <Descriptions.Item label="Customer">
                      {viewingOrder.customer.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      {viewingOrder.customer.email}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="Status">
                  {viewingOrder.status?.toUpperCase()}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              {/* Items Table */}
              <Table
                dataSource={viewingOrder.items}
                pagination={false}
                size="small"
                bordered
                columns={[
                  {
                    title: 'Product',
                    key: 'product',
                    render: (_, record) => {
                      const productName = record.productName ||
                        record.product?.name ||
                        record.productId?.name ||
                        'Unknown Product';
                      const sku = record.product?.sku || record.sku;

                      return (
                        <div>
                          <div style={{ fontWeight: 500 }}>{productName}</div>
                          {sku && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              SKU: {sku}
                            </div>
                          )}
                          {record.product?.taxMethod === 'inclusive' && (
                            <Tag color="purple" style={{ fontSize: '10px', marginTop: 2 }}>Inc. Tax</Tag>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    title: 'Packaging',
                    key: 'packaging',
                    render: (_, record) => {
                      const packaging = record.product?.packaging;
                      if (!packaging?.size?.value) return '-';
                      return (
                        <Tag color="blue">
                          {packaging.size.value} {packaging.size.unit} ({packaging.type})
                        </Tag>
                      );
                    }
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
                    title: 'Total',
                    dataIndex: 'totalPrice',
                    key: 'totalPrice',
                    align: 'right',
                    render: (total) => <strong>₹{(total || 0).toFixed(2)}</strong>,
                  }
                ]}
              />

              <div style={{ marginTop: 20 }}>
                <p style={{ fontWeight: 'bold' }}>GST Breakdown:</p>
                <Table
                  dataSource={viewingOrder.items.map((item, idx) => {
                    const product = item.product || {};
                    const isInclusive = product.taxMethod === 'inclusive';
                    const igstRate = item.igst || 0;
                    const cgstRate = item.cgst || 0;
                    const sgstRate = item.sgst || 0;
                    const quantity = item.quantity || 0;
                    const unitPrice = item.unitPrice || 0;

                    const baseAmount = ((item.unitPrice || 0) * (item.quantity || 0));
                    let discountAmt = 0;
                    if (item.discountType === 'percentage') {
                      discountAmt = (baseAmount * (item.discount || 0)) / 100;
                    } else {
                      discountAmt = item.discount || 0;
                    }
                    const amountAfterDiscount = baseAmount - discountAmt;

                    let taxableValue = 0;
                    const totalRate = igstRate + cgstRate + sgstRate;
                    if (isInclusive) {
                      taxableValue = amountAfterDiscount / (1 + (totalRate / 100));
                    } else {
                      taxableValue = amountAfterDiscount;
                    }

                    return {
                      key: idx,
                      productName: product.name || 'Unknown',
                      hsn: product.hsnCode || '-',
                      taxableValue: taxableValue,
                      igstRate, igstAmount: igstRate > 0 ? (taxableValue * igstRate / 100) : 0,
                      cgstRate, cgstAmount: cgstRate > 0 ? (taxableValue * cgstRate / 100) : 0,
                      sgstRate, sgstAmount: sgstRate > 0 ? (taxableValue * sgstRate / 100) : 0,
                    };
                  })}
                  pagination={false}
                  size="small"
                  bordered
                  columns={[
                    { title: 'Product', dataIndex: 'productName', key: 'productName' },
                    { title: 'HSN/SAC', dataIndex: 'hsn', key: 'hsn' },
                    {
                      title: 'Taxable Value',
                      dataIndex: 'taxableValue',
                      key: 'taxableValue',
                      align: 'right',
                      render: (val) => `₹${val.toFixed(2)}`
                    },
                    {
                      title: 'Total Tax',
                      key: 'totalTax',
                      align: 'right',
                      render: (_, r) => `₹${(r.cgstAmount + r.sgstAmount + r.igstAmount).toFixed(2)}`
                    }
                  ]}
                  summary={pageData => {
                    let totalTaxable = 0;
                    let totalTax = 0;
                    pageData.forEach(({ taxableValue, cgstAmount, sgstAmount, igstAmount }) => {
                      totalTaxable += taxableValue;
                      totalTax += (cgstAmount + sgstAmount + igstAmount);
                    });
                    return (
                      <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                        <Table.Summary.Cell index={0} colSpan={2}>Total</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">₹{totalTaxable.toFixed(2)}</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">₹{totalTax.toFixed(2)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              </div>

              <Row justify="end" style={{ marginTop: 20 }}>
                <Col span={10}>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Subtotal">₹{(viewingOrder.pricing?.subtotal || 0).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Discount">₹{(viewingOrder.pricing?.discount || 0).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="Tax">₹{(viewingOrder.pricing?.tax || 0).toFixed(2)}</Descriptions.Item>
                    {viewingOrder.pricing?.customAdjustment && Number(viewingOrder.pricing.customAdjustment.amount) !== 0 && (
                      <Descriptions.Item label={viewingOrder.pricing.customAdjustment.name || viewingOrder.pricing.customAdjustment.text || "Adjustment"}>
                        {Number(viewingOrder.pricing.customAdjustment.amount) > 0 ? '+' : ''}₹{Number(viewingOrder.pricing.customAdjustment.amount).toFixed(2)}
                      </Descriptions.Item>
                    )}
                    <Descriptions.Item label="Grand Total"><Text strong style={{ fontSize: 16 }}>₹{(viewingOrder.pricing?.total || 0).toFixed(2)}</Text></Descriptions.Item>
                  </Descriptions>

                  {/* Calculated Package & Unit Totals for Invoice */}
                  {(() => {
                    const { totalLitres, totalKg, packageBreakdown } = calculateOrderDetailsHelper(viewingOrder.items || []);
                    return (
                      <div style={{ marginTop: 20, padding: 10, border: '1px solid #f0f0f0', background: '#fafafa' }}>
                        <Text strong>Package Summary:</Text>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 5 }}>
                          {totalLitres > 0 && <Tag color="blue">Total Litres: {totalLitres.toFixed(2)} L</Tag>}
                          {totalKg > 0 && <Tag color="green">Total Kg: {totalKg.toFixed(2)} Kg</Tag>}
                          {Object.entries(packageBreakdown || {}).map(([type, count]) => (
                            <Tag key={type} color="cyan">Total {type}s: {count}</Tag>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                </Col>
              </Row>

              <div style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: '#888' }}>
                <p>Thank you for your business!</p>
              </div>

            </div>
          </>
        )}
      </Modal >

      {/* Payment Completion Modal */}
      < Modal
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
        {
          paymentModalLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }} >
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading latest payment information...</div>
            </div >
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
      </Modal >
    </div >
  );
};

export default Orders;