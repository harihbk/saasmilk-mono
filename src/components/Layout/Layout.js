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
  ShoppingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  TeamOutlined,
  InboxOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined, 
  HistoryOutlined, 
  FileTextOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  AccountBookOutlined,
  TransactionOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  ShopOutlined,
  CloudServerOutlined,
  CarOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Build menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
      {
        key: '/products',
        icon: <ShoppingOutlined />,
        label: 'Products',
      },
      {
        key: '/orders',
        icon: <ShoppingCartOutlined />,
        label: 'Orders',
      },
      {
        key: '/customers',
        icon: <UserOutlined />,
        label: 'Customers',
      },
      {
        key: '/suppliers',
        icon: <TeamOutlined />,
        label: 'Suppliers',
      },
      {
        key: '/inventory',
        icon: <InboxOutlined />,
        label: 'Stocks',
      },
      {
        key: '/fleet',
        icon: <CarOutlined />,
        label: 'Fleet',
      },
      {
        key: '/fleet-maintenance',
        icon: <ToolOutlined />,
        label: 'Fleet Maintenance',
      },
      {
        key: '/users',
        icon: <UserOutlined />,
        label: 'Users',
      },
      {
        key: 'reports',
        icon: <BarChartOutlined />,
        label: 'Reports',
        children: [
          {
            key: '/reports/history',
            icon: <HistoryOutlined />,
            label: 'Order History',
          },
          {
            key: '/reports/dealers',
            icon: <FileTextOutlined />,
            label: 'Dealer Reports',
          },
          {
            key: '/reports/balance-sheet',
            icon: <AccountBookOutlined />,
            label: 'Balance Sheet',
          },
          {
            key: '/reports/simple-balance',
            icon: <AccountBookOutlined />,
            label: 'Simple Balance',
          },
          {
            key: '/reports/payment-history',
            icon: <TransactionOutlined />,
            label: 'Payment History',
          },
          {
            key: '/reports/routes',
            icon: <EnvironmentOutlined />,
            label: 'Route Reports',
          },
        ],
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Settings',
      },
    ];

    // Add super admin specific menu items
    if (user?.role === 'super_admin') {
      baseItems.splice(-1, 0, {
        key: '/saas-admin',
        icon: <CloudServerOutlined />,
        label: 'SaaS Admin',
      });
      baseItems.splice(-1, 0, {
        key: '/tenant-management',
        icon: <GlobalOutlined />,
        label: 'Tenant Management',
      });
    }

    // Add company management for company admins and super admins
    if (user?.role === 'super_admin' || user?.role === 'company_admin') {
      baseItems.splice(-1, 0, {
        key: '/companies',
        icon: <ShopOutlined />,
        label: 'Company Management',
      });
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleMenuClick = ({ key }) => {
    // Handle menu items with query parameters
    if (key.includes('?')) {
      // For URLs with query parameters, navigate to base path with search params
      const [path, search] = key.split('?');
      navigate(`${path}?${search}`);
    } else {
      navigate(key);
    }
  };

  const handleProfileMenuClick = ({ key }) => {
    if (key === 'profile') {
      navigate('profile');
    } else if (key === 'logout') {
      logout();
    }
  };

  const profileMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
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

  const getRoleColor = (role) => {
    const colors = {
      admin: '#f50',
      manager: '#2db7f5',
      employee: '#87d068',
      customer: '#108ee9',
    };
    return colors[role] || '#108ee9';
  };

  return (
    <AntLayout style={{ minHeight: '100vh', width: '100%' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={250}
        style={{
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        }}
      >
        <div className="logo">
          <div className="logo-icon">🥛</div>
          {!collapsed && (
            <div className="logo-text">
              <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                Milk Company
              </Text>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname + location.search]}
          defaultOpenKeys={[]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <Space size="large">
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>
            <Dropdown menu={profileMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  style={{
                    backgroundColor: getRoleColor(user?.role),
                  }}
                  icon={<UserOutlined />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text strong>{user?.name}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {user?.email}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
