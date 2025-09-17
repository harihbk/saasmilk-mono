import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Typography,
  Tag,
  Row,
  Col,
  Upload,
  Avatar,
  Image,
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
} from '@ant-design/icons';
import { categoriesAPI, warehousesAPI, companiesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DealerGroups from '../../components/DealerGroups/DealerGroups';
import Dealers from '../../components/Dealers/Dealers';
import Warehouses from '../../components/Warehouses/Warehouses';
import Routes from '../../components/Routes/Routes';
import Roles from '../../components/Roles/Roles';

const { Title } = Typography;
const { TextArea } = Input;

const Settings = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();
  const [companyForm] = Form.useForm();

  useEffect(() => {
    fetchCategories();
    if (user?.company) {
      fetchCompanyProfile();
    }
  }, [user]);

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

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingCategory(null);
    form.resetFields();
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

  const fetchCompanyProfile = async () => {
    setCompanyLoading(true);
    try {
      const response = await companiesAPI.getCompany(user.company);
      const companyData = response.data.data.company;
      console.log('Company data received:', companyData);
      console.log('Logo URL:', companyData.settings?.theme?.logo);
      setCompany(companyData);
      
      // Set form values - use object structure matching the form field names
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
          }
        },
        businessInfo: {
          type: companyData.businessInfo?.type,
          website: companyData.businessInfo?.website,
          description: companyData.businessInfo?.description,
          gstNumber: companyData.businessInfo?.gstNumber,
        }
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
      console.log('Frontend: Submitting company update with values:', values);
      console.log('Frontend: Company ID:', user.company);
      
      const response = await companiesAPI.updateCompany(user.company, values);
      console.log('Frontend: Update response:', response.data);
      
      message.success('Company profile updated successfully');
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error updating company profile:', error);
      console.error('Error details:', error.response?.data);
      message.error(`Failed to update company profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleLogoUpload = async (file) => {
    setLogoUploading(true);
    try {
      console.log('Uploading logo file:', file.name, file.type, file.size);
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await companiesAPI.uploadLogo(user.company, formData);
      console.log('Logo upload response:', response.data);
      message.success('Logo uploaded successfully');
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error uploading logo:', error);
      message.error(`Failed to upload logo: ${error.response?.data?.message || error.message}`);
    } finally {
      setLogoUploading(false);
    }
    return false; // Prevent default upload behavior
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      await companiesAPI.deleteLogo(user.company);
      message.success('Logo removed successfully');
      fetchCompanyProfile();
    } catch (error) {
      console.error('Error removing logo:', error);
      message.error(`Failed to remove logo: ${error.response?.data?.message || error.message}`);
    } finally {
      setLogoUploading(false);
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
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          />
          <Popconfirm
            title="Are you sure you want to deactivate this category?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getTabItems = () => {
    const items = [];

    // Add company profile tab for company users
    if (user?.company && user?.role !== 'super_admin') {
      items.push({
        key: 'company-profile',
        label: (
          <span>
            <ShopOutlined />
            Company Profile
          </span>
        ),
        children: (
          <Card>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ShopOutlined style={{ marginRight: 8 }} />
                Company Information
              </Title>
              <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                View and update your company profile information
              </p>
            </div>

            {company && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                  <Card>
                    <div style={{ textAlign: 'center' }}>
                      <GlobalOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: 8 }} />
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        {company.tenantId}
                      </div>
                      <div style={{ color: '#666' }}>Tenant ID</div>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div style={{ textAlign: 'center' }}>
                      <Tag color={company.subscription?.plan === 'enterprise' ? 'purple' : 
                                 company.subscription?.plan === 'professional' ? 'green' :
                                 company.subscription?.plan === 'basic' ? 'blue' : 'orange'}>
                        {company.subscription?.plan?.toUpperCase()}
                      </Tag>
                      <div style={{ color: '#666', marginTop: 4 }}>Subscription Plan</div>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: company.isActive ? '#52c41a' : '#f5222d' }}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <div style={{ color: '#666' }}>Status</div>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Company Logo Section */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                  <UploadOutlined style={{ marginRight: 8 }} />
                  Company Logo
                </Title>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                  Upload your company logo (JPG, PNG, GIF, or WebP - Max 5MB)
                </p>
              </div>

              <Row gutter={16} align="middle">
                <Col span={4}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar
                      size={80}
                      src={company?.settings?.theme?.logo || null}
                      icon={!company?.settings?.theme?.logo ? <ShopOutlined /> : null}
                      alt="Company Logo"
                      style={{ 
                        border: '2px solid #f0f0f0',
                        backgroundColor: !company?.settings?.theme?.logo ? '#f0f0f0' : 'transparent',
                        color: !company?.settings?.theme?.logo ? '#999' : 'inherit'
                      }}
                      onError={(e) => {
                        console.error('Avatar: Logo load error for URL:', company?.settings?.theme?.logo);
                        console.error('Avatar: Full company object:', company);
                      }}
                    />
                    
                    {/* Test regular img tag */}
                    {process.env.NODE_ENV === 'development' && company?.settings?.theme?.logo && (
                      <div style={{ marginTop: 8 }}>
                        <img 
                          src={company.settings.theme.logo} 
                          alt="Test" 
                          style={{ width: 40, height: 40, border: '1px solid red' }}
                          onLoad={() => console.log('IMG: Image loaded successfully:', company.settings.theme.logo)}
                          onError={(e) => console.error('IMG: Image load error:', company.settings.theme.logo, e)}
                        />
                      </div>
                    )}
                    {/* Debug info - remove this later */}
                    {process.env.NODE_ENV === 'development' && company?.settings?.theme?.logo && (
                      <div style={{ fontSize: '8px', color: '#999', marginTop: 4, wordBreak: 'break-all' }}>
                        URL: {company.settings.theme.logo}
                        <br />
                        <a href={company.settings.theme.logo} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
                          Test Direct Link
                        </a>
                      </div>
                    )}
                  </div>
                </Col>
                <Col span={20}>
                  <Space>
                    <Upload
                      beforeUpload={handleLogoUpload}
                      accept="image/*"
                      showUploadList={false}
                      disabled={logoUploading}
                    >
                      <Button 
                        icon={logoUploading ? <LoadingOutlined /> : <UploadOutlined />}
                        loading={logoUploading}
                      >
                        {company?.settings?.theme?.logo ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                    </Upload>
                    
                    {company?.settings?.theme?.logo && (
                      <Popconfirm
                        title="Are you sure you want to remove the logo?"
                        onConfirm={handleLogoRemove}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button 
                          danger 
                          icon={<DeleteOutlined />}
                          disabled={logoUploading}
                        >
                          Remove Logo
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Col>
              </Row>
            </Card>

            <Form
              form={companyForm}
              layout="vertical"
              onFinish={handleCompanyUpdate}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Company Name"
                    rules={[{ required: true, message: 'Please enter company name' }]}
                  >
                    <Input 
                      prefix={<ShopOutlined />}
                      placeholder="Enter company name" 
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'email']}
                    label="Contact Email"
                    rules={[
                      { required: true, message: 'Please enter contact email' },
                      { type: 'email', message: 'Please enter a valid email' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />}
                      placeholder="Enter contact email" 
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'phone']}
                    label="Contact Phone"
                  >
                    <Input 
                      prefix={<PhoneOutlined />}
                      placeholder="Enter contact phone" 
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['contactInfo', 'address', 'street']}
                    label="Street Address"
                  >
                    <Input placeholder="Enter street address" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['contactInfo', 'address', 'city']}
                    label="City"
                  >
                    <Input placeholder="Enter city" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['contactInfo', 'address', 'state']}
                    label="State"
                  >
                    <Input placeholder="Enter state" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['contactInfo', 'address', 'postalCode']}
                    label="Postal Code"
                  >
                    <Input placeholder="Enter postal code" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['businessInfo', 'type']}
                    label="Business Type"
                  >
                    <Input placeholder="Enter business type" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['businessInfo', 'website']}
                    label="Website"
                    rules={[{ type: 'url', message: 'Please enter a valid website URL' }]}
                  >
                    <Input placeholder="https://example.com" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['businessInfo', 'gstNumber']}
                    label="GST Number"
                    rules={[
                      { 
                        pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                        message: 'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)'
                      }
                    ]}
                  >
                    <Input 
                      placeholder="Enter GST number (e.g., 22AAAAA0000A1Z5)" 
                      style={{ textTransform: 'uppercase' }}
                      maxLength={15}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name={['businessInfo', 'description']}
                label="Business Description"
              >
                <TextArea 
                  rows={3} 
                  placeholder="Enter business description"
                />
              </Form.Item>

              <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={companyLoading}
                  icon={<SaveOutlined />}
                >
                  Update Company Profile
                </Button>
              </Form.Item>
            </Form>
          </Card>
        ),
      });
    }

    // Add remaining tabs
    items.push(
      {
        key: 'categories',
        label: (
          <span>
            <TagOutlined />
            Categories
          </span>
        ),
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>Product Categories</Title>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                  Manage product categories for better organization
                </p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal()}
              >
                Add Category
              </Button>
            </div>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                      {categories.length}
                    </div>
                    <div style={{ color: '#666' }}>Total Categories</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                      {categories.filter(c => c.isActive).length}
                    </div>
                    <div style={{ color: '#666' }}>Active Categories</div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa541c' }}>
                      {categories.filter(c => !c.isActive).length}
                    </div>
                    <div style={{ color: '#666' }}>Inactive Categories</div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card>
              <Table
                columns={columns}
                dataSource={categories}
                rowKey="_id"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                }}
              />
            </Card>
          </div>
        ),
      },
      {
        key: 'dealer-groups',
        label: (
          <span>
            <TeamOutlined />
            Dealer Groups
          </span>
        ),
        children: <DealerGroups />,
      },
      {
        key: 'dealers',
        label: (
          <span>
            <UserOutlined />
            Dealers
          </span>
        ),
        children: <Dealers />,
      },
      {
        key: 'warehouses',
        label: (
          <span>
            <HomeOutlined />
            Warehouses
          </span>
        ),
        children: <Warehouses />,
      },
      {
        key: 'routes',
        label: (
          <span>
            <EnvironmentOutlined />
            Routes
          </span>
        ),
        children: <Routes />,
      },
      {
        key: 'roles',
        label: (
          <span>
            <SecurityScanOutlined />
            Roles
          </span>
        ),
        children: <Roles />,
      }
    );

    return items;
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Settings</Title>
        <p style={{ color: '#666', margin: 0 }}>
          Manage system settings and configurations
        </p>
      </div>

      <Tabs items={getTabItems()} />

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
            name="name"
            label="Category Name"
            rules={[
              { required: true, message: 'Please enter category name' },
              { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens allowed' },
              { min: 1, max: 50, message: 'Name must be between 1 and 50 characters' },
            ]}
            help="Used internally (e.g., whole-milk, skim-milk)"
          >
            <Input placeholder="e.g., whole-milk" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[
              { required: true, message: 'Please enter display name' },
              { min: 1, max: 100, message: 'Display name must be between 1 and 100 characters' },
            ]}
            help="User-friendly name shown in the interface"
          >
            <Input placeholder="e.g., Whole Milk" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { max: 500, message: 'Description must be less than 500 characters' },
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="Brief description of this category"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
