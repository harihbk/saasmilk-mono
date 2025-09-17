import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Select,
  DatePicker,
  Space,
  Typography,
  Alert,
  Progress,
  Tooltip,
  Divider,
  List,
  Avatar,
} from 'antd';
import {
  UserOutlined,
  WarningOutlined,
  DollarOutlined,
  FallOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { dealersAPI, ordersAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DealerReports = () => {
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [reportType, setReportType] = useState('outstanding');
  
  // Calculated metrics
  const [outstandingDealers, setOutstandingDealers] = useState([]);
  const [worstDealers, setWorstDealers] = useState([]);
  const [dealerMetrics, setDealerMetrics] = useState({});

  useEffect(() => {
    fetchData();
  }, [dateRange, reportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch dealers and orders
      const [dealersRes, ordersRes] = await Promise.all([
        dealersAPI.getDealers({ limit: 1000 }),
        ordersAPI.getOrders({ 
          limit: 1000,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD')
        })
      ]);

      const dealersData = dealersRes.data.data.dealers || [];
      const ordersData = ordersRes.data.data.orders || [];
      
      setDealers(dealersData);
      setOrders(ordersData);
      
      // Calculate metrics
      calculateDealerMetrics(dealersData, ordersData);
      
    } catch (error) {
      console.error('Error fetching dealer reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDealerMetrics = (dealersData, ordersData) => {
    const metrics = {};
    
    dealersData.forEach(dealer => {
      const dealerOrders = ordersData.filter(order => 
        order.dealer && order.dealer._id === dealer._id
      );
      
      const totalOrders = dealerOrders.length;
      const totalRevenue = dealerOrders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0);
      const completedOrders = dealerOrders.filter(order => 
        ['delivered', 'completed'].includes(order.status)
      ).length;
      
      const cancelledOrders = dealerOrders.filter(order => 
        order.status === 'cancelled'
      ).length;
      
      const pendingOrders = dealerOrders.filter(order => 
        order.status === 'pending'
      ).length;
      
      const currentBalance = dealer.financialInfo?.currentBalance || 0;
      const creditLimit = dealer.financialInfo?.creditLimit || 0;
      
      // Calculate risk score (0-100, higher is worse)
      let riskScore = 0;
      if (currentBalance < 0) riskScore += Math.min(Math.abs(currentBalance) / 1000 * 10, 40); // Negative balance impact
      if (cancelledOrders > 0) riskScore += (cancelledOrders / totalOrders) * 30; // Cancellation rate impact
      if (pendingOrders > 5) riskScore += 20; // Too many pending orders
      if (totalOrders === 0) riskScore += 30; // No orders in period
      
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      
      metrics[dealer._id] = {
        dealer,
        totalOrders,
        totalRevenue,
        completedOrders,
        cancelledOrders,
        pendingOrders,
        currentBalance,
        creditLimit,
        availableCredit: creditLimit + currentBalance,
        riskScore: Math.min(riskScore, 100),
        completionRate,
        cancellationRate,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      };
    });

    setDealerMetrics(metrics);
    
    // Calculate outstanding dealers (negative balance)
    const outstanding = Object.values(metrics)
      .filter(m => m.currentBalance < 0)
      .sort((a, b) => a.currentBalance - b.currentBalance)
      .slice(0, 20);
    
    setOutstandingDealers(outstanding);
    
    // Calculate worst dealers (high risk score)
    const worst = Object.values(metrics)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);
    
    setWorstDealers(worst);
  };

  const getRiskLevel = (riskScore) => {
    if (riskScore >= 70) return { level: 'Critical', color: '#f5222d' };
    if (riskScore >= 50) return { level: 'High', color: '#fa541c' };
    if (riskScore >= 30) return { level: 'Medium', color: '#faad14' };
    return { level: 'Low', color: '#52c41a' };
  };

  const outstandingColumns = [
    {
      title: 'Dealer',
      key: 'dealer',
      render: (_, record) => (
        <div>
          <strong>{record.dealer.name}</strong>
          <br />
          <Text type="secondary">{record.dealer.dealerCode}</Text>
        </div>
      ),
    },
    {
      title: 'Outstanding Amount',
      key: 'outstanding',
      render: (_, record) => (
        <Tag color="red" style={{ fontSize: '14px', padding: '4px 8px' }}>
          ₹{Math.abs(record.currentBalance).toLocaleString()} DR
        </Tag>
      ),
      sorter: (a, b) => a.currentBalance - b.currentBalance,
    },
    {
      title: 'Credit Limit',
      key: 'creditLimit',
      render: (_, record) => `₹${record.creditLimit.toLocaleString()}`,
    },
    {
      title: 'Available Credit',
      key: 'availableCredit',
      render: (_, record) => (
        <span style={{ color: record.availableCredit > 0 ? '#52c41a' : '#f5222d' }}>
          ₹{record.availableCredit.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Total Orders',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.dealer.contactInfo?.primaryContact?.phone}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.dealer.contactInfo?.primaryContact?.email}
          </Text>
        </div>
      ),
    },
  ];

  const worstDealersColumns = [
    {
      title: 'Dealer',
      key: 'dealer',
      render: (_, record) => (
        <div>
          <strong>{record.dealer.name}</strong>
          <br />
          <Text type="secondary">{record.dealer.dealerCode}</Text>
        </div>
      ),
    },
    {
      title: 'Risk Score',
      key: 'riskScore',
      render: (_, record) => {
        const risk = getRiskLevel(record.riskScore);
        return (
          <div>
            <Progress 
              percent={record.riskScore} 
              size="small" 
              strokeColor={risk.color}
              format={() => `${record.riskScore.toFixed(0)}`}
            />
            <Tag color={risk.color} style={{ marginTop: '4px' }}>
              {risk.level}
            </Tag>
          </div>
        );
      },
      sorter: (a, b) => b.riskScore - a.riskScore,
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_, record) => (
        <Tag color={record.currentBalance > 0 ? 'red' : record.currentBalance < 0 ? 'green' : 'default'}>
          ₹{Math.abs(record.currentBalance).toLocaleString()} {record.currentBalance > 0 ? 'DR' : record.currentBalance < 0 ? 'CR' : ''}
        </Tag>
      ),
    },
    {
      title: 'Completion Rate',
      key: 'completionRate',
      render: (_, record) => `${record.completionRate.toFixed(1)}%`,
      sorter: (a, b) => a.completionRate - b.completionRate,
    },
    {
      title: 'Cancellation Rate',
      key: 'cancellationRate',
      render: (_, record) => (
        <span style={{ color: record.cancellationRate > 20 ? '#f5222d' : '#52c41a' }}>
          {record.cancellationRate.toFixed(1)}%
        </span>
      ),
      sorter: (a, b) => b.cancellationRate - a.cancellationRate,
    },
    {
      title: 'Revenue',
      key: 'revenue',
      render: (_, record) => `₹${record.totalRevenue.toLocaleString()}`,
      sorter: (a, b) => b.totalRevenue - a.totalRevenue,
    },
  ];

  // Summary statistics
  const totalOutstanding = outstandingDealers.reduce((sum, d) => sum + Math.abs(d.currentBalance), 0);
  const avgOutstanding = outstandingDealers.length > 0 ? totalOutstanding / outstandingDealers.length : 0;
  const criticalDealers = worstDealers.filter(d => d.riskScore >= 70).length;
  const highRiskDealers = worstDealers.filter(d => d.riskScore >= 50 && d.riskScore < 70).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Dealer Reports & Analytics</Title>
        <Text type="secondary">
          Comprehensive analysis of dealer performance, outstanding amounts, and risk assessment
        </Text>
      </div>

      {/* Controls */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>Report Type:</Text>
          </Col>
          <Col>
            <Select 
              value={reportType} 
              onChange={setReportType}
              style={{ width: 200 }}
            >
              <Option value="outstanding">Outstanding Dealers</Option>
              <Option value="worst">Worst Performers</Option>
              <Option value="both">Both Reports</Option>
            </Select>
          </Col>
          <Col>
            <Text strong>Date Range:</Text>
          </Col>
          <Col>
            <RangePicker 
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col>
            <Button type="primary" onClick={fetchData} loading={loading}>
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Outstanding"
              value={totalOutstanding}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Dealers with Outstanding"
              value={outstandingDealers.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa541c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Critical Risk Dealers"
              value={criticalDealers}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average Outstanding"
              value={avgOutstanding}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Outstanding Dealers Report */}
      {(reportType === 'outstanding' || reportType === 'both') && (
        <Card 
          title={
            <Space>
              <DollarOutlined />
              Outstanding Dealers Report
              <Tag color="red">{outstandingDealers.length} dealers</Tag>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Alert
            message="High Priority Action Required"
            description={`${outstandingDealers.length} dealers have outstanding amounts totaling ₹${totalOutstanding.toLocaleString()}. Focus on collecting from top 5 dealers first.`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={outstandingColumns}
            dataSource={outstandingDealers}
            rowKey={(record) => record.dealer._id}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </Card>
      )}

      {/* Worst Dealers Report */}
      {(reportType === 'worst' || reportType === 'both') && (
        <Card 
          title={
            <Space>
              <FallOutlined />
              Worst Performing Dealers
              <Tag color="red">{criticalDealers} critical</Tag>
              <Tag color="orange">{highRiskDealers} high risk</Tag>
            </Space>
          }
        >
          <Alert
            message="Performance Analysis"
            description="Dealers ranked by risk score based on payment history, order completion rates, and cancellation patterns. Focus on dealers with scores above 70."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={worstDealersColumns}
            dataSource={worstDealers}
            rowKey={(record) => record.dealer._id}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        </Card>
      )}

      {/* Action Items */}
      <Card title="Recommended Actions" style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Title level={4}>Immediate Actions (Outstanding)</Title>
            <List
              size="small"
              dataSource={outstandingDealers.slice(0, 5)}
              renderItem={(dealer) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#f5222d' }} icon={<UserOutlined />} />}
                    title={dealer.dealer.name}
                    description={
                      <Space>
                        <Tag color="red">₹{Math.abs(dealer.currentBalance).toLocaleString()} outstanding</Tag>
                        <Button size="small" type="link">Call</Button>
                        <Button size="small" type="link">Email</Button>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Title level={4}>Review Required (High Risk)</Title>
            <List
              size="small"
              dataSource={worstDealers.filter(d => d.riskScore >= 70).slice(0, 5)}
              renderItem={(dealer) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#fa541c' }} icon={<WarningOutlined />} />}
                    title={dealer.dealer.name}
                    description={
                      <Space>
                        <Tag color="red">Risk: {dealer.riskScore.toFixed(0)}</Tag>
                        <Tag color="orange">{dealer.cancellationRate.toFixed(1)}% cancellation</Tag>
                        <Button size="small" type="link">Review</Button>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DealerReports;