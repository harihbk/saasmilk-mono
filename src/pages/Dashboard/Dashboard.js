import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Table,
  Tag,
  List,
  Avatar,
  Button,
} from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  InboxOutlined,
  RiseOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, customersAPI, productsAPI, inventoryAPI, categoriesAPI, dealersAPI, fleetMaintenanceAPI, fleetAPI } from '../../services/api';
import { dashboardAPI } from '../../services/dashboardAPI';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: { total: 0, pending: 0, completed: 0, revenue: 0, income: 0, expenses: 0, profit: 0 },
    customers: { total: 0, active: 0, new: 0 },
    products: { total: 0, lowStock: 0 },
    inventory: { alerts: 0 },
    dealers: { total: 0, creditBalance: 0, debitBalance: 0, negativeBalance: 0 },
    fleetMaintenance: { total: 0, pending: 0, overdue: 0, upcoming: 0, completionRate: 0, avgCost: 0 },
    serviceDue: { total: 0, overdue: 0, urgent: 0, upcoming: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [negativeDealers, setNegativeDealers] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [serviceDueVehicles, setServiceDueVehicles] = useState([]);
  const [dealerOutstandingData, setDealerOutstandingData] = useState([]);
  const [routeOutstandingData, setRouteOutstandingData] = useState([]);

  // Helper function to generate monthly sales data
  const generateMonthlySalesData = (orders) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyData = {};

    // Initialize all months with zero values
    months.forEach((month, index) => {
      monthlyData[month] = { name: month, sales: 0, orders: 0, month: index };
    });

    // Process orders and group by month
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate.getFullYear() === currentYear) {
        const monthName = months[orderDate.getMonth()];
        if (monthlyData[monthName]) {
          monthlyData[monthName].sales += order.pricing?.total || 0;
          monthlyData[monthName].orders += 1;
        }
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month - b.month);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and create dynamic category data
      try {
        const categoriesResponse = await categoriesAPI.getActiveCategories();
        const categories = categoriesResponse.data.data.categories || [];
        
        // Create category data with colors
        const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#fa541c', '#13c2c2', '#eb2f96'];
        const dynamicCategoryData = categories.slice(0, 8).map((cat, index) => ({
          name: cat.label,
          value: Math.floor(Math.random() * 50) + 10, // Mock product count per category
          color: colors[index % colors.length]
        }));
        
        setCategoryData(dynamicCategoryData.length > 0 ? dynamicCategoryData : mockCategoryData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategoryData(mockCategoryData);
      }
      
      // Fetch all data in parallel
      const [orderStatsRes, recentOrdersRes, customersRes, productsRes, inventoryRes, dealersRes, fleetMaintenanceStatsRes, upcomingMaintenanceRes, serviceDueRes, dealerOutstandingRes, routeOutstandingRes, dashboardRecentOrdersRes] = await Promise.allSettled([
        ordersAPI.getOrderStats().catch(e => ({ data: { data: { orderStats: {}, statusStats: [] } } })),
        ordersAPI.getOrders({ limit: 10, sort: '-createdAt' }).catch(e => ({ data: { data: { orders: [] } } })),
        customersAPI.getCustomers({ limit: 1000 }).catch(e => ({ data: { data: { customers: [] } } })),
        productsAPI.getProducts({ limit: 1000 }).catch(e => ({ data: { data: { products: [] } } })),
        inventoryAPI.getAlerts().catch(e => ({ data: { data: { alerts: [] } } })),
        dealersAPI.getDealers({ limit: 1000 }).catch(e => ({ data: { data: { dealers: [] } } })),
        fleetMaintenanceAPI.getStats().catch(e => ({ data: { data: { summary: { totalRecords: 0, pendingRecords: 0, overdueRecords: 0, completionRate: 0 }, costs: { avgCost: 0 } } } })),
        fleetMaintenanceAPI.getUpcomingMaintenance().catch(e => ({ data: { data: { upcoming: [], overdue: [], summary: { upcomingCount: 0, overdueCount: 0 } } } })),
        fleetAPI.getServiceDue({ days: 30 }).catch(e => ({ data: { data: { vehicles: [], summary: { total: 0, overdue: 0, urgent: 0, upcoming: 0 } } } })),
        dashboardAPI.getDealerOutstanding().catch(e => ({ data: [] })),
        dashboardAPI.getRouteOutstanding().catch(e => ({ data: [] })),
        dashboardAPI.getRecentOrders(10).catch(e => ({ data: [] }))
      ]);

      // Process order statistics from backend aggregation
      const orderStats = orderStatsRes.status === 'fulfilled' ? orderStatsRes.value.data.data.orderStats || {} : {};
      const statusStats = orderStatsRes.status === 'fulfilled' ? orderStatsRes.value.data.data.statusStats || [] : {};
      
      // Use backend calculated values for accuracy
      const totalRevenue = orderStats.totalRevenue || 0;
      const pendingOrders = orderStats.pendingOrders || 0;
      const completedOrders = orderStats.completedOrders || 0;
      const totalOrders = orderStats.totalOrders || 0;
      
      // Calculate income/loss from completed orders only  
      const completedOrdersValue = statusStats
        .filter(s => ['delivered', 'completed'].includes(s._id))
        .reduce((sum, s) => sum + (s.totalValue || 0), 0);
      const totalIncome = completedOrdersValue;
      const totalExpenses = totalIncome * 0.7; // Estimate cost as 70% of selling price
      const netProfit = totalIncome - totalExpenses;
      
      // Get recent orders for display
      const recentOrdersList = recentOrdersRes.status === 'fulfilled' ? recentOrdersRes.value.data.data.orders || [] : [];

      // Process customers data
      const customers = customersRes.status === 'fulfilled' ? customersRes.value.data.data.customers || [] : [];
      const activeCustomers = customers.filter(c => c.status === 'active').length;
      const newCustomers = customers.filter(c => {
        const createdDate = new Date(c.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdDate > thirtyDaysAgo;
      }).length;

      // Process products data
      const products = productsRes.status === 'fulfilled' ? productsRes.value.data.data.products || [] : [];
      const activeProducts = products.filter(p => p.status === 'active').length;

      // Process inventory data
      const inventoryAlerts = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data.data.alerts || [] : [];

      // Process dealer data
      const dealers = dealersRes.status === 'fulfilled' ? dealersRes.value.data.data.dealers || [] : [];
      const dealerStats = {
        total: dealers.length,
        creditBalance: dealers.filter(d => (d.financialInfo?.currentBalance || 0) < 0).length, // Negative = credit balance (dealer paid in advance)
        debitBalance: dealers.filter(d => (d.financialInfo?.currentBalance || 0) > 0).length,  // Positive = dealer owes money
        outstandingAmount: dealers
          .filter(d => (d.financialInfo?.currentBalance || 0) > 0)
          .reduce((sum, d) => sum + (d.financialInfo?.currentBalance || 0), 0)
      };
      
      const outstandingDealersList = dealers
        .filter(d => (d.financialInfo?.currentBalance || 0) > 0)  // Show dealers who owe money
        .sort((a, b) => (b.financialInfo?.currentBalance || 0) - (a.financialInfo?.currentBalance || 0))  // Highest debt first
        .slice(0, 5);
        
      setNegativeDealers(outstandingDealersList);

      // Process fleet maintenance data
      const fleetMaintenanceStats = fleetMaintenanceStatsRes.status === 'fulfilled' ? fleetMaintenanceStatsRes.value.data.data.summary || {} : {};
      const fleetMaintenanceCosts = fleetMaintenanceStatsRes.status === 'fulfilled' ? fleetMaintenanceStatsRes.value.data.data.costs || {} : {};
      const upcomingMaintenanceData = upcomingMaintenanceRes.status === 'fulfilled' ? upcomingMaintenanceRes.value.data.data || {} : {};
      
      const fleetMaintenanceData = {
        total: fleetMaintenanceStats.totalRecords || 0,
        pending: fleetMaintenanceStats.pendingRecords || 0,
        overdue: fleetMaintenanceStats.overdueRecords || 0,
        upcoming: upcomingMaintenanceData.summary?.upcomingCount || 0,
        completionRate: fleetMaintenanceStats.completionRate || 0,
        avgCost: fleetMaintenanceCosts.avgCost || 0
      };

      // Process service due vehicles data
      const serviceDueData = serviceDueRes.status === 'fulfilled' ? serviceDueRes.value.data.data || {} : {};
      const serviceDueStats = {
        total: serviceDueData.summary?.total || 0,
        overdue: serviceDueData.summary?.overdue || 0,
        urgent: serviceDueData.summary?.urgent || 0,
        upcoming: serviceDueData.summary?.upcoming || 0
      };

      // Set service due vehicles list (top 5)
      const allServiceDueVehicles = (serviceDueData.vehicles || []).slice(0, 5);
      setServiceDueVehicles(allServiceDueVehicles);

      // Set upcoming maintenance list (top 5)
      const allUpcomingMaintenance = [
        ...(upcomingMaintenanceData.overdue || []),
        ...(upcomingMaintenanceData.upcoming || [])
      ].slice(0, 5);
      setUpcomingMaintenance(allUpcomingMaintenance);

      // Generate monthly sales data from recent orders (for chart display)
      const monthlySales = generateMonthlySalesData(recentOrdersList);
      setSalesData(monthlySales);

      // Set recent orders (already sorted by backend)
      setRecentOrders(recentOrdersList.slice(0, 5));

      // Set all stats
      setStats({
        orders: { 
          total: totalOrders, 
          pending: pendingOrders, 
          completed: completedOrders, 
          revenue: totalRevenue,
          income: totalIncome,
          expenses: totalExpenses,
          profit: netProfit
        },
        customers: { 
          total: customers.length, 
          active: activeCustomers, 
          new: newCustomers 
        },
        products: { 
          total: activeProducts, 
          lowStock: inventoryAlerts.length 
        },
        inventory: { 
          alerts: inventoryAlerts.length 
        },
        dealers: dealerStats,
        fleetMaintenance: fleetMaintenanceData,
        serviceDue: serviceDueStats
      });

      // Process new dashboard chart data
      if (dealerOutstandingRes.status === 'fulfilled') {
        const dealerData = dealerOutstandingRes.value.data || [];
        setDealerOutstandingData(dealerData);
      }

      if (routeOutstandingRes.status === 'fulfilled') {
        const routeData = routeOutstandingRes.value.data || [];
        setRouteOutstandingData(routeData);
      }

      // Use improved recent orders from dashboard API (fixes overlapping issue)
      if (dashboardRecentOrdersRes.status === 'fulfilled') {
        const dashboardRecentOrders = dashboardRecentOrdersRes.value.data || [];
        if (dashboardRecentOrders.length > 0) {
          setRecentOrders(dashboardRecentOrders);
        }
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data on error
      setStats({
        orders: { total: 156, pending: 23, completed: 133, revenue: 45230 },
        customers: { total: 89, active: 67, new: 12 },
        products: { total: 45, lowStock: 3 },
        inventory: { alerts: 5 }
      });
      setRecentOrders([]);
      setSalesData([]);
      setCategoryData(mockCategoryData);
    } finally {
      setLoading(false);
    }
  };


  const mockCategoryData = [
    { name: 'Milk Products', value: 45, color: '#1890ff' },
    { name: 'Cheese', value: 25, color: '#52c41a' },
    { name: 'Yogurt', value: 20, color: '#faad14' },
    { name: 'Butter', value: 10, color: '#f5222d' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      processing: 'blue',
      completed: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'default';
  };

  const orderColumns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 120,
    },
    {
      title: 'Buyer',
      dataIndex: 'buyer',
      key: 'buyer',
      ellipsis: true,
      render: (buyer, record) => {
        // Handle both old and new data formats
        if (buyer) {
          return <span title={buyer}>{buyer}</span>; // New dashboard API format
        }
        // Fallback to old format
        if (record.dealer) {
          return <span title={record.dealer.name}>{record.dealer.name}</span>;
        } else if (record.customer) {
          const name = record.customer.personalInfo?.firstName + ' ' + record.customer.personalInfo?.lastName || record.customer.name;
          return <span title={name}>{name}</span>;
        }
        return 'Unknown';
      },
    },
    {
      title: 'Total',
      key: 'total', 
      width: 80,
      render: (_, record) => {
        const total = record.totalAmount || record.pricing?.total || 0;
        return `₹${total.toFixed(2)}`;
      },
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 90,
      render: (paymentStatus, record) => {
        const status = paymentStatus || record.payment?.status || 'unknown';
        const color = status === 'completed' ? 'green' : status === 'pending' ? 'orange' : 'blue';
        return (
          <Tag color={color} style={{ textTransform: 'capitalize' }}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        <Tag color={getStatusColor(status)} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Dashboard</Title>
        <Text type="secondary">
          Welcome back, {user?.name}! Here's what's happening with your milk business today.
        </Text>
      </div>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.orders.total}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                {stats.orders.pending} pending
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.orders.revenue}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                <RiseOutlined /> +12% from last month
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Customers"
              value={stats.customers.active}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                {stats.customers.new} new this month
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={stats.products.lowStock}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa541c' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Requires attention
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Dealer Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Dealers"
              value={stats.dealers.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Registered dealers
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Credit Balance"
              value={stats.dealers.creditBalance}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Dealers with advance credit
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Outstanding Dealers"
              value={stats.dealers.debitBalance}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa541c' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Dealers owing money
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Outstanding Amount"
              value={stats.dealers.outstandingAmount || 0}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Amount owed by dealers
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Income/Loss Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Income"
              value={stats.orders.income}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                From completed orders
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={stats.orders.expenses}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#fa541c' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Estimated costs (70% of revenue)
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Net Profit"
              value={stats.orders.profit}
              prefix="₹"
              precision={2}
              valueStyle={{ color: stats.orders.profit >= 0 ? '#52c41a' : '#f5222d' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                {stats.orders.profit >= 0 ? 'Profit' : 'Loss'} this period
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Profit Margin"
              value={stats.orders.revenue > 0 ? (stats.orders.profit / stats.orders.revenue * 100) : 0}
              suffix="%"
              precision={1}
              valueStyle={{ color: stats.orders.profit >= 0 ? '#52c41a' : '#f5222d' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Overall profitability
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Fleet Maintenance Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Total Maintenance"
              value={stats.fleetMaintenance.total}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                All maintenance records
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Pending Maintenance"
              value={stats.fleetMaintenance.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Scheduled & in progress
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Overdue Maintenance"
              value={stats.fleetMaintenance.overdue}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Past due date
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Upcoming (7 days)"
              value={stats.fleetMaintenance.upcoming}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Due within week
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={stats.fleetMaintenance.completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: stats.fleetMaintenance.completionRate >= 80 ? '#52c41a' : '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Tasks completed
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Avg Cost"
              value={stats.fleetMaintenance.avgCost}
              prefix="₹"
              precision={0}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Per maintenance
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Vehicle Service Alerts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Service Required"
              value={stats.serviceDue.total}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Vehicles needing service
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={stats.serviceDue.overdue}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Service overdue
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Urgent"
              value={stats.serviceDue.urgent}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Service needed soon
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Scheduled"
              value={stats.serviceDue.upcoming}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Service scheduled
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Sales Overview" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#1890ff"
                  fill="#1890ff"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Product Categories" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* New Outstanding Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Dealer-wise Outstanding" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dealerOutstandingData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dealerName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `₹${value.toLocaleString()}`,
                    name === 'outstandingAmount' ? 'Outstanding' : name
                  ]}
                  labelFormatter={(label) => `Dealer: ${label}`}
                />
                <Bar 
                  dataKey="outstandingAmount" 
                  fill="#ff7300" 
                  name="Outstanding Amount"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Route-wise Outstanding" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={routeOutstandingData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="routeName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `₹${value.toLocaleString()}`,
                    name === 'outstandingAmount' ? 'Outstanding' : name
                  ]}
                  labelFormatter={(label) => `Route: ${label}`}
                />
                <Bar 
                  dataKey="outstandingAmount" 
                  fill="#8884d8" 
                  name="Outstanding Amount"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Tables and Lists */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Recent Orders" loading={loading}>
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              pagination={false}
              size="small"
              rowKey="_id"
              scroll={{ x: 400, y: 300 }}
              style={{ minHeight: '300px' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Upcoming Fleet Maintenance" loading={loading}>
            <List
              dataSource={upcomingMaintenance}
              renderItem={(maintenance) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{ 
                          backgroundColor: maintenance.daysOverdue !== undefined ? '#f5222d' : 
                                           maintenance.daysUntil <= 3 ? '#faad14' : '#52c41a'
                        }}
                        icon={<ToolOutlined />}
                      />
                    }
                    title={maintenance.title}
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary">
                          Vehicle: {maintenance.vehicle?.vehicleNumber} ({maintenance.vehicle?.make} {maintenance.vehicle?.model})
                        </Text>
                        <Text type="secondary">
                          Service: {maintenance.serviceProvider?.name}
                        </Text>
                        {maintenance.daysOverdue !== undefined ? (
                          <Tag color="red">
                            {maintenance.daysOverdue} days overdue
                          </Tag>
                        ) : (
                          <Tag color={maintenance.daysUntil <= 3 ? 'orange' : 'green'}>
                            Due in {maintenance.daysUntil} days
                          </Tag>
                        )}
                        <Text type="secondary">
                          Scheduled: {new Date(maintenance.scheduledDate).toLocaleDateString()}
                        </Text>
                      </Space>
                    }
                  />
                  <div>
                    <Button size="small" type="primary" ghost>
                      View
                    </Button>
                  </div>
                </List.Item>
              )}
              locale={{
                emptyText: upcomingMaintenance.length === 0 ? 'No upcoming maintenance' : 'Loading...'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Service Alerts" loading={loading}>
            <List
              dataSource={serviceDueVehicles}
              renderItem={(serviceAlert) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{ 
                          backgroundColor: serviceAlert.status === 'overdue' ? '#f5222d' : 
                                           serviceAlert.status === 'urgent' ? '#faad14' : '#52c41a'
                        }}
                        icon={<CarOutlined />}
                      />
                    }
                    title={serviceAlert.vehicle?.vehicleNumber}
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary">
                          {serviceAlert.vehicle?.make} {serviceAlert.vehicle?.model} ({serviceAlert.vehicle?.year})
                        </Text>
                        <Text type="secondary">
                          Driver: {serviceAlert.vehicle?.assignedDriver?.name || 'Unassigned'}
                        </Text>
                        <Tag color={
                          serviceAlert.status === 'overdue' ? 'red' : 
                          serviceAlert.status === 'urgent' ? 'orange' : 'green'
                        }>
                          {serviceAlert.reason}
                        </Tag>
                        <Text type="secondary">
                          Odometer: {serviceAlert.vehicle?.currentOdometer?.toLocaleString() || 0} km
                        </Text>
                      </Space>
                    }
                  />
                  <div>
                    <Button size="small" type="primary" ghost>
                      Schedule
                    </Button>
                  </div>
                </List.Item>
              )}
              locale={{
                emptyText: serviceDueVehicles.length === 0 ? 'No service alerts' : 'Loading...'
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
