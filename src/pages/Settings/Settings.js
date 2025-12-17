import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Typography,
  Tag,
  Row,
  Col,
  Upload,
  Avatar,
  Image,
  Select,
  Layout,
  Menu,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  TeamOutlined,
  UserOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  SecurityScanOutlined,
  ShopOutlined,
  GlobalOutlined,
  PhoneOutlined,
  MailOutlined,
  SaveOutlined,
  UploadOutlined,
  LoadingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { categoriesAPI, warehousesAPI, companiesAPI, subCategoriesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DealerGroups from '../../components/DealerGroups/DealerGroups';
import Dealers from '../../components/Dealers/Dealers';
import Warehouses from '../../components/Warehouses/Warehouses';
import Routes from '../../components/Routes/Routes';
import Roles from '../../components/Roles/Roles';
import AutoStockTab from './AutoStockTab/Index';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Sider, Content } = Layout;

const Settings = () => {
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState('profile');
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingInventory, setEditingInventory] = useState(null);
  const [form] = Form.useForm();
  const [inventoryForm] = Form.useForm();
  const [companyForm] = Form.useForm();

  useEffect(() => {
    console.log(user);
    fetchCategories();
    fetchInventoryItems();

    // Load company only when valid id exists
    if (user && user?.company) {
      fetchCompanyProfile();
    } else {
      console.warn("⏳ Waiting for company info...");
    }
  }, [user?.company]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await categoriesAPI.getCategories({ limit: 100 });
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    setInventoryLoading(true);
    try {
      const response = await subCategoriesAPI.getSubCategories({ limit: 100 });
      setInventoryItems(response.data.data.inventory || response.data.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      message.error('Failed to fetch inventory');
    } finally {
      setInventoryLoading(false);
    }
  };

  const showModal = (category = null) => {
    setEditingCategory(category);
    setModalVisible(true);
    if (category) {
      form.setFieldsValue({
        name: category.name,
        displayName: category.displayName,
        description: category.description,
      });
    } else {
      form.resetFields();
    }
  };

  const showInventoryModal = (inventory = null) => {
    setEditingInventory(inventory);
    setInventoryModalVisible(true);
    if (inventory) {
      inventoryForm.setFieldsValue({
        category: inventory.category?._id || inventory.category,
        subcategory: inventory.subcategory,
        status: inventory.status || 'active',
      });
    } else {
      inventoryForm.resetFields();
      inventoryForm.setFieldsValue({ status: 'active' });
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleInventoryModalCancel = () => {
    setInventoryModalVisible(false);
    setEditingInventory(null);
    inventoryForm.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCategory) {
        await categoriesAPI.updateCategory(editingCategory._id, values);
        message.success('Category updated successfully');
      } else {
        await categoriesAPI.createCategory(values);
        message.success('Category created successfully');
      }
      setModalVisible(false);
      setEditingCategory(null);
      form.resetFields();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      message.error(`Failed to save category: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleInventorySubmit = async (values) => {
    try {
      if (editingInventory) {
        await subCategoriesAPI.updateSubCategory(editingInventory._id, values);
        message.success('Subcategory updated successfully');
      } else {
        await subCategoriesAPI.createSubCategory(values);
        message.success('Subcategory created successfully');
      }
      setInventoryModalVisible(false);
      setEditingInventory(null);
      inventoryForm.resetFields();
      fetchInventoryItems();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      message.error(`Failed to save subcategory: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoriesAPI.deleteCategory(id);
      message.success('Category deactivated successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      message.error('Failed to delete category');
    }
  };

  const handleInventoryDelete = async (id) => {
    try {
      await subCategoriesAPI.deleteSubCategory(id);
      message.success('Subcategory deleted successfully');
      fetchInventoryItems();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      message.error('Failed to delete subcategory');
    }
  };

  const fetchCompanyProfile = async () => {
    setCompanyLoading(true);
    try {
      const response = await companiesAPI.getCompany(user.company?.id || user.company);
      const companyData = response.data.data.company;
      setCompany(companyData);
      companyForm.setFieldsValue({
        name: companyData.name,
        contactInfo: {
          email: companyData.contactInfo?.email,
          phone: companyData.contactInfo?.phone,
          address: {
            street: companyData.contactInfo?.address?.street,
            city: companyData.contactInfo?.address?.city,
            state: companyData.contactInfo?.address?.state,
            postalCode: companyData.contactInfo?.address?.postalCode,
          },
        },
        businessInfo: {
          type: companyData.businessInfo?.type,
          website: companyData.businessInfo?.website,
          description: companyData.businessInfo?.description,
          gstNumber: companyData.businessInfo?.gstNumber,
          profitMargin: companyData.businessInfo?.profitMargin || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching company profile:', error);
      message.error('Failed to fetch company profile');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleCompanyUpdate = async (values) => {
    setCompanyLoading(true);
    try {
      const companyId = company?._id || user.company?.id || user.company;
      await companiesAPI.updateCompany(companyId, values);
      message.success('Company profile updated successfully');
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error updating company profile:', error);
      message.error(`Failed to update company profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleLogoUpload = async (file) => {
    setLogoUploading(true);
    try {
      const companyId = company?._id || user.company?.id || user.company;
      const formData = new FormData();
      formData.append('logo', file);
      await companiesAPI.uploadLogo(companyId, formData);
      message.success('Logo uploaded successfully');
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error uploading logo:', error);
      message.error(`Failed to upload logo: ${error.response?.data?.message || error.message}`);
    } finally {
      setLogoUploading(false);
    }
    return false;
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      const companyId = company?._id || user.company?.id || user.company;
      await companiesAPI.deleteLogo(companyId);
      message.success('Logo removed successfully');
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error removing logo:', error);
      message.error(`Failed to remove logo: ${error.response?.data?.message || error.message}`);
    } finally {
      setLogoUploading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <code>{text}</code>,
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to deactivate this category?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const inventoryColumns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text, record) => {
        const categoryName = record.category?.displayName || record.category?.name || 'Unknown';
        return <Tag color="blue">{categoryName}</Tag>;
      },
      sorter: (a, b) => {
        const nameA = a.category?.displayName || a.category?.name || '';
        const nameB = b.category?.displayName || b.category?.name || '';
        return nameA.localeCompare(nameB);
      }
    },
    {
      title: 'Subcategory',
      dataIndex: 'subcategory',
      key: 'subcategory',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showInventoryModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this subcategory?"
            onConfirm={() => handleInventoryDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const menuItems = [
    {
      key: 'profile',
      icon: <HomeOutlined />,
      label: 'Company Profile',
    },
    {
      key: 'categories',
      icon: <TagOutlined />,
      label: 'Categories',
    },
    {
      key: 'subcategories',
      icon: <AppstoreOutlined />,
      label: 'Subcategories',
    },
    {
      key: 'warehouses',
      icon: <ShopOutlined />,
      label: 'Warehouses',
    },
    {
      key: 'dealerGroups',
      icon: <TeamOutlined />,
      label: 'Dealer Groups',
    },
    {
      key: 'dealers',
      icon: <UserOutlined />,
      label: 'Dealers',
    },
    {
      key: 'routes',
      icon: <EnvironmentOutlined />,
      label: 'Routes',
    },
    {
      key: 'roles',
      icon: <SecurityScanOutlined />,
      label: 'Roles & Permissions',
    },
    {
      key: 'auto_stock',
      label: 'Auto Stock',
    }
  ];

  const renderContent = () => {
    switch (activeKey) {
      case 'profile':
        return (
          <Card>
            <Title level={4}>Company Profile</Title>
            <p>View and update your company profile information</p>

            {/* Logo Upload Section */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col span={24}>
                <Card type="inner" title="Company Logo">
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      {company?.settings?.theme?.logo ? (
                        <Image
                          src={company.settings.theme.logo}
                          alt="Company Logo"
                          style={{ maxWidth: '200px', maxHeight: '200px' }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                        />
                      ) : (
                        <Avatar size={120} icon={<ShopOutlined />} />
                      )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <Space>
                        <Upload
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          showUploadList={false}
                          beforeUpload={handleLogoUpload}
                          disabled={logoUploading}
                        >
                          <Button
                            icon={logoUploading ? <LoadingOutlined /> : <UploadOutlined />}
                            loading={logoUploading}
                          >
                            Upload Logo
                          </Button>
                        </Upload>

                        {company?.settings?.theme?.logo && (
                          <Popconfirm
                            title="Are you sure you want to remove the logo?"
                            onConfirm={handleLogoRemove}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button danger loading={logoUploading}>
                              Remove Logo
                            </Button>
                          </Popconfirm>
                        )}
                      </Space>
                      <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                        Upload your company logo (JPG, PNG, GIF, or WebP - Max 5MB)
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* Company Form */}
            <Form
              form={companyForm}
              layout="vertical"
              onFinish={handleCompanyUpdate}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="Company Name"
                    name="name"
                    rules={[{ required: true, message: 'Please enter company name' }]}
                  >
                    <Input prefix={<ShopOutlined />} />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="Email"
                    name={['contactInfo', 'email']}
                    rules={[
                      { required: true, message: 'Please enter email' },
                      { type: 'email', message: 'Please enter valid email' }
                    ]}
                  >
                    <Input prefix={<MailOutlined />} />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="Phone"
                    name={['contactInfo', 'phone']}
                    rules={[{ required: true, message: 'Please enter phone' }]}
                  >
                    <Input prefix={<PhoneOutlined />} />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    label="Street Address"
                    name={['contactInfo', 'address', 'street']}
                  >
                    <Input prefix={<EnvironmentOutlined />} />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    label="City"
                    name={['contactInfo', 'address', 'city']}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    label="State"
                    name={['contactInfo', 'address', 'state']}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    label="Postal Code"
                    name={['contactInfo', 'address', 'postalCode']}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="Business Type"
                    name={['businessInfo', 'type']}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="Website"
                    name={['businessInfo', 'website']}
                  >
                    <Input prefix={<GlobalOutlined />} />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="GST Number"
                    name={['businessInfo', 'gstNumber']}
                  >
                    <Input />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="Profit Margin (%)"
                    name={['businessInfo', 'profitMargin']}
                    tooltip="Default profit margin percentage for pricing calculations"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      placeholder="0.00"
                      suffix="%"
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    label="Description"
                    name={['businessInfo', 'description']}
                  >
                    <TextArea rows={4} />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={companyLoading}
                    >
                      Update Company Profile
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        );
      case 'categories':
        return (
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>Product Categories</Title>
                <p style={{ margin: 0, color: '#666' }}>Manage product categories for better organization</p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                Add Category
              </Button>
            </div>
            <Table
              columns={columns}
              dataSource={categories}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );
      case 'subcategories':
        return (
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>Subcategory Management</Title>
                <p style={{ margin: 0, color: '#666' }}>Manage subcategories under parent categories</p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  fetchCategories();
                  showInventoryModal();
                }}
              >
                Add Subcategory
              </Button>
            </div>
            <Table
              columns={inventoryColumns}
              dataSource={inventoryItems}
              rowKey="_id"
              loading={inventoryLoading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        );
      case 'warehouses':
        return <Warehouses />;
      case 'dealerGroups':
        return <DealerGroups />;
      case 'dealers':
        return <Dealers />;
      case 'routes':
        return <Routes />;
      case 'roles':
        return <Roles />;
      case 'auto_stock':
        return <AutoStockTab />;
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '80vh', background: '#fff' }}>
      <Sider width={250} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>Settings</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          style={{ height: '100%', borderRight: 0 }}
          onClick={({ key }) => setActiveKey(key)}
          items={menuItems}
        />
      </Sider>
      <Layout style={{ padding: '24px' }}>
        <Content style={{ background: '#fff', minHeight: 280 }}>
          {renderContent()}
        </Content>
      </Layout>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Category Name (Internal)"
            name="name"
            rules={[
              { required: true, message: 'Please enter category name' },
              { pattern: /^[a-z-]+$/, message: 'Only lowercase letters and hyphens allowed' }
            ]}
          >
            <Input placeholder="e.g., dairy-products" />
          </Form.Item>

          <Form.Item
            label="Display Name"
            name="displayName"
            rules={[{ required: true, message: 'Please enter display name' }]}
          >
            <Input placeholder="e.g., Dairy Products" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={4} placeholder="Category description..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={handleModalCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Subcategory Inventory Modal */}
      <Modal
        title={editingInventory ? 'Edit Subcategory' : 'Add Subcategory'}
        open={inventoryModalVisible}
        onCancel={handleInventoryModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={inventoryForm}
          layout="vertical"
          onFinish={handleInventorySubmit}
        >
          <Form.Item
            label="Parent Category"
            name="category"
            rules={[{ required: true, message: 'Please select parent category' }]}
          >
            <Select
              placeholder="Select Category"
              showSearch
              optionFilterProp="children"
            >
              {categories.map(cat => (
                <Option key={cat._id} value={cat._id}>{cat.displayName || cat.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Subcategory Name"
            name="subcategory"
            rules={[{ required: true, message: 'Please enter subcategory name' }]}
          >
            <Input placeholder="e.g., Whole Milk" />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingInventory ? 'Update' : 'Create'}
              </Button>
              <Button onClick={handleInventoryModalCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Settings;
