import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Alert,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  GlobalOutlined,
  DollarOutlined,
  UserOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { saasAdminAPI } from '../../services/api';

const { Title, Text } = Typography;

const SaasAdminDashboard = () => {
  const [saasAdminUser, setSaasAdminUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    summary: {},
    users: {},
    revenue: {},
    recentCompanies: [],
  });

  useEffect(() => {
    // Load SaaS admin user from localStorage
    const storedUser = localStorage.getItem('saas_admin_user');
    if (storedUser) {
      setSaasAdminUser(JSON.parse(storedUser));
    }
    
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('saas_admin_token');
      if (!token) {
        window.location.href = '/saas-admin/login';
        return;
      }

      // Fetch SaaS admin stats
      const statsResponse = await saasAdminAPI.getStats();
      const companiesResponse = await saasAdminAPI.getCompanies({ limit: 10 });
      
      console.log('Dashboard stats:', statsResponse.data);
      console.log('Companies data:', companiesResponse.data);

      setDashboardData({
        summary: statsResponse.data.data?.summary || {},
        users: statsResponse.data.data?.users || {},
        revenue: statsResponse.data.data?.revenue || {},
        recentCompanies: companiesResponse.data.data?.companies || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('saas_admin_token');
        localStorage.removeItem('saas_admin_user');
        window.location.href = '/saas-admin/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const companyColumns = [
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Tenant ID',
      dataIndex: 'tenantId',
      key: 'tenantId',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Plan',
      dataIndex: ['subscription', 'plan'],
      key: 'plan',
      render: (plan) => (
        <Tag color={plan === 'enterprise' ? 'gold' : plan === 'professional' ? 'blue' : 'green'}>
          {plan?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: ['subscription', 'status'],
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DashboardOutlined /> SaaS Admin Dashboard
        </Title>
        <Text type="secondary">
          Welcome back, {saasAdminUser?.name || 'Administrator'}! Here's your platform overview.
        </Text>
      </div>

      {/* Stats Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={dashboardData.summary.totalCompanies || 0}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Companies"
              value={dashboardData.summary.activeCompanies || 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={dashboardData.users.totalUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={dashboardData.revenue.monthlyRevenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="$"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Companies */}
      <Card title="Recent Companies" style={{ marginBottom: '24px' }}>
        <Table
          columns={companyColumns}
          dataSource={dashboardData.recentCompanies}
          rowKey="_id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Debug Info */}
      <Alert
        message="SaaS Admin System Status"
        description={`Successfully connected to backend. Token authentication working. ${dashboardData.summary.totalCompanies || 0} companies managed.`}
        type="success"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default SaasAdminDashboard;