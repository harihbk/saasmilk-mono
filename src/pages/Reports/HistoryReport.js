import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Tag,
  Typography,
  Dropdown,
  Menu,
  message,
} from 'antd';
import {
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { ordersAPI, dealersAPI, customersAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const HistoryReport = () => {
  const [orders, setOrders] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: [dayjs().subtract(30, 'days'), dayjs()],
    status: '',
    dealerId: '',
    customerId: '',
  });
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    completedOrders: 0,
  });

  useEffect(() => {
    fetchData();
    fetchDealers();
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: filters.dateRange[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange[1]?.format('YYYY-MM-DD'),
        status: filters.status || undefined,
        dealerId: filters.dealerId || undefined,
        customerId: filters.customerId || undefined,
        limit: 1000, // Get all records for reports
      };

      const response = await ordersAPI.getOrders(params);
      const ordersData = response.data.data.orders || [];
      setOrders(ordersData);

      // Calculate statistics
      const totalOrders = ordersData.length;
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
      const completedOrders = ordersData.filter(order => order.status === 'completed').length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalOrders,
        totalRevenue,
        avgOrderValue,
        completedOrders,
      });
    } catch (error) {
      console.error('Error fetching history data:', error);
      message.error('Failed to fetch history data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDealers = async () => {
    try {
      const response = await dealersAPI.getDealers({ limit: 100 });
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = (format) => {
    // Export functionality would be implemented here
    message.info(`Exporting to ${format.toUpperCase()}...`);
  };

  const resetFilters = () => {
    setFilters({
      dateRange: [dayjs().subtract(30, 'days'), dayjs()],
      status: '',
      dealerId: '',
      customerId: '',
    });
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

  const exportMenu = (
    <Menu onClick={(e) => handleExport(e.key)}>
      <Menu.Item key="excel">Excel (.xlsx)</Menu.Item>
      <Menu.Item key="csv">CSV (.csv)</Menu.Item>
      <Menu.Item key="pdf">PDF (.pdf)</Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text) => <strong>{text}</strong>,
      sorter: (a, b) => a.orderNumber.localeCompare(b.orderNumber),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div>{record.customer?.name || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.customer?.email || ''}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.customer?.name || '').localeCompare(b.customer?.name || ''),
    },
    {
      title: 'Dealer',
      key: 'dealer',
      render: (_, record) => (
        <div>
          <div>{record.dealer?.name || 'N/A'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.dealer?.dealerGroup?.name || ''}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.dealer?.name || '').localeCompare(b.dealer?.name || ''),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items) => (
        <div>
          <div>{items?.length || 0} items</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Qty: {items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
          </div>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      key: 'total',
      render: (_, record) => (
        <strong>₹{(record.pricing?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
      ),
      sorter: (a, b) => (a.pricing?.total || 0) - (b.pricing?.total || 0),
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
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Processing', value: 'processing' },
        { text: 'Shipped', value: 'shipped' },
        { text: 'Delivered', value: 'delivered' },
        { text: 'Completed', value: 'completed' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Payment Status',
      key: 'paymentStatus',
      render: (_, record) => {
        const status = record.payment?.status || 'pending';
        return (
          <Tag color={status === 'paid' ? 'green' : status === 'pending' ? 'orange' : 'red'}>
            {status}
          </Tag>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <BarChartOutlined /> Order History Report
        </Title>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Order Value"
              value={stats.avgOrderValue}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Orders"
              value={stats.completedOrders}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={6}>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="Status"
                allowClear
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                style={{ width: '100%' }}
              >
                <Option value="pending">Pending</Option>
                <Option value="processing">Processing</Option>
                <Option value="shipped">Shipped</Option>
                <Option value="delivered">Delivered</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Col>
            <Col span={5}>
              <Select
                placeholder="Select Dealer"
                allowClear
                showSearch
                value={filters.dealerId}
                onChange={(value) => handleFilterChange('dealerId', value)}
                style={{ width: '100%' }}
              >
                {dealers.map(dealer => (
                  <Option key={dealer._id} value={dealer._id}>
                    {dealer.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={5}>
              <Select
                placeholder="Select Customer"
                allowClear
                showSearch
                value={filters.customerId}
                onChange={(value) => handleFilterChange('customerId', value)}
                style={{ width: '100%' }}
              >
                {customers.map(customer => (
                  <Option key={customer._id} value={customer._id}>
                    {customer.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchData()}
                  loading={loading}
                >
                  Refresh
                </Button>
                <Button
                  icon={<FilterOutlined />}
                  onClick={resetFilters}
                >
                  Reset
                </Button>
                <Dropdown overlay={exportMenu} placement="bottomRight">
                  <Button icon={<DownloadOutlined />}>
                    Export
                  </Button>
                </Dropdown>
              </Space>
            </Col>
          </Row>
        </div>

        {/* History Table */}
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
          }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default HistoryReport;