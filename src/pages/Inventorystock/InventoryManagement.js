import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  message,
  DatePicker,
  Select,
  Typography,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  MinusCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryStockAPI } from '../../services/api';

const { Title } = Typography;
const { Search } = Input;

const InventoryManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalType, setModalType] = useState(null); // add | edit | purchase | consume
  const [editingItem, setEditingItem] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  const [form] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [searchText, setSearchText] = useState('');

  // 🔹 Fetch inventory from API
  const fetchInventory = async (params = {}) => {
    setLoading(true);
    try {
      const res = await inventoryStockAPI.getInventory({
        page: pagination.current,
        limit: pagination.pageSize,
        search: searchText || undefined,
        ...params,
      });

      const data = res.data?.data || {};
      const inventories = data.inventories || data.items || [];
      const pager = data.pagination || {};

      setItems(inventories);
      setPagination((prev) => ({
        ...prev,
        current: pager.page || prev.current,
        pageSize: pager.limit || prev.pageSize,
        total: pager.total || inventories.length || 0,
      }));
    } catch (err) {
      console.error(err);
      message.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize]);

  // 🔹 Table change (pagination / sort)
  const handleTableChange = (pager /*, filters, sorter*/) => {
    setPagination((prev) => ({
      ...prev,
      current: pager.current,
      pageSize: pager.pageSize,
    }));
  };

  // 🔹 Open modal
  const openModal = (type, record = null) => {
    setModalType(type);
    setEditingItem(record || null);
    form.resetFields();

    if (record && (type === 'edit' || type === 'add')) {
      form.setFieldsValue({
        itemCode: record.itemCode,
        itemName: record.itemName,
        category: record.category,
        unit: record.unit,
        quantity: record.quantity,
        reorderLevel: record.reorderLevel,
        minQuantity: record.minQuantity,
        sellingPrice: record.sellingPrice,
        purchasePrice: record.purchasePrice,
        expiryAlertDays: record.expiryAlertDays,
        description: record.description,
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    form.resetFields();
  };

  // 🔹 Show stock history drawer
  const showHistory = (record) => {
    setHistoryItem(record);
    setHistoryOpen(true);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryItem(null);
  };

  // 🔹 Submit handler for all modals
  const handleSubmit = async (values) => {
    try {
      if (modalType === 'add') {
        await inventoryStockAPI.createInventoryItem(values);
        message.success('Item created successfully');
      } else if (modalType === 'edit') {
        await inventoryStockAPI.updateInventoryItem(editingItem._id, values);
        message.success('Item updated successfully');
      } else if (modalType === 'purchase') {
        // purchase stock
        const payload = {
          qty: values.qty,
          unitCost: values.unitCost,
          batchNo: values.batchNo,
          expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
          refNo: values.refNo,
          note: values.note,
        };
        await inventoryStockAPI.purchaseStock(editingItem._id, payload);
        message.success('Stock added successfully');
      } else if (modalType === 'consume') {
        // consume stock
        const payload = {
          qty: values.qty,
          reason: values.reason,
          refNo: values.refNo,
          note: values.note,
        };
        await inventoryStockAPI.consumeStock(editingItem._id, payload);
        message.success('Stock consumed successfully');
      }

      closeModal();
      fetchInventory();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  // 🔹 Soft delete item
  const handleDelete = (record) => {
    Modal.confirm({
      title: `Are you sure you want to delete "${record.itemName}"?`,
      icon: <ExclamationCircleOutlined />,
      okType: 'danger',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await inventoryStockAPI.deleteInventoryItem(record._id);
          message.success('Item deleted successfully');
          fetchInventory();
        } catch (err) {
          console.error(err);
          message.error('Failed to delete item');
        }
      },
    });
  };

  // 🔹 Helpers for UI flags
  const isLowStock = (record) => {
    if (record.reorderLevel != null && record.reorderLevel !== undefined) {
      return record.quantity <= record.reorderLevel;
    }
    if (record.minQuantity != null && record.minQuantity !== undefined) {
      return record.quantity <= record.minQuantity;
    }
    return false;
  };

  const getNearestExpiry = (record) => {
    if (!record.batches || record.batches.length === 0) return null;
    const valid = record.batches.filter((b) => b.expiryDate);
    if (valid.length === 0) return null;
    const dates = valid
      .map((b) => new Date(b.expiryDate))
      .sort((a, b) => a - b);
    return dates[0];
  };

  const getExpiryStatus = (record) => {
    const nearest = getNearestExpiry(record);
    if (!nearest) return { label: 'No Expiry', color: 'default' };

    const today = dayjs();
    const exp = dayjs(nearest);
    const diff = exp.diff(today, 'day');

    const alertDays = record.expiryAlertDays || 0;

    if (diff < 0) return { label: `Expired ${Math.abs(diff)}d ago`, color: 'red' };
    if (diff === 0) return { label: 'Expires today', color: 'red' };
    if (diff <= alertDays) return { label: `Expiring in ${diff}d`, color: 'orange' };
    return { label: `In ${diff}d`, color: 'green' };
  };

  // 🔹 Table columns
  const columns = [
    { title: 'Code', dataIndex: 'itemCode', key: 'itemCode', width: 120 },
    { title: 'Name', dataIndex: 'itemName', key: 'itemName', width: 180 },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      align: 'center',
      width: 90,
      render: (qty, record) => (
        <Tag color={isLowStock(record) ? 'red' : 'green'}>
          {qty}
          {record.unit ? ` ${record.unit}` : ''}
        </Tag>
      ),
    },
    // {
    //   title: 'Reserved',
    //   dataIndex: 'reservedQuantity',
    //   align: 'center',
    //   width: 90,
    //   render: (val) => val || 0,
    // },
    // {
    //   title: 'Reorder',
    //   dataIndex: 'reorderLevel',
    //   align: 'center',
    //   width: 90,
    //   render: (val) => val ?? '-',
    // },
    // {
    //   title: 'Avg Cost (₹)',
    //   dataIndex: 'avgCost',
    //   align: 'right',
    //   width: 110,
    //   render: (val) => (val != null ? Number(val).toFixed(2) : '0.00'),
    // },
    // {
    //   title: 'Last Purchase (₹)',
    //   dataIndex: 'lastPurchasePrice',
    //   align: 'right',
    //   width: 120,
    //   render: (val) => (val != null ? Number(val).toFixed(2) : '0.00'),
    // },
    // {
    //   title: 'Selling Price (₹)',
    //   dataIndex: 'sellingPrice',
    //   align: 'right',
    //   width: 120,
    //   render: (val) => (val != null ? Number(val).toFixed(2) : '0.00'),
    // },
    // {
    //   title: 'Valuation (₹)',
    //   dataIndex: 'valuation',
    //   align: 'right',
    //   width: 120,
    //   render: (val) => (val != null ? Number(val).toFixed(2) : '0.00'),
    // },
    {
      title: 'Expiry',
      key: 'expiry',
      width: 150,
      render: (_, record) => {
        const status = getExpiryStatus(record);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      align: 'center',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 260,
      align: 'center',
      render: (record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal('edit', record)}
          />
          <Button
            size="small"
            icon={<ShoppingCartOutlined />}
            onClick={() => openModal('purchase', record)}
          />
          <Button
            size="small"
            danger
            icon={<MinusCircleOutlined />}
            onClick={() => openModal('consume', record)}
          />
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => showHistory(record)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  // 🔹 Modal dynamic title
  const renderModalTitle = () => {
    if (modalType === 'add') return 'Add Inventory Item';
    if (modalType === 'edit') return `Edit Item - ${editingItem?.itemName}`;
    if (modalType === 'purchase') return `Add Stock - ${editingItem?.itemName}`;
    if (modalType === 'consume') return `Consume Stock - ${editingItem?.itemName}`;
    return '';
  };

  // 🔹 Modal form fields per mode
  const renderFormFields = () => {
    switch (modalType) {
      case 'add':
      case 'edit':
        return (
          <>
            <Form.Item
              name="itemCode"
              label="Item Code"
              rules={[{ required: true, message: 'Item code is required' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="itemName"
              label="Item Name"
              rules={[{ required: true, message: 'Item name is required' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="category" label="Category">
              <Input />
            </Form.Item>
            <Form.Item name="unit" label="Unit">
              <Select
                placeholder="Select unit"
                options={[
                  { value: 'pcs', label: 'Pieces' },
                  { value: 'kg', label: 'Kilograms' },
                  { value: 'ltr', label: 'Litres' },
                  { value: 'box', label: 'Box' },
                ]}
              />
            </Form.Item>
             <Form.Item
              name="quantity"
              label="Quantity"
              tooltip="Initial quantity. For regular updates, use Purchase/Consume"
              initialValue={0}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                disabled={modalType === 'edit'}
              />
            </Form.Item>
          {/*  <Form.Item
              name="reorderLevel"
              label="Reorder Level"
              initialValue={5}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="minQuantity"
              label="Minimum Quantity"
              initialValue={0}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item> */}
            {/* <Form.Item
              name="expiryAlertDays"
              label="Expiry Alert (days)"
              tooltip="Alert when expiry is within these many days"
              initialValue={7}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item> */}
            {/* <Form.Item name="purchasePrice" label="Default Purchase Price (₹)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item> */}
            {/* <Form.Item name="sellingPrice" label="Selling Price (₹)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item> */}
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
          </>
        );

      case 'purchase':
        return (
          <>
            <Form.Item
              name="qty"
              label="Quantity to Add"
              rules={[{ required: true, message: 'Enter quantity' }]}
            >
              <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="unitCost"
              label="Unit Cost (₹)"
              rules={[{ required: true, message: 'Enter cost per unit' }]}
            >
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="batchNo" label="Batch No">
              <Input />
            </Form.Item>
            <Form.Item name="expiryDate" label="Expiry Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="refNo" label="Reference / Bill No">
              <Input />
            </Form.Item>
            <Form.Item name="note" label="Notes">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );

      case 'consume':
        return (
          <>
            <Form.Item
              name="qty"
              label="Quantity to Consume"
              rules={[{ required: true, message: 'Enter quantity' }]}
            >
              <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: 'Select reason' }]}
            >
              <Select
                placeholder="Select reason"
                options={[
                  { value: 'daily_usage', label: 'Daily Usage' },
                  { value: 'sale', label: 'Sale' },
                  { value: 'wastage', label: 'Wastage' },
                  { value: 'production', label: 'Production' },
                  { value: 'adjustment', label: 'Adjustment' },
                ]}
              />
            </Form.Item>
            <Form.Item name="refNo" label="Reference / Doc No">
              <Input />
            </Form.Item>
            <Form.Item name="note" label="Notes">
              <Input.TextArea rows={2} />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  // 🔹 Stock history columns
  const historyColumns =
    historyItem?.stockHistory && historyItem.stockHistory.length
      ? [
          {
            title: 'Date',
            dataIndex: 'createdAt',
            render: (d) => (d ? dayjs(d).format('DD-MM-YYYY HH:mm') : '-'),
            width: 150,
          },
          {
            title: 'Type',
            dataIndex: 'type',
            width: 90,
            render: (type) => (
              <Tag color={type === 'purchase' ? 'green' : 'red'}>
                {type?.toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Qty',
            key: 'qty',
            width: 90,
            render: (_, row) => {
              const val =
                row.type === 'purchase'
                  ? row.quantityIn
                  : row.quantityOut
                  ? row.quantityOut
                  : 0;
              const sign = row.type === 'purchase' ? '+' : '-';
              const color = row.type === 'purchase' ? 'green' : 'red';
              return (
                <span style={{ color, fontWeight: 600 }}>
                  {sign}
                  {val}
                </span>
              );
            },
          },
          {
            title: 'Reason',
            dataIndex: 'reason',
            width: 120,
            render: (r) => (r ? r.toString().toUpperCase() : '-'),
          },
          {
            title: 'Ref No',
            dataIndex: 'refNo',
            width: 120,
          },
          {
            title: 'Value Impact (₹)',
            dataIndex: 'valueImpact',
            align: 'right',
            width: 130,
            render: (v) => (v != null ? Number(v).toFixed(2) : '0.00'),
          },
          {
            title: 'Batch',
            key: 'batch',
            render: (_, row) =>
              row.batches && row.batches.length
                ? row.batches.map((b, idx) => (
                    <Tag key={idx}>
                      {b.batchNo || 'N/A'}{' '}
                      {b.expiryDate
                        ? `(${dayjs(b.expiryDate).format('DD-MM-YYYY')})`
                        : ''}
                    </Tag>
                  ))
                : '-',
          },
          {
            title: 'Note',
            dataIndex: 'note',
            ellipsis: true,
          },
        ]
      : [];

  // 🔹 Search handler
  const onSearch = (val) => {
    setSearchText(val);
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchInventory({ page: 1 });
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Inventory Management
        </Title>

        <Space wrap>
          <Search
            placeholder="Search by code, name, category..."
            allowClear
            onSearch={onSearch}
            style={{ width: 260 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchInventory()}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal('add')}
          >
            Add Item
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey="_id"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
        }}
        scroll={{ x: 1200 }}
        onChange={handleTableChange}
      />

      {/* Main Modal (Add / Edit / Purchase / Consume) */}
      <Modal
        open={!!modalType}
        title={renderModalTitle()}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText="Save"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {renderFormFields()}
        </Form>
      </Modal>

      {/* Stock History Drawer */}
      <Drawer
        title={
          historyItem
            ? `Stock History - ${historyItem.itemName} (${historyItem.itemCode})`
            : 'Stock History'
        }
        placement="right"
        width={650}
        onClose={closeHistory}
        open={historyOpen}
      >
        <Table
          size="small"
          rowKey={(row, idx) => idx}
          dataSource={historyItem?.stockHistory || []}
          columns={historyColumns}
          pagination={false}
        />
        {!historyItem?.stockHistory?.length && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Tag>No stock movement recorded yet</Tag>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default InventoryManagement;
