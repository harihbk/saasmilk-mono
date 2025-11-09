import React, { useState, useEffect } from 'react';
import {
  Table, Button, Input, Select, Card, Modal, Form, InputNumber, Row, Col, Statistic, Alert
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { newInventoryAPI } from '../../services/api';

const { Option } = Select;

const NewInventory = () => {
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0, lowInventory: 0, totalValue: 0
  });

  useEffect(() => {
    fetchMeta();
    fetchInventory();
  }, []);

  const fetchMeta = async () => {
    try {
      const res = await newInventoryAPI.getMeta();
      if (res.data.success) {
        setCategories(res.data.data.categories);
        setSubcategories(res.data.data.subcategories);
      }
    } catch {}
  };

  const fetchInventory = async () => {
    setLoading(true);
    const res = await newInventoryAPI.getList({ search: searchText });
    if (res.data.success) {
      const d = res.data.data;
      setTableData(d);
      setDashboardStats({
        total: d.length,
        lowInventory: d.filter(i => (i.quantity || 0) < 10).length,
        totalValue: d.reduce((acc, curr) => acc + (curr.price || 0) * (curr.quantity || 0), 0),
      });
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
    setTimeout(() => fetchInventory(), 400);
  };

  const showModal = (item=null) => {
    form.resetFields();
    if (item) {
      form.setFieldsValue(item);
      setEditingItem(item);
    } else {
      setEditingItem(null);
    }
    setModalVisible(true);
  };

  const handleModalCancel = () => setModalVisible(false);

  const handleCategoryChange = (cat) => {
    form.setFieldsValue({ subcategory: undefined });
    setFilteredSubcategories(subcategories.filter(s => s.category === cat));
  };

  const handleFinish = async (values) => {
    if (editingItem) {
      // Edit
      const res = await newInventoryAPI.update(editingItem._id, values);
      if (res.data.success) {
        Modal.success({ title: 'Inventory Updated', content: 'Inventory item updated.' });
        setModalVisible(false);
        fetchInventory();
      } else {
        Modal.error({ title: 'Error', content: res.data.message });
      }
    } else {
      // Create
      const res = await newInventoryAPI.create(values);
      if (res.data.success) {
        Modal.success({ title: 'Inventory Added', content: 'New inventory added successfully.' });
        setModalVisible(false);
        fetchInventory();
      } else {
        Modal.error({ title: 'Error', content: res.data.message });
      }
    }
    setEditingItem(null);
    form.resetFields();
  };

  const handleDelete = async (item) => {
    Modal.confirm({
      title: 'Delete Inventory?',
      content: `Are you sure you want to delete "${item.brand}"?`,
      onOk: async () => {
        const res = await newInventoryAPI.delete(item._id);
        if (res.data.success) {
          fetchInventory();
        } else {
          Modal.error({ title: 'Error', content: res.data.message });
        }
      }
    });
  };

  // Table columns = all fields as simple columns, no level/status/progress.
  const columns = [
    { title: 'Category', dataIndex: 'category' },
    { title: 'Subcategory', dataIndex: 'subcategory' },
    { title: 'Brand', dataIndex: 'brand' },
    { title: 'Fat (%)', dataIndex: 'fat_content' },
    { title: 'SNF (%)', dataIndex: 'snf_content' },
    { title: 'Packing Type', dataIndex: 'packing_type' },
    { title: 'Quantity', dataIndex: 'quantity' },
    { title: 'Price', dataIndex: 'price', render: v => `₹${v || 0}` },
    {
      title: 'Actions',
      render: (_, r) => (
        <span>
          <Button type="link" icon={<EditOutlined />} onClick={() => showModal(r)}>
            Edit
          </Button>
          <Button type="link" icon={<DeleteOutlined />} danger onClick={() => handleDelete(r)}>
            Delete
          </Button>
        </span>
      )
    }
  ];

  // Alert label changed to Inventory
  const inventoryAlertMsg = `0 critical alerts, 0 warnings`;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 26, fontWeight: 700 }}>Inventory Management</span>
        {/* <div style={{ fontWeight: 600, marginTop: 4 }}>
          <span>Current Items: <b>{dashboardStats.total}</b></span>
          <span style={{ marginLeft: 16 }}>Loading: <b>{loading ? 'Yes' : 'No'}</b></span>
          <span style={{ marginLeft: 16 }}>Last Fetch: {new Date().toLocaleTimeString()}</span>
        </div> */}
      </div>
      {/* <Alert
        type="warning"
        message={<b>Inventory Alerts</b>}
        description={inventoryAlertMsg}
        style={{ marginBottom: 18 }}
      /> */}

      <Row gutter={24} style={{ marginBottom: 18 }}>
        <Col span={8}><Card><Statistic title="Total Inventory" value={dashboardStats.total} /></Card></Col>
        <Col span={8}><Card><Statistic title="Low Inventory Items" value={dashboardStats.lowInventory} valueStyle={{ color: '#fa541c' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Total Inventory Value" value={`₹${dashboardStats.totalValue}`} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <Input
            placeholder="Search inventory..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={handleSearch}
            allowClear
            style={{ maxWidth: 320 }}
          />
        </Col>
        <Col flex="none">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>Add Inventory Item</Button>
        </Col>
      </Row>

      <Table columns={columns} dataSource={tableData} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />

      {/* Modal Form - three columns */}
      <Modal
        title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
        open={modalVisible}
        footer={null}
        onCancel={handleModalCancel}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select showSearch onChange={handleCategoryChange} placeholder="Select Category">
                  {categories.map(cat =>
                    <Option key={cat} value={cat}>{cat}</Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="subcategory" label="Subcategory" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select Subcategory">
                  {filteredSubcategories.map(sc =>
                    <Option key={sc.value} value={sc.value}>{sc.label}</Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="brand" label="Brand">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="fat_content" label="Fat (%)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="snf_content" label="SNF (%)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="packing_type" label="Packing Type">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="price" label="Price" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            {/* No expiry field */}
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingItem ? "Update" : "Create"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewInventory;
