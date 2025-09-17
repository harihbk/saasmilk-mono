import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Tooltip,
  Space,
  message,
  Empty,
  Spin,
  Typography,
} from 'antd';
import {
  FileSearchOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  ExportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import routesAPI from '../../services/routesAPI';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const RouteReports = () => {
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);

  useEffect(() => {
    fetchRoutes();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [selectedRoute, dateRange]);

  const fetchRoutes = async () => {
    try {
      console.log('Fetching routes with token:', localStorage.getItem('token')?.substring(0, 20) + '...');
      console.log('Tenant ID:', localStorage.getItem('tenantId'));
      const response = await routesAPI.getAll({ status: 'active', limit: 100 });
      console.log('Routes response:', response.data);
      setRoutes(response.data.data.routes || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      console.error('Error details:', error.response?.data || error.message);
      message.error(`Failed to fetch routes: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      console.log('Fetching metrics with dateRange:', dateRange);
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
      };
      console.log('Metrics params:', params);
      
      if (selectedRoute) {
        params.routeId = selectedRoute;
      }

      const response = await routesAPI.getOutstandingMetrics(params);
      const data = response.data.data;
      
      setRouteMetrics(data.routeMetrics || []);
      setSummary(data.summary || {});
    } catch (error) {
      console.error('Error fetching route metrics:', error);
      console.error('Error details:', error.response?.data || error.message);
      message.error(`Failed to fetch route metrics: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getEfficiencyColor = (percentage) => {
    if (percentage >= 90) return '#52c41a';
    if (percentage >= 75) return '#faad14';
    if (percentage >= 60) return '#fa8c16';
    return '#f5222d';
  };

  const columns = [
    {
      title: 'Route',
      key: 'route',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.route?.code || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.route?.name || 'Unknown Route'}
          </div>
        </div>
      ),
    },
    {
      title: 'Orders',
      children: [
        {
          title: 'Total',
          dataIndex: ['metrics', 'totalOrders'],
          key: 'totalOrders',
          align: 'center',
          render: (value) => <strong>{value || 0}</strong>,
        },
        {
          title: 'Outstanding',
          dataIndex: ['metrics', 'outstandingOrders'],
          key: 'outstandingOrders',
          align: 'center',
          render: (value, record) => (
            <div>
              <div style={{ color: '#f5222d', fontWeight: 'bold' }}>
                {value || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                of {record.metrics?.totalOrders || 0}
              </div>
            </div>
          ),
        },
        {
          title: 'Paid',
          dataIndex: ['metrics', 'paidOrders'],
          key: 'paidOrders',
          align: 'center',
          render: (value) => (
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
              {value || 0}
            </span>
          ),
        },
      ],
    },
    {
      title: 'Amount',
      children: [
        {
          title: 'Total Amount',
          dataIndex: ['metrics', 'totalAmount'],
          key: 'totalAmount',
          align: 'right',
          render: (value) => (
            <strong style={{ color: '#1890ff' }}>
              {formatCurrency(value)}
            </strong>
          ),
        },
        {
          title: 'Outstanding',
          dataIndex: ['metrics', 'outstandingAmount'],
          key: 'outstandingAmount',
          align: 'right',
          render: (value) => (
            <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
              {formatCurrency(value)}
            </span>
          ),
        },
        {
          title: 'Collected',
          dataIndex: ['metrics', 'paidAmount'],
          key: 'paidAmount',
          align: 'right',
          render: (value) => (
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
              {formatCurrency(value)}
            </span>
          ),
        },
      ],
    },
    {
      title: 'Collection Efficiency',
      dataIndex: ['metrics', 'collectionEfficiency'],
      key: 'collectionEfficiency',
      align: 'center',
      render: (percentage) => (
        <div style={{ width: 80 }}>
          <Progress
            percent={percentage || 0}
            size="small"
            strokeColor={getEfficiencyColor(percentage)}
            format={(percent) => `${percent.toFixed(0)}%`}
          />
        </div>
      ),
    },
    {
      title: 'Dealers',
      dataIndex: ['metrics', 'dealerCount'],
      key: 'dealerCount',
      align: 'center',
      render: (value) => (
        <Tooltip title="Number of dealers in this route">
          <Tag icon={<TruckOutlined />} color="blue">
            {value || 0}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Avg Order Value',
      dataIndex: ['metrics', 'avgOrderValue'],
      key: 'avgOrderValue',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <FileSearchOutlined style={{ marginRight: 8 }} />
          Route-wise Outstanding Invoice Reports
        </Title>
        <Text type="secondary">
          Track collection efficiency and outstanding amounts by delivery routes
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Date Range</Text>
            </div>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Route Filter</Text>
            </div>
            <Select
              placeholder="All Routes"
              value={selectedRoute}
              onChange={setSelectedRoute}
              allowClear
              style={{ width: '100%' }}
            >
              {routes.map(route => (
                <Option key={route._id} value={route._id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {route.code}
                    </span>
                    <span>{route.name}</span>
                    {route.city && (
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        ({route.city})
                      </span>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Actions</Text>
            </div>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchMetrics}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => message.info('Export functionality coming soon')}
              >
                Export
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Routes"
              value={summary.totalRoutes || 0}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={formatCurrency(summary.totalAmount)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Outstanding Amount"
              value={formatCurrency(summary.outstandingAmount)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              {formatPercentage(summary.outstandingPercentage)} of total
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Collection Efficiency"
              value={formatPercentage(summary.collectionEfficiency)}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ 
                color: getEfficiencyColor(summary.collectionEfficiency)
              }}
            />
            <Progress
              percent={summary.collectionEfficiency || 0}
              size="small"
              strokeColor={getEfficiencyColor(summary.collectionEfficiency)}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Route Metrics Table */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Route-wise Metrics</span>
            <Text type="secondary">
              {selectedRoute ? 'Filtered by route' : 'All routes'} • 
              {' '}{dateRange[0].format('MMM DD')} to {dateRange[1].format('MMM DD, YYYY')}
            </Text>
          </div>
        }
      >
        <Spin spinning={loading}>
          {routeMetrics.length > 0 ? (
            <Table
              columns={columns}
              dataSource={routeMetrics}
              rowKey={(record) => record.route?.id || Math.random()}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} routes`,
              }}
              scroll={{ x: 1200 }}
              size="small"
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text>No data available for the selected criteria</Text>
                  <br />
                  <Text type="secondary">
                    Try adjusting the date range or route filter
                  </Text>
                </div>
              }
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default RouteReports;