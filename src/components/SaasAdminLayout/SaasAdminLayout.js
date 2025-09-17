import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Badge,
  Space,
  Typography,
} from 'antd';
import {
  DashboardOutlined,
  GlobalOutlined,
  ShopOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
  SettingOutlined,
  CloudServerOutlined,
  TeamOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import './SaasAdminLayout.css';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const SaasAdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get admin user from localStorage
  const adminUser = JSON.parse(localStorage.getItem('saas_admin_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('saas_admin_token');
    localStorage.removeItem('saas_admin_user');
    navigate('/saas-admin/login');
  };

  const menuItems = [
    {
      key: '/saas-admin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/saas-admin/tenants',
      icon: <GlobalOutlined />,
      label: 'Tenant Management',
    },
    {
      key: '/saas-admin/companies',
      icon: <ShopOutlined />,
      label: 'Companies',
    },
    {
      key: '/saas-admin/billing',
      icon: <DollarOutlined />,
      label: 'Billing & Subscriptions',
    },
    {
      key: '/saas-admin/users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
      children: [
        {
          key: '/saas-admin/analytics/revenue',
          icon: <DollarOutlined />,
          label: 'Revenue Analytics',
        },
        {
          key: '/saas-admin/analytics/usage',
          icon: <BarChartOutlined />,
          label: 'Usage Analytics',
        },
        {
          key: '/saas-admin/analytics/reports',
          icon: <FileTextOutlined />,
          label: 'Reports',
        },
      ],
    },
    {
      key: '/saas-admin/settings',
      icon: <SettingOutlined />,
      label: 'System Settings',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleProfileMenuClick = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'main-app') {
      window.open('/login', '_blank');
    }
  };

  const profileMenu = {
    items: [
      {
        key: 'main-app',
        icon: <GlobalOutlined />,
        label: 'Open Main App',
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
      },
    ],
    onClick: handleProfileMenuClick,
  };

  return (
    <AntLayout style={{ minHeight: '100vh', width: '100%' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={280}
        className="saas-admin-sider"
      >
        <div className="saas-admin-logo">
          <CloudServerOutlined className="saas-admin-logo-icon" />
          {!collapsed && (
            <div className="saas-admin-logo-text">
              <Text strong style={{ fontSize: '18px', color: '#fff' }}>
                SaaS Admin
              </Text>
              <Text style={{ fontSize: '12px', color: '#8c9eff', display: 'block' }}>
                Control Panel
              </Text>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="saas-admin-menu"
        />
      </Sider>
      <AntLayout>
        <Header className="saas-admin-header">
          <div className="saas-admin-header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="saas-admin-collapse-btn"
            />
            <div className="saas-admin-breadcrumb">
              <Text strong style={{ color: '#2c3e50', fontSize: '16px' }}>
                SaaS Administration Portal
              </Text>
            </div>
          </div>
          <Space size="large">
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined />}
                className="saas-admin-notification-btn"
              />
            </Badge>
            <Dropdown menu={profileMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }} className="saas-admin-profile">
                <Avatar
                  style={{
                    backgroundColor: '#667eea',
                    border: '2px solid #fff',
                  }}
                  icon={<UserOutlined />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text strong style={{ color: '#2c3e50' }}>
                    {adminUser?.name || 'Super Admin'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {adminUser?.email || 'admin@company.com'}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="saas-admin-content">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default SaasAdminLayout;
